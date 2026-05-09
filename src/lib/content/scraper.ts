import { spawn } from "node:child_process";
import path from "node:path";

export type ScrapedPost = {
  body: string;
  likes: number;
  comments: number;
  reposts: number;
  postedAt: string;
  url: string;
  mediaType?: string;
  author?: string;
};

type ScrapeTask = "li_profile_posts" | "x_profile_posts" | "single_post";

type ScrapeJob = {
  task: ScrapeTask;
  handle?: string;
  url?: string;
  limit?: number;
};

type ScrapeResult = {
  ok: boolean;
  posts?: ScrapedPost[];
  error?: string;
};

const TIMEOUT_MS = 90_000;

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value !== "string") return 0;

  const compact = value.trim().replace(/,/g, "").toLowerCase();
  const match = compact.match(/^([\d.]+)\s*([km])?/);
  if (!match) return 0;

  const base = Number.parseFloat(match[1] ?? "0");
  if (!Number.isFinite(base)) return 0;
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.max(0, Math.trunc(base * multiplier));
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePost(raw: unknown): ScrapedPost | null {
  if (!raw || typeof raw !== "object") return null;
  const post = raw as Record<string, unknown>;
  const body = toStringValue(post.body ?? post.text ?? post.content);
  const url = toStringValue(post.url ?? post.href ?? post.permalink);
  if (!body || !url) return null;

  return {
    body,
    likes: toNumber(post.likes),
    comments: toNumber(post.comments ?? post.replies),
    reposts: toNumber(post.reposts ?? post.retweets ?? post.shares),
    postedAt: toStringValue(post.postedAt ?? post.date ?? post.createdAt),
    url,
    mediaType: toStringValue(post.mediaType) || undefined,
    author: toStringValue(post.author) || undefined,
  };
}

async function runScrape(job: ScrapeJob): Promise<ScrapeResult> {
  const python = process.env.SCRAPER_PYTHON || "python3";
  const script = path.resolve(process.cwd(), "scripts/scrape/scrape.py");

  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";

    const child = spawn(python, [script], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    const finish = (result: ScrapeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ ok: false, error: `scraper timed out after ${TIMEOUT_MS / 1000}s` });
    }, TIMEOUT_MS);

    child.on("error", (err: NodeJS.ErrnoException) => {
      const missing = err.code === "ENOENT" ? `Python executable not found: ${python}` : err.message;
      finish({ ok: false, error: missing });
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.stdin.on("error", () => {
      // The process-level error handler reports missing Python and early exits.
    });

    child.on("close", (code) => {
      if (settled) return;
      if (code !== 0) {
        finish({ ok: false, error: stderr.trim() || `scraper exited with code ${code}` });
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as { ok?: boolean; posts?: unknown[]; error?: string };
        if (!parsed.ok) {
          finish({ ok: false, error: parsed.error || stderr.trim() || "scraper returned ok:false" });
          return;
        }

        const posts = Array.isArray(parsed.posts)
          ? parsed.posts.map(normalizePost).filter((post): post is ScrapedPost => Boolean(post))
          : [];
        finish({ ok: true, posts });
      } catch (err) {
        finish({
          ok: false,
          error: `invalid scraper JSON: ${(err as Error).message}${stderr.trim() ? `; ${stderr.trim()}` : ""}`,
        });
      }
    });

    child.stdin.end(JSON.stringify(job));
  });
}

export function scrapeLinkedInProfile(handle: string, limit = 25): Promise<ScrapeResult> {
  return runScrape({ task: "li_profile_posts", handle, limit });
}

export function scrapeXProfile(handle: string, limit = 25): Promise<ScrapeResult> {
  return runScrape({ task: "x_profile_posts", handle, limit });
}

export function scrapeSinglePost(url: string): Promise<ScrapeResult> {
  return runScrape({ task: "single_post", url });
}
