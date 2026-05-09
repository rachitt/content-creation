import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

type CalendlyWebhookBody = {
  event?: string;
  payload?: {
    tracking?: {
      utm_campaign?: string;
    };
  };
};

function parseSignature(header: string | null): string | undefined {
  if (!header) return undefined;

  return header
    .split(",")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === "v1")?.[1];
}

function isValidSignature(rawBody: string, header: string | null, secret: string): boolean {
  const signature = parseSignature(header);
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.CALENDLY_WEBHOOK_SECRET ?? "";

  if (secret && !isValidSignature(rawBody, request.headers.get("Calendly-Webhook-Signature"), secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = JSON.parse(rawBody || "{}") as CalendlyWebhookBody;
  if (body.event !== "invitee.created") {
    return NextResponse.json({ ok: true });
  }

  const postId = body.payload?.tracking?.utm_campaign?.trim();
  if (!postId) {
    return NextResponse.json({ ok: true });
  }

  const db = getDb();
  db.update(schema.posts)
    .set({ leads: sql`${schema.posts.leads} + 1` })
    .where(eq(schema.posts.id, postId))
    .run();
  db.insert(schema.attribution)
    .values({
      eventType: "book",
      postId,
      utm: "",
      ts: Date.now(),
    })
    .run();

  return NextResponse.json({ ok: true });
}
