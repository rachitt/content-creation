import { NextResponse } from "next/server";
import { and, desc, eq, gte, type SQL } from "drizzle-orm";
import { getDb, schema, type Platform } from "@/lib/db";

function parsePlatform(value: string | null): Platform | undefined {
  return value === "linkedin" || value === "x" ? value : undefined;
}

function parseMinLikes(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = parsePlatform(url.searchParams.get("platform"));
  const cluster = url.searchParams.get("cluster") || undefined;
  const minLikes = parseMinLikes(url.searchParams.get("minLikes"));
  const conditions: SQL[] = [];
  if (platform) conditions.push(eq(schema.viralPosts.platform, platform));
  if (cluster) conditions.push(eq(schema.viralPosts.clusterId, cluster));
  if (minLikes !== undefined) conditions.push(gte(schema.viralPosts.likes, minLikes));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const db = getDb();
  const query = db.select().from(schema.viralPosts);
  const posts = whereClause
    ? await query.where(whereClause).orderBy(desc(schema.viralPosts.likes)).limit(50)
    : await query.orderBy(desc(schema.viralPosts.likes)).limit(50);

  return NextResponse.json({ posts });
}
