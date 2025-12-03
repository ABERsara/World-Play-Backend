import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import userRoutes from '../routes/user.routes.js';
import financeRoutes from '../routes/finance.routes.js';
import corsOptions from '../config/corsOptions.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors(corsOptions));
app.use('/users', userRoutes);
app.use('/api/finance', financeRoutes);

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
