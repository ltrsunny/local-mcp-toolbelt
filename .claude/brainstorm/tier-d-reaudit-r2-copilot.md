Reading the diff file to verify the v0.6.0 Tier D demotion changes and check for any residual issues. Running a file view and reporting intent "Reading diff file".

● Read tier-d-diff-v2.txt
  │ tmp/tier-d-diff-v2.txt
  └ 165 lines read

Searching repository for residual references to Tier D, '--tiers B,C,D', and the 14B model to confirm all defaults and docs are consistent. Running three parallel greps.

● Search (grep)
  │ "B,C,D"
  └ 14 lines found

● Search (grep)
  │ "Tier D"
  └ 103 lines found

● Search (grep)
  │ "Qwen3-14B-4bit"
  └ 33 lines found

● Read tiers.ts
  │ packages/core/src/config/tiers.ts
  └ 166 lines read

● Read cli.ts
  │ packages/core/bin/cli.ts
  └ 91 lines read

REVISE

Reason: core code and download script correctly demote D and fix the B mapping and migration note, but residual doc/help issues remain: CLI help (packages/core/bin/cli.ts) still claims Tier B default is Qwen3-8B (should be Qwen3-4B-Instruct-2507-4bit) and packages/core/README.md still lists D without the demotion caveat. Numerous brainstorming/docs reference Tier D historically (non-blocking). Fix those help/readme strings before shipping.


Changes   +0 -0
Requests  1 Premium (52s)
Tokens    ↑ 140.1k • ↓ 3.0k • 81.2k (cached) • 2.4k (reasoning)
