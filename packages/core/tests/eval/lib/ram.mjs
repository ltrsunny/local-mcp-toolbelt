/**
 * RAM peak measurement via `ps -p PID -o rss=` polling.
 *
 * Why not `process.memoryUsage().rss`: on Apple Silicon with node-llama-cpp,
 * Metal GPU buffers live in unified memory but are NOT counted by V8's RSS
 * accounting. `ps` reports the kernel's view of the process's resident set
 * (including Metal allocations mapped into the address space), which is what
 * we want.
 *
 * Polling at 100 ms catches transient peaks during prompt eval / generation
 * without measurable overhead.
 */

import { spawn } from 'node:child_process';

/**
 * Sample current RSS (kB) for `pid` once. Returns null on error so the
 * poller can keep going across transient ps failures.
 */
export function sampleRssKb(pid = process.pid) {
  return new Promise((resolve) => {
    const ps = spawn('ps', ['-p', String(pid), '-o', 'rss=']);
    let out = '';
    ps.stdout.on('data', (b) => { out += b; });
    ps.on('error', () => resolve(null));
    ps.on('close', () => {
      const n = parseInt(out.trim(), 10);
      resolve(Number.isFinite(n) ? n : null);
    });
  });
}

/**
 * Run `fn` while polling RSS every `intervalMs`. Returns
 * `{ result, peakRssMb, samples }`. Peak in MB rather than kB for human
 * readability in reports.
 */
export async function withRssPeak(fn, { pid = process.pid, intervalMs = 100 } = {}) {
  let peakKb = 0;
  let samples = 0;
  // Capture the baseline so peak isn't dominated by Node's own startup RSS
  // — interesting comparison is the *delta* the chat call adds.
  const baselineKb = (await sampleRssKb(pid)) ?? 0;
  let stopped = false;
  const poll = async () => {
    while (!stopped) {
      const k = await sampleRssKb(pid);
      if (k !== null) {
        if (k > peakKb) peakKb = k;
        samples++;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };
  const pollPromise = poll();
  let result, error;
  try {
    result = await fn();
  } catch (e) {
    error = e;
  }
  stopped = true;
  await pollPromise;
  if (error) throw error;
  return {
    result,
    peakRssMb: Math.round(peakKb / 1024),
    baselineRssMb: Math.round(baselineKb / 1024),
    deltaRssMb: Math.round((peakKb - baselineKb) / 1024),
    samples,
  };
}
