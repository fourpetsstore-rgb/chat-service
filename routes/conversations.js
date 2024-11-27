const express = require('express');
const { createConversation, getAllConversations, updateConversation,getConversationById } = require('../controllers/conversationsController');

const router = express.Router();


router.get('/', getAllConversations);
router.post('/', createConversation);
router.get('/:conversationId', getConversationById);
router.put('/:conversationId', updateConversation);

module.exports = router;
