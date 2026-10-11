/**
 * APOY Cloudflare Worker
 *
 * Serves the Next.js static export (frontend) via Workers Static Assets,
 * and handles /api/* requests against the Turso (libSQL) database.
 *
 * The API logic mirrors the Next.js API route handlers so that the deployed
 * app behaves identically to the local Next.js dev server.
 */
import { createClient } from '@libsql/client';

export interface Env {
  ASSETS: Fetcher;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

function uuid(): string {
  return crypto.randomUUID();
}

// ---------- API handlers ----------

async function handleProjects(req: Request, env: Env): Promise<Response> {
  const db = getDb(env);
  const url = new URL(req.url);

  // GET /api/projects — list
  if (req.method === 'GET') {
    try {
      const res = await db.execute(
        'SELECT id, name, created_at, updated_at, photo_count, settings FROM projects ORDER BY updated_at DESC'
      );
      const projects = res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        created_at: Number(r.created_at),
        updated_at: Number(r.updated_at),
        photo_count: Number(r.photo_count),
        settings: r.settings ? JSON.parse(r.settings as string) : null,
      }));
      return json({ success: true, projects });
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 500);
    }
  }

  // POST /api/projects — save/upsert
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { id, name, photo_count, settings } = body;
      if (!name || !settings) {
        return json({ success: false, error: 'name and settings are required' }, 400);
      }
      const now = Date.now();
      const projectId = id || uuid();
      const settingsJson = JSON.stringify(settings);
      await db.execute({
        sql: `INSERT INTO projects (id, name, created_at, updated_at, photo_count, settings)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                updated_at = excluded.updated_at,
                photo_count = excluded.photo_count,
                settings = excluded.settings`,
        args: [projectId, name, now, now, photo_count || 0, settingsJson],
      });
      return json({ success: true, project: { id: projectId, name, updated_at: now } });
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 500);
    }
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

async function handleProjectItem(req: Request, env: Env, id: string): Promise<Response> {
  const db = getDb(env);

  if (req.method === 'GET') {
    try {
      const res = await db.execute({
        sql: 'SELECT id, name, created_at, updated_at, photo_count, settings FROM projects WHERE id = ?',
        args: [id],
      });
      if (res.rows.length === 0) {
        return json({ success: false, error: 'Project not found' }, 404);
      }
      const r = res.rows[0];
      return json({
        success: true,
        project: {
          id: r.id,
          name: r.name,
          created_at: Number(r.created_at),
          updated_at: Number(r.updated_at),
          photo_count: Number(r.photo_count),
          settings: r.settings ? JSON.parse(r.settings as string) : null,
        },
      });
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 500);
    }
  }

  if (req.method === 'DELETE') {
    try {
      await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [id] });
      return json({ success: true });
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 500);
    }
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

async function handleHistory(req: Request, env: Env): Promise<Response> {
  const db = getDb(env);

  if (req.method === 'GET') {
    try {
      const res = await db.execute(
        `SELECT id, project_id, created_at, format, quality, photo_count, file_size, destination, settings
         FROM export_history ORDER BY created_at DESC LIMIT 50`
      );
      const history = res.rows.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        created_at: Number(r.created_at),
        format: r.format,
        quality: r.quality,
        photo_count: Number(r.photo_count),
        file_size: r.file_size,
        destination: r.destination,
        settings: r.settings ? JSON.parse(r.settings as string) : null,
      }));
      return json({ success: true, history });
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 500);
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { project_id, format, quality, photo_count, file_size, destination, settings } = body;
      if (!format || !quality) {
        return json({ success: false, error: 'format and quality are required' }, 400);
      }
      const id = uuid();
      const now = Date.now();
      const settingsJson = JSON.stringify(settings || {});
      await db.execute({
        sql: `INSERT INTO export_history
              (id, project_id, created_at, format, quality, photo_count, file_size, destination, settings)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, project_id || null, now, format, quality, photo_count || 0, file_size || null, destination || null, settingsJson],
      });
      return json({ success: true, id });
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 500);
    }
  }

  return json({ success: false, error: 'Method not allowed' }, 405);
}

// ---------- Auth helpers (Worker-side) ----------

function hashPasswordWorker(password: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('node:crypto');
  return createHash('sha256').update(password).digest('hex');
}

function decodeSessionTokenWorker(token: string): { username: string; role: string } | null {
  try {
    const payload = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.username || !payload.role) return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

function requireSuperAdminWorker(req: Request): { username: string; role: string } | null {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/apoy_session=([^;]+)/);
  if (!match) return null;
  const session = decodeSessionTokenWorker(match[1]);
  if (!session || session.role !== 'super_admin') return null;
  return session;
}

async function handleAuthLogin(req: Request, env: Env): Promise<Response> {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return json({ success: false, error: 'Username and password are required' }, 400);
    }
    const db = getDb(env);
    const res = await db.execute({
      sql: 'SELECT id, username, password_hash, role FROM users WHERE username = ?',
      args: [username],
    });
    if (res.rows.length === 0) {
      return json({ success: false, error: 'Invalid username or password' }, 401);
    }
    const user = res.rows[0];
    if (hashPasswordWorker(password) !== user.password_hash) {
      return json({ success: false, error: 'Invalid username or password' }, 401);
    }
    const payload = JSON.stringify({ username: user.username, role: user.role, ts: Date.now(), rand: Math.random() });
    const token = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const response = json({
      success: true,
      user: { username: user.username, role: user.role },
      token,
    });
    response.headers.set('Set-Cookie', `apoy_session=${token}; HttpOnly; SameSite=Lax; Max-Age=604800; Path=/`);
    return response;
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
}

function handleAuthSession(req: Request): Response {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/apoy_session=([^;]+)/);
  if (!match) return json({ success: false, authenticated: false });
  const session = decodeSessionTokenWorker(match[1]);
  if (!session) return json({ success: false, authenticated: false });
  return json({ success: true, authenticated: true, user: session });
}

function handleAuthLogout(): Response {
  const response = json({ success: true });
  response.headers.set('Set-Cookie', 'apoy_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/');
  return response;
}

async function handleUsers(req: Request, env: Env): Promise<Response> {
  if (!requireSuperAdminWorker(req)) {
    return json({ success: false, error: 'Super Admin access required' }, 403);
  }
  const db = getDb(env);
  if (req.method === 'GET') {
    try {
      const res = await db.execute('SELECT id, username, role, created_at FROM users ORDER BY created_at ASC');
      return json({ success: true, users: res.rows.map((r) => ({ id: r.id, username: r.username, role: r.role, created_at: Number(r.created_at) })) });
    } catch (e) { return json({ success: false, error: (e as Error).message }, 500); }
  }
  if (req.method === 'POST') {
    try {
      const { username, password, role } = await req.json();
      if (!username || !password) return json({ success: false, error: 'Username and password are required' }, 400);
      const id = crypto.randomUUID();
      await db.execute({ sql: 'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', args: [id, username, hashPasswordWorker(password), role || 'user', Date.now()] });
      return json({ success: true, user: { id, username, role: role || 'user' } });
    } catch (e) {
      const msg = (e as Error).message;
      return json({ success: false, error: msg.includes('UNIQUE') ? 'Username already exists' : msg }, msg.includes('UNIQUE') ? 409 : 500);
    }
  }
  if (req.method === 'DELETE') {
    try {
      const { id } = await req.json();
      await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
      return json({ success: true });
    } catch (e) { return json({ success: false, error: (e as Error).message }, 500); }
  }
  return json({ success: false, error: 'Method not allowed' }, 405);
}

// ---------- Worker entry ----------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    // Auth routes
    if (path === '/api/auth/login' && req.method === 'POST') return handleAuthLogin(req, env);
    if (path === '/api/auth/session' && req.method === 'GET') return handleAuthSession(req);
    if (path === '/api/auth/logout' && req.method === 'POST') return handleAuthLogout();
    if (path === '/api/users' || path === '/api/users/') return handleUsers(req, env);

    // API routes — handled by this Worker
    if (path === '/api/projects' || path === '/api/projects/') {
      return handleProjects(req, env);
    }
    const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch) {
      return handleProjectItem(req, env, projectMatch[1]);
    }
    if (path === '/api/history' || path === '/api/history/') {
      return handleHistory(req, env);
    }

    // Everything else → serve static assets (the Next.js export)
    // For SPA-style routing, fall back to index.html for non-asset paths.
    return env.ASSETS.fetch(req);
  },
};
