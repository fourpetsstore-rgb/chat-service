const express = require('express');
const { sendMessage, getMessages, updateMessageStatus } = require('../controllers/chatController');

const router = express.Router();

// Send a message
router.post('/send-message', sendMessage);

// Get messages for a conversation
router.get('/messages/:conversation_id', getMessages);

// Update customer message status
router.put('/messages/status/:message_id', updateMessageStatus);


module.exports = router;