import { NextRequest, NextResponse } from 'next/server';
import { d1Query, d1Exec } from '@/lib/d1';
function isWriteBlocked(e: unknown): boolean { return (e as Error).message?.includes('blocked'); }
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await d1Query('SELECT id, name, created_at, updated_at, photo_count, settings FROM projects WHERE id = ?', [id]);
    if (rows.length === 0) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    const r = rows[0];
    return NextResponse.json({ success: true, project: { ...r, created_at: Number(r.created_at), updated_at: Number(r.updated_at), photo_count: Number(r.photo_count), settings: r.settings ? JSON.parse(r.settings as string) : null } });
  } catch (e) { return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 }); }
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await d1Exec('DELETE FROM projects WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (isWriteBlocked(e)) return NextResponse.json({ success: false, error: 'Database read-only', writeBlocked: true }, { status: 503 });
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
