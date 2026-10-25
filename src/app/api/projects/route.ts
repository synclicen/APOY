import { NextRequest, NextResponse } from 'next/server';
import { d1Query, d1Exec } from '@/lib/d1';
function isWriteBlocked(e: unknown): boolean { return (e as Error).message?.includes('blocked'); }
export async function GET() {
  try {
    const rows = await d1Query('SELECT id, name, created_at, updated_at, photo_count, settings FROM projects ORDER BY updated_at DESC');
    return NextResponse.json({ success: true, projects: rows.map(r => ({ ...r, created_at: Number(r.created_at), updated_at: Number(r.updated_at), photo_count: Number(r.photo_count), settings: r.settings ? JSON.parse(r.settings as string) : null })) });
  } catch (e) { return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const { id, name, photo_count, settings } = await req.json();
    if (!name || !settings) return NextResponse.json({ success: false, error: 'name and settings are required' }, { status: 400 });
    const now = Date.now();
    const projectId = id || crypto.randomUUID();
    await d1Exec('INSERT INTO projects (id, name, created_at, updated_at, photo_count, settings) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, photo_count = excluded.photo_count, settings = excluded.settings', [projectId, name, now, now, photo_count || 0, JSON.stringify(settings)]);
    return NextResponse.json({ success: true, project: { id: projectId, name, updated_at: now } });
  } catch (e) {
    if (isWriteBlocked(e)) return NextResponse.json({ success: false, error: 'Database read-only', writeBlocked: true }, { status: 503 });
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
