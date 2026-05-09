"use client";

import { useEffect } from "react";

type TrackViewProps = {
  postId?: string;
  utmSource?: string;
};

export default function TrackView({ postId, utmSource }: TrackViewProps) {
  useEffect(() => {
    if (!postId) return;

    void fetch("/api/content/attribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "view",
        utm_campaign: postId,
        utm_source: utmSource,
      }),
    });
  }, [postId, utmSource]);

  return null;
}
