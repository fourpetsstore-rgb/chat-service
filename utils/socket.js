const { getConversationById } = require("../controllers/conversationsController");
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
                // console.log("New message send", message);
                const parsedMessage = await JSON.parse(message);


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
                if (!parsedMessage?.messageContent && !parsedMessage?.attachments) {
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

                // console.log("New message ref", newMessageRef);

                // Update the last message in the conversation
                await db.collection('conversations').doc(parsedMessage.conversationId).update({
                    last_message: parsedMessage.messageContent,
                    last_message_timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    messages_count: admin.firestore.FieldValue.increment(1),
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
        // For new conversations
        const openConvosQuery = db.collection("conversations")
            .where("status", "==", "open")
            .orderBy("created_at").startAfter(admin.firestore.Timestamp.now().toMillis() - 60000) // 1 minute

        // For closed conversations
        const closedConvosQuery = db.collection("conversations")
            .where("status", "==", "closed");


        const previousConversations = new Map();

        // Track active message listeners per conversation
        const activeMessageListeners = new Map();

        const lastOpenEmissionMap = new Map();
        const THROTTLE_INTERVAL = 2000; // 2 second

        const unsubscribeOpen = openConvosQuery.onSnapshot(
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === "added") {
                        const conversation = { id: change.doc.id, ...change.doc.data(), messages: [] };
                        // Set initial status
                        previousConversations.set(conversation.id, conversation.status);

                        // Start message listener
                        const messageListener = db.collection('conversations')
                            .doc(conversation.id)
                            .collection('messages')
                            .orderBy('timestamp', 'desc')
                            .limit(50)
                            .onSnapshot((msgSnapshot) => {
                                msgSnapshot.docChanges().forEach((msgChange) => {
                                    if (msgChange.type === "added") {
                                        const message = msgChange.doc.data();
                                        io.to(conversation.id).emit('newMessage', {
                                            id: msgChange.doc.id,
                                            ...message
                                        });
                                        io.emit('conversationUpdate', {
                                            id: conversation.id,
                                            lastMessage: message.message_content,
                                            messageCount: msgSnapshot.size
                                        });
                                    }
                                });
                            });

                        activeMessageListeners.set(conversation.id, messageListener);


                        // Throttle emission per conversation:
                        const lastEmission = lastOpenEmissionMap.get(conversation.id) || 0;
                        if (Date.now() - lastEmission > THROTTLE_INTERVAL) {
                            console.log("Emitting new conversation", conversation.id);
                            io.emit("newConversation", conversation);
                            lastOpenEmissionMap.set(conversation.id, Date.now());
                        }
                    }
                });
            });




        const lastClosedEmissionMap = new Map();
        const CLOSED_THROTTLE_INTERVAL = 2000;

        const unsubscribeClosed = closedConvosQuery.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const conversation = { id: change.doc.id, ...change.doc.data() };
                const previousStatus = previousConversations.get(conversation.id);

                // Cleanup message listener when conversation closes
                if (activeMessageListeners.has(conversation.id)) {
                    activeMessageListeners.get(conversation.id)();
                    activeMessageListeners.delete(conversation.id);
                }


                // Only emit if status changed and sufficient time has passed
                const lastEmission = lastClosedEmissionMap.get(conversation.id) || 0;
                if (previousStatus !== "closed" && Date.now() - lastEmission > CLOSED_THROTTLE_INTERVAL) {
                    previousConversations.set(conversation.id, "closed");
                    io.emit("closedConversation", conversation);
                    lastClosedEmissionMap.set(conversation.id, Date.now());
                }
            });
        });


        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('A user disconnected');
            unsubscribeOpen();
            unsubscribeClosed();

            activeMessageListeners.forEach((unsub, id) => {
                unsub();
                activeMessageListeners.delete(id);
            });
        });

    });
};

module.exports = { initializeSocket };
