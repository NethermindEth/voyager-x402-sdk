/**
 * Retry Logic with Exponential Backoff
 */

import type { RetryConfig } from "../types/index.js";

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 10,
  initialDelay: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    "unknown_error",
    "transaction_execution_error",
    "paymaster",
    "network",
    "timeout",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
  ],
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(
  error: Error,
  retryablePatterns: Array<string>,
): boolean {
  const errorMessage = error.message.toLowerCase();
  return retryablePatterns.some((pattern) =>
    errorMessage.includes(pattern.toLowerCase()),
  );
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param config - Retry configuration
 * @param onRetry - Optional callback when retrying (for logging)
 * @returns Result of the function call
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  function_: () => Promise<T>,
  config: RetryConfig = {},
  onRetry?: (attempt: number, delay: number, error: Error) => void,
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await function_();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a retryable error
      const retryable = isRetryableError(
        lastError,
        finalConfig.retryableErrors,
      );

      // If not retryable or last attempt, throw immediately
      if (!retryable || attempt === finalConfig.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay =
        finalConfig.initialDelay *
        Math.pow(finalConfig.backoffMultiplier, attempt - 1);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, delay, lastError);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Retry failed with unknown error");
}
