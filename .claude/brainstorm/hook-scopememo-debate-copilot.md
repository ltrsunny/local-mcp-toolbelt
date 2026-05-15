Recommend Option C: Default gate with a per-session opt-in for intensive editing.

Rationale: The project’s history of PM pushback shows soft-rule slippage is a real governance risk; the hook should preserve its default protective posture (preventing large-raw-byte reads) to maintain reproducible discipline and minimize accidental exfiltration risk. At the same time, scope memos legitimately straddle two workflows: lightweight "for-understanding" reads (bridge-friendly) and byte-exact "for-Edit" reads (needs raw access). For most review work, bridge tools win—lower frontier exposure and better summarization. For heavy editing sessions, requiring an explicit per-session opt-in preserves developer ergonomics without weakening the default rule.

Concrete implementation and friction cost:
- Default: keep scope memos gated by the hook. Documentation and error message point to the opt-in.
- Opt-in mechanism: set OMCP_HOOK_EXTRA_ALLOWED_PREFIXES=/abs/path/to/docs/scope-memos when starting an intensive editing session (one-line export or wrapper script). CI and routine reviewers keep default behavior.
- Friction: minimal for reviewers (no change). Moderate for editors (one-time session opt-in or wrapper script). Training and a documented helper script reduce friction to negligible.

On the for-Edit vs for-understanding distinction: do not encode complex heuristics in the hook. Keep the hook simple and enforce discipline by default; use the opt-in for explicit authorial intent. This balances safety, practicality, and low long-term maintenance cost.