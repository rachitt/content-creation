import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const platforms = ["linkedin", "x"] as const;
export type Platform = (typeof platforms)[number];

export const draftStatuses = ["draft", "approved", "scheduled", "posted", "killed"] as const;
export type DraftStatus = (typeof draftStatuses)[number];

export const ideaStatuses = ["new", "selected", "drafted", "killed"] as const;
export type IdeaStatus = (typeof ideaStatuses)[number];

export const eventTypes = ["view", "click", "book"] as const;
export type EventType = (typeof eventTypes)[number];

function nowMs() {
  return Date.now();
}

// JSON columns are stored as TEXT and parsed in helper layer.
const jsonText = (name: string) => text(name);

export const handles = sqliteTable(
  "handles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    platform: text("platform").$type<Platform>().notNull(),
    handle: text("handle").notNull(),
    vertical: text("vertical"),
    addedAt: integer("added_at").notNull().$defaultFn(nowMs),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    customThreshold: jsonText("custom_threshold"), // JSON: {likes?, comments?}
  },
  (t) => ({
    uniqPlatformHandle: uniqueIndex("uniq_handles_platform_handle").on(t.platform, t.handle),
  }),
);

export const viralPosts = sqliteTable(
  "viral_posts",
  {
    id: text("id").primaryKey(), // hash(url) or platform:author:postId
    platform: text("platform").$type<Platform>().notNull(),
    author: text("author").notNull(),
    authorUrl: text("author_url"),
    body: text("body").notNull(),
    url: text("url").notNull(),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    reposts: integer("reposts").notNull().default(0),
    impressions: integer("impressions"),
    engagementRate: real("engagement_rate"),
    mediaType: text("media_type"), // "text" | "image" | "video" | "carousel" | "thread"
    fetchedAt: integer("fetched_at").notNull().$defaultFn(nowMs),
    postedAt: integer("posted_at").notNull(),
    embedding: jsonText("embedding"), // JSON: number[]
    tags: jsonText("tags"), // JSON: string[]
    clusterId: text("cluster_id"),
  },
  (t) => ({
    uniqUrl: uniqueIndex("uniq_viral_url").on(t.url),
    byPlatformLikes: index("idx_viral_platform_likes").on(t.platform, t.likes),
    byCluster: index("idx_viral_cluster").on(t.clusterId),
  }),
);

export const templates = sqliteTable(
  "templates",
  {
    id: text("id").primaryKey(), // archetype slug
    archetype: text("archetype").notNull(),
    structure: text("structure").notNull(),
    hookExamples: jsonText("hook_examples"), // JSON: string[]
    transitionExamples: jsonText("transition_examples"), // JSON: string[]
    sampleSourceIds: jsonText("sample_source_ids"), // JSON: string[]
    avgEngagement: real("avg_engagement").notNull().default(0),
    lastUsed: integer("last_used"),
    useCount: integer("use_count").notNull().default(0),
  },
  (t) => ({
    byArchetype: index("idx_templates_archetype").on(t.archetype),
  }),
);

export const ideas = sqliteTable(
  "ideas",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    raw: text("raw").notNull(),
    angle: text("angle"),
    score: real("score").notNull().default(0),
    status: text("status").$type<IdeaStatus>().notNull().default("new"),
    createdAt: integer("created_at").notNull().$defaultFn(nowMs),
  },
  (t) => ({
    byStatusScore: index("idx_ideas_status_score").on(t.status, t.score),
  }),
);

export const drafts = sqliteTable(
  "drafts",
  {
    id: text("id").primaryKey(),
    ideaId: text("idea_id"),
    templateId: text("template_id"),
    viralSourceIds: jsonText("viral_source_ids"), // JSON: string[]
    channel: text("channel").$type<Platform>().notNull(),
    body: text("body").notNull(),
    hook: text("hook").notNull(),
    cta: text("cta").notNull().default(""),
    status: text("status").$type<DraftStatus>().notNull().default("draft"),
    scheduledAt: integer("scheduled_at"),
    bufferId: text("buffer_id"),
    similarityScore: real("similarity_score"),
    createdAt: integer("created_at").notNull().$defaultFn(nowMs),
  },
  (t) => ({
    byStatusScheduled: index("idx_drafts_status_scheduled").on(t.status, t.scheduledAt),
  }),
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    draftId: text("draft_id").notNull(),
    channel: text("channel").$type<Platform>().notNull(),
    postedAt: integer("posted_at").notNull(),
    url: text("url").notNull(),
    impressions: integer("impressions"),
    likes: integer("likes"),
    comments: integer("comments"),
    leads: integer("leads").notNull().default(0),
  },
  (t) => ({
    byPostedAt: index("idx_posts_posted_at").on(t.postedAt),
  }),
);

export const attribution = sqliteTable(
  "attribution",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    utm: text("utm").notNull(),
    postId: text("post_id").notNull(),
    leadId: text("lead_id"),
    eventType: text("event_type").$type<EventType>().notNull(),
    ts: integer("ts").notNull().$defaultFn(nowMs),
  },
  (t) => ({
    byPostTs: index("idx_attribution_post_ts").on(t.postId, t.ts),
  }),
);

// Domain types (camelCase) — slice code uses these via helpers in ./index.ts.
export type Handle = typeof handles.$inferSelect;
export type ViralPost = typeof viralPosts.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type PostRecord = typeof posts.$inferSelect;
export type Attribution = typeof attribution.$inferSelect;
