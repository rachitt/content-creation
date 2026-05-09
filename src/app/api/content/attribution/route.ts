import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eventName } from "@/lib/content/attribution";

type AttributionBody = {
  utm_campaign?: string;
  utm_source?: string;
  eventType?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AttributionBody;
  const postId = body.utm_campaign?.trim();

  if (!postId) {
    return NextResponse.json({ ok: true });
  }

  let eventType;
  try {
    eventType = eventName(body.eventType ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid eventType" }, { status: 400 });
  }

  const db = getDb();
  db.insert(schema.attribution)
    .values({
      utm: body.utm_source ?? "",
      postId,
      eventType,
      ts: Date.now(),
    })
    .run();

  return NextResponse.json({ ok: true });
}
