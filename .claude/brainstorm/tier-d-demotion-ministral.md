The core framing misses a critical tension: **Tier D’s value proposition (classify/transform accuracy) is now overwhelmed by its operational fragility**—not just on 16GB Macs, but even in the default 6GB hot cache. The proposed demotions (A-E) assume fracturing the problem (removing docs, adding caveats, or narrowing routes), but the *systemic issue* is that **Tier D’s existence violates the toolbelt’s stated priorities**:

1. **Latency underpressure**: Model-eval acceleration isn’t worth 60s synced calls when the async triad already mitigates D’s original justification (long-form isn’t D’s strong suit either, given its context window mismatch).
2. **24GB-as-second-class**: Tier D’s opt-in status is a science experiment, not a user-facing feature. The truth is embarrassment-more-memory isn’t sustainable.
3. **Truth > Legacy Promises**: The lack of v0.6.0 eval data implicitly confirms D’s score lift isn’t repeatable—because no one’s *using it*. The avalanche of "accept 8+ GB of reserved cache" or "throw hardware at it" demands snapshots the product as pre-alpha slot-machine mechanics, not cohesive behavior.

**F: De sixième sense of D → E but with surgical ugliness**.
Replace Tier D’s row with **explicit obituary**:
```
| D (⚰️)  | Qwen3-14B-4bit              | -      | ➜ **Deprecated: 05-2026**.
**Do not rely on adaptive benefits without explicit TierOverride**.
For new installs, `npm run download-models` skips 14B.
Persistent samples (e.g., quantitative compare) in S3/ferd-theor/restricted;
contact k-ops@shard.so for reverting to [-classify].
```
WHY?
→ **Calls it out without suggesting fragility is fixable**
→ **Zeroth-order move** (no evasions about "future cache resizes"--history shows none came)
→ **Trains scavengers**: Tier B/C are repurpose-ready, while Tier D’s real الأولى-scandal is that the team **never termed its ejection from prime utility**.

---
A/B/C are band-aids on a grilez with carryover sidechains; D/E coast over how *people’s 90% use case*—classify + transform*—shouldn’t disappear, just morph. The right solution is a **rating agency for models**—where ** Tier D is a "Cautio—AOW" (Avoid Unless Willfully Capital-AUnfortunately-Wrestling)** with sequential deprecation artifacts above the table.
