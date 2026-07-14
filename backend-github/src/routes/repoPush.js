import { Router } from 'express';
import { runFullPushFlow } from '../modules/githubPusher.js';
import { createClerkClient, verifyToken } from '@clerk/backend';
import GithubToken from '../models/GithubToken.js';
import { decryptToken } from '../utils/encryption.js';

const router = Router();

// Ensure CLERK_SECRET_KEY is provided in .env
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

router.post('/push', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const { auditId, acceptedFixIds } = req.body;

  if (!auditId || !Array.isArray(acceptedFixIds)) {
    return res.status(400).json({ success: false, error: 'Invalid payload: missing auditId or acceptedFixIds' });
  }

  try {
    // 1. Verify Clerk session token to get the user ID
    let userId;
    try {
      const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      userId = verified.sub;
    } catch (err) {
      console.warn('Clerk token verification failed:', err.message);
    }

    // 2. Try to fetch the user's GitHub OAuth Token from Clerk
    let clerkOauthToken = null;
    if (userId && process.env.CLERK_SECRET_KEY) {
      try {
        const response = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github');
        if (response.data && response.data.length > 0) {
          clerkOauthToken = response.data[0].token;
        }
      } catch (err) {
        console.warn('Failed to fetch Clerk GitHub OAuth token:', err.message);
      }
    }

    // 3. Resolve the GitHub Token (prefer DB -> Clerk OAuth -> Server Default)
    let dbToken = null;
    if (userId) {
      const tokenDoc = await GithubToken.findOne({ userId });
      if (tokenDoc) {
        try {
          dbToken = decryptToken(tokenDoc.encryptedToken);
        } catch (err) {
          console.warn('Failed to decrypt stored token:', err.message);
        }
      }
    }
    
    const githubToken = dbToken || clerkOauthToken || process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      throw new Error('Please connect your GitHub account by providing a Personal Access Token.');
    }

    const result = await runFullPushFlow(auditId, acceptedFixIds, githubToken);

    res.json({
      success: true,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      branch: result.branch,
      filesChanged: result.filesChanged,
      commits: result.commits,
    });
  } catch (err) {
    console.error('Push failed:', err.message);

    res.status(500).json({
      success: false,
      error: err.message,
      // Include branch name if it was created before failure
      branch: err.message.includes('branch rolled back') ? null : undefined,
    });
  }
});

export default router;
