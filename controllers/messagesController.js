const { db, admin, storage } = require("../firebaseConfig");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

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


// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
    },
});

// Upload file function
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const bucket = storage.bucket(); // Assuming default bucket is set

    const fileName = `${uuidv4()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const blobStream = fileUpload.createWriteStream({
        metadata: {
            contentType: file.mimetype,
        },
    });

    blobStream.on('error', (err) => {
        res.status(500).json({ error: err.message });
    });

    blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
        res.status(200).json({ fileUrl: publicUrl });
    });

    blobStream.end(file.buffer);
};



module.exports = {
    getMessages,
    sendMessage,
    markMessageAsRead,
    uploadFile,
};
