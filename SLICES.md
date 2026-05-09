# Parallel Build Slices

Each slice owns one branch + worktree. Coordinate only via:
- `src/lib/db.ts` types (do not modify, extend in your slice if needed)
- `.env.example` (append new vars in your slice)
- This file (do not modify; contracts are frozen)

## Shared types
All slices import from `src/lib/db.ts`:
- `ViralPost`, `Template`, `Handle`, `Idea`, `Draft`, `PostRecord`, `Attribution`, `Platform`
- `collections.{viralPosts, templates, handles, ideas, drafts, posts, attribution}`

## Slice A — Viral Mine (`slice/viral-mine`)
Owner files:
- `src/lib/content/apify.ts` — Apify API client (LinkedIn Post Scraper + Twitter Scraper)
- `src/lib/content/cluster.ts` — embed + cluster + template extraction
- `scripts/viral-mine.ts` — daily cron: fetch handles → filter viral → upsert
- `scripts/viral-cluster.ts` — weekly: cluster + write `templates`
- `src/app/admin/content/viral/page.tsx` — browse harvested viral posts
- `src/app/api/content/viral/route.ts` — list/filter viral_posts

Reads: `src/content/brand/handles.yaml`, `viral_posts`, `templates`.
Writes: `viral_posts`, `templates`.
Env: `APIFY_TOKEN`.
Apify actors:
- LI: `apify/linkedin-post-scraper` (or `dev_fusion/linkedin-profile-posts-scraper`)
- X: `apidojo/twitter-scraper`

Embedding: use Voyage AI free tier OR `@xenova/transformers` local (no API key). Cluster with k-means or HDBSCAN (small N — k-means with k=8 is fine v1).

Template extraction: feed top 5 posts per cluster to `claude -p` → returns archetype label + structure pattern. Use `src/lib/content/claude.ts` (built by Slice B — stub it locally if needed during dev).

Plagiarism guard: export `cosineSimilarity(a, b)` for Slice B to use.

## Slice B — Voice & Forge (`slice/voice-forge`)
Owner files:
- `src/lib/content/claude.ts` — `claude -p` subprocess wrapper. Spawn `claude -p --output-format stream-json` (or simpler `claude -p "<prompt>"`) and capture stdout. NO `langchain-anthropic`, NO API key.
- `src/lib/content/voice.ts` — load `BRAND.md`, `voice-samples.md`, `icp.md`, build prompt
- `src/content/brand/BRAND.md` — expand voice contract
- `src/content/brand/voice-samples.md` — populated by ingest-handles
- `src/content/brand/icp.md` — expand
- `scripts/content-new.ts` — CLI: `pnpm content:new "topic" [--channel=li|x] [--format=single|thread]`
- `scripts/ingest-handles.ts` — one-time: mine OWN LI/X via Apify (reuse Slice A's apify.ts) → distill voice DNA into voice-samples.md
- `src/app/api/content/generate/route.ts` — POST endpoint wrapping content-new flow

Reads: brand files, `viral_posts`, `templates` (when picking template).
Writes: `drafts`.
Env: none (uses local `claude` CLI).

Forge prompt structure (assemble in `voice.ts`):
1. SYSTEM: BRAND.md + banned words enforcement
2. CONTEXT: ICP.md vertical for the topic
3. STYLE ANCHOR: 3 raw viral source posts from chosen template
4. STRUCTURE: template's `structure` field
5. TASK: write 3 variants for `<topic>` on `<channel>`
6. CONSTRAINTS: cooldown (no template reused 14d), no emoji, no banned words

Output 3 variants → insert as `Draft` rows with `status: "draft"`, `viralSourceIds`, `templateId`.

After generation: call `cosineSimilarity` (from Slice A) vs each `viralSourceIds`. If max > 0.85 → flag `similarityScore` and `status: "killed"`.

## Slice C — Buffer + Admin UI (`slice/buffer-ui`)
Owner files:
- `src/lib/content/buffer.ts` — Buffer API client (OAuth flow + schedule endpoint)
- `src/app/admin/content/page.tsx` — pipeline dashboard (counts per status)
- `src/app/admin/content/drafts/page.tsx` — list drafts, edit, approve, schedule
- `src/app/admin/content/queue/page.tsx` — calendar view of scheduled posts
- `src/app/admin/layout.tsx` — admin shell + nav
- `src/app/api/content/schedule/route.ts` — POST → push to Buffer queue → update Draft.bufferId/scheduledAt/status
- `src/app/api/auth/buffer/route.ts` — OAuth callback

Reads: `drafts`, `posts`.
Writes: `drafts`, `posts`.
Env: `BUFFER_TOKEN`, `BUFFER_CLIENT_ID`, `BUFFER_CLIENT_SECRET`.

Slot strategy for X 4/day: 9am, 1pm, 5pm, 9pm America/New_York. LI 5/wk: Tue/Wed/Thu 8am + 2pm. Round-robin from approved queue.

## Slice D — Idea Inbox + Radar + Repurposer (`slice/idea-inbox`)
Owner files:
- `src/app/admin/content/ideas/page.tsx` — list + create + score + select
- `src/app/api/content/ideas/route.ts` — CRUD
- `scripts/daily-radar.ts` — scrape HN front page, r/SaaS, r/startups, r/legaltech, r/healthIT → score → upsert to `ideas`. Use simple keyword-match scoring against `icp.md` keywords.
- `src/lib/content/repurpose.ts` — input: long text → output: 5 LI + 10 X + 2 threads via Slice B's `claude.ts`
- `src/app/api/content/repurpose/route.ts` — POST endpoint
- Daily digest email via Resend (8am cron) — top 5 ideas → user

Reads: `ideas`, brand files.
Writes: `ideas`, `drafts` (via repurpose).
Env: `RESEND_API_KEY`, `RESEND_FROM`.

## Slice E — Lead Capture (`slice/lead-capture`)
Owner files:
- `src/app/audit/page.tsx` — Calendly embed + UTM ping to `/api/content/attribution`
- `src/app/api/content/attribution/route.ts` — log view/click/book events
- `src/app/api/webhooks/calendly/route.ts` — Calendly webhook → match utm → update `posts.leads`
- `src/app/admin/content/attribution/page.tsx` — leaderboard: posts by leads_per_view
- `src/lib/content/attribution.ts` — UTM helpers (build/parse `utm_campaign={postId}`)

Reads: `posts`, `attribution`.
Writes: `attribution`, `posts.leads`.
Env: `CALENDLY_TOKEN`, `CALENDLY_URL`, `CALENDLY_WEBHOOK_SECRET`.

## Coordination rules
- DO NOT modify files outside your owner list (except adding env vars to `.env.example`).
- If you need a function from another slice that doesn't exist yet, stub it locally with `TODO: from slice X` comment.
- Commit small, push often to your branch.
- Final integration done on `main` after all slices land.
