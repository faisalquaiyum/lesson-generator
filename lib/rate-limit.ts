import { NextRequest } from "next/server";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>();

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

/**
 * Rate limiter that tracks requests per IP address
 * Returns true if rate limit is exceeded
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Get client IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const now = Date.now();
  const key = `ratelimit:${ip}`;

  // Get or create rate limit entry
  let rateLimitEntry = rateLimitStore.get(key);

  // Reset if interval has passed
  if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
    rateLimitEntry = {
      count: 0,
      resetTime: now + config.interval,
    };
    rateLimitStore.set(key, rateLimitEntry);
  }

  // Increment count
  rateLimitEntry.count++;

  // Check if limit exceeded
  const isLimitExceeded = rateLimitEntry.count > config.uniqueTokenPerInterval;

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup
    cleanupOldEntries();
  }

  return {
    success: !isLimitExceeded,
    limit: config.uniqueTokenPerInterval,
    remaining: Math.max(0, config.uniqueTokenPerInterval - rateLimitEntry.count),
    reset: rateLimitEntry.resetTime,
  };
}

/**
 * Cleanup expired rate limit entries
 */
function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Create a rate limit error response
 */
export function rateLimitExceeded(limit: number, reset: number) {
  return {
    error: "Rate limit exceeded",
    message: `Too many requests. Maximum ${limit} requests per minute.`,
    retryAfter: Math.ceil((reset - Date.now()) / 1000),
  };
}
