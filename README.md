# content-creation

Social content engine for **Enigma Labs**. Mines viral posts from ICP-adjacent creators on LinkedIn + X, extracts structural templates, generates posts in Enigma voice for client acquisition.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- **SQLite + Drizzle ORM** (single local file, zero infra)
- **ScrapeGraphAI** Python helper + Ollama (local LLM, no API keys) for LI + X scraping
- Resend (email), Buffer (LI + X scheduling)
- Claude Code CLI (`claude -p` subprocess) for generation — no API key required

## Pipeline

```
[100 ICP creators] → ScrapeGraphAI daily fetch → viral_posts (SQLite)
                                                  ↓
                                      embed + cluster (weekly)
                                                  ↓
                                            templates (SQLite)
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
    db/
      schema.ts         Drizzle schema (frozen)
      index.ts          DB client, migrations, JSON helpers (frozen)
    content/
      claude.ts         claude -p subprocess wrapper
      buffer.ts         Buffer API client
      scraper.ts        ScrapeGraphAI Python subprocess wrapper
      voice.ts          BRAND.md loader + prompt builder
      cluster.ts        embed + cluster + template extraction
      repurpose.ts      blog → 5 LI + 10 X
scripts/scrape/
  scrape.py             ScrapeGraphAI helper (called by scraper.ts)
  requirements.txt      Python deps (scrapegraphai + playwright)
drizzle/                Drizzle migrations (committed)
data/                   SQLite file (gitignored)
      scoring.ts        engagement → template feedback
scripts/
  content-new.ts        CLI: pnpm content:new "<topic>"
  ingest-handles.ts     One-time: mine OWN voice samples
  viral-mine.ts         Daily cron: Apify fetch
  viral-cluster.ts      Weekly: cluster + extract templates
  daily-radar.ts        Cron: HN/Reddit idea scrape
```

## Env

Copy `.env.example` to `.env.local`. Key vars:

```
SQLITE_PATH=./data/content.db
SCRAPER_PYTHON=python3
SCRAPER_LLM_BACKEND=ollama
SCRAPER_LLM_MODEL=llama3.1
OLLAMA_BASE_URL=http://localhost:11434
RESEND_API_KEY=
BUFFER_TOKEN=
CALENDLY_URL=
CALENDLY_WEBHOOK_SECRET=
```

## Setup

```bash
pnpm install
pnpm db:generate     # one-time, generates drizzle/0000_*.sql from schema
# DB auto-migrates on first getDb() call

# Scraping helper (one-time)
cd scripts/scrape && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && playwright install chromium
brew install ollama && ollama serve & && ollama pull llama3.1
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
