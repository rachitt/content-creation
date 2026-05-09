type RepurposeResult = {
  liPosts: string[];
  xPosts: string[];
  xThreads: string[][];
};

const EMPTY_RESULT: RepurposeResult = { liPosts: [], xPosts: [], xThreads: [] };

async function loadRunClaude(): Promise<((prompt: string) => Promise<string>) | null> {
  try {
    const mod = (await import("./claude")) as { runClaude?: (prompt: string) => Promise<string> };
    return typeof mod.runClaude === "function" ? mod.runClaude : null;
  } catch {
    return null;
  }
}

function parseJson(text: string): RepurposeResult {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  const parsed = JSON.parse(jsonText) as Partial<RepurposeResult>;

  return {
    liPosts: Array.isArray(parsed.liPosts) ? parsed.liPosts.filter((value): value is string => typeof value === "string") : [],
    xPosts: Array.isArray(parsed.xPosts) ? parsed.xPosts.filter((value): value is string => typeof value === "string") : [],
    xThreads: Array.isArray(parsed.xThreads)
      ? parsed.xThreads
          .filter((thread) => Array.isArray(thread))
          .map((thread) => thread.filter((value): value is string => typeof value === "string"))
      : [],
  };
}

export async function repurpose(longText: string, sourceType: string): Promise<RepurposeResult> {
  const runClaude = await loadRunClaude();
  if (!runClaude) return EMPTY_RESULT;

  const prompt = `Repurpose this ${sourceType} for Enigma Labs.

Return only valid JSON with exactly these keys:
- liPosts: 5 LinkedIn posts as strings
- xPosts: 10 short X posts as strings
- xThreads: 2 X threads, each an array of post strings

Source:
${longText}`;

  try {
    return parseJson(await runClaude(prompt));
  } catch {
    return EMPTY_RESULT;
  }
}
