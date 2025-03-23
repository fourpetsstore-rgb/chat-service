const express = require('express');
const { getMessages, sendMessage, markMessageAsRead, uploadFile, markAllMessagesAsRead } = require('../controllers/messagesController');
const multer = require('multer');


const router = express.Router();
const upload = multer({storage: multer.memoryStorage()});


// Get messages for a conversation
router.get('/:conversationId', getMessages);

// Send a new message
router.post('/:conversationId', sendMessage);

// Mark as read
router.put('/:conversationId/messages/:messageId/markAsRead', markMessageAsRead);

// Mark all as read
router.put('/:conversationId/messages/markAllAsRead', markAllMessagesAsRead);

// Upload a file
router.post('/upload', upload.single('file'), uploadFile);

module.exports = router;
