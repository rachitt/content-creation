import { eventTypes, type EventType } from "@/lib/db";

export function buildAuditUrl({
  postId,
  channel,
  baseUrl,
}: {
  postId: string;
  channel: string;
  baseUrl: string;
}): string {
  return `${baseUrl}/audit?utm_source=${channel}&utm_medium=social&utm_campaign=${postId}`;
}

export function parseUtm(
  searchParams: URLSearchParams | Record<string, string>,
): { postId?: string; channel?: string; source?: string } {
  const get = (key: string) =>
    searchParams instanceof URLSearchParams ? searchParams.get(key) ?? undefined : searchParams[key];

  return {
    postId: get("utm_campaign"),
    channel: get("utm_source"),
    source: get("utm_medium"),
  };
}

export function eventName(type: string): EventType {
  if ((eventTypes as readonly string[]).includes(type)) {
    return type as EventType;
  }

  throw new Error(`Invalid attribution event type: ${type}`);
}
