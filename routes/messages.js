const express = require('express');
const { getMessages, sendMessage, markMessageAsRead } = require('../controllers/messagesController');

const router = express.Router();

// Get messages for a conversation
router.get('/:conversationId', getMessages);

// Send a new message
router.post('/:conversationId', sendMessage);

// Mark as read
router.put('/:conversationId/messages/:messageId/markAsRead', markMessageAsRead)

module.exports = router;
