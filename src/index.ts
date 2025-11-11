/**
 * @voyager/sdk
 * Zero-configuration SDK for Voyager x402 payment-protected APIs
 */

// Main client
export { VoyagerClient } from "./client.js";

// Types
export type {
  VoyagerConfig,
  VoyagerOptions,
  SupportedAccount,
  NetworkType,
  RetryConfig,
  PaymentDetails,
  PaymentReceipt,
  PaymentStats,
  RequestOptions,
  ClientConfig,
  PaymentRequirement,
  ErrorCode,
} from "./types/index.js";

export { VoyagerError } from "./types/index.js";

// Voyager API types (re-export for convenience)
export type {
  Block,
  BlocksResponse,
  Transaction,
  TransactionsResponse,
  Contract,
  ContractsResponse,
  HealthResponse,
} from "./types/voyager.js";
