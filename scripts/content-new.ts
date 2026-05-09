import "dotenv/config";
import { generateDrafts, type ForgeChannel, type ForgeFormat } from "../src/lib/content/voice";

type CliArgs = {
  topic: string;
  channel: ForgeChannel;
  format: ForgeFormat;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.topic) {
    console.error('Usage: pnpm content:new "<topic>" [--channel=li|x] [--format=single|thread]');
    process.exitCode = 1;
    return;
  }

  const draftIds = await generateDrafts(args);
  if (draftIds.length === 0) {
    console.warn("[content:new] no drafts created");
    return;
  }

  console.log(`[content:new] created drafts: ${draftIds.join(", ")}`);
}

function parseArgs(argv: string[]): CliArgs {
  const topicParts: string[] = [];
  let channel: ForgeChannel = "linkedin";
  let format: ForgeFormat = "single";

  for (const arg of argv) {
    if (arg.startsWith("--channel=")) {
      channel = parseChannel(arg.slice("--channel=".length));
      continue;
    }
    if (arg.startsWith("--format=")) {
      format = parseFormat(arg.slice("--format=".length));
      continue;
    }
    topicParts.push(arg);
  }

  return {
    topic: topicParts.join(" ").trim(),
    channel,
    format,
  };
}

function parseChannel(value: string): ForgeChannel {
  if (value === "li" || value === "linkedin") return "linkedin";
  if (value === "x") return "x";
  throw new Error(`Unsupported channel: ${value}`);
}

function parseFormat(value: string): ForgeFormat {
  if (value === "single" || value === "thread") return value;
  throw new Error(`Unsupported format: ${value}`);
}

main().catch((err) => {
  console.error("[content:new]", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
