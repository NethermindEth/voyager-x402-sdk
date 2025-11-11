/**
 * Error Utilities
 */

import { VoyagerError, type ErrorCode } from "../types/index.js";

/**
 * Create a VoyagerError with the appropriate code
 */
export function createError(
  code: ErrorCode,
  message: string,
  retryable = false,
  details?: unknown,
): VoyagerError {
  return new VoyagerError(code, message, retryable, details);
}

/**
 * Create a payment failed error
 */
export function createPaymentError(
  message: string,
  retryable = true,
  details?: unknown,
): VoyagerError {
  return createError("PAYMENT_FAILED", message, retryable, details);
}

/**
 * Create a network error
 */
export function createNetworkError(
  message: string,
  retryable = true,
  details?: unknown,
): VoyagerError {
  return createError("NETWORK_ERROR", message, retryable, details);
}

/**
 * Create a discovery failed error
 */
export function createDiscoveryError(
  message: string,
  retryable = false,
  details?: unknown,
): VoyagerError {
  return createError("DISCOVERY_FAILED", message, retryable, details);
}

/**
 * Create a configuration error
 */
export function createConfigError(
  message: string,
  retryable = false,
  details?: unknown,
): VoyagerError {
  return createError("CONFIG_ERROR", message, retryable, details);
}

/**
 * Create an insufficient balance error
 */
export function createInsufficientBalanceError(
  message: string,
  details?: unknown,
): VoyagerError {
  return createError("INSUFFICIENT_BALANCE", message, false, details);
}

/**
 * Create a timeout error
 */
export function createTimeoutError(
  message: string,
  retryable = true,
  details?: unknown,
): VoyagerError {
  return createError("TIMEOUT", message, retryable, details);
}

/**
 * Create an unsupported account error
 */
export function createUnsupportedAccountError(
  message: string,
  details?: unknown,
): VoyagerError {
  return createError("UNSUPPORTED_ACCOUNT", message, false, details);
}

/**
 * Wrap a generic error into a VoyagerError
 */
export function wrapError(
  error: unknown,
  defaultMessage?: string,
): VoyagerError {
  if (error instanceof VoyagerError) {
    return error;
  }

  if (error instanceof Error) {
    // Detect error type from message
    const message = error.message.toLowerCase();

    if (message.includes("balance") || message.includes("insufficient")) {
      return createInsufficientBalanceError(error.message, error);
    }

    if (
      message.includes("timeout") ||
      message.includes("etimedout") ||
      message.includes("deadline")
    ) {
      return createTimeoutError(error.message, true, error);
    }

    if (
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    ) {
      return createNetworkError(error.message, true, error);
    }

    if (message.includes("discovery")) {
      return createDiscoveryError(error.message, false, error);
    }

    // Default to payment error for unknown errors
    return createPaymentError(error.message, true, error);
  }

  // Unknown error type
  return createError(
    "NETWORK_ERROR",
    defaultMessage ?? String(error),
    true,
    error,
  );
}
