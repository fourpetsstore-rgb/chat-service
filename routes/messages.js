const express = require('express');
const { getMessages, sendMessage, markMessageAsRead, uploadFile, markAllMessagesAsRead } = require('../controllers/messagesController');
const multer = require('multer');
const { db, admin } = require("../firebaseConfig");


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


// Get messages for a conversation
router.get('/:conversationId', getMessages);

// Send a new message
router.post('/:conversationId', sendMessage);
router.post('/', async (req, res) => {

    const sender = req.body.conversation.messages[0].sender_type

    const conversation = req.body.conversation.id
    const inbox = req.body.conversation.inbox_id

    if (sender == "User" && inbox == 65301) {
        try {


            const parsedMessage = { sender: "admin", conversationId: String(conversation), attachments: [], messageContent: req.body.content };

            const io = req.app.get('io');
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
                    read: true,
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


            return;
        } catch (error) {
            console.error('Error sending message:', error);

        }

    }





    // TODO: handle the payload (e.g., update order status, log event, etc.)

    // Respond quickly to acknowledge receipt

});
// Mark as read
router.put('/:conversationId/messages/:messageId/markAsRead', markMessageAsRead);

// Mark all as read
router.put('/:conversationId/markAllAsRead', (req, res) => {
    const io = req.app.get('io'); // Retrieve io from the app context
    markAllMessagesAsRead(req, res, io)
});

// Upload a file
router.post('/upload', upload.single('file'), uploadFile);

module.exports = router;