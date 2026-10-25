import { NextRequest, NextResponse } from 'next/server';
import { decodeSessionToken } from '@/lib/auth';
export async function GET(req: NextRequest) {
  const token = req.cookies.get('apoy_session')?.value;
  if (!token) return NextResponse.json({ success: false, authenticated: false });
  const session = decodeSessionToken(token);
  if (!session) return NextResponse.json({ success: false, authenticated: false });
  return NextResponse.json({ success: true, authenticated: true, user: session });
}
