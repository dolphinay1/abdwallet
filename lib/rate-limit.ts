import { NextResponse } from 'next/server';

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

/**
 * In-memory sliding window rate limiter per client IP.
 * @param req The Next.js Request object
 * @param maxRequests Maximum allowed requests in the window (default: 60)
 * @param windowMs Window duration in milliseconds (default: 60,000ms / 1 min)
 */
export function checkRateLimit(
  req: Request,
  maxRequests = 60,
  windowMs = 60_000
): { allowed: boolean; response?: NextResponse } {
  // Extract client IP from headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = (forwarded ? forwarded.split(',')[0].trim() : realIp) || '127.0.0.1';

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
