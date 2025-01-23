const { admin, db } = require("../firebaseConfig");


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
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        res.status(200).json({
            conversations,
            lastVisible: lastDoc.id,  // Provide lastVisible document ID for pagination
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// Create a new conversation
const createConversation = async (req, res) => {
    const { userId, userName } = req.body;
    console.log("Req body", {
        userId: userId,
        userName: userName
    })

    try {
        console.log("Conversation Data", {
            user_id: userId ? userId : "Guest User", // If no user ID is provided, set as "Guest"
            user_name: userName,
            admin_assigned: null, // Initially, no admin assigned
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            last_message: '',
            last_message_timestamp: null,
            status: 'open', // Default status
        })
        const newConversationRef = await db.collection('conversations').add({
            user_id: userId ? userId : "Guest User", // If no user ID is provided, set as "Guest"
            user_name: userName,
            admin_assigned: null, // Initially, no admin assigned
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            last_message: '',
            last_message_timestamp: null,
            status: 'open', // Default status
        });


        res.status(201).json({ conversationId: newConversationRef.id });
    } catch (err) {
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
    const { adminAssigned, status } = req.body;

    try {
        const conversationRef = db.collection('conversations').doc(conversationId);
        await conversationRef.update({
            admin_assigned: adminAssigned,
            status: status,
            last_message_timestamp: new Date(), // Update the last message timestamp
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