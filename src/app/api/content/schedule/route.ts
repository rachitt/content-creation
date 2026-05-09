import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { schedulePost } from "@/lib/content/buffer";
import { nextAvailableSlot } from "@/lib/content/slots";

async function readPayload(
  request: NextRequest,
): Promise<{ draftId?: string; scheduledAt?: number | string; isForm: boolean }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { draftId?: string; scheduledAt?: number | string };
    return { ...body, isForm: false };
  }

  const form = await request.formData();
  const draftId = form.get("draftId");
  const scheduledAt = form.get("scheduledAt");
  return {
    draftId: typeof draftId === "string" ? draftId : undefined,
    scheduledAt: typeof scheduledAt === "string" && scheduledAt ? Number(scheduledAt) : undefined,
    isForm: true,
  };
}

function respond(request: NextRequest, isForm: boolean, body: unknown, status = 200) {
  if (isForm && status < 400) return NextResponse.redirect(new URL("/admin/content/queue", request.url), 303);
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const { draftId, scheduledAt, isForm } = await readPayload(request);
  if (!draftId) return respond(request, isForm, { ok: false, error: "draftId required" }, 400);

  const db = getDb();
  const draft = db.select().from(schema.drafts).where(eq(schema.drafts.id, draftId)).get();
  if (!draft) return respond(request, isForm, { ok: false, error: "Draft not found" }, 404);

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : nextAvailableSlot(draft.channel);
  if (Number.isNaN(scheduledDate.getTime())) {
    return respond(request, isForm, { ok: false, error: "scheduledAt invalid" }, 400);
  }
  const result = await schedulePost({
    channel: draft.channel,
    body: draft.body,
    scheduledAt: scheduledDate,
  });

  if (!result.ok) return respond(request, isForm, result, 502);

  db.update(schema.drafts)
    .set({ status: "scheduled", bufferId: result.bufferId, scheduledAt: scheduledDate.getTime() })
    .where(eq(schema.drafts.id, draft.id))
    .run();

  revalidatePath("/admin/content");
  revalidatePath("/admin/content/drafts");
  revalidatePath("/admin/content/queue");
  return respond(request, isForm, { ok: true, draftId: draft.id, bufferId: result.bufferId, scheduledAt: scheduledDate.getTime() });
}
