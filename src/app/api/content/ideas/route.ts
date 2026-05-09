import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, newId, schema, type IdeaStatus } from "@/lib/db";
import { extractKeywords, scoreIdea } from "@/lib/content/radar";

const STATUSES = new Set<IdeaStatus>(["new", "selected", "drafted", "killed"]);

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
}

async function loadKeywords(): Promise<string[]> {
  const icpText = await fs.readFile(path.resolve(process.cwd(), "src/content/brand/icp.md"), "utf8");
  return extractKeywords(icpText);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const filters: SQL[] = [];
  if (status && STATUSES.has(status as IdeaStatus)) filters.push(eq(schema.ideas.status, status as IdeaStatus));
  if (source) filters.push(eq(schema.ideas.source, source));

  const db = getDb();
  const ideas = await db
    .select()
    .from(schema.ideas)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.ideas.score));

  return NextResponse.json({ ideas });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: unknown; source?: unknown; url?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "manual";
  const url = typeof body.url === "string" && body.url.trim() ? body.url.trim() : "";

  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const score = scoreIdea(`${text}\n${url}`, await loadKeywords());
  const id = url ? `idea_${hashUrl(url)}` : newId("idea");
  const raw = [text, url].filter(Boolean).join("\n\n");
  const [idea] = await getDb()
    .insert(schema.ideas)
    .values({ id, source, raw, score, status: "new" })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ idea: idea ?? null, id }, { status: 201 });
}
