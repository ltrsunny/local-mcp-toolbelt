# All memory files concatenated for adversarial review


================================================================
## FILE: MEMORY.md
================================================================
- [Communication language](language.md) — user prefers Chinese; keep replies in Chinese unless explicitly asked otherwise
- [Feature Intake Rule](feature-intake-rule.md) — ollama-mcp-bridge: mandatory Prior Art Review before any build work; Auditor blocks if missing
- [Token budget log](token-log.md) — per-turn bookkeeping, pause-before-limit protocol, optimization levers
- [Restart Reminder Rule](restart-reminder.md) — after any bridge source change, remind user to restart Claude Code / reconnect MCP before self-observation tests
- [Bridge usage trigger checklist](bridge-trigger-checklist.md) — **铁律** 何时调 mcp__local-mcp-toolbelt__*：>1KB 外部内容 + summarize/extract/classify/transform 任务 → 走 bridge 不走 frontier
- [Model reminder rule](model-reminder.md) — **每条回复开头必须** 输出模型/bridge/session 状态行；用户切换模型时立即更新
- [Decision log rule](decision-log-rule.md) — 任何决策/计划必须**当场写入文件**，不能只存在于对话中；session summary 是有损的
- [PM role](pm-role.md) — **Claude 是 PM**，独立做架构和实施决策；用户提需求和资源，不审批技术细节
- [Brainstorm iron rule](brainstorm-iron-rule.md) — **铁律** 任何规划/选型决策必须并行 fan-out Claude+Gemini+Copilot+nv_pro，不能单源思考
- [Auditor protocol](auditor-protocol.md) — Gemini + Copilot + nv_pro 并行对抗审查的可执行 recipe；每个 PA/scope memo 必跑
- [Research routing](research-routing.md) — 文档/web 查询先 gem/copilot，避免 claude-code-guide subagent 烧 Claude token

================================================================
## FILE: language.md
================================================================
---
name: Communication language
description: User's preferred language for conversation
type: feedback
originSessionId: 2ce8504b-dfd0-4c6f-a591-26b2202c40c7
---
Reply in Chinese (Simplified). The user is a native Chinese speaker and has explicitly asked to communicate in Chinese. Code, commit messages, file contents, and identifiers stay in English — only chat responses are in Chinese.

**Why:** User said "请保持用中文跟我沟通" (2026-04-22) during the ollama-mcp-bridge session. They have been typing in Chinese throughout.

**How to apply:** Use Chinese for all user-facing text and explanations. Keep code, comments in code, and git commit messages in English. If the user switches to English, match them — mirror the language they're using in the current message.

================================================================
## FILE: feature-intake-rule.md
================================================================
---
name: Feature Intake Rule (ollama-mcp-bridge)
description: Mandatory "check for existing wheels" step before building any new feature on this project
type: workflow
originSessionId: 2ce8504b-dfd0-4c6f-a591-26b2202c40c7
---
# Feature Intake Rule — ollama-mcp-bridge

**Scope:** This rule is project-specific to the `ollama-mcp-bridge` codebase (monorepo at `/Users/rd/ollama-claude`). It is permanent and overrides any instinct to "just write it."

## The rule

Before writing a single line of code for any new feature, capability, or tool on this project, the PM (me) MUST complete a written **Prior Art Review** covering:

1. **Candidate inventory** — every existing implementation I could find, with URL. Search at minimum:
   - npm (by keyword + adjacent packages)
   - GitHub (by code search + topic filter)
   - The MCP ecosystem (modelcontextprotocol.io registry, MCP servers index)
   - Ollama ecosystem (blog, library pages, official integrations)
   - Relevant academic papers / arxiv if the problem is known
2. **Evaluation per candidate** — score each on:
   - **API fit** — does it drop in, or does it force our architecture to bend?
   - **Performance** — runtime overhead, memory, latency added to our hot path
   - **Maintenance** — last commit date, open-issue velocity, contributor count, release cadence, any signs of abandonment
   - **License compatibility** — must be Apache-2.0 / MIT / BSD / ISC compatible with our Apache-2.0. Flag GPL/AGPL/SSPL/custom-restrictive licenses.
3. **Decision** — one of:
   - **Adopt** — use it as a dependency. Note the version pin and the specific commit/tag.
   - **Fork-and-extend** — vendor it, credit in NOTICE, justify why we can't upstream.
   - **Build fresh** — justify why every candidate fails. "I didn't like their code style" is not a justification.
4. **Auditor pass** — the Prior Art Review must go through the Auditor agent before PM commits to any code. Auditor checks: are the "rejection" reasons sound? Were candidates actually evaluated or hand-waved? Are license claims verified?

## Why this rule exists

The PM has a demonstrated pattern of "convenient blindness" — proposing build-fresh work without first looking for wheels. Examples caught in this project:
- Almost built a model catalog scraper before remembering ollama.com/library has stable `x-test-*` automation attributes
- Proposed "copy-paste three system prompts" for classify/extract/rewrite tools without checking whether (a) Ollama's native `format: <json schema>` already solves structured extraction, (b) existing MCP servers already expose these, (c) libraries like Outlines/Instructor solve the schema-constrained generation problem natively

The user called this out explicitly on 2026-04-22 and made the rule permanent.

## Trigger for Auditor red flag

Auditor MUST block progress (not just warn) when:
- PM proposes "I'll build X" without a preceding Prior Art Review section
- Prior Art Review lists fewer than 3 candidates for a well-trodden problem
- Rejections cite style/taste rather than objective fit/performance/maintenance criteria
- License claims are unverified (no quote from the actual LICENSE file)

## Applies to (non-exhaustive)

- New MCP tools
- New parsers / scrapers / client wrappers
- New config / logging / telemetry / observability surfaces
- New eval / benchmark harnesses
- Choice of runtime (MLX vs Ollama vs something else)
- Any "quick helper" that smells like a library someone else has written 200 times

================================================================
## FILE: token-log.md
================================================================
---
name: Token budget log (ollama-mcp-bridge)
description: Per-turn token bookkeeping and pause-before-limit protocol
type: runtime
originSessionId: 2ce8504b-dfd0-4c6f-a591-26b2202c40c7
---
# Token budget log

## Protocol

- **Observable**: each `Agent` tool call returns a usage summary. Main-loop token usage is NOT directly visible; I estimate from context size and write-heavy turns.
- **Limit**: Claude subscription daily cap. Exact number unknown to the agent; treat **"conversation feeling slow + multiple auto-compactions in a row"** as a proxy for ~70% used, and **"context window getting auto-compacted within the turn"** as ~90%.
- **Pause rule**: when ≥2 compactions happen in one session's hot stretch, PM emits a **checkpoint summary** (current state, next resumable step, what's parked) and stops. Resumes at the next reset.
- **Optimization levers** (in order of effect):
  1. Delegate heavy reads to sub-agents with "report in under 200 words"
  2. Batch independent Bash commands in one tool call (parallel)
  3. Avoid re-reading files already in this conversation
  4. Never paste whole files into a prompt when a path reference works
  5. Use `Grep` over `Read` when locating symbols
  6. Defer Auditor pass until PM actually has an artifact (not for brainstorming)

## Log

Format: `<UTC-ish ISO> | <action> | <rough tokens in+out> | notes`

- 2026-04-22 ~20:30 | session resume after compaction | ~auto-compacted | new chapter "无人值守 + v0.1.1 执行"
- 2026-04-22 ~20:35 | Agent: mcp-local-llm delta audit (aa9ec471) | 52,269 total (33 tool_uses, 54min) | thorough; reused allow-listed curls
- 2026-04-22 ~20:35 | Agent: defender verify (a8a04d01) | 18,051 total (1 tool_use, 18s) | BLOCKED by sub-agent sandbox (/tmp mkdir denied) — main session permissions don't propagate
- 2026-04-22 ~20:35 | Agent: extract eval (a5e4c2dd) | 19,545 total (5 tool_uses, 26s) | BLOCKED same reason — /tmp writes denied
- Learning: sub-agents cannot write to /tmp even when main allow-listed. Sub-agents for research/reading only; scratch-eval work must run in main session.
- 2026-04-22 ~20:40 | PM hallucination caught | — | I told sub-agent upstream was `nbiish/mcp-local-llm`; actually `aplaceforallmystuff/mcp-local-llm` (already correct in NOTICE). Sub-agent caught it. Compaction lossy; always re-check owner/URL from NOTICE before dispatching prior-art research.
- 2026-04-22 ~20:55 | defender smoke (10-case) | main-session, ~0 agent tokens | TP=5/FN=0/TN=5/FP=0, warmup 1.6s, warm 1-5ms, offline OK
- 2026-04-22 ~21:05 | extract eval (150-case) | main-session, ~0 agent tokens | 100% pass on easy/medium/hard incl. semantic spot-check; p50 easy/med/hard = 691/1781/3608ms
- 2026-04-22 ~21:30 | Auditor pass v1 (aa358a22) | 41,374 (15 tool_uses, 65s) | BLOCKED with 5 preconditions; caught 150-eval overreach + bundle-size 5x error + spec-claim without citation
- 2026-04-22 ~21:35 | CRITICAL finding | main-session | JSON schema with `pattern`/`format:email`/`format:uri` crashes qwen3:4b Ollama runner (llama.cpp GBNF). Daemon-level failure — next req ECONNREFUSED. Must implement schema-sanitizer.
- 2026-04-22 ~21:45 | adversarial eval v2 (20 cases, no regex) | main-session | 20/20 pass incl. anyOf/nested/3-level/Chinese/temp 0.8; median ~1.5s; deep-nested ~3.7s

================================================================
## FILE: restart-reminder.md
================================================================
---
name: Restart Reminder Rule
description: When bridge code changes require a restart to take effect, remind the user
type: workflow-rule
originSessionId: 2ce8504b-dfd0-4c6f-a591-26b2202c40c7
updated: 2026-05-04 (v0.4.0 file list + enforcement trigger clarified)
---

## Rule

After any change to bridge source code that affects runtime behavior, remind
the user, **explicitly and prominently**, in the same response that lands
the change:

> ⚠️ **需要重启 Claude Code（或重连 MCP 连接）才能让本次改动对 mcp__local-mcp-toolbelt__* 调用生效。**

The reminder must include the commit hash so the user can verify they're
running the right version after restart.

## Trigger (mandatory check at end of each turn)

Before finalizing a response, check: **did this turn touch any of these files?**

- `packages/core/src/mcp/server.ts`
- `packages/core/src/mcp/{footer,meta,defense,sanitize,backend-factory}.ts`
- `packages/core/src/ollama/client.ts`
- `packages/core/src/llm/*.ts`
- `packages/core/src/config/tiers.ts`
- `packages/core/src/io/sourceReader.ts`
- `packages/core/src/jobs/*.ts`
- `packages/core/src/chunking/*.ts`
- `packages/core/src/diff/*.ts`
- `packages/core/bin/cli.ts`
- `packages/core/package.json` (dep changes)

If yes → emit reminder. No exceptions for "small" changes.

## Why

The MCP server process is loaded once when Claude Code starts. Code changes
on disk don't hot-reload. The frontier LLM (me) using `mcp__local-mcp-toolbelt__*`
tools is still talking to the *old* process until reconnection.

Without the reminder, the user runs a self-observation test, sees the OLD
behavior, and concludes the change didn't work.

## Current pending restart

**Commit `db0927c` (2026-05-04)** — v0.4.0 LlamaCppBackend + dual-field config.
Files changed: 8 (cli.ts, server.ts, tiers.ts, backend-factory.ts,
llama-cpp-backend.ts NEW, package.json, README.md, package-lock.json).

After restarting Claude Code, `mcp__local-mcp-toolbelt__*` tools will use the new
bridge code. Until then, this session's bridge calls (if any) hit the old code.

================================================================
## FILE: bridge-trigger-checklist.md
================================================================
---
name: Bridge usage trigger checklist
description: 铁律 — when to call mcp__local-mcp-toolbelt__* instead of doing it in frontier
type: feedback
originSessionId: 553c10e3-386e-4334-9342-dd3b6eda5264
---
# Bridge usage 触发清单（铁律）

CLAUDE.md 写了"Use first — saves frontier"，但 Claude 从 v0.2.0 起惯性违反。问题不是规则缺失，是**触发时刻自检**缺失。本文件给出每个 bridge 工具的精确触发条件。

**核心原则**：bulk processing 走 bridge，frontier 只做协调和决策。

## 触发清单

| 场景 | 工具 | 阈值 / 条件 |
|---|---|---|
| 外部 LLM 输出（gem / copilot / nv_pro 回应）| `summarize` 或 `summarize-long` | 单条 > 1 KB 而我不需要逐字读 |
| HF 页面 / API 文档 / paper PDF | `summarize-long` | > 5 KB 内容 |
| 单个非代码文件读但只要 gist | `summarize-long-chunked` | > 25 KB 的文档 |
| 多类决策（"是 A/B/C/D 中哪个 / 哪几个"）| `classify` | 任何分类任务，提供 categories[] |
| 从结构化文本提取字段 | `extract` | 任何字段提取，提供 JSON Schema |
| 格式转换（笔记→action items / 代码→文档 等）| `transform` | 任何格式重写 |

**优先 source_uri**（file:// 或 http://）而非 inline `text`：原始字节不进 frontier。

## 不应使用 bridge 的场景

- 项目代码（用 Read 直接读，需要逐行精确性）
- 用户消息里直接给的内容（已在 context，bridge 反而增加 round-trip）
- 多文件代码搜索（用 grep / Explore agent）
- 任何 < 1 KB 的小内容（bridge 启动开销不划算）

## Self-check（自检 — 每次准备 Read / WebFetch 外部内容前）

1. 这个内容 > 1 KB 吗？
2. 我下一步要总结 / 分类 / 提取 / 改写它吗？
3. 如果两个都是 yes → **走 bridge**，不走 frontier。
4. 如果违反，在结束 turn 前明确承认失误（不要默不作声）。

## Friction 解除：第一次用 bridge 前必须 ToolSearch 预加载

mcp__local-mcp-toolbelt__* 工具是 deferred — 第一次用前必须 `ToolSearch query="select:summarize,summarize-long,summarize-long-chunked,classify,extract,transform"`。否则会看到工具名但调不动。

**session 第一次有 LLM 类工作时立即预加载**，不等到要用才加载（friction 是不用的借口）。

## 失误的代价

每次该走 bridge 而走 frontier 的失误 = 烧 token + 延长 session 寿命缩短。1 个 5 KB 的 gem 输出在 frontier 总结要 ~3 K 输入 + ~500 输出 = 3.5K token；走 bridge 只要 ~30 token（工具调用 + 引用）。**100 倍差距**。

================================================================
## FILE: model-reminder.md
================================================================
---
name: Model reminder rule
description: Always echo active model + session status at top of every response
type: protocol
originSessionId: 4a981919-4db3-40cc-a73e-bd25b57cb952
---
# Model reminder rule

## Why
User switches between Opus / Sonnet during sessions. Claude cannot introspect its own
model name. User explicitly requested per-turn model echo. Forgetting this is a
recurring failure mode.

## Protocol — every response starts with this header

**Mandatory at the very top of every assistant response. No exceptions.**
Not at the end. Not in the middle. The FIRST line.

Format:
```
> 📍 模型：{model} | bridge：{bridge_status} | 5h窗口：{pct}% [{lag_note}] | {restart_status}
```

Fields:
- `{model}`: last model the user told me (e.g. "Sonnet 4.6", "Opus 4.7"). Track
  under "Current state" below; update IMMEDIATELY when user says "切到 X" or
  similar.
- `{bridge_status}`: status of `mcp__local-mcp-toolbelt__*` tools.
  - `✅ preloaded` — already ToolSearch'd this session, ready to call without friction
  - `🔄 deferred` — listed in deferred tools but not yet ToolSearch'd. **First time an LLM-bulk task arrives, run `ToolSearch query="select:summarize,summarize-long,summarize-long-chunked,classify,extract,transform"` to preload.** See `bridge-trigger-checklist.md`.
  - `❌ unavailable` — confirmed not running (e.g. ping failed, daemon down). Note this and use frontier with explicit acknowledgement that this is a fallback.
- `{pct}`: last % reported. If the user said "UI has lag," append `(实际可能更高)`.
- `{lag_note}` (optional): if user said UI lags by N%, write "实际+~N%".
- `{restart_status}`:
  - `重启已待` if any bridge source file changed in this session and not yet
    restart-acknowledged (per `restart-reminder.md` trigger list)
  - `clean` otherwise

If > 3 turns since last user-reported %, also append on a second line:
```
> ⚠️ 已 {N} 轮未更新用量，建议确认当前 %
```

## Self-check before submitting any response

1. Did I write the header line first? If no → rewrite.
2. Did this turn modify any file in `restart-reminder.md`'s trigger list? If
   yes → header must say `重启已待` AND body must include the explicit
   `⚠️ 重启 Claude Code` reminder per `restart-reminder.md`.
3. Did the user mention a model switch in their message? If yes → update
   "Current state" below in this file.
4. **Proactive model recommendation**: if the next likely task class doesn't
   match the currently-active model class, recommend a switch with rationale
   (see "When to recommend a switch" below).
5. **Bridge usage check** (per `bridge-trigger-checklist.md`):
   - Did this turn read external content > 1 KB that I summarized / extracted /
     classified / transformed in frontier instead of via bridge?
   - If yes → I committed a usage violation. Acknowledge it in the response and
     fix the trigger going forward.
   - Bridge status `🔄 deferred` and an LLM-bulk task is approaching? → ToolSearch
     preload BEFORE the task starts.

## When to recommend a switch (proactive — Claude initiates)

This is the core PM behavior: not "tell me what model I'm on" but "based on
what's coming next, suggest the right tool."

| Current model | Next task class | Recommendation |
|---|---|---|
| Opus | Routine implementation, mechanical refactor, test-running, doc updates | **Switch to Sonnet** — Opus budget is finite; preserve it for hard reasoning |
| Opus | Deep arch decision, scope memo Auditor pass, complex debugging | **Stay on Opus** |
| Sonnet | Routine work continues | **Stay on Sonnet** |
| Sonnet | About to make a significant arch decision / scope memo / risky refactor | **Recommend switch to Opus** |
| Any | 5h window > 70 % | Recommend cheapest model that meets task floor; if all 3 are > 70 %, recommend pause |
| Any | Just spent ≥ 3 turns on the same dead-end | Recommend switch to a different model (different reasoning style breaks tie) |

When recommending, write a single sentence at the top:
> 💡 建议切到 **{model}**：{1-line reason tied to the task}

If the user's message explicitly says "stay on X" or doesn't mention model
preference and the current model fits, don't recommend.

## Confirmation discipline (lesson 2026-05-04)

**User stating current model is NOT user choosing to stay on it.**

When Claude has just recommended a switch and the user replies with phrases
like:
- "目前仍是 Opus" / "目前是 Opus" / "still on Opus"
- "已切 Sonnet" / "已切 Opus"
- (any sentence whose topic is *current state*, not *I want to stay*)

→ This is a STATUS UPDATE, not an instruction.
→ Claude must NOT proceed as if the recommendation was rejected.
→ Re-issue the recommendation more directly:
  > 💡 你目前在 X，但下面的活该切到 Y。要我等你切完再开始？

Only treat the user as having *chosen* the current model when they say
something explicit like "stay on Opus", "用 Opus 做", "保留 Opus" — i.e. the
sentence is about the CHOICE, not the STATE.

Bundling decision-questions inside the recommendation paragraph is also
prohibited — each open switch gets its own line, each gets its own ack.

## Every-turn mandate (added 2026-05-04, user's explicit instruction)

**"每次交互你都告诉我应该用什么模型"** — The user explicitly requires a model
recommendation in EVERY response without exception.

Format (SECOND line, right after the 📍 header):

```
> 💡 继续用 **{model}** — {1-line task reason}
```
or
```
> 💡 建议切到 **{model}** — {1-line task reason}
```

Even when the current model is correct, say "继续用X" — NEVER leave the
recommendation blank. The user's feedback is they want the active guidance, not
silence.

## Anti-patterns

- ❌ Passive: "📍 你现在是 Opus" (this is just reporting; user already knows)
- ❌ Generic: "建议切到 Sonnet 节省额度" without naming the upcoming task
- ❌ Silent when model is correct — must still emit "继续用 X — [reason]"
- ❌ Bundling model recommendation with other content in the middle of the response

## Current state (updated per-turn)

- Model: Sonnet 4.6 (user switched 2026-05-04 per recommendation)
- 5h window: post-reset
- Pending restart: ⚠️ helpers.sh changed — re-source or restart shell for secrets.env auto-load
- Last updated: 2026-05-04 post-rename complete

## Calibration data

| Date | UI % | Billable tokens | Raw tokens | Assistant msgs | Model |
|---|---|---|---|---|---|
| 2026-05-03 | 89% | ~3.56 M | ~25.2 M | 229 | Opus |

Trigger rule: at **80%** stop new feature work, emit handoff note, switch to lighter tasks.
Note: UI has display lag — actual consumption leads display. 80% chosen for safety margin.

================================================================
## FILE: decision-log-rule.md
================================================================
---
name: Decision log rule
description: Any non-trivial decision or plan made in conversation must be written to disk immediately
type: protocol
originSessionId: 4a981919-4db3-40cc-a73e-bd25b57cb952
---
# Decision log rule

## Why
Context compaction is lossy. Decisions and plans that exist only in conversation
will be lost. The session summary does not preserve discussion-level detail.

## Rule
When a decision or plan is reached in conversation (even informally), write it
to a persistent file before the session ends:

- **Architecture decisions**: `docs/prior-art/` or `docs/scope-memos/`
- **Process decisions** (how we work together): `docs/notes/YYYY-MM-DD-*.md`
- **Tool/model preferences**: update MEMORY.md or relevant memory file immediately
- **Test/validation plans**: `docs/notes/` or inline in scope memo

## Anti-pattern
Discussing a plan in chat, treating it as "decided," then moving on without
writing it down. The next session will not have it.

## Recovered 2026-05-04 (Opus 4.7 session)

- ✅ "Collective Auditor mode" was a misread of intent. User clarified Claude is PM
  who decides; gem/copilot/etc are consultants Claude calls when useful, not
  approval gates. Recorded in `pm-role.md`.
- ✅ Larger-model exploration: scope memo at
  `docs/scope-memos/v0.4.0-larger-models-eval-2026-05-04.md` covers candidates,
  hardware constraints, eval methodology, promotion criteria for a possible Tier D.

================================================================
## FILE: pm-role.md
================================================================
---
name: PM role definition
description: Claude is the Project Manager; user provides requirements and resources, not approval on technical execution
type: protocol
originSessionId: 4a981919-4db3-40cc-a73e-bd25b57cb952
---
# PM role

## Established 2026-05-04 (Opus 4.7 session)

User explicitly stated:
> "你是项目经理，我没有插手任何代码，你应该决定如何高效精确执行任务。
>  我只是提出需求和提供资源。"

## What this means

| Decision type | Owner |
|---|---|
| Requirements / goals / constraints | User |
| Resources (API keys, hardware, time) | User |
| Approval gates that user explicitly reserves | User (e.g., destructive actions) |
| **Architecture choices** | **Claude (PM)** |
| **Implementation approach** | **Claude (PM)** |
| **Tool selection** (which model, which library, which approach) | **Claude (PM)** |
| **Trade-offs (binary size, latency, complexity)** | **Claude (PM)** |
| **When to invoke external tools (gem, copilot, nv_pro)** | **Claude (PM)** |

## Anti-pattern

Asking the user "do you accept Y trade-off?" when the answer follows from
already-stated requirements. Decide it, document it, move on.

## Right pattern

- Decide based on stated requirements
- Record the decision in the relevant scope memo / prior-art doc with rationale
- Inform the user only when a decision **changes scope** they need to be aware
  of, or when a genuinely new requirement is needed
- Use external tools (gem, copilot, nv_pro, bridge) as **consultants** to inform
  the decision, not as approvers

## When to actually ask the user

- New requirement needed (e.g., "should we support Linux?")
- Resource needed (e.g., "I need an API key for X")
- Destructive action protected by safety rules (per system prompt)
- True ambiguity that no amount of analysis can resolve
- User explicitly reserved sign-off on this class of decision

## When NOT to ask

- Architectural trade-offs within stated requirements
- Library choices that meet the stated constraints
- Implementation order
- Test strategy
- Refactoring scope

================================================================
## FILE: brainstorm-iron-rule.md
================================================================
---
name: Multi-source brainstorm iron rule
description: 铁律 — every planning/scoping/model-selection decision fans out concurrently to Claude + Gemini + Copilot + nv_pro
type: feedback
originSessionId: 553c10e3-386e-4334-9342-dd3b6eda5264
---
# 铁律：多源并行 brainstorm

任何**规划/选型/架构/scope 决策**必须并行 fan-out 到 3-4 个独立资源，不能只用 Claude 思考再让 Gemini「补充」。

## Why
- 用户在 2026-05-06 明确指出："之前已交代的Claude+Gemini+Copilot的Brainstorm模式已彻底遗忘，现在又加入了nv资源。此项机制应作为任何规划的铁律，时刻尝试可用最强模型互相辩论"
- 上一轮失误：评估候选模型时只让 gem + copilot 查文件大小，没让它们辩论"该不该用 MLX"、"该不该先评估 Qwen3.5-9B/Gemma4-9B 这些更小的候选"
- 单源规划=策略失误。必须让最强模型互相辩论。

## How to apply
- **触发条件**：任何形式的"下一步该做什么"、"选什么模型"、"用什么框架"、"scope 怎么定" 都要触发。
- **资源池**：Claude（我自己合成）+ Gemini（`gem`，亦可 `GEM_MODEL=gemini-2.5-pro gem`）+ Copilot（`copilot --allow-all-tools --effort xhigh`）+ nv_pro（用 `NV_PRO_MODEL=...` 变换不同 NIM 模型，比如 deepseek-v4-pro / mistral-large / qwen3-coder-480b）。
- **多 nv_pro 模型**：fan-out 至少 3-5 个不同家族 / 不同尺寸的 NIM 模型，**总是包含 NIM 上当前最好的**。用户 2026-05-06 强调："nv 总是尝试最好模型，也可以引入多个不同的"。**绝不用训练记忆推测模型名**——用户 2026-05-06 第二次纠正："你没有根据在线结果决策"。
- **每次都查 NIM 真实目录**（不缓存、不依赖记忆——用户 2026-05-06 第三次纠正："不要保存，每次用都查最新的"）：
  ```bash
  source ~/.config/claude-dev/secrets.env
  curl -s "https://integrate.api.nvidia.com/v1/models" -H "Authorization: Bearer $NVIDIA_API_KEY" | python3 -c "import sys,json; [print(m['id']) for m in json.load(sys.stdin)['data']]" | sort -u
  ```
  从查到的 ~130+ 模型里挑 frontier-class（`large` / `pro` / `ultra` / `medium` / `405b` / `253b` / `kimi-k2*` / `v4-pro` 等关键词）做 fan-out。
- **多家族原则**：选模型时跨 DeepSeek / Mistral / Meta / NVIDIA / Moonshot / Google / MiniMax 至少 3 家，避免单家偏见。
- **adversarial 角色**：每个源都要明确"tear it apart"，不是"补充意见"。

## 关键：互相 challenge，不是并行各写
**用户 2026-05-06 明确指出：脑爆的意思是大家互相 challenge，不只是各自独立给意见**。所以 brainstorm 至少 2 轮：

- **Round 1**：4 路并行 fan-out，各自独立写 verdict（已习惯做法）。
- **Round 2**：把所有 Round-1 输出汇总成一个 bundle，**给每个 reviewer 看**，让他们：
  1. 选择 1-2 个最不同意的他人立场，用具体论点 challenge 之
  2. 看完别人的论点后是否要 revise 自己的立场（admit when wrong）
- **Round 3 (我合成)**：读 round-2 的 challenge + revisions，提出最终 Draft，标注哪些立场被强论点 push 改变了。

只做 Round 1 而跳过 Round 2 = 单源思考的变种。必须有反方反驳。

## Anti-patterns
- ❌ 只让 Claude 思考再让 Gemini 验证
- ❌ Sequential（"gem 失败再试 copilot"）— 那是 fallback 不是 portfolio
- ❌ "在赶时间所以跳过审查" — 这次失误就是这么发生的
- ❌ 让 gem/copilot 只查事实而不辩论选型

================================================================
## FILE: auditor-protocol.md
================================================================
---
name: Adversarial-Auditor protocol (Gemini + Copilot + nv_pro)
description: 铁律 — any planning/architecture/model-selection decision must fan-out 3+ sources concurrently
type: protocol
originSessionId: 4a981919-4db3-40cc-a73e-bd25b57cb952
---
# Adversarial-Auditor protocol

## CRITICAL — this is an iron rule (铁律)

**Any planning, architecture, or model-selection decision MUST fan-out concurrently to 3+ sources.** Forgetting this is the #1 strategic failure mode. User flagged on 2026-05-06: "之前已交代的Claude+Gemini+Copilot的Brainstorm模式已彻底遗忘，现在又加入了nv资源。此项机制应作为任何规划的铁律". The portfolio is now Claude + Gemini + Copilot + nv_pro (with NV_PRO_MODEL variation).

Single-source planning (even "just Claude + one reviewer") is the failure mode. Always 3-4 in parallel.

## Origin

Recovered 2026-05-04 from session `f9bac1c3-...jsonl`. The pattern shipped
v0.3.0 Draft 2 of the chunked-summarize scope memo with the commit message
**"Gemini Auditor critique addressed (BLOCK 0.95 → ready for user)"**.

This is the working protocol. The **portfolio orchestration** entry in
CLAUDE.md describes the philosophy; this file describes the executable
recipe.

## Recipe

For any non-trivial scope memo, prior-art review, or implementation:

### Step 1: Draft

Claude writes Draft 1.

### Step 2: Adversarial review (parallel fan-out)

Pipe the draft to **both** tools in parallel, each with an explicit
"tear it apart" role. Run them in the same Bash invocation with `&` so
they run concurrently and Claude only blocks once on `wait`.

```bash
# Gemini critique
cat docs/<draft>.md | gem "You are an adversarial reviewer. Read the
document above in full, then do your best to tear it apart. Focus on:
specific factual errors, missing prior art, weak risk arguments, scope
creep, or hidden complexity. Grade BLOCK 0.<n> at the end where 0.95+
means ready for user, < 0.85 means re-draft." > /tmp/gem-review.md 2>&1 &

# Copilot critique
copilot --no-color --allow-all-tools --effort xhigh -p "Read $(pwd)/docs/<draft>.md.
You are an adversarial reviewer. Read the document above in full, then do your
best to tear it apart. Focus on: specific factual errors, missing prior art,
weak risk arguments, scope creep, or hidden complexity. Grade BLOCK 0.<n> at
the end. Do NOT modify any files." > /tmp/copilot-review.md 2>&1 &

wait
```

### Step 3: Synthesize

Claude reads both reviews, deduplicates findings, and produces Draft 2 that
addresses each cited issue. The commit message names the grade.

### Step 4: User Auditor

Once both reviewers grade ≥ 0.85, present Draft 2 to user (the actual
Auditor). User has final say — Gemini/Copilot are *consultants*, not
approvers (per `pm-role.md`).

## When to invoke

- Any new scope memo (mandatory per Feature Intake Rule)
- Any prior-art review (mandatory)
- Major architecture refactor PRs
- Any change to LlmBackend interface or backend factory

## When NOT to invoke

- Trivial bug fixes
- Doc-only changes
- Test additions
- Routine refactors that don't change interface

## Failure handling

- **Gemini 429 / capacity**: `gem` auto-falls back through
  gemini-3.1-pro-preview → 2.5-pro → 2.5-flash. Proceed with Copilot
  if all fail; note in commit.
- **Copilot quota out** (50 premium/month): proceed with Gemini only.
- **NIM model unavailable mid-round**: free-tier composition shifts —
  see "Per-round NIM voice discovery" below. Never depend on a
  specific NIM model being available; always re-enumerate.

## Per-round NIM voice discovery (no cached lists)

NIM's free-tier composition shifts. Static candidate lists go stale,
including in-session caches: DeepSeek moved free → preview = paid in
2026; llama-3.3-70b flipped HTTP 200 → 000 within 5 min during the
v0.6.0 audit on 2026-05-15. Every fan-out begins with fresh discovery:

1. List current models: `curl -s .../v1/models | jq '.data[].id'`
2. Filter by out-of-subject-family + reasonable size class.
3. Smoke-ping each candidate (5-token POST, `--max-time 5`):
   - HTTP 200 → include in voice pool
   - HTTP 000 (timeout) → exclude (capacity OR preview-tier silent drop)
   - HTTP 404 → exclude (not provisioned for free tier)
4. Pick 2-3 from the working pool. Combined with copilot + gem. Don't
   artificially cap at 3 voices — use what's available.
5. Record which models responded in this round's brainstorm artifacts
   so future audits can detect tier shifts retroactively.
6. When subjects are from a specific model family (e.g. Qwen),
   exclude that family from the voice pool — self-family bias is
   real and material (verified 2026-05-15, v0.6.0 audit Rounds 1+3:
   nv_pro using qwen3.5-397b flagged its own self-interest and
   voted against itself).

## Anti-patterns

- ❌ Asking only one reviewer (Gemini OR Copilot) — they catch different
  classes of issues; Gemini = correctness/scope, Copilot = code/concurrency.
- ❌ Sequential ("try gem, if fails try copilot") — that's fallback, not
  portfolio. Always fan out.
- ❌ Skipping reviewer when "in a hurry" — diminished value for v0.4.0
  showed up as concurrency bugs Copilot caught (race on lazy load,
  use-after-dispose) that Claude alone missed.
- ❌ Trusting a reviewer's grade without reading their reasoning — the
  grade is a coordination signal, not the final word.
- ❌ **Sticky-default env var on any LLM-gateway model selector** (e.g.
  `NV_PRO_MODEL`, `GHM_MODEL`, `GEM_MODEL`). Gateway catalogs drift —
  NIM free-tier composition shifts (DeepSeek free→preview paid in 2026;
  llama-3.3-70b flipped 200→000 in 5 min); GitHub Models adds/gates
  Azure-preview models (gpt-5 / o-series catalog-listed but currently
  unavailable to free PAT, may GA later); even Vertex Gemini renames
  endpoints (`gemini-pro` → `gemini-1.5-pro` → `gemini-2.5-pro`).
  Verified failure modes:
  - 2026-05-15: Claude proposed sticky `NV_PRO_MODEL=llama-3.3-70b`
    default, PM corrected ("每次都选免费里面最好的，而不是在环境里写
    一个默认的").
  - 2026-05-18: same pattern applied to `GHM_MODEL` — Claude added
    `GHM_MODEL=openai/gpt-4o-mini` default in helpers.sh for
    convenience, PM flagged "ghm 模型也应动态选择".
  **Rule for any fan-out**: re-discover via the gateway's catalog
  endpoint (`/v1/models` for NIM, `/catalog/models` for GitHub Models,
  Model Garden listing for Vertex) PLUS a 5-tok inference smoke before
  committing a voice slot. Default env-var values inside helpers.sh
  remain for ergonomic single calls only — never lift them into a
  fan-out lineup without verification.
- ❌ Reusing the previous fan-out's working voice list within the same
  session — status flips mid-session. Re-smoke-ping every round.
- ❌ Auditing ONLY the option set the synthesizer presented — the
  option enumeration ITSELF must go through fan-out. Otherwise the
  synthesizer's framing biases the audit. Meta-failure observed
  2026-05-15: A/B/C/D/E judge-backend selection was audited; the
  framing that produced A-E wasn't, and the actual right answer
  (skip eval rerun entirely; F+H+G hybrid) lived outside A-E.
- ❌ Using `gem "..."` (3.5-flash via API key) for adversarial
  audit / synthesis — that quality tier is below the audit floor
  for deep reasoning / cross-file consistency / framing pushback.
  Renaming as of 2026-05-18 (see
  `.claude/brainstorm/gem-model-strategy-decision-2026-05-18.md`):
  - `gem` is now the fast daily driver (3.5-flash via API, REST
    direct). Good for fan-out brainstorm voices, short summary,
    classification, extract. NO agentic tools.
  - `gem-pro` is OAuth-path 2.5-pro single model, no fallback —
    fail-fast on capacity. **Use `gem-pro` for any adversarial
    audit / synthesis** that needs Pro quality + agentic tools.
    Expires 2026-06-18 with the OAuth cutoff.
  - `gem-pro-escalate` tries 3.1-pro-preview first, falls back to
    2.5-pro. Use sparingly — 3.1 has ~50% capacity-exhaust rate.

- ❌ When the fan-out includes a voice whose model family is the
  SUBJECT of the brainstorm, treating its vote at full weight.
  Verified 2026-05-18: gem-model-strategy fan-out included
  `gem` (gemini-3.5-flash) which self-disclosed "Selecting S3
  directly champions my own utility" — its S3 vote correctly
  half-discounted, flipping a 2-2 tie to a ~1.5-2 lean. **Rule**:
  flag any same-family voice in the brief explicitly; ask for
  self-bias disclosure; half-discount picks that align with the
  voice's own family. Other voices unaffected. Discount IS NOT
  exclusion — same-family voices often catch framing flaws
  invisible to outsiders (gem-flash caught the auth/tier coupling
  flaw in the brief that an OpenAI voice corroborated).
- ❌ Treating a `spawn_task` chip brief as a procedural action —
  it is a **design artefact**, not a "go do this" command. The
  brief encodes the task decomposition, candidate enumeration,
  comparison framework, and operating constraints. All of these
  are design decisions and must pass an audit round BEFORE
  `spawn_task` is invoked. Spawning first then auditing the brief
  retroactively means either dismissing the chip (wasted UI noise)
  or letting it run on an audited-bad design. Verified failure
  mode 2026-05-18: PA chips for v0.7.0 install were spawned
  without audit; 3-voice audit (commit `2490e4c`) found 7/7
  REVISE-or-RESTART verdicts including 3 missing scope axes, 2
  coupled categories incorrectly parallelised, over-specified
  dimensions, and a blocking macOS-26 spike treated as orthogonal.
  This is the **third** instance of the same shape in one day
  (Day 1-3 code; hook lazy-fix f8a8fc1; PA chips) — the pattern
  recurs because synthesizers treat "spawning" as a verb rather
  than a design commitment. Rule: every `spawn_task` call follows
  a 3+ voice audit on the brief, no exceptions.

- ❌ **Cloud-only dependencies in a local-first project** — when
  the project's stated ethos is local-first (e.g. MCP toolbelt
  delegating to oMLX), proposing cloud-only services (embeddings
  API, vector search, managed inference) for "core feature
  enablement" is an architectural contradiction. Worse: when the
  cloud budget is a finite credit window (90-day GCP trial),
  cloud dependency becomes a **ticking time bomb** — feature
  works for 90 days then dies. Verified failure mode 2026-05-18:
  Claude proposed Vertex AI Embeddings API to fill bridge's
  missing embedding tier; 2 fan-out voices (gem-pro + mixtral)
  independently flagged misframe. **Rule**: cloud credit is the
  right tool to BENCHMARK candidate local artefacts (e.g. test
  bge-m3-mlx vs nomic-embed-text-mlx on Compute Engine GPU),
  not to host them long-term. Local-first means the shipping
  artefact runs locally — cloud is for development assistance.

- ❌ **Same-family voice in fan-out = redundant** — if the
  orchestrator is Claude (Anthropic), adding cloud-hosted Claude
  as a fan-out voice doesn't produce adversarial diversity. The
  whole point of multi-vendor fan-out is to catch blind spots
  invisible to a single model family. Verified 2026-05-18:
  Claude proposed "add Anthropic Claude via Vertex AI Model
  Garden as a fan-out voice"; both gem-pro and mixtral-8x22b
  independently called this redundant ("voice from same family
  as orchestrator", "may not significantly enhance considering
  existing orchestrator"). **Rule**: when picking a vendor for
  fan-out voice, exclude the orchestrator's own family. For
  Claude-orchestrated sessions: prefer Llama / Mistral / Grok /
  Gemini / DeepSeek / Qwen — anything except Anthropic. The
  fan-out portfolio is a deliberate diversity instrument.

- ❌ **Treating tool docs / README / smoke test as ground truth
  without systematic bundle / behavior inspection.** Every CLI
  / API tool has runtime behavior beyond its docs: which files it
  reads in different modes, which env vars affect routing, which
  config file paths are searched, which model strings are real
  API endpoints vs catalog placeholders, what auth resolution
  order applies, what side effects yolo/--agentic modes have.
  Verified 2026-05-18: PM challenged "你每次的bundle都没有直接获取
  而是靠猜测" after Claude had operated on gemini-cli for the
  entire session assuming `-p` headless mode is stateless prompt
  → text, only discovering at hour 12 that yolo mode reads
  workspace `CLAUDE.md` and probes file tree (`list_directory`
  tool invocations visible in stderr). This silently polluted
  every `gem-pro` voice call today launched from project root
  cwd. **Rule**: before using any new tool in fan-out / decision-
  load workflows, do a systematic inspect (≥5 axes):
    1. `which <tool>` + full `--help` (all subcommands, --debug)
    2. `strings <bundle>` or grep js bundle for: API endpoints,
       config paths, env var names, model id literals
    3. `~/.config/<tool>/` or equivalent — what files exist, what
       persists across sessions, what's per-cwd vs global
    4. Run a representative call WITH `--trace` / `--debug` /
       `2>&1 | head` and READ stderr noise for hints (deprecation
       warnings, file-tool calls, hidden tool use)
    5. Test the documented variation axes (--effort / --model /
       --auth-type / cwd-sensitive vs not)
  This is **30 minutes once per tool**, not a luxury — it's the
  precondition for trusting the tool in adversarial fan-out.
  Skipping it produces session-long systemic errors that the
  agent itself can't detect (because it doesn't know what to
  look for).

- ❌ **Declaring a portfolio path "dead" from a single failure
  signal without diff-axis verification** — when a tool returns
  "exhausted/unavailable" once, don't conclude "out for the day"
  before testing across the relevant variation axes:
  - Per-effort-level (Copilot `--effort none/low/medium/high/xhigh`
    — different tiers may NOT all hit the same quota gate)
  - Per-model (gemini-cli with different `--model` flag — one model
    quota-exhausted ≠ all)
  - Per-time-of-day (NIM model availability rotates throughout day)
  - Per-auth-path (OAuth dead ≠ API-key dead for same vendor)
  Verified 2026-05-18: PM challenged "copilot 你就直接放弃尝试了？"
  after Claude had auto-excluded copilot from the portfolio for
  ~7 hours based on one "no quota" error. Diff-axis test (all 5
  effort levels) confirmed exhaustion across the board — initial
  conclusion was correct, but **the reasoning was lucky, not
  rigorous**. A 30-second multi-effort smoke would have either
  ruled in (saving 7 hours of foregone copilot voices) or ruled out
  (cleaner evidence). **Rule**: any "X failed → X dead" conclusion
  requires diff-axis verification at the time of declaration, not
  hours later when PM asks.

- ❌ **Platform-mono fan-out** — picking 4 different model families
  but all routed through the SAME infrastructure (e.g. all 4 via
  GitHub Models proxy → Azure routing). Family diversity ≠ platform
  diversity. If the shared platform has any systematic bias (routing-
  level filtering, common fine-tune layer, latency-tier rationing),
  all voices inherit it and the fan-out catches none of it.
  Verified failure mode 2026-05-18: after activating `ghm` (GitHub
  Models PAT), Claude ran two consecutive 4-voice fan-outs (v0.7
  scope reduction + v0.7 strategy validation) using ONLY ghm voices
  (openai/deepseek/meta/mistral/cohere — diverse families, single
  platform). PM flagged "为什么只用了 ghm" — "new-toy bias", over-
  using the freshly-added voice channel. **Rule**: target ≥2
  distinct infrastructure paths per fan-out (e.g. 1 ghm + 1 gem-pro
  via OAuth + 1 nv_pro via NIM gateway + 1 ghm-different-family).
  Family diversity is necessary but not sufficient; platform
  diversity catches infra-level mono-culture risk.

- ❌ **Skipping voice quality pre-smoke for brief compliance** —
  not all NIM models follow a strategic-reasoning brief. Vision-
  instruct models (e.g. `meta/llama-3.2-90b-vision-instruct`) and
  reasoning-prefix models (e.g. `nvidia/nemotron-3-nano-omni-30b-
  a3b-reasoning`) can mangle multi-axis briefs even when their
  `/v1/models` smoke ping returns "hi" successfully. Today's
  observation: llama-90b returned rankings with rationales
  **swapped** between picks ("#1 Embeddings because automate
  prompt-tuning" — but prompt-tuning is the Prompt-Optimizer
  pick); nemotron-reasoning went off-brief entirely (proposed
  LangChain and "RAG-System" as missed Google services).
  Voting positions burned, no signal extracted. **Rule**: when
  fan-out depends on multi-axis strategic reasoning, the
  5-token smoke ping is insufficient — add a 1-question
  warmup ("rank these 3 options + give one-line rationale each;
  if any rationale doesn't match its pick, exclude from
  fan-out"). Cheap up front; saves a voice slot from being
  burned by garbled output.

================================================================
## FILE: research-routing.md
================================================================
---
name: Research routing rule
description: Documentation/web research routes to gem/copilot first, NOT to internal claude-code-guide subagent
type: feedback
originSessionId: 553c10e3-386e-4334-9342-dd3b6eda5264
---
# Research routing rule

## Rule

For any **documentation lookup**, **web research**, **API specification check**,
or **"how does X work"** question that has a public answer:

1. **First** route to `gem` (Gemini agentic, has WebFetch + ReAct loop)
2. **Or** `copilot` for code-context lookups
3. **Or** `nv_pro` for one-shot synthesis after raw text retrieved
4. **claude-code-guide subagent** ONLY when the answer requires reading
   files inside Claude Code's installed binary or internal-only state that
   external tools genuinely can't reach.

## Why

claude-code-guide is a Claude subagent — it consumes **the user's own Claude
token budget**, not a separate quota. For pure documentation lookup ("which
hook events does Claude Code expose? what data is in the JSON?"), every other
quota pool is cheaper.

Concrete cost reference: claude-code-guide research on hook system used 47K
tokens. gem doing the same task uses 0 Claude tokens (Gemini Pro quota).

## How to apply

Before invoking ANY subagent, ask:
- Is the answer in public docs / web? → `gem` first
- Is the answer in the user's GitHub state? → `copilot` first
- Is the answer in the running CLI's behavior or installed files? → `claude-code-guide` OK
- Is it adversarial review of code I just wrote? → `gem` + `copilot` parallel (per auditor-protocol)

## Anti-patterns

- ❌ Defaulting to claude-code-guide for "how does Claude Code do X"
  questions when X is documented publicly
- ❌ Spawning subagents to do work that my own conversation could fan out
  to gem/copilot for free
- ❌ Spawning multiple Claude subagents in parallel without first checking
  if external tools can do the same job

## Confirmation

Validated by user feedback 2026-05-05: "webfetch这种活有必要消耗token干吗？"
