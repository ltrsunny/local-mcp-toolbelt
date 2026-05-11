# R2 mutual-challenge — Q1 fork (2026-05-10)

R1 produced consensus on Q2-Q5 (delete Frankensteins, rewrite docs,
eval-as-smoke, delete scratch). The unresolved fork is Q1: what to
prioritize for v0.6.0.

## R1 positions (verbatim, terse form)

### Position A — gem: **(b) Eval automation**
> Re-run matrix on 4B-Instruct as Tier B; data-back the single-model vs
> asymmetric decision before any further architecture changes. Tier B
> swap was based on ONE curl test, not the 5-trial eval the project's
> own promotion criteria demand.

### Position B — claude: **(c) Documentation pass + bridge transform dogfood**
> Project shipped a major architectural shift (Ollama+llama.cpp →
> oMLX). Docs (README, CHANGELOG, scope memos) all lie about it. New
> contributors / future self can't onboard. Use bridge `transform` to
> do the rewrite — eats own dogfood, demonstrates output-side bridge
> use case while doing the docs work.

## New evidence from copilot R1 (it answered a different brief — security
attack surface — but its biggest-mistake call is independently relevant):

> **Trusting an unauthenticated, locally downloaded oMLX backend and
> accepting `file://` source_uri is the fatal error — it hands attackers
> the entire pipeline (weights, inputs, outputs) with zero cryptographic
> attestation or isolation.**

The hook we just shipped (b2c8316) AUTOMATICALLY routes external `file://`
content through oMLX. So copilot's threat surface is now strictly larger
than before this session.

## R2 task

You must:

1. **Steel-man the OTHER position**: state its strongest argument in your
   own words (not a strawman).
2. Engage with it:
   - **Concede fully**: flip to the other position. State why your R1 was
     wrong.
   - **Concede partially**: name the specific sub-claim of the other side
     that holds; preserve the rest.
   - **Rebut**: give a concrete refutation. Cite specific risks or facts
     the steel-man missed.
3. Engage with copilot's new evidence: does the security observation tilt
   the scale toward your position, the other, or neither?
4. **Final R2 verdict**: (a) eval / (b) docs / (c) different choice you
   now want / (d) hybrid plan with explicit ordering.

≤300 words. Argue, don't summarize. End with one-line verdict label.
