import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema, type IdeaStatus } from "@/lib/db";

const STATUSES = new Set<IdeaStatus>(["new", "selected", "drafted", "killed"]);

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { status?: unknown };
  const status = typeof body.status === "string" ? body.status : "";

  if (!STATUSES.has(status as IdeaStatus)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const [idea] = await getDb()
    .update(schema.ideas)
    .set({ status: status as IdeaStatus })
    .where(eq(schema.ideas.id, id))
    .returning();

  if (!idea) return NextResponse.json({ error: "idea not found" }, { status: 404 });
  return NextResponse.json({ idea });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const [idea] = await getDb().delete(schema.ideas).where(eq(schema.ideas.id, id)).returning();

  if (!idea) return NextResponse.json({ error: "idea not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
