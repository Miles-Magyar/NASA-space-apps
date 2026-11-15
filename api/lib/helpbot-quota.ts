import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const DAILY_LIMIT = 250;
const IP_MINUTE_LIMIT = 6;

// Check both limits and reserve one Gemini request in a single Redis operation.
const reserveRequest = `
  if tonumber(redis.call('GET', KEYS[1]) or '0') >= tonumber(ARGV[1]) then return 1 end
  if tonumber(redis.call('GET', KEYS[2]) or '0') >= tonumber(ARGV[2]) then return 2 end
  if redis.call('INCR', KEYS[1]) == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
  if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
  return 0
`;

export async function reserveHelpbotQuota(ipHeader: string | string[] | undefined): Promise<number> {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = process.env;
  if (!url || !token) throw new Error('Shared Helpbot quota unavailable');
  const ip = typeof ipHeader === 'string' ? ipHeader.trim() : '';
  const client = isIP(ip) ? createHash('sha256').update(ip).digest('hex') : 'unknown';
  const now = Math.floor(Date.now() / 1000);
  const minuteRemaining = 60 - now % 60;
  const dayRemaining = 86400 - now % 86400;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(2500),
    body: JSON.stringify([
      'EVAL', reserveRequest, 2,
      `{helpbot}:ip:${client}:${Math.floor(now / 60)}`,
      `{helpbot}:day:${Math.floor(now / 86400)}`,
      IP_MINUTE_LIMIT, DAILY_LIMIT, minuteRemaining + 10, dayRemaining + 10,
    ]),
  });
  if (!response.ok) throw new Error('Shared Helpbot quota unavailable');
  const { result } = await response.json() as { result?: number };
  if (result === 0) return 0;
  if (result === 1) return minuteRemaining;
  if (result === 2) return dayRemaining;
  throw new Error('Shared Helpbot quota unavailable');
}
