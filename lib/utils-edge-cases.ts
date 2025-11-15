/**
 * Utility functions for handling edge cases
 * Includes network retries, timeouts, and error recovery
 */

/**
 * Fetch with exponential backoff retry
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // For server errors (5xx), retry with exponential backoff
      if (response.status >= 500 && i < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
        console.warn(`Server error (${response.status}), retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      // Network error (offline, CORS, etc.)
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = 1000 * Math.pow(2, i);
      console.warn(`Network error, retrying in ${delay}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max retries exceeded");
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout - please try again");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with both retry and timeout
 */
export async function fetchWithRetryAndTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000,
  maxRetries = 3
): Promise<Response> {
  return fetchWithRetry(
    url,
    options,
    maxRetries
  ).then((response) => {
    // Apply timeout to the actual request
    return fetchWithTimeout(url, options, timeout);
  });
}

/**
 * Truncate long error messages for display
 */
export function truncateError(error: string, maxLength = 500): string {
  if (error.length <= maxLength) return error;
  return error.substring(0, maxLength) + "... (see console for full error)";
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/**
 * Wait for network to come back online
 */
export async function waitForOnline(timeout = 30000): Promise<boolean> {
  if (isOnline()) return true;

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      window.removeEventListener("online", onlineHandler);
      resolve(false);
    }, timeout);

    const onlineHandler = () => {
      clearTimeout(timeoutId);
      window.removeEventListener("online", onlineHandler);
      resolve(true);
    };

    window.addEventListener("online", onlineHandler);
  });
}

/**
 * Format retry-after seconds to human readable time
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

/**
 * Debounce function to prevent rapid API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit API call frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Validate code size before compilation
 */
export function validateCodeSize(code: string, maxSize = 500000): {
  isValid: boolean;
  error?: string;
} {
  if (code.length > maxSize) {
    return {
      isValid: false,
      error: `Generated code is too large (${Math.round(code.length / 1000)}KB). Maximum allowed: ${maxSize / 1000}KB`,
    };
  }
  return { isValid: true };
}

/**
 * Check if code is likely empty or whitespace only
 */
export function isEmptyCode(code: string): boolean {
  return !code || code.trim().length === 0 || code.trim().length < 100;
}

/**
 * Sanitize user input for display
 */
export function sanitizeForDisplay(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Get user's timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format date with user's locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
