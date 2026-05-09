const PAIN_WORDS = ["spent", "frustrated", "overpaid", "broken", "leaked", "wasted", "failed", "stuck"];

const STOP_WORDS = new Set([
  "and",
  "are",
  "but",
  "for",
  "from",
  "into",
  "more",
  "now",
  "the",
  "this",
  "with",
  "your",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+.#\s-]/g, " ");
}

function cleanPhrase(value: string): string {
  return normalize(value)
    .replace(/\([^)]*\)/g, " ")
    .replace(/^\d+\s*[.)-]?\s*/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addPhrase(phrases: Set<string>, phrase: string) {
  const cleaned = cleanPhrase(phrase);
  if (!cleaned || cleaned.length < 4) return;
  if (STOP_WORDS.has(cleaned)) return;
  phrases.add(cleaned);

  for (const part of cleaned.split(/[,/]| adjacents? | automation | ops /g)) {
    const token = cleanPhrase(part);
    if (token.length >= 4 && !STOP_WORDS.has(token)) phrases.add(token);
  }
}

function sectionBody(markdown: string, heading: string): string {
  const pattern = new RegExp(`(?:^|\\n)##\\s+${heading}\\b[\\s\\S]*?(?=\\n##\\s+|$)`, "i");
  return markdown.match(pattern)?.[0] ?? "";
}

export function extractKeywords(icpText: string): string[] {
  const phrases = new Set<string>();
  const source = [sectionBody(icpText, "Verticals"), sectionBody(icpText, "Pain language")].join("\n");

  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("##")) continue;

    const withoutBullet = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
    addPhrase(phrases, withoutBullet);

    const quoted = [...withoutBullet.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    for (const phrase of quoted) addPhrase(phrases, phrase);

    const parens = [...withoutBullet.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]);
    for (const phrase of parens) addPhrase(phrases, phrase);
  }

  return [...phrases].sort((a, b) => b.length - a.length);
}

export function scoreIdea(text: string, keywords: string[]): number {
  const normalized = ` ${normalize(text)} `;
  const keywordScore = new Set(
    keywords.filter((keyword) => normalized.includes(` ${normalize(keyword)} `) || normalized.includes(normalize(keyword))),
  ).size;
  const painScore = PAIN_WORDS.reduce((total, word) => total + (normalized.includes(` ${word} `) ? 2 : 0), 0);

  return keywordScore + painScore;
}
