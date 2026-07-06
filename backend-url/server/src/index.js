import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import { useMemoryStore } from './store/memory.js';
import { createAuditRoutes } from './routes/audit.js';
import { createChatRoutes } from './routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve audit assets (screenshots, videos, reports)
fs.mkdirSync(config.outputDir, { recursive: true });
app.use('/outputs', express.static(config.outputDir));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'memory',
    groq: config.groqApiKey ? 'configured' : 'missing',
  });
});

app.use('/api/audits', createAuditRoutes(io));
app.use('/api/chat', createChatRoutes());

// Serve React app in production
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/outputs')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

io.on('connection', (socket) => {
  socket.on('join:audit', (auditId) => {
    if (auditId) socket.join(auditId);
  });

  socket.on('leave:audit', (auditId) => {
    if (auditId) socket.leave(auditId);
  });
});

async function connectDatabase() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB unavailable:', err.message);
    await useMemoryStore();
  }
}

async function start() {
  await connectDatabase();

  httpServer.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

start();
