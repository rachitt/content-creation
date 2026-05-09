import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const idea = await db.query.ideas.findFirst({ where: eq(schema.ideas.id, id) });

  if (!idea) return NextResponse.json({ error: "idea not found" }, { status: 404 });

  const response = await fetch(new URL("/api/content/generate", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: idea.raw, channel: "linkedin", format: "single" }),
  });

  const result = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) return NextResponse.json({ error: "generate failed", detail: result }, { status: response.status });

  const [updated] = await db
    .update(schema.ideas)
    .set({ status: "drafted" })
    .where(eq(schema.ideas.id, id))
    .returning();

  return NextResponse.json({ idea: updated, result });
}
