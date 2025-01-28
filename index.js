// index.js
const express = require('express');
const bodyParser = require('body-parser');
const chatRoutes = require('./routes/chatRoutes');
const { db } = require('./firebaseConfig');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { initializeSocket } = require('./utils/socket');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');


dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());


// Routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

// Initialize Socket.io for real-time communication
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow all origins for testing; restrict in production
        methods: ['GET', 'POST', 'PUT'],
    },
});
initializeSocket(io);

// Set io in the app context
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});