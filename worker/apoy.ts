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

// ---------- Worker entry ----------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

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
