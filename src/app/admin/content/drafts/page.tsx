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
                  <button
                    type="button"
                    popoverTarget={`edit-${draft.id}`}
                    className="h-9 rounded-md border px-3 font-mono text-xs uppercase tracking-wider"
                    style={{ borderColor: "var(--line-soft)", color: "var(--ink)" }}
                  >
                    Edit
                  </button>
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
                <div
                  id={`edit-${draft.id}`}
                  popover="auto"
                  className="m-auto w-[min(720px,calc(100vw-32px))] rounded-md border border-line-soft bg-bg-0 p-5 text-ink shadow-2xl backdrop:bg-black/60"
                >
                  <form data-action="edit" data-id={draft.id} className="flex flex-col gap-4">
                    <div>
                      <div className="font-mono text-xs uppercase tracking-widest text-c-cyan">Edit draft</div>
                      <h2 className="mt-2 text-xl font-semibold">{draft.hook || "Untitled draft"}</h2>
                    </div>
                    <textarea
                      name="body"
                      defaultValue={draft.body}
                      className="min-h-64 resize-y rounded-md border border-line-soft bg-bg-1 p-3 text-sm leading-6 text-ink outline-none focus:border-c-cyan"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        popoverTarget={`edit-${draft.id}`}
                        popoverTargetAction="hide"
                        className="rounded-md border border-line-soft px-3 py-2 font-mono text-xs uppercase tracking-wider text-ink"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wider"
                        style={{ background: "var(--c-cyan)", color: "var(--bg-0)" }}
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <script
        dangerouslySetInnerHTML={{
          __html: `
document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action='edit']");
  if (!form) return;
  event.preventDefault();
  const submit = form.querySelector("button[type='submit']");
  if (submit) submit.disabled = true;
  try {
    const data = new FormData(form);
    const response = await fetch("/api/content/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: form.dataset.id, body: data.get("body") })
    });
    if (!response.ok) throw new Error(await response.text());
    window.location.reload();
  } finally {
    if (submit) submit.disabled = false;
  }
});
          `,
        }}
      />
    </div>
  );
}
