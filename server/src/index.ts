import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:5175', 
  'http://127.0.0.1:5173', 
  'http://127.0.0.1:5174'
];

if (process.env.FRONTEND_URL) {
  const cleanUrl = process.env.FRONTEND_URL.endsWith('/') 
    ? process.env.FRONTEND_URL.slice(0, -1) 
    : process.env.FRONTEND_URL;
  allowedOrigins.push(cleanUrl);
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import { registerOnlineGameHandler } from './controllers/onlineGameHandler';

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Register Socket.io online game handler (includes JWT auth + all game events)
registerOnlineGameHandler(io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
