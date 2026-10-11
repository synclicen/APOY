import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';
import { hashPassword, decodeSessionToken } from '@/lib/auth';
function requireSuperAdmin(req: NextRequest) {
  const token = req.cookies.get('apoy_session')?.value;
  if (!token) return null;
  const s = decodeSessionToken(token);
  return s && s.role === 'super_admin' ? s : null;
}
export async function GET(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ success: false, error: 'Super Admin access required' }, { status: 403 });
  try {
    const db = getTurso();
    const res = await db.execute('SELECT id, username, role, created_at FROM users ORDER BY created_at ASC');
    return NextResponse.json({ success: true, users: res.rows.map(r => ({ id: r.id, username: r.username, role: r.role, created_at: Number(r.created_at) })) });
  } catch (e) { return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ success: false, error: 'Super Admin access required' }, { status: 403 });
  try {
    const { username, password, role } = await req.json();
    if (!username || !password) return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    const db = getTurso();
    const id = crypto.randomUUID();
    await db.execute({ sql: 'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)', args: [id, username, hashPassword(password), role || 'user', Date.now()] });
    return NextResponse.json({ success: true, user: { id, username, role: role || 'user' } });
  } catch (e) {
    const m = (e as Error).message;
    return NextResponse.json({ success: false, error: m.includes('UNIQUE') ? 'Username already exists' : m }, m.includes('UNIQUE') ? { status: 409 } : { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  if (!requireSuperAdmin(req)) return NextResponse.json({ success: false, error: 'Super Admin access required' }, { status: 403 });
  try {
    const { id } = await req.json();
    const db = getTurso();
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 }); }
}
