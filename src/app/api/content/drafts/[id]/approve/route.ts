import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const result = db.update(schema.drafts).set({ status: "approved" }).where(eq(schema.drafts.id, id)).run();

  revalidatePath("/admin/content");
  revalidatePath("/admin/content/drafts");

  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  if (acceptsHtml) return NextResponse.redirect(new URL("/admin/content/drafts", request.url), 303);
  return NextResponse.json({ ok: result.changes > 0 });
}
