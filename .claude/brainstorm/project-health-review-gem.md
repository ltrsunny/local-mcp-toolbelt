Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
The proposed v0.7.0 direction is structurally obsolete and severely misaligned with the current ecosystem. We are building a bespoke package manager for `local-mcp-toolbelt` on the exact day the host CLI environments shipped first-party primitives that solve these exact problems natively. Proceeding with the monolithic `omcp install` strategy is a wasted effort and a strategic error.

Here are the top 4 structural problems in the current direction, ranked by severity:

### 1. The `omcp install` bespoke installer is fundamentally obsolete.
The v0.7.0 scope memo proposes a monolithic custom installer for hook wiring, model downloading, and MCP config injection, which is now completely redundant.
**Cite:** Today's release of `gemini skills install <source>` handles hook distribution and scope-aware wiring natively, while Copilot's `--acp` allows dynamic MCP server injection without mutating global config files.
**Remediation:** Scrap the `omcp install` command entirely. Ship the bridge-enforcement hook as a standard Gemini skill via `gemini skills install`, and document injecting the local MCP server dynamically using `copilot --acp` or Gemini's new policy engine.

### 2. The `omlx` Homebrew dependency conflicts with first-party local model management.
Hardcoding a dependency on `brew install jundot/omlx/omlx` and custom Python download scripts ties the project to a brittle external service pattern instead of using the CLI's native capabilities.
**Cite:** The newly shipped `gemini gemma setup/start/stop` commands introduce a first-party, native local server lifecycle for LiteRT-LM models.
**Remediation:** Deprecate the bespoke oMLX Homebrew installation and Python download paths. Pivot the project's local execution strategy to leverage the `gemini gemma` daemon to guarantee alignment with the CLI's official local model lifecycle.

### 3. Fan-out integration via stdout scraping and global configuration is a brittle anti-pattern.
The current strategy of invoking `gem` or `copilot` and likely parsing their text output or relying on brittle global configurations is prone to unexpected breakage.
**Cite:** `gemini-cli` just introduced native structured output via `-o json`, comprehensive session management (`-r`, `--session-id`), and a robust Policy Engine.
**Remediation:** Refactor all fan-out wrapper scripts to consume `gemini -o json` exclusively for structured data exchange, and utilize explicit session IDs rather than mutating global state.

### 4. The release-gate smoke test is a dangerous false positive.
The `stdio cross-client smoke green` test in v0.6.0 only verifies the stdio transport layer, masking critical runtime protocol failures in real-world usage.
**Cite:** The `bytedance/seed-oss-36b` model perfectly passes the current smoke test but completely fails on real workloads with empty-body silent drops, proving the test suite is fundamentally inadequate.
**Remediation:** Upgrade `scripts/cross-client-smoke.mjs` immediately to mandate a full end-to-end Tier B inference round-trip, effectively blocking releases if real payload generation fails.
