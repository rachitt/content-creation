import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb, schema, type IdeaStatus } from "@/lib/db";

type IdeasPageProps = {
  searchParams?: Promise<{
    status?: string;
    source?: string;
  }>;
};

const STATUSES: IdeaStatus[] = ["new", "selected", "drafted", "killed"];

function excerpt(value: string): string {
  return value.length > 260 ? `${value.slice(0, 257)}...` : value;
}

function statusFilter(value?: string): IdeaStatus | undefined {
  return STATUSES.includes(value as IdeaStatus) ? (value as IdeaStatus) : undefined;
}

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  const params = (await searchParams) ?? {};
  const status = statusFilter(params.status);
  const source = params.source?.trim();
  const filters: SQL[] = [];
  if (status) filters.push(eq(schema.ideas.status, status));
  if (source) filters.push(eq(schema.ideas.source, source));

  const ideas = await getDb()
    .select()
    .from(schema.ideas)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.ideas.score));

  return (
    <main className="min-h-screen bg-bg-0 px-6 py-8 text-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b pb-5" style={{ borderColor: "var(--line-soft)" }}>
          <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--c-cyan)" }}>
            content radar
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Idea Inbox</h1>
              <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--ink-dim)" }}>
                Review scored market signals from HN, Reddit, and manual captures.
              </p>
            </div>
            <form className="flex flex-wrap gap-3">
              <select
                name="status"
                defaultValue={status ?? ""}
                className="h-10 rounded-md border bg-bg-1 px-3 text-sm"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <option value="">All statuses</option>
                {STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                name="source"
                defaultValue={source ?? ""}
                placeholder="source"
                className="h-10 rounded-md border bg-bg-1 px-3 text-sm"
                style={{ borderColor: "var(--line-soft)" }}
              />
              <button
                className="h-10 rounded-md px-4 font-mono text-xs uppercase tracking-wider"
                style={{ background: "var(--c-cyan)", color: "var(--bg-0)" }}
              >
                Filter
              </button>
            </form>
          </div>
        </header>

        <section className="overflow-hidden rounded-md border" style={{ borderColor: "var(--line-soft)" }}>
          <div
            className="grid grid-cols-[1fr_120px_90px_110px_190px] gap-4 border-b px-4 py-3 font-mono text-xs uppercase tracking-wider"
            style={{ borderColor: "var(--line-soft)", color: "var(--ink-dim)" }}
          >
            <div>Idea</div>
            <div>Source</div>
            <div>Score</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {ideas.length === 0 ? (
            <div className="px-4 py-10 text-sm" style={{ color: "var(--ink-dim)" }}>
              No ideas match these filters.
            </div>
          ) : (
            ideas.map((idea) => (
              <div
                key={idea.id}
                className="grid grid-cols-1 gap-4 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1fr_120px_90px_110px_190px]"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap text-sm leading-6">{excerpt(idea.raw)}</p>
                  <p className="mt-2 break-all font-mono text-[11px]" style={{ color: "var(--ink-dim)" }}>
                    {idea.id}
                  </p>
                </div>
                <div className="font-mono text-xs" style={{ color: "var(--c-blue)" }}>
                  {idea.source}
                </div>
                <div className="font-mono text-sm">{idea.score}</div>
                <div className="font-mono text-xs uppercase" style={{ color: "var(--c-green)" }}>
                  {idea.status}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <form action={`/api/content/ideas/${idea.id}/select`} method="post">
                    <button
                      className="h-9 rounded-md border px-3 font-mono text-xs uppercase"
                      style={{ borderColor: "var(--line-soft)", color: "var(--ink)" }}
                    >
                      Select
                    </button>
                  </form>
                  <form action={`/api/content/ideas/${idea.id}/forge`} method="post">
                    <button
                      className="h-9 rounded-md px-3 font-mono text-xs uppercase"
                      style={{ background: "var(--c-orange)", color: "var(--bg-0)" }}
                    >
                      Forge Draft
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
