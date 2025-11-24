const express = require('express');
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();


const corsOptions = require('./config/corsOptions');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors(corsOptions));

app.get('/', (req, res) => {
    res.send('Live Game Streaming Backend is Running!');
});


io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);


    socket.on('send_message', (data) => {
        console.log(`Message received from ${data.user}: ${data.message}`);


        socket.broadcast.emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

