Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
(node:97224) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
BLOCK

(1) **Latent inconsistencies:** `README.md` still claims `npm run download-models` fetches "all tiers (Tier B/C/D)", and `src/config/tiers.ts` still describes a "Tier D promotion", both contradicting the demotion. (2) **Regressions:** Upgrading users will immediately fail on Tier B requests (model not found) because v0.5.0 never downloaded the 4B model; without a `postinstall` hook or startup check to re-run `download-models`, their local state is broken by default. (3) **`CLAUDE.md` compression:** The diff deletes crucial routing timings (e.g., `classify (~8s)`) and the "60s wall" explanation for `summarize-long` limits, which was the architectural justification for keeping specific tools on Tier B/C.
