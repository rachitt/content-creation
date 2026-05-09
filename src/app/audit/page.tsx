import Script from "next/script";
import TrackView from "./track-view";

type AuditPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = (await searchParams) ?? {};
  const postId = firstParam(params.utm_campaign);
  const utmSource = firstParam(params.utm_source);
  const calendlyUrl = process.env.CALENDLY_URL ?? "";

  return (
    <main className="min-h-screen px-6 py-12 sm:px-10" style={{ background: "var(--bg-0)", color: "var(--ink)" }}>
      <TrackView postId={postId} utmSource={utmSource} />
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--c-cyan)" }}>
          Enigma Labs
        </div>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              30-min audit. We diagnose where AI/SaaS is leaking time or money. Free.
            </h1>
            <p className="max-w-xl text-base leading-7" style={{ color: "var(--ink-dim)" }}>
              Bring a workflow, a funnel, or an ops bottleneck. We will map the failure points and identify the fastest
              path to measurable leverage.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--line-soft)" }}>
            {calendlyUrl ? (
              <>
                <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
                <div
                  className="calendly-inline-widget bg-white"
                  data-url={`${calendlyUrl}?utm_campaign=${postId ?? ""}`}
                  style={{ minHeight: 700 }}
                />
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
                Booking unavailable — set CALENDLY_URL
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
