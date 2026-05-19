# Brief: steelman the case FOR `omcp install` against today's 4-voice "scrap it" consensus

You are an adversarial brainstormer. A 4-voice fan-out (copilot,
gem, llama-4-maverick, llama-3.1-70b) just unanimously concluded
that v0.7.0's proposed `omcp install` is **structurally obsolete**
given today's Gemini CLI 0.42.0 release (`gemini skills install`
+ `gemini hooks migrate` + `gemini gemma`). Strongest line (gem):

> Proceeding with the monolithic `omcp install` strategy is a
> wasted effort and a strategic error. Ship the bridge-enforcement
> hook as a standard Gemini skill via `gemini skills install`.

Unanimous consensus on a strategic shift is exactly when you need
adversarial steelman of the opposing position. **Your task: find
the strongest case AGAINST the consensus.** Output 250-400 words.

## What the consensus says (the position to attack)

1. `omcp install` reinvents `gemini skills install`.
2. oMLX/brew-services is duplicated by `gemini gemma setup/start/stop`.
3. Bridge fan-out should consume `gemini -o json` + Copilot's `--acp`
   instead of text-parsing.
4. v0.6.0 stdio smoke is a false positive (passed seed-oss, model
   then real-failed).

## What you must argue (the steelman)

Defend at least 3 of these counter-positions. Push hard:

1. **MCP client coverage**: `local-mcp-toolbelt` targets ANY MCP
   client — Claude Code, Claude Desktop, Cursor, Cline, Zed,
   future clients. `gemini skills install` only configures the
   Gemini CLI. What happens to users who never run `gemini-cli`?
   The bridge serves Claude Desktop / Cursor / Cline users who
   may not have `gemini-cli` installed at all.
2. **Vendor lock-in / SPOF**: anchoring install to Google's
   `gemini-cli` makes the project's adoption depend on Google's
   product roadmap. If Gemini CLI deprecates `skills install` or
   changes the spec, the bridge breaks for ALL users. The bespoke
   `omcp install` keeps the bridge independent.
3. **`gemini gemma` is Gemma-specific, not Qwen / MLX**: the
   bridge uses Qwen3 on oMLX (Apple Silicon). `gemini gemma`
   manages LiteRT-LM serving Gemma. Different runtime, different
   model family. Conflating them is a category error.
4. **`gemini hooks migrate` direction is one-way**: that command
   IMPORTS Claude Code hooks into Gemini. Our bridge wants to
   INSTALL a Claude-Code-shaped hook on the user's machine — same
   file format Gemini supports, but the install path is opposite
   to what `gemini hooks migrate` does.
5. **Real-workload smoke ≠ scrap stdio smoke**: stdio smoke
   verifies protocol handshake (a real, documented contract).
   seed-oss-36b's real-call failure is a vendor capacity-tier
   bug NIM doesn't expose via API — completely orthogonal to
   stdio handshake quality. Conflating them blurs two different
   release gates.
6. **Adoption funnel for non-Anthropic-CLI users**: per
   v0.7.0-install-2026-05-15.md §6 reason 4 ("each manual step
   drops some percent of users"), forcing users to install
   gemini-cli first to install our bridge IS another manual step.
   That's the same anti-pattern the install scope memo opens with.

## Your task

Pick the 3 strongest of those 6 counter-positions (or propose a
7th). Defend each in 60-80 words. End with one paragraph: GIVEN
the steelman, what's the CORRECT v0.7+ direction?

Three plausible answers a priori:
- KEEP `omcp install` as proposed (consensus wrong)
- HYBRID (omcp install + integration with gemini skill for the
  subset of users who have gemini-cli)
- SCRAP omcp install (consensus right; the steelman exercise
  confirms the consensus once you address it)

Don't pre-commit — argue from the steelman.

Output: comment body only, no preamble. Push back if the consensus
itself has a framing flaw the original 4 voices missed.
