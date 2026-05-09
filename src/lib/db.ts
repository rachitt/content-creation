import { MongoClient, type Collection, type Db } from "mongodb";

export type Platform = "linkedin" | "x";

export type ViralPost = {
  platform: Platform;
  author: string;
  authorUrl?: string;
  body: string;
  url: string;
  metrics: {
    likes: number;
    comments: number;
    reposts: number;
    impressions?: number;
    engagementRate?: number;
  };
  mediaType?: "text" | "image" | "video" | "carousel" | "thread";
  fetchedAt: Date;
  postedAt: Date;
  embedding?: number[];
  tags?: string[];
  clusterId?: string;
};

export type Template = {
  archetype: string;
  structure: string;
  hookExamples: string[];
  transitionExamples: string[];
  sampleSourceIds: string[];
  avgEngagement: number;
  lastUsed?: Date;
  useCount: number;
};

export type Handle = {
  platform: Platform;
  handle: string;
  vertical?: string;
  addedAt: Date;
  active: boolean;
  customThreshold?: { likes?: number; comments?: number };
};

export type Idea = {
  source: string;
  raw: string;
  angle?: string;
  score: number;
  status: "new" | "selected" | "drafted" | "killed";
  createdAt: Date;
};

export type Draft = {
  ideaId?: string;
  templateId?: string;
  viralSourceIds?: string[];
  channel: Platform;
  body: string;
  hook: string;
  cta: string;
  status: "draft" | "approved" | "scheduled" | "posted" | "killed";
  scheduledAt?: Date;
  bufferId?: string;
  similarityScore?: number;
  createdAt: Date;
};

export type PostRecord = {
  draftId: string;
  channel: Platform;
  postedAt: Date;
  url: string;
  metrics?: { impressions?: number; likes?: number; comments?: number };
  leads?: number;
};

export type Attribution = {
  utm: string;
  postId: string;
  leadId?: string;
  eventType: "view" | "click" | "book";
  ts: Date;
};

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "content_creation";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  var __mongoIndexesEnsured: boolean | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI not set");
  if (!global.__mongoClientPromise) {
    global.__mongoClientPromise = new MongoClient(uri).connect();
  }
  return global.__mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(dbName);
  if (!global.__mongoIndexesEnsured) {
    await Promise.all([
      db.collection<ViralPost>("viral_posts").createIndex({ url: 1 }, { unique: true }),
      db.collection<ViralPost>("viral_posts").createIndex({ platform: 1, "metrics.likes": -1 }),
      db.collection<ViralPost>("viral_posts").createIndex({ clusterId: 1 }),
      db.collection<Template>("templates").createIndex({ archetype: 1 }),
      db.collection<Handle>("handles").createIndex({ platform: 1, handle: 1 }, { unique: true }),
      db.collection<Idea>("ideas").createIndex({ status: 1, score: -1 }),
      db.collection<Draft>("drafts").createIndex({ status: 1, scheduledAt: 1 }),
      db.collection<PostRecord>("posts").createIndex({ postedAt: -1 }),
      db.collection<Attribution>("attribution").createIndex({ postId: 1, ts: -1 }),
    ]);
    global.__mongoIndexesEnsured = true;
  }
  return db;
}

export const collections = {
  viralPosts: async () => (await getDb()).collection<ViralPost>("viral_posts"),
  templates: async () => (await getDb()).collection<Template>("templates"),
  handles: async () => (await getDb()).collection<Handle>("handles"),
  ideas: async () => (await getDb()).collection<Idea>("ideas"),
  drafts: async () => (await getDb()).collection<Draft>("drafts"),
  posts: async () => (await getDb()).collection<PostRecord>("posts"),
  attribution: async () => (await getDb()).collection<Attribution>("attribution"),
};
