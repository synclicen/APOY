import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET /api/projects/[id] — load a single project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getTurso();
    const res = await db.execute({
      sql: 'SELECT id, name, created_at, updated_at, photo_count, settings FROM projects WHERE id = ?',
      args: [id],
    });
    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    const r = res.rows[0];
    return NextResponse.json({
      success: true,
      project: {
        id: r.id,
        name: r.name,
        created_at: r.created_at,
        updated_at: r.updated_at,
        photo_count: r.photo_count,
        settings: r.settings ? JSON.parse(r.settings as string) : null,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] — delete a project
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getTurso();
    await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
