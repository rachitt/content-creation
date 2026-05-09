import { NextResponse } from "next/server";
import { getDb, newId, schema } from "@/lib/db";
import { repurpose } from "@/lib/content/repurpose";

function hookFor(body: string): string {
  return body.split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 180) ?? "Repurposed draft";
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: unknown; sourceType?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const sourceType = typeof body.sourceType === "string" && body.sourceType.trim() ? body.sourceType.trim() : "source";

  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const result = await repurpose(text, sourceType);
  const drafts = [
    ...result.liPosts.map((draftBody) => ({ channel: "linkedin" as const, body: draftBody })),
    ...result.xPosts.map((draftBody) => ({ channel: "x" as const, body: draftBody })),
    ...result.xThreads.map((thread) => ({ channel: "x" as const, body: thread.join("\n\n") })),
  ].filter((draft) => draft.body.trim());

  const inserted = drafts.length
    ? await getDb()
        .insert(schema.drafts)
        .values(
          drafts.map((draft) => ({
            id: newId("draft"),
            channel: draft.channel,
            body: draft.body,
            hook: hookFor(draft.body),
            cta: "",
            status: "draft" as const,
          })),
        )
        .returning()
    : [];

  return NextResponse.json({ result, drafts: inserted });
}
