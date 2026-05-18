```markdown
### **Design for F: Programmable Gold-Match Scorer**
**Solution:** (b) Extend `report.mjs` *with parallel execution* and deprecate `judge.mjs` entirely.
Rationale: Consolidating scoring logic avoids duplication between JSONL processing paths. The new design:

1. **Library Location:**
   File: `packages/core/tests/eval/report.mjs` (extends existing)
   - New namespace: `export class GoldScorer` (parallel to `ReportMatrix`).
   - Executes post-runnable (`runs/completed` → `allPassed` boolean).
   - API:
     ```typescript
     class GoldScorer {
       static readonly GATING_THRESHOLD = 0.95; // Strict for v0.6 release
       static async scoreRunfile(jsonlPath: string, registry: ToolSpec[]): Promise<{total: number; trials: ScoredTrial[]}>;
     }
     ```

2. **Task-Specific Rules:**
   - **`classify`:** `{labels}` array equality (order-insensitive) **AND** `reason` presence (inferred from backend).
     - Example match:
       ```json
       {labels: ["spam", "urgent"], reason: "...diff in POS..."} // ✓
       {labels: ["spam"], reason: "vague reason"} // ✗ (fails `labels`)
       ```
   - **`extract`:** Unstván quasi-deep-equality via `jsondiffpatch` (modes: {
       "type-check": true, "numeric-epsilon": 0.01, "map-keys-insensitive": true
     }).
     - Schema-shaped fallback: `if(checkEq(gold, spec)) return {score: 0.0}`.

3. **Gating:**
   - **Hard bar:** Every trial must score ≥ `0.95` (**not** mean). Documented in `scorer.mjs` as:
     ```typescript
     if (Math.min(...results.map(x => x.score)) < Scorer.GATING_THRESHOLD) {
       throw new Error(`Release gate ❌; failed trials: ${failedTrialIndices};
         see score breakdown in per-trial metadata.`);
     }
     ```
   - **Justification:** v0.6 explicit requirement to "reject runfiles with structured task failures." Forced autonomy reduces dev hacks.

---

### **Design for H: Thinking-Mode Behavioural Unit Tests**
**Solution:** Parametrized against `thinking-defaults.ts` → single `RecorderBackend`-targeted file.

1. **Location:**
   File: `packages/core/tests/unit/thinking-mode.config.test.ts` (new).
   - *Why:* Existing `*.test.ts` split even with `config/*` scope would overflow `SetupIDE.allPassed` metadata.

2. **Assertions:**
   - **'engine-level signal:** Validate `MlxHttpBackend.requestJson` carries `disableThinking` boolean when `toolSpec.thinkingHeavy`.
     ```typescript
     it.each([
       ["summarize", {expectDisableThinking: true}],
       ["classify", {expectDisableThinking: false}],
     ])(`%s config emits correct disableThinking flag`, ({expectDisableThinking}) => {
       // Trigger tool config → mock `oMLXRequestBody` → assertion:
       const backend = new RecorderBackend({toolSpecMutexOverride: "classify"});
       mockBackendCall(/* arguments */);
       expect(backend.requestRecords[0].body.disableThinking).toBe(expectDisableThinking);
     });
     ```
   - **Data race catch:** Cross-check `thinking_defaults.ts` against the output of `getToolFromName()`:
     ```ts
     const actualMode = lib.invoke.toolSpecRegistry.find(t => t.name === "diff-semantic-index")?.thinkingMode;
     expect(actualMode === Enum<bool>/* "defaultOn" */).toBe(true);  // ✓ sanity
     ```

3. **Scope:**
   - Single test file, coverage:
     ```mermaid
     graph TD
       A[thinking-defaults.ts] -- ✓ 17 rules --> B[config.test.ts:registry]
       B[mock backend] --SharedFlow--> C[תו] --> D[unit harness:✓pass]
     ```
   - Exclusion: Real oMLX payloads (against existing `CI{/tests/unit/*}` constraints).

---
### **Flaps and Recommendations**
1. For **F**:
   - ⚠️ **Regression risk:** `runner.mjs` integration (option c) might silently corrupt future runs if ci-xform becomes order-dependent.
   - **Rejection:** Options (a) and (c) push the test logic away from the *implicit agreement* that v0.6 release must be blocked by hard `runfile.validateAll()` in `scripts/release-check`.

2. For **H**:
   - ⚠️ **Legacy “oMLX incubators”** might override Mlb dobr; add `helpers/DecoderChecker` to parse `reasoning_content` from `RecorderBackend` if enabled.

3. **Join Condition:** If ` installer fonde {1} identifying the `scorer` as breakpointable — add a deliberate `diagnostics/enablePrecision=False` to ease manual overrides.

**Strong recommendation proceed-forward with F and H designs above.**
```
