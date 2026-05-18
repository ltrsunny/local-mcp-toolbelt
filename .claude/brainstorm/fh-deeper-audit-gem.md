Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
The F+H+G framing suffers from a fundamental category error. By grouping programmatic scoring (F) alongside behavioural tests (H) and dogfooding (G), we are conflating deterministic wiring verification with non-deterministic model evaluation.

v0.6.0 is a plumbing release. We are altering the thinking-mode default propagation, not updating the underlying Qwen weights. H comprehensively verifies that the `disableThinking` boundary signal correctly traverses the registry to the backend. F, conversely, attempts to measure whether the model produces structurally correct output under these new defaults. This is a trap. F will inevitably catch local LLM variance—prompt jitter, quantization noise, or structural drift—and block CI on failures completely unrelated to our v0.6.0 wiring changes. The 80 LOC for F is not just a maintenance burden; it is institutionalised test flake. F is testing the model, not the wiring.

The unaudited 0.90/0.75 threshold compromise is a symptom of this flawed premise. Splitting the difference between 0.95 and 0.80 is simply synthesis masquerading as engineering consensus. It provides a false sense of mathematical rigour while lacking any empirical grounding. Furthermore, applying any global threshold across disparate tasks (classification vs extraction) completely ignores the reality that different tiers possess different baseline capabilities.

Regarding the 25-inference JSONL: discard it immediately. It is the byproduct of a rejected Phase 1 methodology. Committing it introduces dead data into the repository, violating the principle that test artifacts should directly gate a release. Future maintainers will inevitably misinterpret it as an active, supported evaluation baseline. We must constrain the release criteria to what actually changed.

**Recommendation:** Option (a). Skip F entirely and ship v0.6.0 gated strictly on H (deterministic boundary assertions) and G (dogfooding). Discard the Phase 1 runner JSONL to prevent repository pollution.
