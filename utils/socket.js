const { db, admin } = require("../firebaseConfig");


const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected with id: ' + socket.id);

        // Join a specific conversation
        socket.on('joinConversation', (conversationId) => {
            
            const parsedId = JSON.parse(conversationId).conversation_id;
            socket.join(parsedId);
            console.log(`User joined conversation: ${parsedId}`);
        });

        // Send a new message
        socket.on('sendMessage', async (message) => {
            const parsedMessage = JSON.parse(message)
            console.log("New message send", parsedMessage.messageContent)

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

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('A user disconnected');
        });
    });
};

module.exports = { initializeSocket };
