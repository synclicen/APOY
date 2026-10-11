import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET /api/projects — list all saved projects (newest first)
export async function GET() {
  try {
    const db = getTurso();
    const res = await db.execute(
      'SELECT id, name, created_at, updated_at, photo_count, settings FROM projects ORDER BY updated_at DESC'
    );
    const projects = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      updated_at: r.updated_at,
      photo_count: r.photo_count,
      settings: r.settings ? JSON.parse(r.settings as string) : null,
    }));
    return NextResponse.json({ success: true, projects });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/projects — save a new project (or update if id exists)
export async function POST(req: NextRequest) {
  try {
    const db = getTurso();
    const body = await req.json();
    const { id, name, photo_count, settings } = body;

    if (!name || !settings) {
      return NextResponse.json(
        { success: false, error: 'name and settings are required' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const projectId = id || crypto.randomUUID();
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

    return NextResponse.json({
      success: true,
      project: { id: projectId, name, updated_at: now },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
