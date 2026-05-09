# content-creation

Social content engine for **Enigma Labs**. Mines viral posts from ICP-adjacent creators on LinkedIn + X, extracts structural templates, generates posts in Enigma voice for client acquisition.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- MongoDB (storage), Resend (email)
- Apify (LI + X scraping)
- Buffer (LI + X scheduling)
- Claude Code CLI (`claude -p` subprocess) for generation — no API key required

## Pipeline

```
[100 ICP creators] → Apify daily fetch → viral_posts (Mongo)
                                          ↓
                              embed + cluster (weekly)
                                          ↓
                                    templates (Mongo)
                                          ↓
       Idea Inbox → Post Forge (template + BRAND.md + claude -p) → drafts
                                          ↓
                              admin review/edit → Buffer queue
                                          ↓
                                  LI + X publish
                                          ↓
              UTM → /audit → Calendly book → attribution
                                          ↓
                              perf loop → re-rank templates
```

## Repo layout

```
src/
  content/brand/        BRAND.md, voice-samples.md, icp.md, handles.yaml
  app/
    admin/content/      Pipeline dashboard (ideas, drafts, queue, viral)
    api/content/        generate, schedule, ideas, attribution
    audit/              Calendly embed + UTM ping
  lib/
    db.ts               MongoDB client + collections
    content/
      claude.ts         claude -p subprocess wrapper
      buffer.ts         Buffer API client
      apify.ts          Apify scraper client
      voice.ts          BRAND.md loader + prompt builder
      cluster.ts        embed + cluster + template extraction
      repurpose.ts      blog → 5 LI + 10 X
      scoring.ts        engagement → template feedback
scripts/
  content-new.ts        CLI: pnpm content:new "<topic>"
  ingest-handles.ts     One-time: mine OWN voice samples
  viral-mine.ts         Daily cron: Apify fetch
  viral-cluster.ts      Weekly: cluster + extract templates
  daily-radar.ts        Cron: HN/Reddit idea scrape
```

## Env

Copy `.env.example` to `.env.local`:

```
MONGODB_URI=
MONGODB_DB=content_creation
APIFY_TOKEN=
BUFFER_TOKEN=
CALENDLY_TOKEN=
RESEND_API_KEY=
RESEND_FROM=hello@enigmalabs.com
CALENDLY_URL=
```

## Scripts

```bash
pnpm dev                 # Next.js dev server
pnpm content:new "topic" # Generate post drafts
pnpm viral:mine          # Run Apify scrape
pnpm viral:cluster       # Re-cluster + extract templates
pnpm radar               # HN/Reddit idea scrape
```

## Slices (parallel build)

| Slice | Branch | Scope |
|-------|--------|-------|
| A | `slice/viral-mine` | Apify integration, scraping, storage, clustering |
| B | `slice/voice-forge` | BRAND.md, voice samples, Post Forge CLI, claude.ts |
| C | `slice/buffer-ui` | Buffer OAuth, scheduler, admin pipeline UI |
| D | `slice/idea-inbox` | Idea Inbox, daily radar, repurposer |
| E | `slice/lead-capture` | /audit page, UTM attribution, Calendly webhook |
