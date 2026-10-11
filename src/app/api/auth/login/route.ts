import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';
import { verifyPassword, createSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    const db = getTurso();
    const res = await db.execute({ sql: 'SELECT id, username, password_hash, role FROM users WHERE username = ?', args: [username] });
    if (res.rows.length === 0) return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    const user = res.rows[0];
    if (!verifyPassword(password, user.password_hash as string)) return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    const token = createSessionToken(user.username as string, user.role as string);
    const response = NextResponse.json({ success: true, user: { username: user.username, role: user.role }, token });
    response.cookies.set('apoy_session', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 604800, path: '/' });
    return response;
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
