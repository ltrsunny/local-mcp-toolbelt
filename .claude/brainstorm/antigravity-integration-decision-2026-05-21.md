# Decision: Antigravity integration — refined-A with security tightening

Date: 2026-05-21
Trigger: PM "先对抗性脑暴" after agy CLI 5-axis audit completed
Voices: ghm@openai/gpt-4o, ghm@deepseek/deepseek-r1,
nv_pro@mistralai/mistral-large-3-675b-instruct-2512
(copilot-free FAILED — agentic mode over-explored project files,
400 transient_bad_request)
Platforms: 2 (GitHub Models + NIM) — `copilot-free` failure cost us
the 3rd platform; fallback to 2 acceptable given strong evidence
convergence on framing flaws
Brief: `.claude/brainstorm/antigravity-integration-brief-2026-05-21.md`

## Vote tally

| Voice | Pick | Attack target |
|---|---|---|
| gpt-4o | **E (Reject)** | C — "light integration is incompatible with workflows needing deterministic per-thread models" |
| deepseek-r1 | **A (Full adopt)** | C — "Schrödinger strategy: clinging to dying tool while underutilizing replacement" |
| mistral-large | **E (Reject)** | A — "cross-polluting contexts, quota exhaustion, loss of model state per conversation" |

**C (synthesizer's draft) loses 2/3.** Real split: A=1 / E=2.

## Synthesizer's draft (C, "light integration") FAILED

Both E voices reject the synth-draft. deepseek-r1 was more
constructive — argued FOR full adoption (A) over status-quo (C).
gpt-4o and mistral both went for full reject (E) but for different
reasons: gpt-4o cited single-sticky → workflow friction; mistral
cited security + cross-pollution.

## Convergent framing flaw (2/3 independent)

**`/Users/rd` trustedWorkspaces is too broad.** gpt-4o + mistral
both flagged: agy currently has file-read access to the entire
home dir subtree, not just our project. Security risk for any
file in `~/...` (including secrets in `~/.config/claude-dev/`,
ssh keys, etc.). **Should tighten to `/Users/rd/ollama-claude`
specifically.**

## Other findings worth noting

- **deepseek-r1 hallucinated a docs URL**: cited `antigravity.ai/
  docs/v1/conversations#model-inheritance` as source for
  per-conversation model inheritance claim. The real domain is
  `antigravity.google`, not `antigravity.ai`. **The claim
  itself (no per-convo model preservation) matches my actual
  experimental test today**, but the URL citation is fabricated.
  Voice family disclosed as "Google" so possibly trying to
  appear authoritative via fake citation. Discount the
  citation, keep the conclusion (which I independently verified).
- **deepseek-r1's "v1.1.0 roadmap adds /model <name> non-
  interactively"**: untestable claim about future. Don't bank
  on it.

## Decision: refined-A (full adoption with caveats)

The synth's C was correctly attacked. The choice is A vs E:

**Reasons A wins over E:**

1. **3.1 Pro capacity isolation is real and time-limited value**.
   Today's evidence: gemini-cli + free API key both 100%
   capacity-exhausted on 3.1-pro-preview. Antigravity gives
   working 3.1 Pro under daily-cloudcode-pa endpoint. Holding
   gem-pro as primary until 6/18 (deepseek-r1's "Schrödinger
   strategy" critique) wastes ~28 days of best-available Pro
   reasoning.
2. **Post-6/18 survival path is the right structural answer.**
   Antigravity is Google's documented migration target. Going
   in 28 days early lets us battle-test before forced.
3. **Switching latency (gpt-4o's main argument)** is real but
   bounded. Daily workflow uses 1 sticky model 90% of time;
   only fan-out brainstorm sessions need switches, and those
   are batch operations where 30-45s switching cost is small
   vs 30-min brainstorm run.

**But adopt with E's security flag honored:**

- **Tighten `~/.gemini/antigravity-cli/settings.json`
  trustedWorkspaces** from `/Users/rd` to
  `/Users/rd/ollama-claude` only.

## Concrete actions

### 1. Default agy sticky → Gemini 3.1 Pro (High)

User does this once interactively (`agy` → `/model` → Gemini 3.1
Pro (High) → exit). Persists across `agy -p` subprocess calls.

### 2. Tighten trustedWorkspaces

```bash
# Edit ~/.gemini/antigravity-cli/settings.json
# trustedWorkspaces: ["/Users/rd"]  →  ["/Users/rd/ollama-claude"]
```

User does this manually (file is mode 600, project-external).

### 3. helpers.sh wrapper: `agy_pro` as opt-in agentic Pro voice

```bash
agy_pro() {
  # Convenience wrapper; assumes /model already set to Gemini 3.1 Pro (High).
  # If sticky differs, output naming will reveal mismatch — user must /model.
  agy -p "$@" --dangerously-skip-permissions
}
```

(no env-var model switching possible per audit; user manages sticky)

### 4. Document use cases in CLAUDE.md cheat sheet

- `agy_pro` — agentic + Pro tier (3.1 Pro), 0 Premium quota burn,
  survives 6/18, replaces gem-pro after sticky set
- gem-pro stays available until 6/18 as fallback path

### 5. Do NOT replace gem-pro yet

Keep gem-pro defined for 28 more days as parallel fallback.
After 6/18, delete gem-pro / gem-pro-escalate from helpers.sh.

## What was NOT done (deferred)

- Multi-account agy (D) — hardware/account multiplication not in
  scope, no voice supported
- Replace gem-pro NOW — delay until 6/18 confirms gem-pro death
- Document /model switching protocol for occasional Sonnet/Opus
  fan-out — defer to actual use case emerging

## Process learnings

- **deepseek-r1 fabricated a citation URL** while reaching the
  right conclusion. Reminded again: even when voice answer
  matches independent test, **cite-checking remains essential**.
  Add to auditor-protocol anti-pattern #16: "Verify cited URLs
  exist before trusting their authority — even when the underlying
  claim happens to be correct."

- **copilot-free agentic over-exploration causes 400 errors.**
  When invoked from /Users/rd/ollama-claude (project cwd), it
  ran `glob "**/*.md"` and tried to read 174 files → context
  overload → API 400. **Don't invoke copilot-free from project
  root for fan-out tasks** (vs Bash subprocess). For fan-out
  voice use, run from /tmp or isolated dir.

## Voice logs
- `tmp/ghm-gpt4o-antigravity.log` (E reject, security flaw)
- `tmp/ghm-deepseekr1-antigravity.log` (A adopt, fake citation)
- `tmp/mistral-large-antigravity.log` (E reject, security flaw)
- `tmp/copilot-free-antigravity.log` (FAILED, agentic over-explore)
