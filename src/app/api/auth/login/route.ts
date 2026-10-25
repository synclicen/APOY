import { NextRequest, NextResponse } from 'next/server';
import { d1Query } from '@/lib/d1';
import { hashPassword, createSessionToken } from '@/lib/auth';
function isWriteBlocked(e: unknown): boolean { return (e as Error).message?.includes('blocked'); }
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    const rows = await d1Query('SELECT id, username, password_hash, role FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    const user = rows[0];
    if (hashPassword(password) !== user.password_hash) return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    const token = createSessionToken(user.username as string, user.role as string);
    const response = NextResponse.json({ success: true, user: { username: user.username, role: user.role }, token });
    response.cookies.set('apoy_session', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 604800, path: '/' });
    return response;
  } catch (e) {
    if (isWriteBlocked(e)) return NextResponse.json({ success: false, error: 'Database read-only', writeBlocked: true }, { status: 503 });
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
