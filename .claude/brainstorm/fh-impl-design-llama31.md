**F: Programmatic Gold-Match Scorer**

I recommend option (a) - a new `tests/eval/scorer.mjs` file parallel to `judge.mjs`. This file will read `runs/*.jsonl` files, emit pass/fail per row, and provide a summary.

For `classify` tasks, I suggest using set equality on `labels` as the comparison rule. This will ensure that the scorer checks for exact matches between the predicted labels and the gold labels. The `reason` field can be ignored in the scoring process.

For `extract` tasks, I recommend using deep structural equality (strict) as the comparison rule. This will ensure that the scorer checks for exact matches between the predicted extracted values and the gold extracted values.

The pass/fail bar for the release gate should be set to a mean score of 0.95 across all trials. This will ensure that the model is performing well across all tasks and trials.

**H: Behavioural Unit Tests for Thinking-Mode**

I recommend creating a new file `tests/unit/thinking-mode-behavioural.test.ts` for these assertions.

The observable output that proves thinking on/off is the presence/absence of `<think>...</think>` tokens in the raw text response. This can be used to assert that the `disableThinking` flag is being respected.

These tests should run against a recorder mock, specifically the `RecorderBackend`. This will allow us to verify that the `disableThinking` flag is being passed correctly to the backend, without actually calling the real oMLX API.

I recommend writing one parameterized test that covers all tools in the registry. This will ensure that the thinking mode behaviour is tested consistently across all tools.

**Gating Threshold**

Based on the above design, I recommend setting the gating threshold for F to a mean score of 0.95 across all trials. This will ensure that the model is performing well across all tasks and trials.

**Code Snippets**

Here's an example of what the `scorer.mjs` file could look like:
```javascript
import { readJsonl } from 'jsonl';
import { assertEquals } from 'asserts';

const scorer = async () => {
  const runs = await readJsonl('runs/*.jsonl');
  const summary = { pass: 0, fail: 0 };

  for (const run of runs) {
    const task = run.task;
    const prediction = run.prediction;
    const gold = run.gold;

    let score = 0;
    if (task === 'classify') {
      score = assertEquals(prediction.labels, gold.labels);
    } else if (task === 'extract') {
      score = assertEquals(prediction, gold);
    }

    summary[score === 1 ? 'pass' : 'fail']++;
  }

  return summary;
};

export { scorer };
```

And here's an example of what the `thinking-mode-behavioural.test.ts` file could look like:
```typescript
import { RecorderBackend } from 'recorder-backend';
import { MlxHttpBackend } from 'mlx-http-backend';
import { assertEquals } from 'asserts';

describe('thinking mode behaviour', () => {
  it('should respect disableThinking flag', async () => {
    const backend = new RecorderBackend();
    const mlxBackend = new MlxHttpBackend(backend);

    const tools = ['summarize', 'classify', 'extract', 'transform', 'diff-semantic-index'];

    for (const tool of tools) {
      const disableThinking = tool === 'summarize' ? true : false;
      const response = await mlxBackend.chat({ tool, disableThinking });

      if (disableThinking) {
        assertEquals(response.includes('<think>...</think>'), false);
      } else {
        assertEquals(response.includes('<think>...</think>'), true);
      }
    }
  });
});
```
