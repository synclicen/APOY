import { NextRequest, NextResponse } from 'next/server';
import { d1Query, d1Exec } from '@/lib/d1';
import { hashPassword, decodeSessionToken } from '@/lib/auth';
function requireSuperAdmin(req: NextRequest) {
  const token = req.cookies.get('apoy_session')?.value;
  if (!token) return null;
  const s = decodeSessionToken(token);
  return s && s.role === 'super_admin' ? s : null;
}
function isWriteBlocked(e: unknown): boolean { return (e as Error).message?.includes('blocked'); }
export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ success: false, error: 'Super Admin access required' }, { status: 403 });
  try {
    const rows = await d1Query('SELECT id, username, role, created_at FROM users ORDER BY created_at ASC');
    return NextResponse.json({ success: true, users: rows.map(r => ({ ...r, created_at: Number(r.created_at) })) });
  } catch (e) { return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ success: false, error: 'Super Admin access required' }, { status: 403 });
  try {
    const { username, password, role } = await req.json();
    if (!username || !password) return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    const id = crypto.randomUUID();
    await d1Exec('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', [id, username, hashPassword(password), role || 'user', Date.now()]);
    return NextResponse.json({ success: true, user: { id, username, role: role || 'user' } });
  } catch (e) {
    if (isWriteBlocked(e)) return NextResponse.json({ success: false, error: 'Database read-only', writeBlocked: true }, { status: 503 });
    const m = (e as Error).message;
    return NextResponse.json({ success: false, error: m.includes('UNIQUE') ? 'Username already exists' : m }, m.includes('UNIQUE') ? { status: 409 } : { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ success: false, error: 'Super Admin access required' }, { status: 403 });
  try {
    const { id } = await req.json();
    await d1Exec('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (isWriteBlocked(e)) return NextResponse.json({ success: false, error: 'Database read-only', writeBlocked: true }, { status: 503 });
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
