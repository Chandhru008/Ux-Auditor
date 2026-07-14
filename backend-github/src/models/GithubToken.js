import mongoose from 'mongoose';

const githubTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  encryptedToken: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('GithubToken', githubTokenSchema);
