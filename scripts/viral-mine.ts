import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { getDb, newId, schema, type Platform } from "../src/lib/db";
import { scrapeLinkedInProfile, scrapeXProfile, type ScrapedPost } from "../src/lib/content/scraper";

type HandleConfig = {
  handle: string;
  vertical?: string;
};

type HandlesYaml = {
  linkedin?: HandleConfig[];
  x?: HandleConfig[];
  thresholds?: {
    linkedin?: {
      minLikes?: number;
      minComments?: number;
      minEngagementRate?: number;
    };
    x?: {
      minLikes?: number;
      minRetweets?: number;
      minEngagementRate?: number;
    };
  };
};

function parsePostedAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function passesThreshold(platform: Platform, post: ScrapedPost, config: HandlesYaml): boolean {
  if (platform === "linkedin") {
    const thresholds = config.thresholds?.linkedin;
    return post.likes >= (thresholds?.minLikes ?? 0) && post.comments >= (thresholds?.minComments ?? 0);
  }

  const thresholds = config.thresholds?.x;
  return post.likes >= (thresholds?.minLikes ?? 0) && post.reposts >= (thresholds?.minRetweets ?? 0);
}

async function loadHandles(): Promise<HandlesYaml> {
  const file = await fs.readFile(path.resolve(process.cwd(), "src/content/brand/handles.yaml"), "utf8");
  return (yaml.load(file) ?? {}) as HandlesYaml;
}

async function mineHandle(platform: Platform, handleConfig: HandleConfig, config: HandlesYaml): Promise<void> {
  const label = `${platform}:${handleConfig.handle}`;
  console.log(`[viral-mine] scraping ${label}`);

  const result =
    platform === "linkedin"
      ? await scrapeLinkedInProfile(handleConfig.handle)
      : await scrapeXProfile(handleConfig.handle);

  if (!result.ok) {
    console.log(`[viral-mine] skipped ${label}: ${result.error ?? "unknown scraper error"}`);
    return;
  }

  const posts = result.posts ?? [];
  const filtered = posts.filter((post) => passesThreshold(platform, post, config));
  console.log(`[viral-mine] ${label}: ${filtered.length}/${posts.length} posts passed thresholds`);

  const db = getDb();
  for (const post of filtered) {
    const now = Date.now();
    await db
      .insert(schema.viralPosts)
      .values({
        id: newId("vp"),
        platform,
        author: post.author || handleConfig.handle,
        authorUrl: platform === "linkedin"
          ? `https://www.linkedin.com/in/${handleConfig.handle.replace(/^@/, "")}/`
          : `https://x.com/${handleConfig.handle.replace(/^@/, "")}`,
        body: post.body,
        url: post.url,
        likes: post.likes,
        comments: post.comments,
        reposts: post.reposts,
        mediaType: post.mediaType,
        fetchedAt: now,
        postedAt: parsePostedAt(post.postedAt),
      })
      .onConflictDoUpdate({
        target: schema.viralPosts.url,
        set: {
          likes: post.likes,
          comments: post.comments,
          reposts: post.reposts,
          fetchedAt: now,
        },
      });
  }
}

async function main() {
  const config = await loadHandles();
  const linkedin = config.linkedin ?? [];
  const x = config.x ?? [];

  console.log(`[viral-mine] starting ${linkedin.length} LinkedIn handles and ${x.length} X handles`);
  for (const handle of linkedin) {
    await mineHandle("linkedin", handle, config);
  }
  for (const handle of x) {
    await mineHandle("x", handle, config);
  }
  console.log("[viral-mine] done");
}

main().catch((err) => {
  console.error("[viral-mine] fatal:", err);
  process.exitCode = 1;
});
