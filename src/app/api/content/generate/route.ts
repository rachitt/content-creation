import { NextResponse } from "next/server";
import { generateDrafts, type ForgeChannel, type ForgeFormat } from "@/lib/content/voice";

type GenerateBody = {
  topic?: unknown;
  channel?: unknown;
  format?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GenerateBody;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const channel = parseChannel(body.channel);
  const format = parseFormat(body.format);

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const draftIds = await generateDrafts({ topic, channel, format });
  return NextResponse.json({ draftIds });
}

function parseChannel(value: unknown): ForgeChannel {
  if (value === "x") return "x";
  return "linkedin";
}

function parseFormat(value: unknown): ForgeFormat {
  if (value === "thread") return "thread";
  return "single";
}
