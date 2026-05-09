# Parallel Build Slices (v2 — SQLite + ScrapeGraphAI)

> **Pivot:** Mongo dropped → SQLite via Drizzle. Apify dropped → ScrapeGraphAI Python helper (Ollama backend, no API keys).

Each slice owns one branch + worktree. Coordinate only via:
- `src/lib/db/schema.ts` and `src/lib/db/index.ts` (frozen — extend in your slice via new tables only if absolutely needed)
- `.env.example` (append new vars in your slice)
- This file (frozen contracts)

## Shared types
All slices import from `src/lib/db`:
```ts
import { getDb, schema, type ViralPost, type Template, type Handle, type Idea, type Draft, type PostRecord, type Attribution, type Platform, parseJson, stringifyJson, newId } from "@/lib/db"; // or relative path
import { eq, desc, and } from "drizzle-orm";
```

Tables: `schema.handles`, `schema.viralPosts`, `schema.templates`, `schema.ideas`, `schema.drafts`, `schema.posts`, `schema.attribution`.

JSON columns (text under hood): `viralPosts.embedding`, `viralPosts.tags`, `templates.hookExamples`, etc. → use `parseJson(row.embedding, [])` to read, `stringifyJson(arr)` to write.

DB file: `./data/content.db` (gitignored). Migrations in `./drizzle/`. Run `pnpm db:generate` after schema changes (only if you really must — coordinate first).

## Slice A — Viral Mine (`slice/viral-mine`)
Owner files:
- `src/lib/content/scraper.ts` — Node wrapper around `scripts/scrape/scrape.py`. Spawns `process.env.SCRAPER_PYTHON ./scripts/scrape/scrape.py`, writes JSON job to stdin, reads JSON from stdout. 90s timeout. Functions: `scrapeLinkedInProfile(handle, limit)`, `scrapeXProfile(handle, limit)`, `scrapeSinglePost(url)`. If Python or Ollama unavailable, return `{ok:false, error}` and let caller no-op.
- `src/lib/content/cluster.ts` — embeddings (use `@xenova/transformers` `Xenova/all-MiniLM-L6-v2`, local, no API key) + k-means (k=8, write inline). Export `cosineSimilarity(a, b)` for Slice B.
- `scripts/viral-mine.ts` — load `src/content/brand/handles.yaml` → for each handle call scraper → filter by thresholds (from yaml) → upsert to `viralPosts` table. Use Drizzle `insert().onConflictDoUpdate({target: viralPosts.url, set: ...})`.
- `scripts/viral-cluster.ts` — load all `viralPosts` lacking `embedding` → embed → write back → cluster all → write `templates` (stub archetype labels with TODO; Slice B provides claude.ts later).
- `src/app/admin/content/viral/page.tsx` — server component listing viral posts, filters: platform, cluster, min likes
- `src/app/api/content/viral/route.ts` — GET endpoint with filters

**Add to `.env.example`**: nothing new (scraper vars already there).
**Add deps**: `@xenova/transformers`, `js-yaml`, `@types/js-yaml`.

**Constraints:**
- Touch nothing outside owner list except `.env.example`, `package.json`, and `src/content/brand/handles.yaml` (read-only).
- Do NOT modify `src/lib/db/`.
- ScrapeGraphAI Python deps live in `scripts/scrape/` venv; the helper script `scripts/scrape/scrape.py` already exists. Just call it.

## Slice B — Voice & Forge (`slice/voice-forge`)
Owner files:
- `src/lib/content/claude.ts` — wrapper around `claude -p "<prompt>"` via `child_process.spawn`. Capture stdout. 60s timeout. Reject if `claude` binary missing. NO `langchain-anthropic`, NO API keys.
- `src/lib/content/voice.ts` — `loadBrand()` reads `BRAND.md`, `voice-samples.md`, `icp.md`. `buildForgePrompt({topic, channel, format, template, viralSourceTexts, recentDraftBodies})` returns string.
- `src/content/brand/BRAND.md` — expand stub
- `src/content/brand/voice-samples.md` — placeholder + 3 LI + 5 X hand-written samples
- `src/content/brand/icp.md` — expand
- `scripts/content-new.ts` — CLI: `pnpm content:new "<topic>" [--channel=li|x] [--format=single|thread]`. Reads brand → picks template (least-recently-used, diverse archetype) via Drizzle query → fetches 3 source viral posts → builds prompt → claude.ts → parses 3 variants → inserts as `Draft` rows (`status: "draft"`).
- `scripts/ingest-handles.ts` — one-time: read `OWN_LINKEDIN_HANDLE`, `OWN_X_HANDLE` env → call Slice A's `scraper.ts` → distill into `voice-samples.md`.
- `src/app/api/content/generate/route.ts` — POST `{topic, channel, format}` → returns 3 draft IDs.

**Add to `.env.example`**: vars already there (`OWN_LINKEDIN_HANDLE`, `OWN_X_HANDLE`).

**Constraints:**
- Touch nothing outside owner list.
- If Slice A's `scraper.ts`/`cluster.ts` not yet in main, write `// TODO: import from slice A` comments and stub locally.

## Slice C — Buffer + Admin UI (`slice/buffer-ui`)
Owner files:
- `src/lib/content/buffer.ts` — Buffer API client (PAT auth via `BUFFER_TOKEN`). Functions: `schedulePost({channel, body, scheduledAt, mediaUrl?})`, `getProfiles()`, `getQueue(profileId)`.
- `src/app/admin/layout.tsx` — admin shell, sidebar (Pipeline, Drafts, Queue, Viral, Ideas, Attribution). Brand tokens.
- `src/app/admin/content/page.tsx` — pipeline dashboard (counts per `Draft.status` via `select count`)
- `src/app/admin/content/drafts/page.tsx` — list + edit + approve + schedule
- `src/app/admin/content/queue/page.tsx` — 14-day calendar
- `src/app/api/content/schedule/route.ts` — POST `{draftId, scheduledAt?}` → buffer push → update Draft
- `src/app/api/content/drafts/[id]/approve/route.ts` — POST → set status `approved`
- `src/app/api/content/drafts/route.ts` — GET (filter by status) + PATCH (edit body)
- `src/lib/content/slots.ts` — slot strategy: X 4/day at 9/13/17/21 ET, LI 5/wk Tue/Wed/Thu 8am+2pm. Export `nextAvailableSlot(channel, after?)`.

**Add to `.env.example`**: vars already there (`BUFFER_TOKEN`, `BUFFER_LINKEDIN_PROFILE_ID`, `BUFFER_X_PROFILE_ID`).

**Constraints:** brand tokens via `var(--c-cyan)` etc. Server components for fetching, client components only for interactive bits.

## Slice D — Idea Inbox + Radar + Repurposer (`slice/idea-inbox`)
Owner files:
- `src/app/admin/content/ideas/page.tsx` — list + select + forge buttons
- `src/app/api/content/ideas/route.ts` — GET (filters) + POST (manual create)
- `src/app/api/content/ideas/[id]/route.ts` — PATCH/DELETE
- `src/app/api/content/ideas/[id]/select/route.ts` — set status `selected`
- `src/app/api/content/ideas/[id]/forge/route.ts` — call Slice B's generate
- `scripts/daily-radar.ts` — HN top 50 + r/SaaS r/startups r/legaltech r/healthIT (User-Agent header) → score → upsert
- `scripts/daily-digest.ts` — top 5 unselected → email via Resend
- `src/lib/content/repurpose.ts` — input long text → 5 LI + 10 X + 2 threads via Slice B's claude.ts
- `src/lib/content/radar.ts` — `extractKeywords(icpText)`, `scoreIdea(text, keywords)`
- `src/app/api/content/repurpose/route.ts` — POST endpoint

**Add to `.env.example`**: vars already there (`OPERATOR_EMAIL`, `RESEND_API_KEY`).

**Constraints:** dedupe ideas by URL. Skip writes if no DB writable (graceful dry-run logging).

## Slice E — Lead Capture (`slice/lead-capture`)
Owner files:
- `src/lib/content/attribution.ts` — `buildAuditUrl({postId, channel, baseUrl})`, `parseUtm(searchParams)`
- `src/app/audit/page.tsx` — server component, dark on-brand, Calendly embed
- `src/app/audit/track-view.tsx` — client component, fires POST to attribution endpoint on mount
- `src/app/api/content/attribution/route.ts` — POST `{utm_campaign, utm_source, eventType}` → insert `attribution`
- `src/app/api/webhooks/calendly/route.ts` — HMAC-verify with `CALENDLY_WEBHOOK_SECRET`. On `invitee.created` → match `posts.id = utm_campaign` → `posts.leads += 1` + `attribution {eventType:"book"}`
- `src/app/admin/content/attribution/page.tsx` — leaderboard

**Add to `.env.example`**: vars already there.

**Constraints:** graceful when env vars missing. NO emoji. Brand tokens.

## Coordination rules
- DO NOT modify files outside your owner list (only `.env.example` additions and own slice's `package.json` deps).
- If you need a function from another slice that doesn't exist yet, stub it locally with `// TODO: from slice X` comment.
- Commit small. NO co-authored-by. NO emoji in commits.
- Push to `origin/slice/<your-slice>` when done.
- Final integration on `main` after all slices land via PR review.
