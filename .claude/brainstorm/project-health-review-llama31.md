The top 3-5 structural problems in the current project direction, ranked by severity, are:

1. **Inconsistent installation workflow**: The introduction of `gemini skills install` and `gemini hooks migrate` exposes the need for a unified installation workflow, as the current `omcp install` proposal may be redundant or incomplete.
   * Cited tool/feature change: Gemini CLI 0.42.0
   * Proposed remediation: Re-evaluate the `omcp install` proposal to ensure it aligns with the new Gemini CLI features and provides a seamless installation experience.

2. **Stale oMLX-via-brew-services pattern**: The addition of `gemini gemma setup/start/stop` makes the oMLX-via-brew-services pattern potentially obsolete, as it may be superseded by the new Gemma server lifecycle management.
   * Cited tool/feature change: Gemini CLI 0.42.0
   * Proposed remediation: Assess the continued relevance of the oMLX-via-brew-services pattern and consider replacing it with the new Gemma server lifecycle management.

3. **Inefficient fan-out script invocation**: The introduction of `-o json` and Policy Engine in gemini-cli, as well as `--acp` in both, may require changes to how `gem` and `copilot` are invoked from the project's fan-out scripts.
   * Cited tool/feature change: Gemini CLI 0.42.0 and Copilot CLI 1.0.49
   * Proposed remediation: Review the fan-out scripts to ensure they take advantage of the new features and optimize the invocation of `gem` and `copilot`.

4. **Protocol bug in smoke-ping ≠ working voice pattern**: The "smoke-ping ≠ working voice" pattern, as seen with the `bytedance/seed-oss-36b` model, may indicate a real protocol bug that needs to be fixed.
   * Cited tool/feature change: NIM catalog update
   * Proposed remediation: Investigate the cause of the "smoke-ping ≠ working voice" pattern and fix the underlying protocol bug.

5. **Potential obsolescence of v0.6.0 features**: The external changes may have rendered some features in v0.6.0 obsolete or weakened, requiring a review of the current project state.
   * Cited tool/feature change: Various external tool changes
   * Proposed remediation: Conduct a thorough review of the v0.6.0 features to identify any potential obsolescence or weaknesses and address them accordingly.
