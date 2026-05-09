# scripts/scrape — ScrapeGraphAI Python helper

Replaces the (initially planned) Apify dependency with a self-hosted, free alternative built on [ScrapeGraphAI](https://github.com/ScrapeGraphAI/Scrapegraph-ai) + Ollama (local LLM, no API key).

## Setup (one-time)

```bash
# 1. Python venv inside this dir
cd scripts/scrape
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# 2. Local LLM (Ollama)
brew install ollama
ollama serve &
ollama pull llama3.1
```

## Test

```bash
echo '{"task":"x_profile_posts","handle":"levelsio","limit":5}' | python3 scrape.py
```

## How Node calls it

`src/lib/content/scraper.ts` (Slice A) spawns:
```
SCRAPER_PYTHON ./scripts/scrape/.venv/bin/python ./scripts/scrape/scrape.py
```
…writes job JSON to stdin, reads result JSON from stdout. Timeout 90s.

## Tasks supported

- `li_profile_posts {handle, limit}`
- `x_profile_posts {handle, limit}`
- `single_post {url}`

## Notes
- LinkedIn requires login for most profile data. Slice A may need to fall back to manual paste-in for LI initially.
- X is harder than it used to be post-API-changes; rate limiting expected. Mitigations: throttle, free-proxy rotation (in requirements.txt).
- Whole pipeline degrades gracefully — if scraper returns `{ok:false}`, viral-mine logs and continues.
