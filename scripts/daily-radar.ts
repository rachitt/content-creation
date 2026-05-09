import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb, schema, type Idea } from "@/lib/db";
import { extractKeywords, scoreIdea } from "@/lib/content/radar";

type RadarItem = {
  source: string;
  title: string;
  url: string;
  text?: string;
};

type HnItem = {
  id: number;
  title?: string;
  url?: string;
  text?: string;
};

type RedditChild = {
  data?: {
    title?: string;
    selftext?: string;
    url?: string;
    permalink?: string;
  };
};

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
}

function rawForItem(item: RadarItem): string {
  return [item.title, item.text, item.url].filter(Boolean).join("\n\n");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      console.warn(`[radar] skipped ${url}: ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[radar] skipped ${url}: ${(error as Error).message}`);
    return null;
  }
}

async function fetchHn(): Promise<RadarItem[]> {
  const ids = await fetchJson<number[]>("https://hacker-news.firebaseio.com/v0/topstories.json");
  if (!ids) return [];

  const items = await Promise.all(
    ids.slice(0, 50).map((id) => fetchJson<HnItem>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)),
  );

  return items.flatMap((item) => {
    if (!item?.title) return [];
    const url = item.url ?? `https://news.ycombinator.com/item?id=${item.id}`;
    return [{ source: "hn", title: item.title, text: item.text, url }];
  });
}

async function fetchRedditSub(subreddit: string): Promise<RadarItem[]> {
  const listing = await fetchJson<{ data?: { children?: RedditChild[] } }>(`https://www.reddit.com/r/${subreddit}.json`, {
    headers: { "User-Agent": "enigma-content-creation/1.0" },
  });

  return (
    listing?.data?.children?.flatMap((child) => {
      const data = child.data;
      if (!data?.title) return [];
      const url = data.url ?? `https://www.reddit.com${data.permalink ?? `/r/${subreddit}`}`;
      return [{ source: `reddit:${subreddit}`, title: data.title, text: data.selftext, url }];
    }) ?? []
  );
}

async function main() {
  const icpPath = path.resolve(process.cwd(), "src/content/brand/icp.md");
  const icpText = await fs.readFile(icpPath, "utf8");
  const keywords = extractKeywords(icpText);

  const [hnItems, ...redditGroups] = await Promise.all([
    fetchHn(),
    fetchRedditSub("SaaS"),
    fetchRedditSub("startups"),
    fetchRedditSub("legaltech"),
    fetchRedditSub("healthIT"),
  ]);

  const byUrl = new Map<string, RadarItem>();
  for (const item of [...hnItems, ...redditGroups.flat()]) {
    if (!byUrl.has(item.url)) byUrl.set(item.url, item);
  }

  const ideas: (typeof schema.ideas.$inferInsert)[] = [...byUrl.values()].flatMap((item) => {
    const raw = rawForItem(item);
    const score = scoreIdea(raw, keywords);
    if (score <= 3) return [];

    return [
      {
        id: `idea_${hashUrl(item.url)}`,
        source: item.source,
        raw,
        score,
        status: "new" satisfies Idea["status"],
      },
    ];
  });

  if (ideas.length === 0) {
    console.log("[radar] no scored ideas above threshold");
    return;
  }

  try {
    const db = getDb();
    for (const idea of ideas) {
      await db.insert(schema.ideas).values(idea).onConflictDoNothing();
    }
    console.log(`[radar] inserted up to ${ideas.length} ideas`);
  } catch (error) {
    console.warn(`[radar] dry-run: DB write skipped: ${(error as Error).message}`);
    for (const idea of ideas) console.log(`[radar] ${idea.score} ${idea.source}: ${idea.raw.slice(0, 120)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
