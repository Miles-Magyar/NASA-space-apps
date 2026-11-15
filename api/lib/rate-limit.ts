/** Simple in-memory sliding-window rate limiter (per serverless instance). */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec?: number;
}

const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): RateLimitResult {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 20;
  const now = Date.now();
  const cutoff = now - windowMs;
  const prev = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (prev.length >= max) {
    hits.set(key, prev);
    const retryAfterSec = Math.max(1, Math.ceil((prev[0]! + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }

  prev.push(now);
  hits.set(key, prev);
  return { ok: true, remaining: Math.max(0, max - prev.length) };
}

/** Test helper — clear buckets between unit tests. */
export function resetRateLimitBuckets(): void {
  hits.clear();
}
