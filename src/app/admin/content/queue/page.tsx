import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getDb, schema, type Draft } from "@/lib/db";

const DAY_MS = 86_400_000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatDay(value: number) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(value),
  );
}

function formatTime(value: number | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function QueuePage() {
  const db = getDb();
  const now = Date.now();
  const start = startOfDay(new Date(now));
  const end = start + 14 * DAY_MS;
  const drafts = db
    .select()
    .from(schema.drafts)
    .where(and(eq(schema.drafts.status, "scheduled"), gte(schema.drafts.scheduledAt, now), lt(schema.drafts.scheduledAt, end)))
    .orderBy(asc(schema.drafts.scheduledAt))
    .limit(100)
    .all();

  const byDay = new Map<number, Draft[]>();
  for (const draft of drafts) {
    if (!draft.scheduledAt) continue;
    const day = startOfDay(new Date(draft.scheduledAt));
    byDay.set(day, [...(byDay.get(day) ?? []), draft]);
  }

  const days = Array.from({ length: 14 }, (_, index) => start + index * DAY_MS);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-c-cyan">Queue</p>
        <h1 className="mt-2 text-3xl font-semibold">Next 14 days</h1>
      </header>

      {drafts.length === 0 ? (
        <section className="rounded-md border bg-bg-1 px-4 py-8 text-sm" style={{ borderColor: "var(--line-soft)", color: "var(--ink-dim)" }}>
          No scheduled posts in the next 14 days.
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((day) => (
            <div key={day} className="min-h-48 rounded-md border bg-bg-1" style={{ borderColor: "var(--line-soft)" }}>
              <div className="border-b px-3 py-2 font-mono text-xs uppercase tracking-wider text-c-cyan" style={{ borderColor: "var(--line-soft)" }}>
                {formatDay(day)}
              </div>
              <div className="space-y-2 p-3">
                {(byDay.get(day) ?? []).length === 0 ? (
                  <div className="text-xs" style={{ color: "var(--ink-dim)" }}>
                    Empty
                  </div>
                ) : (
                  byDay.get(day)?.map((draft) => (
                    <article key={draft.id} className="rounded border p-2" style={{ borderColor: "var(--line-soft)" }}>
                      <div className="font-mono text-[11px] uppercase text-c-cyan">
                        {formatTime(draft.scheduledAt)} / {draft.channel}
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm">{draft.hook}</div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
