const express = require('express');
const { createConversation, getAllConversations, updateConversation, getConversationById } = require('../controllers/conversationsController');

const router = express.Router();


router.post('/', (req, res) => {
    const io = req.app.get('io'); // Retrieve io from the app context
    createConversation(req, res, io);
});

router.get('/', getAllConversations);
router.get('/:conversationId', getConversationById);
router.put('/:conversationId', updateConversation);

module.exports = router;
