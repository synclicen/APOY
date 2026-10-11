import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET /api/history — list export history (newest first)
export async function GET() {
  try {
    const db = getTurso();
    const res = await db.execute(
      `SELECT id, project_id, created_at, format, quality, photo_count, file_size, destination, settings
       FROM export_history ORDER BY created_at DESC LIMIT 50`
    );
    const history = res.rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      created_at: r.created_at,
      format: r.format,
      quality: r.quality,
      photo_count: r.photo_count,
      file_size: r.file_size,
      destination: r.destination,
      settings: r.settings ? JSON.parse(r.settings as string) : null,
    }));
    return NextResponse.json({ success: true, history });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/history — record a new export
export async function POST(req: NextRequest) {
  try {
    const db = getTurso();
    const body = await req.json();
    const {
      project_id,
      format,
      quality,
      photo_count,
      file_size,
      destination,
      settings,
    } = body;

    if (!format || !quality) {
      return NextResponse.json(
        { success: false, error: 'format and quality are required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const settingsJson = JSON.stringify(settings || {});

    await db.execute({
      sql: `INSERT INTO export_history
            (id, project_id, created_at, format, quality, photo_count, file_size, destination, settings)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        project_id || null,
        now,
        format,
        quality,
        photo_count || 0,
        file_size || null,
        destination || null,
        settingsJson,
      ],
    });

    return NextResponse.json({ success: true, id });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
