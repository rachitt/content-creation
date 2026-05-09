import { and, desc, eq, gte, type SQL } from "drizzle-orm";
import { getDb, schema, type Platform } from "@/lib/db";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePlatform(value: string | undefined): Platform | undefined {
  return value === "linkedin" || value === "x" ? value : undefined;
}

function parseMinLikes(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function ViralPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const platform = parsePlatform(firstParam(params.platform));
  const cluster = firstParam(params.cluster);
  const minLikes = parseMinLikes(firstParam(params.minLikes));
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

  return (
    <main className="min-h-screen bg-[var(--bg-0)] px-6 py-10 text-[var(--ink)]">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--line-soft)] pb-6">
          <p className="text-sm uppercase tracking-[0.16em] text-[var(--c-cyan)]">Content Engine</p>
          <h1 className="text-3xl font-semibold">Viral Mine</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--ink-dim)]">
            Top mined posts from ICP-adjacent LinkedIn and X creators, sorted by likes.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--bg-1)]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-[var(--line-soft)] text-xs uppercase tracking-[0.12em] text-[var(--ink-dim)]">
              <tr>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Excerpt</th>
                <th className="px-4 py-3 text-right font-medium">Likes</th>
                <th className="px-4 py-3 text-right font-medium">Comments</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-[var(--line-soft)] last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-4 align-top">
                    <div className="font-medium text-[var(--ink)]">{post.author}</div>
                    <div className="mt-1 text-xs text-[var(--ink-dim)]">{post.platform}</div>
                  </td>
                  <td className="max-w-3xl px-4 py-4 align-top leading-6 text-[var(--ink)]">
                    {post.body.length > 240 ? `${post.body.slice(0, 240)}...` : post.body}
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums text-[var(--c-cyan)]">
                    {post.likes.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right align-top tabular-nums">
                    {post.comments.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <a
                      className="text-[var(--c-cyan)] underline decoration-[var(--line-soft)] underline-offset-4 hover:text-[var(--brand-ice)]"
                      href={post.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))}
              {posts.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[var(--ink-dim)]" colSpan={5}>
                    No viral posts match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
