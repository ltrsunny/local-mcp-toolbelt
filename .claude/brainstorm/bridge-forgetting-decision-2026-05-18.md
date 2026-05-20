# Decision: bridge-forgetting workflow fix — S6 primary + S7 fallback

Date: 2026-05-18
Trigger: User catch "总忘记调用模型干活，已反复多次"
Voices: copilot / gem --strict / nvidia-llama-3.3-nemotron-super-49b / mistralai/mistral-nemotron
Brief: `.claude/brainstorm/bridge-forgetting-brief-2026-05-18.md`

## Tally

| Voice | Pick | Attacks | Root cause |
|---|---|---|---|
| copilot | S2 (prompt-PreToolUse hook) | S6 brittle coupling | R4+R3 |
| gem --strict | **S6** | S2 brittle "LLM second-guessing frontier" | R4 |
| nemotron-49b | **S6** | S2 latency + judgement variance | R4 |
| mistral-nemotron | **S6** | S2 prompt-gameable | R4+R5 |

**3-1 for S6. R4 (task-granularity misclassification) unanimous driver.**

## Key insight (gem)

> "The orchestrator is behaving rationally given the data format it is
> handed. The blind spot is treating this as a 'Claude forgets'
> problem rather than recognizing that the **pipeline itself is
> failing to map-reduce its own artifacts** before passing them back
> to the orchestrator."

This reframes the problem: it's not discipline (Claude should remember
the rule), it's infrastructure (voice runner should pre-extract).

## Copilot's S2 attack on S6 (the real risk)

> "demands upstream infra changes, brittle coupling: if any producer
> diverges or misses a voice, Claude stalls waiting for a JSONL that
> may never appear."

This is real. Single producer failure poisons the whole flow. Mitigation
must include: per-voice timeout, partial-result tolerance, fallback to
raw-read with explicit log when JSONL is missing/malformed.

## Decision

**S6 primary + S7 memory-rule fallback.**

### S6 — `bin/run-voices.mjs` voice runner with auto-extract
Single script that takes:
- `--brief <path>`
- `--voices <comma-separated lineup, e.g. copilot,gem-strict,nv@meta/llama-3.1-70b>`
- `--extract-schema <path-to-json-schema>` (default: `{voice_id, stance,
  key_args[], critique, root_cause}` for adversarial brainstorms)

Runs all voices in parallel with timeout per voice (default 90s). For each
voice's output:
1. Bridge `extract` with the schema → structured JSON
2. Append to `synthesis.jsonl` (one record per voice)
3. If a voice fails or times out: record `{voice_id, status: "failed",
   error: "..."}` to keep aggregation honest

Claude only reads `synthesis.jsonl` (small, structured). No more per-voice
raw `.log` reads.

### S7 — Memory rule: 3-question gate
For situations the runner doesn't cover (ad-hoc voice peeks, debugging),
add to memory:

> Before any non-surgical Read of a file >1 KB:
> Q1: Is total content I'll read this turn >1 KB combined?
> Q2: Is my task summarize / extract / classify / transform?
> Q3: Will the result be quoted/paraphrased, not edited-in-place?
> ≥2 Yes → MUST route through bridge.

## What's NOT being done

- **S1 (drop threshold to 1 KB)** — kicks in too often, breaks legit
  source-code reads
- **S2 (prompt-PreToolUse hook)** — 3 voices flagged "LLM second-guessing
  frontier" as a recurring frustration vector + latency tax
- **S3 (CLAUDE.md decision-tree)** — already tried; the 200-line cap
  compresses the rule; making it longer doesn't fix R4 because the rule
  is invisible at decision-time anyway
- **S4 (`.log` 0-threshold)** — narrow, only covers today's specific shape
- **S5 (PostCompact spend audit)** — useful telemetry but doesn't change
  in-the-moment behavior

## Framing flaws spotted

- **gem**: implicit assumption that file outputs are immutable
- **mistral**: missed type-2 errors (users silently adapting around
  false positives)
- **nemotron**: S/R presented in coupled form → preconceived balance
- **copilot**: no metrics / A-B baseline defined

All four are valid. Mitigation: when implementing S6, add a 2-week
telemetry phase (record bridge-saved-tokens, voice-runner failure rate,
fall-back-to-Read frequency) before declaring success.

## Action items (when implementing — NOT today)

1. `packages/core/bin/run-voices.mjs` — voice runner with auto-extract
2. Schema library: `.claude/schemas/adversarial-brainstorm-v1.json`
3. Memory patch: `~/.claude/.../memory/bridge-trigger-checklist.md` —
   add 3-question gate from S7
4. Telemetry: emit `voice-runner-spend.jsonl` for the 2-week eval

## Voice logs
- `tmp/copilot-bridge-forget.log` (S2)
- `tmp/gem-bridge-forget.log` (S6 — gem --strict, no fallback)
- `tmp/nemotron-bridge-forget.log` (S6)
- `tmp/mistral-bridge-forget.log` (S6)
