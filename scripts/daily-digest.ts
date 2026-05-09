import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { getDb, schema } from "@/lib/db";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function excerpt(value: string): string {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.OPERATOR_EMAIL;
  const from = process.env.RESEND_FROM ?? "hello@enigmalabs.com";

  if (!apiKey || !to) {
    console.log("[digest] skipped: RESEND_API_KEY and OPERATOR_EMAIL are required");
    return;
  }

  const db = getDb();
  const ideas = await db
    .select()
    .from(schema.ideas)
    .where(eq(schema.ideas.status, "new"))
    .orderBy(desc(schema.ideas.score))
    .limit(5);

  const isoDate = new Date().toISOString().slice(0, 10);
  const subject = `Daily Content Radar — ${isoDate}`;
  const text =
    ideas.length === 0
      ? "No new ideas above threshold today."
      : ideas
          .map((idea, index) => `${index + 1}. [${idea.source}] score ${idea.score}\n${excerpt(idea.raw)}`)
          .join("\n\n");
  const html =
    ideas.length === 0
      ? "<p>No new ideas above threshold today.</p>"
      : `<ol>${ideas
          .map(
            (idea) =>
              `<li><p><strong>${escapeHtml(idea.source)}</strong> score ${idea.score}</p><pre>${escapeHtml(
                excerpt(idea.raw),
              )}</pre></li>`,
          )
          .join("")}</ol>`;

  await new Resend(apiKey).emails.send({ from, to, subject, text, html });
  console.log(`[digest] sent ${ideas.length} ideas to ${to}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
