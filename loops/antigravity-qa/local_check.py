#!/usr/bin/env python3
"""Local-model bug CHECKER for the Antigravity-QA loop (hybrid: checker swapped to a local LLM).

A CONSTRAINED per-file review — weak local models flail at open-ended agentic exploration, so this
feeds the model ONE engine file at a time and asks for findings in a strict JSON schema, then
validates/dedups/appends them to `.ralph/bug-queue.md`. The fix phase (Claude) and verify phase
(agy/Gemini) are unchanged — only the discovery role is local.

Talks to an Ollama-compatible HTTP endpoint (no extra Python deps — stdlib only).

Env:
  OLLAMA_HOST   default http://192.168.11.22:11434  (the GPU box running `ollama serve`)
  LOCAL_MODEL   default qwen2.5-coder:14b
  MAX_PER_FILE  default 2   (cap findings/file to avoid flooding a weak model's noise)
  TIMEOUT       default 600  (seconds per model call)
"""
import json, os, re, sys, urllib.request, pathlib

KIT = pathlib.Path(__file__).resolve().parent
ROOT = KIT.parents[1]                       # repo root from loops/antigravity-qa/
QUEUE = ROOT / ".ralph" / "bug-queue.md"
OLLAMA = os.environ.get("OLLAMA_HOST", "http://192.168.11.22:11434").rstrip("/")
MODEL = os.environ.get("LOCAL_MODEL", "qwen2.5-coder:14b")
MAX_PER_FILE = int(os.environ.get("MAX_PER_FILE", "2"))
TIMEOUT = float(os.environ.get("TIMEOUT", "600"))

# The highest-signal engine surfaces to review (one model call each).
TARGETS = [
    "src/module/rolls/damage-data.mjs",
    "src/module/rolls/action-data.mjs",
    "src/module/rolls/roll-data.mjs",
    "src/module/rolls/assign-damage-data.mjs",
    "src/module/rolls/roll-helpers.mjs",
    "src/module/rules/combat-actions.mjs",
    "src/module/rules/attack-specials.mjs",
    "src/module/documents/acolyte.mjs",
    "src/module/documents/voidship.mjs",
]

BRIEF = (KIT / "bug_check_local.md").read_text()

# Injected for testing: a stub may replace `chat` to avoid a live model call.
def chat(system: str, user: str) -> str:
    # NOTE: deliberately NOT using Ollama's `format:"json"` — forcing JSON suppresses the model's
    # reasoning (it just emits the simplest valid object, e.g. `{}`, and misses obvious bugs). We
    # let it reason and END with a JSON object, then extract it (see _parse_findings).
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "stream": False,
        "options": {"temperature": 0.3, "num_ctx": 16384, "num_predict": 1024},
    }).encode()
    req = urllib.request.Request(f"{OLLAMA}/api/chat", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode())["message"]["content"]


def _parse_findings(raw: str):
    """Pull the findings list out of the model's reasoning reply (the JSON object is emitted at the
    end, optionally fenced)."""
    # Primary: the {...} object that contains a "findings" array.
    m = re.search(r'\{[^{}]*"findings"\s*:\s*\[.*?\]\s*\}', raw, re.S)
    if m:
        try:
            return json.loads(m.group(0)).get("findings", []) or []
        except Exception:
            pass
    # Fallback: a bare top-level array of finding objects.
    m2 = re.search(r'\[\s*\{.*\}\s*\]', raw, re.S)
    if m2:
        try:
            d = json.loads(m2.group(0))
            return d if isinstance(d, list) else []
        except Exception:
            pass
    return []


def _queue_titles() -> list:
    """The titles of findings ALREADY in the queue — the dedup target. Deliberately NOT the
    CLAUDE.md changelog or the 160-entry QA_FINDINGS.md: those name every feature, so matching
    against them suppresses legitimate NEW findings about known features. Broader 'is this already
    handled elsewhere' triage is the fixer's (Claude's) job, per fix.prompt.md."""
    try:
        return [m.group(1).lower() for m in re.finditer(r"## BUG-Q-\d+ — (.+)", QUEUE.read_text())]
    except Exception:
        return []


def _next_num() -> int:
    nums = [int(m.group(1)) for m in re.finditer(r"## BUG-Q-(\d+)", QUEUE.read_text())]
    return (max(nums) if nums else 160) + 1


_STOP = {"weapon", "damage", "quality", "attack", "incorrect", "applies", "instead",
         "missing", "should", "value", "rules", "logic", "engine"}

def _is_dup(title: str, seen_titles: list) -> bool:
    """A finding duplicates an existing QUEUE finding when their distinctive title keywords
    overlap by 2+ (catches the local model re-filing the same bug within a run)."""
    words = {w for w in re.findall(r"[a-z][a-z-]{3,}", title.lower()) if w not in _STOP}
    if not words:
        return False
    for t in seen_titles:
        tw = {w for w in re.findall(r"[a-z][a-z-]{3,}", t) if w not in _STOP}
        if len(words & tw) >= 2:
            return True
    return False


def main() -> int:
    if not QUEUE.exists():
        print("queue missing — run the loop driver once to seed it.", file=sys.stderr)
        return 1
    seen = _queue_titles()
    n = _next_num()
    appended = 0
    for rel in TARGETS:
        p = ROOT / rel
        if not p.exists():
            continue
        snippet = p.read_text()[:48000]      # keep within the model's context window
        user = (f"Review this file for up to {MAX_PER_FILE} REAL, evidence-backed Rogue Trader 1e "
                f"correctness bugs. Think briefly, then END your reply with ONE JSON object on its "
                f"own line.\n\nFILE: {rel}\n```javascript\n{snippet}\n```\n\n"
                f"Final line format:\n"
                f'{{"findings":[{{"title":"...","area":"weapons|rules|psychic|ship|vehicle|...",'
                f'"severity":"P0|P1|P2|P3","evidence":"the code line + a short quote",'
                f'"canon":"the RT rule, or \'unsure\' if you are not certain","gap":"does X, should do Y"}}]}}\n'
                f"Use an empty findings list only if there is genuinely no bug. Do NOT invent a rule "
                f"— if unsure of the Rogue Trader canon, set canon to 'unsure'.")
        try:
            raw = chat(BRIEF, user)
        except Exception as e:
            print(f"[{rel}] ollama error: {e}", file=sys.stderr)
            continue
        for fd in _parse_findings(raw)[:MAX_PER_FILE]:
            if not isinstance(fd, dict):
                continue
            title = str(fd.get("title", "")).strip().replace("\n", " ")
            if not title or _is_dup(title, seen):
                continue
            block = (f"\n## BUG-Q-{n} — {title}\n"
                     f"- status: open\n"
                     f"- found-by: local ({MODEL}) · {rel}\n"
                     f"- area: {fd.get('area', 'other')}\n"
                     f"- severity: {fd.get('severity', 'P2')}\n"
                     f"- evidence: {rel} — {str(fd.get('evidence', '')).replace(chr(10), ' ')}\n"
                     f"- canon: {str(fd.get('canon', 'unsure')).replace(chr(10), ' ')}\n"
                     f"- gap: {str(fd.get('gap', '')).replace(chr(10), ' ')}\n"
                     f"- fix: \n- verify: \n")
            with open(QUEUE, "a") as q:
                q.write(block)
            seen.append(title.lower())
            print(f"[{rel}] filed BUG-Q-{n}: {title}")
            n += 1
            appended += 1
    print(f"local check done — {appended} new finding(s) appended to {QUEUE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
