import { NextRequest, NextResponse } from 'next/server';
import { d1Query, d1Exec } from '@/lib/d1';
function isWriteBlocked(e: unknown): boolean { return (e as Error).message?.includes('blocked'); }
export async function GET() {
  try {
    const rows = await d1Query('SELECT id, project_id, created_at, format, quality, photo_count, file_size, destination, settings FROM export_history ORDER BY created_at DESC LIMIT 50');
    return NextResponse.json({ success: true, history: rows.map(r => ({ ...r, created_at: Number(r.created_at), photo_count: Number(r.photo_count), settings: r.settings ? JSON.parse(r.settings as string) : null })) });
  } catch (e) { return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const { project_id, format, quality, photo_count, file_size, destination, settings } = await req.json();
    if (!format || !quality) return NextResponse.json({ success: false, error: 'format and quality are required' }, { status: 400 });
    const id = crypto.randomUUID();
    const now = Date.now();
    await d1Exec('INSERT INTO export_history (id, project_id, created_at, format, quality, photo_count, file_size, destination, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, project_id || null, now, format, quality, photo_count || 0, file_size || null, destination || null, JSON.stringify(settings || {})]);
    return NextResponse.json({ success: true, id });
  } catch (e) {
    if (isWriteBlocked(e)) return NextResponse.json({ success: false, error: 'Database read-only', writeBlocked: true }, { status: 503 });
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
