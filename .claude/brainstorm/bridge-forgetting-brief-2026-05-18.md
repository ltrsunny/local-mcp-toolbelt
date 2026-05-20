# Brief: Claude keeps forgetting to call the bridge

You are one of 4 adversarial voices on a META workflow problem.
This is NOT a project-code question. **The synthesizer has no
default preference among options.** Risk presentation is matched
across all options to avoid the framing-bias failure from the
prior round.

## The recurring problem

In this single session, Claude (the orchestrator) has read content
into frontier context that should have been delegated to the local
bridge **at least 4 times today**:

1. 4× voice outputs (~2 KB each) on a previous fan-out — full
   `cat` instead of bridge `extract`
2. NIM tier-map JSON (~50 KB scraped from build.nvidia.com) —
   raw `Read` then in-frontier `grep`
3. Current round (commit history hygiene) Round 1: 4 voice logs
   raw-read until user intervened
4. After user intervention, switched to `extract` for Round 2 —
   but only because user explicitly called it out

Each individual file was BELOW the bridge-enforce hook's 4 KB
internal-data threshold (.log files, ~1.5 KB each). The hook
didn't block. But the **aggregate task** ("read 4 files + abstract
each voice's 4-field argument") is squarely a 4× extract job.

The pattern: Claude under-counts the **task** size (it's a
synthesis/extraction job, not a "look at a small note").

## Candidate root causes (matched-form)

| ID | Root cause | Evidence-today | Cost of ignoring | Cost of over-correcting |
|---|---|---|---|---|
| R1 | Hook thresholds purely byte-based | 4× 1.5 KB files all pass | Cumulative leakage | False positives on legit small reads |
| R2 | Sunk-cost bias on system-reminder replays | Post-compact replay of 6 Reads | Treat "already paid" as license to keep reading | None — pure mental model |
| R3 | No pre-action self-check | Read fires without prompt | Reflex over judgment | Latency on every Read |
| R4 | Task-granularity misclassification | "small cat" vs "4× extract" | Same as today | Over-bridge tiny notes |
| R5 | Batching default = read-as-they-finish | Drip-read each voice as it completes | Each individual feels small | Wait for all → blocks if one hangs |
| R6 | CLAUDE.md 200-line cap compresses rule | "Trigger checklist" is one bullet | Rule is invisible at decision-time | Bloats CLAUDE.md beyond cap |
| R7 | No PostRead self-audit | Frontier-token spend not tracked | No feedback loop | Audit overhead |

## Candidate solutions (matched-form)

| ID | Solution | What it does | Cost | Benefit |
|---|---|---|---|---|
| S1 | Drop internal-data hook from 4 KB → 1 KB | Catch more reads early | Blocks more legit reads | Hard floor on leakage |
| S2 | Prompt-type PreToolUse hook on Read | Local model judges "bridge-eligible?" | Adds ~2 s latency per Read | Catches granularity misjudgment R4 |
| S3 | CLAUDE.md decision-tree (not bullet) | Replaces "铁律" with `IF size>1KB AND task=extract THEN bridge` | +5 lines in 200-line cap | Visible at every Read |
| S4 | New extension class: `*.log` 0-byte threshold | Voice logs always go through bridge | Some legit small log peek must use bypass | Closes today's specific hole |
| S5 | PostCompact-hook session-spend audit | Compares frontier-input-tokens vs bridge-saved-tokens | Mental overhead of seeing report | Visible feedback loop R7 |
| S6 | Refactor workflow: voice runner writes pre-extracted JSONL | Claude only reads the JSONL summary | One-shot infra work | Removes the decision entirely |
| S7 | Memory rule: "3 Yes-questions before Read" | Q1 size>1KB? Q2 task=extract? Q3 not surgical-edit? → bridge | Decision overhead | Forces conscious step |

## Your task

1. **Pick your preferred option** (S1-S7 or D/E/F you invent).
2. **Attack the strongest competing option** — concrete failure mode,
   not "I prefer mine".
3. **Propose a concrete refinement** to your pick. If S2, what
   prompt text. If S3, what specific decision-tree. If S6, what
   JSONL schema.
4. **Diagnose root cause** — which of R1-R7 is the dominant driver?
5. **Spot a flaw in this brief's framing** if you see one. (Self-
   challenge: brief author drafted both root-cause list and solution
   list — possible blind spots.)

200-400 words. Comment body only.
