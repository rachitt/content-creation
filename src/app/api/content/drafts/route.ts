import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, type DraftStatus } from "@/lib/db";

const validStatuses: DraftStatus[] = ["draft", "approved", "scheduled", "posted", "killed"];

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const db = getDb();

  if (status) {
    if (!validStatuses.includes(status as DraftStatus)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const drafts = db
      .select()
      .from(schema.drafts)
      .where(eq(schema.drafts.status, status as DraftStatus))
      .orderBy(desc(schema.drafts.createdAt))
      .all();
    return NextResponse.json({ ok: true, drafts });
  }

  const drafts = db.select().from(schema.drafts).orderBy(desc(schema.drafts.createdAt)).all();
  return NextResponse.json({ ok: true, drafts });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { id?: string; body?: string; hook?: string };
  if (!body.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const updates: { body?: string; hook?: string } = {};
  if (typeof body.body === "string") updates.body = body.body;
  if (typeof body.hook === "string") updates.hook = body.hook;
  if (!updates.body && !updates.hook) {
    return NextResponse.json({ ok: false, error: "body or hook required" }, { status: 400 });
  }

  const result = getDb().update(schema.drafts).set(updates).where(eq(schema.drafts.id, body.id)).run();
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/drafts");
  return NextResponse.json({ ok: result.changes > 0 });
}
