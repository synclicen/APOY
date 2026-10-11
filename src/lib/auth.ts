/** Hash a password with SHA-256. */
export function hashPassword(password: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('node:crypto');
  return createHash('sha256').update(password).digest('hex');
}

/** Verify a password against a hash. */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/** Create a simple session token (base64url of payload). */
export function createSessionToken(username: string, role: string): string {
  const payload = JSON.stringify({ username, role, ts: Date.now(), rand: Math.random() });
  return Buffer.from(payload).toString('base64url');
}

/** Decode a session token. */
export function decodeSessionToken(token: string): { username: string; role: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
    if (!payload.username || !payload.role) return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
