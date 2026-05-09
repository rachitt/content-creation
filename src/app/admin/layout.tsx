import Link from "next/link";

const navItems = [
  { label: "Pipeline", href: "/admin/content" },
  { label: "Drafts", href: "/admin/content/drafts" },
  { label: "Queue", href: "/admin/content/queue" },
  { label: "Viral", href: "/admin/content/viral" },
  { label: "Ideas", href: "/admin/content/ideas" },
  { label: "Attribution", href: "/admin/content/attribution" },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-bg-0 text-ink">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(rgba(141, 225, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(141, 225, 255, 0.045) 1px, transparent 1px), var(--bg-0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-line-soft bg-bg-0/95 px-5 py-6 md:block">
          <Link href="/admin/content" className="block font-mono text-sm uppercase tracking-widest">
            <span style={{ color: "var(--c-cyan)" }}>Enigma</span>
            <span className="mt-1 block text-ink">Content Ops</span>
          </Link>
          <nav className="mt-10 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider text-ink-dim transition hover:border-line-soft hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="border-b border-line-soft bg-bg-0/85 px-4 py-4 backdrop-blur md:hidden">
            <div className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--c-cyan)" }}>
              Enigma Content Ops
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md border border-line-soft px-3 py-2 font-mono text-xs uppercase tracking-wider text-ink-dim"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
