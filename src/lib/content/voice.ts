import fs from "node:fs/promises";
import path from "node:path";
import { eq, desc, asc } from "drizzle-orm";
import { getDb, newId, parseJson, schema, stringifyJson, type Platform, type Template } from "@/lib/db";
import { runClaude } from "./claude";

export type ForgeChannel = "linkedin" | "x";
export type ForgeFormat = "single" | "thread";

export type BrandSource = {
  brand: string;
  samples: string;
  icp: string;
};

export type ForgePromptInput = {
  topic: string;
  channel: ForgeChannel;
  format: ForgeFormat;
  template: Template | null;
  viralSourceTexts: string[];
  recentDraftBodies: string[];
};

export type ForgeVariant = {
  hook: string;
  body: string;
  cta: string;
};

export type GenerateDraftInput = {
  topic: string;
  channel: ForgeChannel;
  format: ForgeFormat;
};

const brandDir = path.resolve(process.cwd(), "src/content/brand");
let cachedBrand: BrandSource | null = null;

export async function loadBrand(): Promise<BrandSource> {
  const [brand, samples, icp] = await Promise.all([
    fs.readFile(path.join(brandDir, "BRAND.md"), "utf8"),
    fs.readFile(path.join(brandDir, "voice-samples.md"), "utf8"),
    fs.readFile(path.join(brandDir, "icp.md"), "utf8"),
  ]);

  cachedBrand = { brand, samples, icp };
  return cachedBrand;
}

export function buildForgePrompt(input: ForgePromptInput): string {
  const templateBlock = input.template
    ? [
        `Template ID: ${input.template.id}`,
        `Archetype: ${input.template.archetype}`,
        `Structure: ${input.template.structure}`,
        `Hook examples: ${parseJson<string[]>(input.template.hookExamples, []).join(" | ") || "none"}`,
        `Transitions: ${parseJson<string[]>(input.template.transitionExamples, []).join(" | ") || "none"}`,
      ].join("\n")
    : defaultTemplate(input.channel, input.format);

  const sourceBlock = input.viralSourceTexts.length
    ? input.viralSourceTexts.map((text, i) => `Source ${i + 1}:\n${text}`).join("\n\n")
    : "No source posts available. Use only the brand voice and ICP.";

  const recentBlock = input.recentDraftBodies.length
    ? input.recentDraftBodies.map((text, i) => `Recent draft ${i + 1}:\n${text}`).join("\n\n")
    : "No recent drafts available.";

  return [
    "You are writing social content for Enigma Labs.",
    "Return only valid JSON, no markdown fences, no commentary.",
    'Shape: [{"hook":"...","body":"...","cta":"..."},{"hook":"...","body":"...","cta":"..."},{"hook":"...","body":"...","cta":"..."}]',
    "",
    `Topic: ${input.topic}`,
    `Channel: ${input.channel}`,
    `Format: ${input.format}`,
    "",
    "Brand contract:",
    cachedBrand?.brand ?? "Brand contract was not preloaded. Use Enigma Labs voice: direct, technical, anti-hype.",
    "",
    "Voice samples:",
    cachedBrand?.samples ?? "No voice samples preloaded.",
    "",
    "ICP:",
    cachedBrand?.icp ?? "No ICP document preloaded.",
    "",
    input.template ? "Use the provided template without copying the sources." : "Use the fallback template below.",
    "",
    "Template:",
    templateBlock,
    "",
    "Viral source posts to learn structure from, not to plagiarize:",
    sourceBlock,
    "",
    "Recent drafts to avoid repeating:",
    recentBlock,
    "",
    "Hard requirements:",
    "- Write in Enigma Labs voice: direct, technical, anti-hype, founder-to-founder.",
    "- Avoid banned words and question hooks from the brand contract.",
    "- Produce exactly 3 materially different variants.",
    "- LinkedIn posts must be 1200-2000 characters.",
    "- X single posts must be 270 characters or less.",
    "- X thread variants must put the complete thread in body with each tweet on its own line, each tweet 270 characters or less.",
    "- CTA must be soft and specific, not salesy.",
  ].join("\n");
}

export async function generateDrafts(input: GenerateDraftInput): Promise<string[]> {
  await loadBrand();
  const db = getDb();
  const [template] = await db.select().from(schema.templates).orderBy(asc(schema.templates.lastUsed)).limit(1);

  if (!template) {
    console.warn("[content:new] no templates found; run viral clustering before forging drafts");
    return [];
  }

  const sourceIds = parseJson<string[]>(template.sampleSourceIds, []).slice(0, 3);
  const viralSources = (
    await Promise.all(
      sourceIds.map(async (id) => {
        const rows = await db
          .select()
          .from(schema.viralPosts)
          .where(eq(schema.viralPosts.id, id))
          .limit(1);
        return rows[0];
      }),
    )
  )
    .filter((post): post is NonNullable<typeof post> => Boolean(post))
    .slice(0, 3);
  const recentDrafts = await db
    .select({ body: schema.drafts.body })
    .from(schema.drafts)
    .where(eq(schema.drafts.channel, input.channel))
    .orderBy(desc(schema.drafts.createdAt))
    .limit(5);

  const prompt = buildForgePrompt({
    ...input,
    template,
    viralSourceTexts: viralSources.map((post) => post.body),
    recentDraftBodies: recentDrafts.map((draft) => draft.body),
  });

  let rawOutput = "";
  try {
    rawOutput = await runClaude(prompt);
  } catch (err) {
    console.warn(`[content:new] ${formatClaudeError(err)}; skipping draft generation`);
    return [];
  }

  const variants = parseForgeVariants(rawOutput);
  const ids = variants.map(() => newId("dr"));
  const now = Date.now();

  if (variants.length === 0) return [];

  await db.insert(schema.drafts).values(
    variants.map((variant, i) => ({
      id: ids[i],
      status: "draft" as const,
      templateId: template.id,
      viralSourceIds: stringifyJson(sourceIds),
      channel: input.channel as Platform,
      body: variant.body,
      hook: variant.hook,
      cta: variant.cta,
    })),
  );

  await db
    .update(schema.templates)
    .set({
      lastUsed: now,
      useCount: template.useCount + 1,
    })
    .where(eq(schema.templates.id, template.id));

  return ids;
}

export function parseForgeVariants(raw: string): ForgeVariant[] {
  const parsed = parseJsonCandidate(raw);
  if (Array.isArray(parsed)) {
    const variants = parsed.map(normalizeVariant).filter((variant): variant is ForgeVariant => Boolean(variant));
    if (variants.length > 0) return variants.slice(0, 3);
  }

  const fallback = normalizeVariant(parsed) ?? parseTextFallback(raw);
  return fallback ? [fallback] : [];
}

function defaultTemplate(channel: ForgeChannel, format: ForgeFormat): string {
  if (channel === "x" && format === "single") {
    return "Fallback: one sharp observation, concrete technical implication, soft CTA only if it fits.";
  }
  if (channel === "x" && format === "thread") {
    return "Fallback: 5-7 standalone tweets, numbered naturally, each tweet makes one concrete point.";
  }
  return "Fallback: hook, short credibility-building story, practical framework, grounded proof, soft CTA.";
}

function parseJsonCandidate(raw: string): unknown {
  const trimmed = raw.trim();
  for (const candidate of [trimmed, extractJsonArray(trimmed), extractJsonObject(trimmed)]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue through less strict candidates.
    }
  }
  return null;
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : null;
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : null;
}

function normalizeVariant(value: unknown): ForgeVariant | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const hook = typeof record.hook === "string" ? record.hook.trim() : "";
  const body = typeof record.body === "string" ? record.body.trim() : "";
  const cta = typeof record.cta === "string" ? record.cta.trim() : "";
  if (!hook && !body) return null;
  return {
    hook: hook || firstLine(body),
    body: body || hook,
    cta,
  };
}

function parseTextFallback(raw: string): ForgeVariant | null {
  const body = raw.trim();
  if (!body) return null;
  return {
    hook: firstLine(body),
    body,
    cta: "",
  };
}

function firstLine(text: string): string {
  return text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "";
}

function formatClaudeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
