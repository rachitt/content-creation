import type { Platform } from "@/lib/db";

const BUFFER_API_BASE = "https://api.bufferapp.com/1/";

export type SchedulePostInput = {
  channel: Platform;
  body: string;
  scheduledAt: Date;
  mediaUrl?: string;
};

export type SchedulePostResult = {
  ok: boolean;
  bufferId?: string;
  error?: string;
};

export type BufferProfile = {
  id: string;
  service?: string;
  service_username?: string;
  formatted_username?: string;
  avatar?: string;
};

export type BufferUpdate = {
  id: string;
  text?: string;
  due_at?: number;
  due_time?: string;
  profile_id?: string;
  status?: string;
};

function getToken(): string | null {
  return process.env.BUFFER_TOKEN || null;
}

function getProfileId(channel: Platform): string | null {
  const key = channel === "linkedin" ? "BUFFER_LINKEDIN_PROFILE_ID" : "BUFFER_X_PROFILE_ID";
  return process.env[key] || null;
}

async function bufferRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("BUFFER_TOKEN missing");

  const response = await fetch(`${BUFFER_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Buffer ${path} failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

export async function schedulePost({
  channel,
  body,
  scheduledAt,
  mediaUrl,
}: SchedulePostInput): Promise<SchedulePostResult> {
  if (!getToken()) return { ok: false, error: "BUFFER_TOKEN missing" };

  const profileId = getProfileId(channel);
  if (!profileId) {
    const key = channel === "linkedin" ? "BUFFER_LINKEDIN_PROFILE_ID" : "BUFFER_X_PROFILE_ID";
    return { ok: false, error: `${key} missing` };
  }

  const params = new URLSearchParams({
    text: body,
    now: "false",
    scheduled_at: String(Math.floor(scheduledAt.getTime() / 1000)),
  });
  params.append("profile_ids[]", profileId);
  if (mediaUrl) params.append("media[photo]", mediaUrl);

  try {
    const result = await bufferRequest<{ updates?: BufferUpdate[]; update?: BufferUpdate }>(
      "updates/create.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      },
    );
    const update = result.updates?.[0] ?? result.update;
    if (!update?.id) return { ok: false, error: "Buffer response missing update id" };
    return { ok: true, bufferId: update.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Buffer request failed" };
  }
}

export async function getProfiles(): Promise<BufferProfile[]> {
  return bufferRequest<BufferProfile[]>("profiles.json");
}

export async function getQueue(profileId: string): Promise<BufferUpdate[]> {
  const result = await bufferRequest<{ updates?: BufferUpdate[] }>(
    `profiles/${encodeURIComponent(profileId)}/updates/pending.json`,
  );
  return result.updates ?? [];
}
