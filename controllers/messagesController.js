const { db, admin } = require("../firebaseConfig");


// Get messages for a specific conversation
const getMessages = async (req, res) => {
    const { conversationId } = req.params;
    try {
        const snapshot = await db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .get();

        const messages = snapshot.docs.map(doc => ({
            id: doc.id, // Destructure correctly
            ...doc.data()
        }));

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Send a new message in a conversation
const sendMessage = async (req, res) => {
    const { conversationId } = req.params;
    const { sender, messageContent, attachments, endSession } = req.body;
    console.log("Body", req.body)
    try {
        const newMessageRef = await db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .add({
                conversation_id: conversationId,
                sender,
                message_content: messageContent,
                attachments,
                read: false, // Initially, mark the message as unread
                end_session: endSession || false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

        // Update the last message in the conversation
        await db.collection('conversations').doc(conversationId).update({
            last_message: messageContent,
            last_message_timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        const newMessage = (await newMessageRef.get()).data()

        res.status(201).json({ message: { id: newMessageRef.id, ...newMessage } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Mark message as read
const markMessageAsRead = async (req, res) => {
    const { conversationId, messageId } = req.params;

    try {
        const messageRef = db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .doc(messageId);

        await messageRef.update({
            read: true,
        });

        res.status(200).json({ message: 'Message marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getMessages,
    sendMessage,
    markMessageAsRead,
};
