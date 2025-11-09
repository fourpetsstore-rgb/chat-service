const { db, admin } = require('../firebaseConfig');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');

dotenv.config();

// Send a new message
const sendMessage = [
    // Validation rules
    
    body('sender_id').notEmpty().withMessage('Sender ID is required.'),
    body('conversation_id').notEmpty().withMessage('Conversation ID is required.'),
    body('sender_name').notEmpty().withMessage('Sender name is required.'),
    body('message_content').notEmpty().withMessage('Message content is required.'),
    
    async (req, res) => {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { conversation_id, sender_id, sender_name, message_content, end_session } = req.body;

            const messageData = {
                conversation_id,
                sender_id,
                sender_name,
                recipient_id: process.env.ADMIN_ID,
                message_content,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                customer_status: 'unread',
                admin_status: 'read',
                end_session,
            };

            await db.collection('chats').add(messageData);

            // Retrieve all messages for the conversation
            const messagesSnapshot = await db.collection('chats')
                .where('conversation_id', '==', conversation_id)
                .orderBy('timestamp')
                .get();

            const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            res.status(200).json({ success: true, messages });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ success: false, error: `Failed to send message: ${error.message}` });
        }
    }
];


// Update customer message status
const updateMessageStatus = async (req, res) => {
    const { conversation_id } = req.body;

    try {
        const snapshot = await db
            .collection('chats')
            .where('conversation_id', '==', conversation_id)
            .where('customer_status', '==', 'unread')
            .get();

        const batch = db.batch();
        snapshot.forEach((doc) => batch.update(doc.ref, { customer_status: 'read' }));

        await batch.commit();
        res.status(200).json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ success: false, message: 'Failed to update read status' });
    }
};


// Retrieve messages for a conversation
const getMessages = async (req, res) => {
    try {
        const { conversation_id } = req.params;

        const messagesSnapshot = await db.collection('chats')
            .where('conversation_id', '==', conversation_id)
            .orderBy('timestamp')
            .get();

        const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (messages.length > 0) {
            const batch = db.batch();

            // Check if the last message is already marked as read
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.customer_status === 'unread') {
                // Mark all messages as 'read' for the customer except the most recent one
                for (let i = 0; i < messages.length - 1; i++) {
                    const messageRef = db.collection('chats').doc(messages[i].id);
                    batch.update(messageRef, { customer_status: 'read' });
                    messages[i].customer_status = 'read';
                }
                // Leave the most recent message as 'unread' for the customer
                lastMessage.customer_status = 'unread';
            }

            await batch.commit();
        }

        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error('Error retrieving messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { sendMessage, getMessages, updateMessageStatus };



// Admin sends a message to a user
// const sendAdminMessage = async (req, res) => {
//     try {
//         const { conversation_id, admin_id, sender_name, message_content, recipient_id } = req.body;

//         const messageData = {
//             conversation_id,
//             sender_id: admin_id,
//             sender_name,
//             recipient_id,
//             message_content,
//             timestamp: admin.firestore.FieldValue.serverTimestamp(),
//             customer_status: 'unread',
//             admin_status: 'read',
//         };

//         const response = await db.collection('chats').add(messageData);

//         if (!response) {
//             throw new Error(`Error sending message ${response}`);
//         }

//         res.status(200).json({ success: true, message: 'Admin message sent successfully' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     }
// };


// Update admin message status
// const updateAdminMessageStatus = async (req, res) => {
//     const { conversation_id } = req.body;

//     try {
//         const snapshot = await db
//             .collection('chats')
//             .where('conversation_id', '==', conversation_id)
//             .where('admin_status', '==', 'unread')
//             .get();

//         const batch = db.batch();
//         snapshot.forEach((doc) => batch.update(doc.ref, { admin_status: 'read' }));

//         await batch.commit();
//         res.status(200).json({ success: true, message: 'Admin messages marked as read' });
//     } catch (error) {
//         console.error('Error marking admin messages as read:', error);
//         res.status(500).json({ success: false, message: 'Failed to update admin read status' });
//     }
// };

// const getMessages = async (req, res) => {
//     try {
//         const { conversation_id } = req.params;
//         const { initiator } = req.body; // Accept initiator from the request body

//         const messagesSnapshot = await db.collection('chats')
//             .where('conversation_id', '==', conversation_id)
//             .orderBy('timestamp')
//             .get();

//         const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

//         // Check if there are messages
//         if (messages.length > 0) {
//             const batch = db.batch();

//             if (initiator === 'customer') {
//                 // Mark all messages as 'read' for the customer except the most recent one
//                 for (let i = 0; i < messages.length - 1; i++) {
//                     const messageRef = db.collection('chats').doc(messages[i].id);
//                     batch.update(messageRef, { customer_status: 'read' });
//                     messages[i].customer_status = 'read'; // Update local messages array
//                 }
//                 // Leave the most recent message as 'unread' for the customer
//                 messages[messages.length - 1].customer_status = 'unread';
//             } else if (initiator === 'admin') {
//                 // Mark all messages as 'read' for the admin
//                 for (let i = 0; i < messages.length; i++) {
//                     const messageRef = db.collection('chats').doc(messages[i].id);
//                     batch.update(messageRef, { admin_status: 'read' });
//                     messages[i].admin_status = 'read'; // Update local messages array
//                 }
//                 // Optionally, you can leave the most recent message as 'unread' for the admin if needed
//                 // messages[messages.length - 1].admin_status = 'unread';
//             }

//             await batch.commit();
//         }

//         res.status(200).json({ success: true, messages });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     }
// };

// const getNewConversations = async (req, res) => {
    //     try {
    //         const snapshot = await db.collection('chats')
    //             .where('admin_status', '==', 'unread') // Assuming new conversations have admin_status as 'unread'
    //             .orderBy('timestamp')
    //             .get();
    
    //         const newConversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    //         res.status(200).json({ success: true, conversations: newConversations });
    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).json({ error: error.message });
    //     }
    // };

// setInterval(async () => {
//     const response = await fetch('http://localhost:5000/api/chat/messages/123'); // Replace with actual conversation ID
//     const data = await response.json();
//     if (data.success) {
//         // Update your chat UI with the new messages
//         console.log(data.messages);

//         // Update message status to 'read'
//         await fetch(`http://localhost:5000/api/chat/messages/status/${messageId}`, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ status: 'read' }),
//         });
//     }
// }, 5000); // Poll every 5 seconds



// async function checkForNewConversations() {
//     const response = await fetch('http://localhost:5000/api/chat/messages/new'); // Endpoint to get new messages
//     const data = await response.json();
//     if (data.success) {
//         // Update the admin dashboard with new conversations
//         console.log('New conversations:', data.messages);
//     }
// }

// // Poll every 10 seconds
// setInterval(checkForNewConversations, 10000);