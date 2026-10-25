import { createClient, type Client } from '@libsql/client';

/**
 * Turso (libSQL) database client.
 *
 * Used by the APOY app to persist:
 *  - Saved projects (a named bundle of photos + analysis/export settings)
 *  - Export history (a log of every export performed)
 *
 * The connection is edge-compatible, so the same module works inside the
 * Next.js dev server AND inside a Cloudflare Worker.
 */
let _client: Client | null = null;

export function getTurso(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }

  _client = createClient({ url, authToken });
  return _client;
}

export interface ProjectRow {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  photo_count: number;
  settings: string; // JSON string of AnalysisSettings + photo metadata
}

export interface HistoryRow {
  id: string;
  project_id: string | null;
  created_at: number;
  format: string;
  quality: string;
  photo_count: number;
  file_size: string | null;
  destination: string | null;
  settings: string; // JSON snapshot of AnalysisSettings
}
