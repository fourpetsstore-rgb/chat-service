const { errorMonitor } = require("ws");
const { admin, db } = require("../firebaseConfig");
const axios = require('axios');
const { userInfo } = require("os");


const getAllConversations = async (req, res) => {
    const { pageSize, lastVisible } = req.query;

    try {
        let query = db.collection('conversations').orderBy('created_at', 'desc').limit(Number(pageSize));

        if (lastVisible) {
            // If lastVisible exists, start after it for pagination
            const lastVisibleDoc = await db.collection('conversations').doc(lastVisible).get();
            if (!lastVisibleDoc.exists) {
                return res.status(400).json({ error: 'Invalid lastVisible document' });
            }
            query = query.startAfter(lastVisibleDoc);
        }

        const snapshot = await query.get();

        // Check if there are conversations
        if (snapshot.empty) {
            return res.status(404).json({ error: 'No conversations found' });
        }

        // Map the snapshot to return the conversations
        const conversations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get the last document in the snapshot for pagination
        const lastDoc = snapshot.docs[snapshot.docs?.length - 1];

        res.status(200).json({
            conversations,
            lastVisible: lastDoc.id,  // Provide lastVisible document ID for pagination
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Create a new conversation
const createConversation = async (req, res, io) => {
    const { userId, userName } = req.body; // Assuming the request body only contains user info
    const adminMessage = `Hello, how can I assist you today?\nمرحباََ! كيف يمكننا مساعدتك؟`; // Admin's first message

    // console.log("Req body", {
    //     userId: userId,
    //     userName: userName,
    // });

    try {

        const baseUrl = 'https://chat.bevatel.com'; // Replace with actual base URL
        const apiAccessToken = 'kTpUq4fo74yfUrZrfBJqNYMi';  // Replace with actual token
        const apiAccountId = '15582';      // Replace with actual account ID
        let contactId = ""
        const url = `${baseUrl}/developer/api/v1/contacts`;
        const body = {
            name: userName
        }

        const response = await axios.post(url, body, {
            headers: {
                api_access_token: apiAccessToken,
                api_account_id: apiAccountId,
                'Content-Type': 'application/json'

            }
        })
        console.log(response.data.data.id)
        contactId = response.data.data.id
        const convurl = `${baseUrl}/api/v1/accounts/${apiAccountId}/conversations`;
        let convId
        const convbody =
        {
            inbox_id: 65301,
            contact_id: Number(contactId)
        }
        const convResp = await axios.post(convurl, convbody, {
            headers: {
                api_access_token: apiAccessToken,
                'Content-Type': 'application/json'

            }
        })
        convId = convResp.data.id

        // Create a new conversation document
        const newConversationRef = await db.collection('conversations').doc(String(convId))
        newConversationRef.set({

            user_id: userId ? userId : "Guest User", // If no user ID is provided, set as "Guest"
            user_name: userName,
            admin_assigned: null, // Initially, no admin assigned
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            last_message: adminMessage, // Set last_message to the admin's first message
            last_message_timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'open', // Default status
        });


        // Add admin's first message to the 'messages' subcollection
        const newMessageRef = await newConversationRef.collection('messages').add({
            sender: "admin",
            message_content: adminMessage,
            attachments: [],
            read: true, // Initially, mark the message as unread
            end_session: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update last_message and last_message_timestamp fields in the conversation document
        await newConversationRef.update({
            last_message: adminMessage,
            last_message_timestamp: admin.firestore.FieldValue.serverTimestamp(),
            messages_count: 0, // Initially, no messages in the conversation. Ignore the admin's first message for count purposes.
        });

        // Emit the auto-response message to the conversation room
        const newMessageSnapshot = await newMessageRef.get();
        const newMessage = newMessageSnapshot.data();
        io.to(newConversationRef.id).emit('newMessage', {
            id: newMessageRef.id,
            ...newMessage,
        });

        // Return the new conversation ID as part of the response
        console.log("conversationId created with heeeereee ", newConversationRef.id)
        res.status(201).json({ conversationId: newConversationRef.id });
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message });
    }
};


// Get a conversation by its ID
const getConversationById = async (req, res) => {
    const { conversationId } = req.params;

    try {
        const conversationDoc = await db.collection('conversations').doc(conversationId).get();

        if (!conversationDoc.exists) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const conversation = conversationDoc.data();
        res.status(200).json(conversation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Update conversation (e.g., assigning an admin or changing status)
const updateConversation = async (req, res) => {
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        const conversationRef = db.collection('conversations').doc(conversationId);
        await conversationRef.update({
            admin_assigned: req.body?.adminAssigned || null,
            status: status,
            // last_message_timestamp: new Date(), // Update the last message timestamp
        });

        res.status(200).json({ message: 'Conversation updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createConversation,
    getAllConversations,
    updateConversation,
    getConversationById
};