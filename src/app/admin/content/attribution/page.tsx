import { getDb, schema } from "@/lib/db";

type EventCounts = {
  view: number;
  click: number;
  book: number;
};

export default function AttributionPage() {
  const db = getDb();
  const posts = db.select().from(schema.posts).all();
  const attribution = db.select().from(schema.attribution).all();
  const countsByPost = new Map<string, EventCounts>();

  for (const event of attribution) {
    const counts = countsByPost.get(event.postId) ?? { view: 0, click: 0, book: 0 };
    counts[event.eventType] += 1;
    countsByPost.set(event.postId, counts);
  }

  const rows = posts
    .map((post) => {
      const counts = countsByPost.get(post.id) ?? { view: 0, click: 0, book: 0 };
      const conversion = counts.view === 0 ? 0 : (counts.book / counts.view) * 100;

      return { post, counts, conversion };
    })
    .sort((a, b) => b.conversion - a.conversion);

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10" style={{ background: "var(--bg-0)", color: "var(--ink)" }}>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--c-cyan)" }}>
            Content attribution
          </div>
          <h1 className="mt-3 text-3xl font-semibold">Lead Capture Leaderboard</h1>
        </div>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--line-soft)" }}>
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead style={{ color: "var(--ink-dim)" }}>
              <tr className="border-b" style={{ borderColor: "var(--line-soft)" }}>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider">Post URL</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider">Channel</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider">Views</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider">Clicks</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider">Books</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider">Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ post, counts, conversion }) => (
                <tr key={post.id} className="border-b last:border-b-0" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="max-w-md px-4 py-3">
                    <a className="break-words underline-offset-4 hover:underline" href={post.url}>
                      {post.url}
                    </a>
                  </td>
                  <td className="px-4 py-3">{post.channel}</td>
                  <td className="px-4 py-3">{counts.view}</td>
                  <td className="px-4 py-3">{counts.click}</td>
                  <td className="px-4 py-3">{counts.book}</td>
                  <td className="px-4 py-3">{conversion.toFixed(1)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={6} style={{ color: "var(--ink-dim)" }}>
                    No posts tracked yet.
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
