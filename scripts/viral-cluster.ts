import { eq, isNotNull, isNull } from "drizzle-orm";
import { getDb, parseJson, schema, stringifyJson } from "../src/lib/db";
import { embed, kmeans } from "../src/lib/content/cluster";

const CLUSTERS = 8;

async function main() {
  const db = getDb();

  const missingEmbeddings = await db
    .select()
    .from(schema.viralPosts)
    .where(isNull(schema.viralPosts.embedding));

  console.log(`[viral-cluster] embedding ${missingEmbeddings.length} posts`);
  for (const post of missingEmbeddings) {
    const vector = await embed(post.body);
    await db
      .update(schema.viralPosts)
      .set({ embedding: stringifyJson(vector) })
      .where(eq(schema.viralPosts.id, post.id));
  }

  const rows = await db
    .select()
    .from(schema.viralPosts)
    .where(isNotNull(schema.viralPosts.embedding));

  const posts = rows
    .map((row) => ({ row, vector: parseJson<number[]>(row.embedding, []) }))
    .filter((item) => item.vector.length > 0);

  if (posts.length === 0) {
    console.log("[viral-cluster] no embedded posts to cluster");
    return;
  }

  const assignments = kmeans(posts.map((post) => post.vector), CLUSTERS);
  console.log(`[viral-cluster] clustering ${posts.length} posts`);

  for (let i = 0; i < posts.length; i += 1) {
    const post = posts[i];
    const clusterId = `cluster-${assignments[i] ?? 0}`;
    await db
      .update(schema.viralPosts)
      .set({ clusterId })
      .where(eq(schema.viralPosts.id, post.row.id));
  }

  const byCluster = new Map<number, typeof posts>();
  for (let i = 0; i < posts.length; i += 1) {
    const cluster = assignments[i] ?? 0;
    const existing = byCluster.get(cluster) ?? [];
    existing.push(posts[i]);
    byCluster.set(cluster, existing);
  }

  for (const [cluster, clusterPosts] of byCluster.entries()) {
    const top = [...clusterPosts].sort((a, b) => b.row.likes - a.row.likes).slice(0, 5);
    const sampleSourceIds = top.map((post) => post.row.id);
    const avgEngagement =
      top.reduce((sum, post) => sum + post.row.likes + post.row.comments + post.row.reposts, 0) /
      Math.max(1, top.length);
    const id = `cluster-${cluster}`;

    await db
      .insert(schema.templates)
      .values({
        id,
        archetype: id,
        structure: "TODO: from claude.ts",
        sampleSourceIds: stringifyJson(sampleSourceIds),
        avgEngagement,
      })
      .onConflictDoUpdate({
        target: schema.templates.id,
        set: {
          archetype: id,
          structure: "TODO: from claude.ts",
          sampleSourceIds: stringifyJson(sampleSourceIds),
          avgEngagement,
        },
      });
  }

  console.log(`[viral-cluster] wrote ${byCluster.size} template stubs`);
}

main().catch((err) => {
  console.error("[viral-cluster] fatal:", err);
  process.exitCode = 1;
});
