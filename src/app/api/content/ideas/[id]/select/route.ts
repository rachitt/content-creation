import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const [idea] = await getDb()
    .update(schema.ideas)
    .set({ status: "selected" })
    .where(eq(schema.ideas.id, id))
    .returning();

  if (!idea) return NextResponse.json({ error: "idea not found" }, { status: 404 });
  return NextResponse.json({ idea });
}
