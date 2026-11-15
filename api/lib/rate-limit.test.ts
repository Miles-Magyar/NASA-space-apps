import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitBuckets } from './rate-limit.js';

describe('rate-limit', () => {
  beforeEach(() => resetRateLimitBuckets());

  it('allows traffic under the cap', () => {
    const a = checkRateLimit('t1', { max: 3, windowMs: 60_000 });
    const b = checkRateLimit('t1', { max: 3, windowMs: 60_000 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(b.remaining).toBe(1);
  });

  it('blocks when max is exceeded', () => {
    checkRateLimit('t2', { max: 2, windowMs: 60_000 });
    checkRateLimit('t2', { max: 2, windowMs: 60_000 });
    const blocked = checkRateLimit('t2', { max: 2, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
