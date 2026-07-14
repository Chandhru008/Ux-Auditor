import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import repoAuditRoutes from './routes/repoAudit.js';
import repoPushRoutes from './routes/repoPush.js';
import githubTokenRoutes from './routes/githubToken.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'RepoScan' });
});

app.use('/api/repo', repoAuditRoutes);
app.use('/api/repo', repoPushRoutes);
app.use('/api/github-token', githubTokenRoutes);

import { MongoMemoryServer } from 'mongodb-memory-server';

async function start() {
  let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reposcan';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.log('Falling back to in-memory MongoDB...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('In-memory MongoDB connected successfully');
    } catch (memErr) {
      console.error('In-memory MongoDB connection failed:', memErr.message);
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`RepoScan API running on http://localhost:${PORT}`);
  });
}

start();
