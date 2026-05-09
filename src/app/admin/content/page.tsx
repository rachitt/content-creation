import { count, desc } from "drizzle-orm";
import { getDb, schema, type DraftStatus } from "@/lib/db";

const statuses: DraftStatus[] = ["draft", "approved", "scheduled", "posted", "killed"];

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ContentPipelinePage() {
  const db = getDb();
  const counts = db
    .select({ status: schema.drafts.status, count: count() })
    .from(schema.drafts)
    .groupBy(schema.drafts.status)
    .all();
  const countByStatus = new Map(counts.map((row) => [row.status, row.count]));
  const drafts = db.select().from(schema.drafts).orderBy(desc(schema.drafts.createdAt)).limit(10).all();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-c-cyan">Pipeline</p>
        <h1 className="mt-2 text-3xl font-semibold">Content operations</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statuses.map((status) => (
          <div key={status} className="rounded-md border bg-bg-1 p-4" style={{ borderColor: "var(--line-soft)" }}>
            <div className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--ink-dim)" }}>
              {status}
            </div>
            <div className="mt-4 text-3xl font-semibold text-c-cyan">{countByStatus.get(status) ?? 0}</div>
          </div>
        ))}
      </section>

      <section className="rounded-md border bg-bg-1" style={{ borderColor: "var(--line-soft)" }}>
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--line-soft)" }}>
          <h2 className="font-mono text-sm uppercase tracking-widest">Last 10 drafts</h2>
        </div>
        {drafts.length === 0 ? (
          <div className="px-4 py-8 text-sm" style={{ color: "var(--ink-dim)" }}>
            No drafts yet.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line-soft)" }}>
            {drafts.map((draft) => (
              <div key={draft.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_110px_120px_150px]">
                <div className="min-w-0">
                  <div className="truncate font-medium">{draft.hook}</div>
                  <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--ink-dim)" }}>
                    {draft.body}
                  </p>
                </div>
                <div className="font-mono text-xs uppercase text-c-cyan">{draft.channel}</div>
                <div className="font-mono text-xs uppercase" style={{ color: "var(--ink-dim)" }}>
                  {draft.status}
                </div>
                <div className="text-sm" style={{ color: "var(--ink-dim)" }}>
                  {formatDate(draft.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
