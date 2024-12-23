const { db, admin } = require("../firebaseConfig");


const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected with id: ' + socket.id);

        // Join a specific conversation
        socket.on('joinConversation', (conversationId) => {

            const parsedId = conversationId.conversation_id;
            console.log("Conversation Id", conversationId)
            socket.join(parsedId);
            console.log(`User joined conversation: ${parsedId}`)
        });

        // Send a new message
        socket.on('sendMessage', async (message) => {
            const parsedMessage = message
            console.log("New message send", parsedMessage);

            // Validate conversationId
            if (!parsedMessage.conversationId || typeof parsedMessage.conversationId !== 'string' || parsedMessage.conversationId.trim() === '') {
                console.error('Invalid conversationId:', parsedMessage.conversationId);
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
                    attachments: parsedMessage.attachments,
                    read: false,
                    end_session: parsedMessage.endSession || false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });

            // Update the last message in the conversation
            await db.collection('conversations').doc(parsedMessage.conversationId).update({
                last_message: parsedMessage.messageContent,
                last_message_timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            const newMessage = (await newMessageRef.get()).data()

            // Emit the new message to the conversation room
            io.to(parsedMessage.conversationId).emit('newMessage', {
                id: newMessageRef.id,
                ...newMessage,
            });
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
                console.error("Error listening for new conversations:", error);
            }
        );


        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('A user disconnected');
        });


        // Cleanup Firestore listener on disconnection
        socket.on("disconnect", () => {
            unsubscribe();
        });
    });
};

module.exports = { initializeSocket };
