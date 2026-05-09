"""ScrapeGraphAI helper.

Called by Node via subprocess. Reads JSON job from stdin, writes JSON result to stdout.

Job shape:
{
  "task": "li_profile_posts" | "x_profile_posts" | "single_post",
  "handle": "...",            # for profile-posts tasks
  "url": "...",               # for single_post task
  "limit": 25,
  "prompt": "..."             # optional override extraction prompt
}

Result shape (success):
{ "ok": true, "posts": [ {body, likes, comments, reposts, postedAt, url, mediaType} ] }

Result shape (error):
{ "ok": false, "error": "..." }
"""
from __future__ import annotations

import json
import os
import sys
import traceback


DEFAULT_LI_PROMPT = (
    "Extract the most recent posts from this LinkedIn profile feed. "
    "For each post return: body (the full post text), likes (int), comments (int), "
    "reposts (int), postedAt (ISO date if visible else relative time string), "
    "url (permalink to the post), mediaType (one of: text, image, video, carousel)."
)

DEFAULT_X_PROMPT = (
    "Extract the most recent posts from this X (Twitter) profile. "
    "For each post return: body (full tweet text), likes (int), reposts (int retweets+quotes), "
    "comments (int replies), postedAt (ISO date if visible else relative), url, mediaType."
)


def make_config():
    backend = os.environ.get("SCRAPER_LLM_BACKEND", "ollama")
    model = os.environ.get("SCRAPER_LLM_MODEL", "llama3.1")
    if backend == "ollama":
        return {
            "llm": {
                "model": f"ollama/{model}",
                "base_url": os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
                "model_tokens": 8192,
            },
            "headless": True,
            "verbose": False,
        }
    raise RuntimeError(f"unsupported SCRAPER_LLM_BACKEND={backend}")


def li_profile_url(handle: str) -> str:
    h = handle.strip().lstrip("@/")
    if h.startswith("http"):
        return h
    return f"https://www.linkedin.com/in/{h}/recent-activity/all/"


def x_profile_url(handle: str) -> str:
    h = handle.strip().lstrip("@/")
    if h.startswith("http"):
        return h
    return f"https://x.com/{h}"


def run(job: dict) -> dict:
    from scrapegraphai.graphs import SmartScraperGraph  # type: ignore

    task = job.get("task")
    limit = int(job.get("limit", 25))
    config = make_config()

    if task == "li_profile_posts":
        url = li_profile_url(job["handle"])
        prompt = job.get("prompt") or f"{DEFAULT_LI_PROMPT} Limit to {limit} most recent posts."
    elif task == "x_profile_posts":
        url = x_profile_url(job["handle"])
        prompt = job.get("prompt") or f"{DEFAULT_X_PROMPT} Limit to {limit} most recent posts."
    elif task == "single_post":
        url = job["url"]
        prompt = job.get("prompt") or (
            "Extract the post body, likes, comments, reposts, postedAt, url, mediaType, author."
        )
    else:
        raise ValueError(f"unknown task: {task}")

    graph = SmartScraperGraph(prompt=prompt, source=url, config=config)
    result = graph.run() or {}
    posts = result.get("posts") or result.get("data") or []
    if isinstance(posts, dict):
        posts = [posts]
    return {"ok": True, "posts": posts, "source_url": url}


def main():
    raw = sys.stdin.read()
    try:
        job = json.loads(raw)
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"invalid json: {e}"}))
        return
    try:
        out = run(job)
    except Exception as e:
        out = {
            "ok": False,
            "error": str(e),
            "trace": traceback.format_exc(limit=5),
        }
    sys.stdout.write(json.dumps(out, default=str))


if __name__ == "__main__":
    main()
