import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptToken(text) {
  const secretKey = process.env.ENCRYPTION_KEY;
  if (!secretKey) throw new Error('ENCRYPTION_KEY environment variable is missing.');
  if (secretKey.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-character hex string.');
  
  const iv = crypto.randomBytes(12); // 12 bytes is standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(secretKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptToken(encryptedString) {
  const secretKey = process.env.ENCRYPTION_KEY;
  if (!secretKey) throw new Error('ENCRYPTION_KEY environment variable is missing.');
  
  const parts = encryptedString.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format.');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedData = parts[2];
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(secretKey, 'hex'),
    iv
  );
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
