const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');


// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
// Initialize Firebase Storage
const storage = admin.storage();

const db = admin.firestore();

module.exports = { db, admin, storage };