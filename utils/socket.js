const { db, admin } = require("../firebaseConfig");


const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected with id: ' + socket.id);

        // Join a specific conversation
        socket.on('joinConversation', (payload) => {
            try {
                const parsedPayload = JSON.parse(payload);
                const conversationId = parsedPayload.conversationId;
                if (!conversationId || typeof conversationId !== 'string') {
                    throw new Error('Invalid conversationId');
                }
                console.log("Conversation Id", conversationId);
                socket.join(conversationId);
                console.log(`User joined conversation: ${conversationId}`);
            } catch (error) {
                console.error('Error joining conversation:', error.message);
                socket.emit('error', { type: 'VALIDATION_ERROR', message: 'Invalid payload for joinConversation' });
            }
        });


        // Send a new message
        socket.on('sendMessage', async (message, callback) => {

            try {
                const parsedMessage = await JSON.parse(message);
                console.log("New message send", parsedMessage);


                // Validate conversationId
                if (!parsedMessage.conversationId || typeof parsedMessage.conversationId !== 'string' || parsedMessage.conversationId.trim() === '') {
                    console.error('Invalid conversationId:', parsedMessage.conversationId);
                    socket.emit('error', { type: 'VALIDATION_ERROR', message: 'Invalid conversationId' });
                    return;
                }

                if (!parsedMessage.sender || typeof parsedMessage.sender !== 'string') {
                    socket.emit('error', { type: 'VALIDATION_ERROR', message: 'Invalid sender' });
                    return;
                }
                if (!parsedMessage.messageContent || typeof parsedMessage.messageContent !== 'string') {
                    socket.emit('error', { type: 'VALIDATION_ERROR', message: 'Invalid message content' });
                    return;
                }



                // Save message to Firestore
                const newMessageRef = await db.collection('conversations')
                    .doc(parsedMessage.conversationId)
                    .collection('messages')
                    .add({
                        conversation_id: parsedMessage.conversationId,
                        sender: parsedMessage.sender,
                        message_content: parsedMessage.messageContent,
                        attachments: parsedMessage.attachments || [],
                        read: false,
                        end_session: parsedMessage.endSession || false,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    console.log("New message ref", newMessageRef);

                // Update the last message in the conversation
                await db.collection('conversations').doc(parsedMessage.conversationId).update({
                    last_message: parsedMessage.messageContent,
                    last_message_timestamp: admin.firestore.FieldValue.serverTimestamp()
                });


                // Emit the new message to the conversation room
                const newMessageSnapshot = await newMessageRef.get();
                const newMessage = newMessageSnapshot.data();
                io.to(parsedMessage.conversationId).emit('newMessage', {
                    id: newMessageRef.id,
                    ...newMessage,
                });

                if (callback) {
                    callback({ status: 'success' });
                }
                return;
            } catch (error) {
                console.error('Error sending message:', error);
                if (callback) {
                    callback({ status: 'error', message: error.message });
                }
                socket.emit('error', 'Error sending message');
            }
        });


        // Real-time listener for new conversations
        const conversationsQuery = db.collection("conversations").orderBy("created_at");
        const unsubscribe = conversationsQuery.onSnapshot(
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const newConversation = {
                            id: change.doc.id,
                            ...change.doc.data(),
                        };

                        // Emit new conversation to all connected admin clients
                        io.emit("newConversation", newConversation);
                        console.log("New conversation detected:", newConversation);
                    }
                });
            },
            (error) => {
                console.error('Error listening to conversations:', error);
                socket.emit('error', 'Error listening to conversations: ' + error.message);
            }
        );


        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('A user disconnected');
            unsubscribe();
        });

    });
};

module.exports = { initializeSocket };
