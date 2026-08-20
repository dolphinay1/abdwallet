import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const IP_MAP = new Map<string, RateLimitStore>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of IP_MAP.entries()) {
      if (now > data.resetTime) {
        IP_MAP.delete(ip);
      }
    }
  }, 300_000);
}

// Distributed Redis client initialization (if env variables are present)
let upstashRatelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    upstashRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: false,
    });
  } catch {
    upstashRatelimit = null;
  }
}

/**
 * Extracts client IP securely by relying on trusted reverse proxy / edge headers.
 * Does not trust raw first element of X-Forwarded-For which can be spoofed by attackers.
 */
export function getClientIp(req: Request): string {
  // 0. Cloudflare proxy önde — en güvenilir kaynak
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  // 1. Check trusted Vercel proxy header
  const vercelForwarded = req.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    const parts = vercelForwarded.split(',');
    const ip = parts[parts.length - 1].trim();
    if (ip) return ip;
  }

  // 2. Check x-real-ip
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  // 3. Check x-forwarded-for (rely on edge-appended last IP)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const ip = parts[parts.length - 1].trim();
    if (ip) return ip;
  }

  return '127.0.0.1';
}

/**
 * Synchronous in-memory sliding window rate limiter per client IP.
 */
export function checkRateLimit(
  req: Request,
  maxRequests = 60,
  windowMs = 60_000
): { allowed: boolean; response?: NextResponse } {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = IP_MAP.get(ip);

  if (!entry || now > entry.resetTime) {
    IP_MAP.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please wait a moment.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
          },
        }
      ),
    };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Async rate limiter utilizing Upstash Redis if configured, falling back to in-memory.
 */
export async function checkRateLimitAsync(
  req: Request,
  maxRequests = 60,
  windowMs = 60_000
): Promise<{ allowed: boolean; response?: NextResponse }> {
  if (upstashRatelimit) {
    try {
      const ip = getClientIp(req);
      const { success, reset } = await upstashRatelimit.limit(ip);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return {
          allowed: false,
          response: NextResponse.json(
            {
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please wait a moment.',
            },
            {
              status: 429,
              headers: {
                'Retry-After': retryAfter.toString(),
              },
            }
          ),
        };
      }
      return { allowed: true };
    } catch {
      // Fallback to in-memory on redis connection error
    }
  }

  return checkRateLimit(req, maxRequests, windowMs);
}
