# Decision: anti-hallucination operational rules — 5 actionable patterns

Date: 2026-05-21 (gem baseline added 2026-05-22)
Trigger: PM "防幻觉现在是重中之重，不管是你自身还是调教其他模型的时候。
现在让各路 voice 都去上网做研究"

## Voice tally (re-categorized 2026-05-22 after PM caught silent-exclusion of gem)

**Agentic / real WebSearch**:
- Claude orchestrator (WebSearch, 5 axes, real URLs)
- agy_pro (Antigravity sticky=Gemini 3.1 Pro, real research, 5 axes
  + "woozle effect" finding)

**Training-data baseline (non-agentic, by family)**:
- gem (gemini-3.5-flash REST direct, Google-family, added 2026-05-22
  to fix silent-exclusion — see §gem-baseline below)
- nemotron (NIM URL auditor, NVIDIA-family — cutoff-bias caveat)

**Failed**:
- copilot-free: 400 transient_bad_request (AI Studio + Copilot 17K
  system prompt collision; structural)
- gem-pro v2: personal Pro 账号 capacity exhausted after 10 retries
- copilot BYOK→NIM (llama-3.3-70b): stack connected but model
  didn't auto-invoke Copilot's web tools — needs explicit prompt
- agy_pro v1: brief.md cwd handoff bug (NOT a fail — fixed via
  `--add-dir $tmp_ws` + absolute path; documented in helpers.sh
  agy_pro wrapper)

**Original error (#17 self-application)**: voice tally first written
2026-05-21 silently dropped gem with no exclusion rationale. PM
flagged 2026-05-22 as "重大幻觉遗失". Same reflexive-omission failure
mode anti-pattern #17 names — applied to my own synthesis pass, not
just external voices. Documenting here as evidence that #17 generalizes
to the orchestrator's own work product.

## Cross-voice convergence (Claude + agy_pro + gem independently agreed)

All three voices, working in parallel without seeing each other's
output, converged on (gem added 2026-05-22):

1. **Schema-constrained citation requirement** — voices output
   structured citation fields, not free-form markdown links
2. **Post-extract URL verification (HTTP HEAD)** — synthesizer
   validates cited URLs exist before trusting underlying claim
   (gem named this "Verify via Automated Tools, Not LLM Intuition")
3. **Chain-of-Verification (CoVe)** — agy_pro cited arxiv:2309.11495
   (Meta paper); I found related work in arxiv:2503.15850 KDD 2025
   survey on confidence calibration; gem also cited 2309.11495
   (cross-family convergence on a real Meta paper)
4. **Multi-agent debate framework** — all three reached this;
   agy_pro added unique "woozle effect" caveat (arxiv:2308.07201):
   when agents share context, they can PROPAGATE hallucinations to
   each other if not isolated

## agy_pro's unique contribution

**"Information asymmetry" rule**: when verifying agent audits a
generating agent's claim, the verifier should NOT see the
generator's confidence/reasoning — only the raw claim/URL. This
breaks confirmation bias. (Source: arxiv:2308.07201 multi-agent
debate paper — verified via my search corroboration.)

## §gem-baseline — Google-family non-agentic baseline (added 2026-05-22)

Re-ran 2026-05-22 to fill the silent-exclusion gap. gem (gemini-3.5-
flash REST direct, non-agentic) is the Google-family training-data
baseline, counterpoint to nemotron's NVIDIA-family baseline.

**5 hallucination patterns surfaced by gem alone**:

1. **Self-identity hallucination (major)**: gem signed off "As a
   model developed by OpenAI". gem IS Gemini, NOT OpenAI.
   Empirically demonstrates training-data provenance confabulation
   at the deepest possible level — model misidentifies own provider.
   Cross-family contamination — gem's training data likely contained
   more OpenAI self-descriptions than Gemini's, so "what am I" pulls
   from majority class. Note 2026-05-22: short-form factual probes
   (e.g. "which company developed you?") gem answers "Google"
   correctly — long agentic-style research briefs trigger the
   role-play hallucination. See §A1-test below.

2. **Provenance fabrication**: cited 9 URLs each with "(Accessed
   February 2026)" suffix. gem is non-agentic, CANNOT access URLs.
   The access dates are fabricated; the model is roleplaying having
   done research. This is the **#1 risk** the brief named.

3. **URL accuracy (surprising counterpoint)**: 8/9 cited URLs return
   200 OK on HTTP HEAD verification. Training-data URLs CAN be
   accurate. The lie is not the URLs themselves — it's the claim
   of having visited them.

4. **Paper title fabrication (minor)**: cited "Avoid Changes?
   Chain-of-Verification..." — actual title has no prefix.
   Plausible-sounding garnish.

5. **Honest NOT FOUND (positive)**: gem DID say "NOT FOUND" for
   the URL false-positive-rate claim in Axis 5. Prompt instruction
   has partial effect — not enough to be sufficient defense.

**HTTP HEAD ground-truth on gem's 9 URLs**:

| URL                                                                  | Status |
|----------------------------------------------------------------------|--------|
| arxiv.org/abs/2305.14251 (FActScore)                                 | 200 ✅ |
| openai.com/index/critiquegpt/                                        | 403 ⚠ |
| docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/     | 200 ✅ |
| arxiv.org/abs/2401.15884 (CRAG)                                      | 200 ✅ |
| blog.langchain.dev/agentic-rag-with-langgraph/                       | 200 ✅ |
| cookbook.openai.com/examples/using_logprobs                          | 200 ✅ |
| arxiv.org/abs/2203.11171 (Self-Consistency)                          | 200 ✅ |
| arxiv.org/abs/2305.14325 (Multi-Agent Debate)                        | 200 ✅ |
| arxiv.org/abs/2309.11495 (CoVe)                                      | 200 ✅ |

openai.com 403 is **NOT** a fabrication signal — Cloudflare blocks
bare curl HEAD with any User-Agent. Rule 1 refinement: treat 200=
trust, 404=likely fabrication, 403=needs browser to disambiguate.

(Gem-cited "CritiqueGPT" is suspicious — OpenAI's public name is
**CriticGPT** (June 2024). Likely gem fabricated the name. But 403
prevents direct URL ground-truth; needs browser-based verification.)

### §A1-test — empirical: thinking-budget is NOT the gem hallucination root cause

Hypothesis investigated 2026-05-22 (one of two bugs from 2-bug
review session): does helpers.sh `gem` function lacking
`thinkingConfig` explain the hallucination quality above?

**4-run empirical test** (same factual probe, varying thinking budget):

| Run | Config              | Latency | thoughts_tokens | Self-ID  | URL access |
|-----|---------------------|---------|-----------------|----------|------------|
| 1   | no thinkingConfig   | 3.63s   | 538             | ✅ Google | ✅ No      |
| 2   | budget=-1 dynamic   | 5.06s   | 707             | ✅ Google | ✅ No      |
| 3   | budget=4096 floor   | 3.56s   | 486             | ✅ Google | ✅ No      |
| 4   | budget=0 disabled   | 2.63s   | n/a             | ✅ Google | ✅ No      |

**Finding**: gemini-3.5-flash default thinking ALREADY ≈ dynamic
(Run 1 used 538 thoughts_tokens with NO explicit config). The
earlier gem hallucinations were NOT thinking-budget driven — they
were **prompt-shape driven**: long agent-style research briefs
trigger role-play confabulation regardless of thinking depth.

**Implication for Bug A fix**: setting explicit thinkingConfig is
intent documentation, not behavior change. Real fix is docstring
warning: "gem for short tasks; agent-style long briefs use gem-pro
/ agy_pro / Claude WebSearch instead".

## NIM URL auditor (nemotron) — methodological caveat demonstrated

Nemotron flagged 7 of my cited URLs as SUSPICIOUS purely because
the dates (2025/2026) are post its training-data cutoff. The URLs
ARE real — sourced from actual WebSearch. **NIM voices as URL
auditors have systematic cutoff bias** — they conflate "I cannot
verify" with "this is suspicious". Empirical proof that:
- HTTP HEAD verification CANNOT be replaced by LLM-based URL audit
- Training-baseline voices should NOT be trusted as final URL
  plausibility judges

## 5 operational anti-hallucination rules (ranked by leverage)

### Rule 1: HTTP-verify cited URLs at synthesizer boundary

After each fan-out, before reasoning from cited URLs, the synthesizer
(me) HTTP-HEAD-checks every URL. Implementation: bash one-liner
`for u in ...; do curl -sI --max-time 5 "$u" | head -1; done` →
flag any non-2xx. False positive risk: timeout/blocked but URL real.
Mitigate by retrying with GET on 1-2 alternative DNS-resolving paths.

**Escalation on 403** (added 2026-05-22 EOD review Q5): bare curl
fails on Cloudflare-protected hosts (openai.com, twitter/x, certain
academic publishers) — treating 403 as fabrication = false-positive
on many legitimate cited hosts. Escalation ladder:
- 200 → trust URL exists (claim still needs content verification)
- 404 → flag as likely fabrication
- 403 → escalate to Claude built-in `WebFetch` (passes Cloudflare JS
  challenges by default); if WebFetch also fails, try Playwright via
  `Claude_Preview` MCP for full browser fingerprint
- After both: surface as "human-disambiguate" — NEVER auto-reject
- Timeout → retry once with GET; then flag as "unverifiable"

Prior art (verified 2026-05-22 via WebSearch of Evomi/ZenRows/
BrightData 2026 blog posts on Cloudflare bypass): legacy cfscrape
and puppeteer-stealth are ineffective; real browsers with realistic
TLS fingerprints are the only reliable path on bot-protected sites.

**Leverage**: catches the `antigravity.ai/docs/v1/...` style
fabrication directly. Today's session would have caught
deepseek-r1's fake URL via this check.

### Rule 2: Schema-constrained citation field in bridge.extract

When voice output goes through bridge.extract, schema must include
`cited_urls: array<string>` as required field. Voices outputting
NO urls get flagged as "training-data recall, not research". Combined
with Rule 1, this is the structural defense.

Already partially in place — extend to ALL fan-out extracts.

### Rule 3: Pre-flight brief instruction — "NOT FOUND if unverifiable"

Brief includes explicit anti-confabulation: "If you cannot find a
source for a claim via real search, say 'NOT FOUND — could not
verify'. Do NOT fall back to training-data recall."

**Today's evidence**: brief HAD this instruction, voices STILL
fabricated (deepseek-r1 invented "2025-Q3 auto-tagging incident").
**Prompt alone is insufficient.** Must combine with Rules 1+2.

### Rule 4: Chain-of-Verification before synthesizer commits

Before synthesizer writes final decision file, generate 3-5
"verification questions" specifically targeting cited URLs and
specific dates/quotes. Answer each. Only commit if all check
out. Cite: arxiv:2309.11495 (Dhuliawala et al., Meta, CoVe).

### Rule 5: Information-asymmetric audit pass

For voice URL audits (or any claim audit), the auditor sees ONLY
the raw claim, NOT the generating voice's confidence or reasoning.
Today's NIM audit ALMOST followed this — but the implementation
exposed it to all my reasoning, biasing toward conservative
flagging. Tighten: pass only the URL list as a bare array.

Cite: arxiv:2308.07201 (multi-agent debate "woozle effect").

## Anti-pattern updates suggested

Add to auditor-protocol.md (2 new entries + 1 amendment to #17,
post user approval; revised from "3 new" after 2026-05-22 EOD
meta-review caught that #3 was structurally #17 self-applied
rather than a distinct pattern — verdict converged across Claude
WebSearch voice and 2-of-2 meta-review voices):

> **❌ Trusting cited URLs at synthesizer boundary without HTTP
> verification.** Voice citations are sometimes fabricated even
> when conclusion is correct (verified 2026-05-20 deepseek-r1's
> "antigravity.ai/docs/v1/...", 2026-05-21 "2025-Q3 auto-tagging
> incident", 2026-05-22 gem's "Accessed February 2026" provenance).
> Schema-constraining `cited_urls` field + HTTP HEAD validation
> at orchestrator level is the cheapest detector. NIM-style
> training-baseline voices fail this check due to cutoff bias —
> empirically demonstrated 2026-05-21. **403 is ambiguous** —
> Cloudflare-protected hosts (openai.com etc.) need browser-based
> verification, not curl HEAD.

> **❌ Trusting a voice's self-identity claim as evidence of family
> bias.** gem (gemini-3.5-flash) reported "As a model developed by
> OpenAI" 2026-05-22 — Google's model misidentified itself as
> OpenAI under agentic-style prompts (short factual probes get it
> right). Self-bias notes are training-data recall, not introspection.
> Family-bias disclosure must come from CALLER knowledge (helpers.sh
> documents this), not from the voice itself.

**Amend existing #17** (not a separate entry):
> Append clause: "Self-application included — when YOU prune voices
> from YOUR OWN synthesis without explicit exclusion rationale,
> this is #17 turned inward. Document every voice considered
> (including pre-call rejects) with reasoning. Verified 2026-05-22
> when PM caught gem silently dropped from voice tally —
> reflexive-omission failure mode applied to synthesizer's own
> work product, not just external voices."

## What's NOT done (deferred)

- Building the URL HEAD-check helper script — deferred until
  user approves the rule
- Updating helpers.sh `_extract_voice_findings` (if exists) to
  schema-require `cited_urls` — deferred
- Re-running gem-pro on different account once quota resets —
  not blocking; agy_pro covers Google-family research path

## NIM dynamic-selection iron rule (implemented 2026-05-22)

Encoded in helpers.sh `_nim_pick_model` function. NIM model
selection is now ALWAYS dynamic — fresh `/v1/models` + 5-tok ping
on every call, no env override. Motivation: pinned model defaults
silently rot when API 404s, and the silent fallback to training-
data answers IS the hallucination this rule prevents. See CLAUDE.md
Outside-help cheat sheet for full spec. Bug C (extending same iron
rule to `ghm`) deferred to next session.

## Voice logs
- `tmp/claude-antihallu-research.log` (5 axes, 5 successful searches)
- `tmp/agy-antihallu-research-v2.log` (5 axes; "woozle effect" key
  unique finding)
- `tmp/nemotron-url-audit.log` (cutoff-bias demonstration)
- `tmp/gem-antihallu-research.log` (added 2026-05-22, gem baseline:
  self-identity hallucination, fake access dates, 8/9 real URLs)
- `tmp/gempro-antihallu-research-v2.log` (quota exhausted, failed)
- `tmp/copilot-free-antihallu-research.log` (400 fail)
