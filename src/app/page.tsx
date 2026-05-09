import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-24">
      <main className="w-full max-w-3xl flex flex-col gap-10">
        <div className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--ink-dim)" }}>
          [ enigma-labs / content-engine ]
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">
          Mine viral. Forge in voice. Ship daily.
        </h1>
        <p className="text-lg max-w-xl" style={{ color: "var(--ink-dim)" }}>
          Daily harvest of viral LinkedIn + X posts from ICP creators. Templates
          extracted. Posts forged in Enigma voice. Scheduled to Buffer. Leads booked
          via UTM-tagged audit calls.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/admin/content"
            className="px-5 h-12 inline-flex items-center justify-center rounded-md font-mono text-sm uppercase tracking-wider"
            style={{ background: "var(--c-cyan)", color: "var(--bg-0)" }}
          >
            Open Admin
          </Link>
          <a
            href="https://github.com/rachitt/content-creation"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 h-12 inline-flex items-center justify-center rounded-md font-mono text-sm uppercase tracking-wider border"
            style={{ borderColor: "var(--line-soft)", color: "var(--ink)" }}
          >
            Repo
          </a>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          {[
            ["A", "viral-mine", "Apify scrape + cluster"],
            ["B", "voice-forge", "BRAND.md + claude -p"],
            ["C", "buffer-ui", "Schedule + admin"],
            ["D", "idea-inbox", "HN/Reddit radar"],
            ["E", "lead-capture", "/audit + UTM"],
          ].map(([s, name, desc]) => (
            <div
              key={s}
              className="border p-3 rounded-md"
              style={{ borderColor: "var(--line-soft)" }}
            >
              <div style={{ color: "var(--c-cyan)" }}>slice {s}</div>
              <div className="mt-1">{name}</div>
              <div className="mt-1" style={{ color: "var(--ink-dim)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
