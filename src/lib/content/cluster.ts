type FeatureExtractionPipeline = (text: string | string[], options?: Record<string, unknown>) => Promise<{
  data: Float32Array | number[];
}>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = import("@xenova/transformers").then(async ({ pipeline }) => {
      return (await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")) as FeatureExtractionPipeline;
    });
  }
  return extractorPromise;
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data, Number);
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const vectors: number[][] = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    vectors.push(Array.from(output.data, Number));
  }
  return vectors;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function squaredDistance(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return sum;
}

function nearestCentroid(vector: number[], centroids: number[][]): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centroids.length; i += 1) {
    const distance = squaredDistance(vector, centroids[i] ?? []);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

export function kmeans(vectors: number[][], k: number, iterations = 30): number[] {
  if (vectors.length === 0) return [];

  const clusterCount = Math.max(1, Math.min(k, vectors.length));
  const dimensions = vectors[0]?.length ?? 0;
  const centroids = vectors.slice(0, clusterCount).map((vector) => [...vector]);
  const assignments = new Array<number>(vectors.length).fill(0);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let changed = false;

    for (let i = 0; i < vectors.length; i += 1) {
      const next = nearestCentroid(vectors[i] ?? [], centroids);
      if (assignments[i] !== next) {
        assignments[i] = next;
        changed = true;
      }
    }

    const sums = Array.from({ length: clusterCount }, () => new Array<number>(dimensions).fill(0));
    const counts = new Array<number>(clusterCount).fill(0);

    for (let i = 0; i < vectors.length; i += 1) {
      const cluster = assignments[i] ?? 0;
      counts[cluster] += 1;
      const vector = vectors[i] ?? [];
      for (let d = 0; d < dimensions; d += 1) {
        sums[cluster][d] += vector[d] ?? 0;
      }
    }

    for (let cluster = 0; cluster < clusterCount; cluster += 1) {
      if (counts[cluster] === 0) {
        centroids[cluster] = [...(vectors[cluster % vectors.length] ?? [])];
        continue;
      }
      centroids[cluster] = sums[cluster].map((value) => value / counts[cluster]);
    }

    if (!changed) break;
  }

  return assignments;
}
