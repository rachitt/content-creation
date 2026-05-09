import { desc, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

function preview(text: string) {
  return text.length > 200 ? `${text.slice(0, 197)}...` : text;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DraftsPage() {
  const db = getDb();
  const drafts = db
    .select()
    .from(schema.drafts)
    .where(inArray(schema.drafts.status, ["draft", "approved"]))
    .orderBy(desc(schema.drafts.createdAt))
    .limit(50)
    .all();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-c-cyan">Drafts</p>
        <h1 className="mt-2 text-3xl font-semibold">Review queue</h1>
      </header>

      <section className="rounded-md border bg-bg-1" style={{ borderColor: "var(--line-soft)" }}>
        {drafts.length === 0 ? (
          <div className="px-4 py-8 text-sm" style={{ color: "var(--ink-dim)" }}>
            No draft or approved posts.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line-soft)" }}>
            {drafts.map((draft) => (
              <div key={draft.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_100px_1.4fr_110px_150px_190px]">
                <div className="min-w-0 font-medium">{draft.hook}</div>
                <div className="font-mono text-xs uppercase text-c-cyan">{draft.channel}</div>
                <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
                  {preview(draft.body)}
                </p>
                <div className="font-mono text-xs uppercase" style={{ color: "var(--ink-dim)" }}>
                  {draft.status}
                </div>
                <div className="text-sm" style={{ color: "var(--ink-dim)" }}>
                  {formatDate(draft.createdAt)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={`/api/content/drafts/${draft.id}/approve`} method="post">
                    <button
                      type="submit"
                      className="h-9 rounded-md border px-3 font-mono text-xs uppercase tracking-wider"
                      style={{ borderColor: "var(--line-soft)", color: "var(--ink)" }}
                    >
                      Approve
                    </button>
                  </form>
                  <form action="/api/content/schedule" method="post">
                    <input type="hidden" name="draftId" value={draft.id} />
                    <button
                      type="submit"
                      className="h-9 rounded-md px-3 font-mono text-xs uppercase tracking-wider"
                      style={{ background: "var(--c-cyan)", color: "var(--bg-0)" }}
                    >
                      Schedule
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
