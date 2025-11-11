/**
 * Payment Header Encoding Utilities
 */

/**
 * Encode payment payload as base64 for X-Payment header
 */
export function encodePaymentHeader(payload: unknown): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64");
}

/**
 * Decode X-Payment-Response header
 */
export function decodePaymentResponse(headerValue: string): unknown {
  const decoded = Buffer.from(headerValue, "base64").toString();
  return JSON.parse(decoded);
}
