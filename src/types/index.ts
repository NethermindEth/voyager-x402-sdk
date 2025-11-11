/**
 * Core SDK Types
 */

import type { Account as ViemAccount } from "viem";
import type { Account as StarknetAccount } from "starknet";

/**
 * Supported account types
 */
export type SupportedAccount = string | ViemAccount | StarknetAccount;

/**
 * Network types
 */
export type NetworkType = "evm" | "starknet";

/**
 * SDK Configuration
 */
export interface VoyagerConfig {
  /** User's wallet/account - can be private key (string), Viem account, or Starknet account */
  account: SupportedAccount;

  /** Voyager API base URL (e.g., https://voyager-api.example.com) */
  apiUrl: string;

  /** Optional advanced configuration */
  options?: VoyagerOptions;
}

/**
 * Advanced SDK Options
 */
export interface VoyagerOptions {
  /** Network preference (auto-detected if not specified) */
  network?: NetworkType;

  /** Retry configuration */
  retries?: RetryConfig;

  /** Event hooks for monitoring */
  onPaymentRequired?: (details: PaymentDetails) => void;
  onPaymentSettled?: (receipt: PaymentReceipt) => void;
  onError?: (error: VoyagerError) => void;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Custom headers for all requests */
  headers?: Record<string, string>;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 10) */
  maxAttempts?: number;

  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;

  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;

  /** Custom retryable error patterns */
  retryableErrors?: Array<string>;
}

/**
 * Payment Details (emitted on payment required)
 */
export interface PaymentDetails {
  network: string;
  token: string;
  amount: string;
  recipient: string;
  endpoint: string;
}

/**
 * Payment Receipt (emitted after payment settled)
 */
export interface PaymentReceipt {
  transactionHash: string;
  network: string;
  payer: string;
  timestamp: number;
  success: boolean;
}

/**
 * Payment Statistics
 */
export interface PaymentStats {
  totalRequests: number;
  paidRequests: number;
  freeRequests: number;
  totalSpent: Partial<
    Record<
      string,
      {
        amount: string;
        token: string;
      }
    >
  >;
  averageLatency: number;
}

/**
 * Discovery Response (from /discovery/resources)
 */
export interface DiscoveryResponse {
  x402Version: number;
  items: Array<DiscoveredResource>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

/**
 * Discovered Resource
 */
export interface DiscoveredResource {
  resource: string;
  type: string;
  x402Version: number;
  accepts: Array<PaymentRequirement>;
  lastUpdated: number;
  metadata?: {
    category?: string;
    provider?: string;
    description?: string;
    tags?: Array<string>;
  };
}

/**
 * Payment Requirement (from 402 response or discovery)
 */
export interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, unknown>;
}

/**
 * Internal Client Configuration (after discovery)
 */
export interface ClientConfig {
  endpoints: Array<EndpointConfig>;
  facilitatorUrl: string;
  networks: Array<string>;
}

/**
 * Endpoint Configuration
 */
export interface EndpointConfig {
  path: string;
  pricing: Array<PricingInfo>;
}

/**
 * Pricing Information
 */
export interface PricingInfo {
  network: string;
  amount: string;
  token: string;
  recipient: string;
}

/**
 * Error Codes
 */
export type ErrorCode =
  | "PAYMENT_FAILED"
  | "NETWORK_ERROR"
  | "DISCOVERY_FAILED"
  | "CONFIG_ERROR"
  | "INSUFFICIENT_BALANCE"
  | "TIMEOUT"
  | "UNSUPPORTED_ACCOUNT";

/**
 * SDK Error Class
 */
export class VoyagerError extends Error {
  code: ErrorCode;
  details?: unknown;
  retryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    retryable = false,
    details?: unknown,
  ) {
    super(message);
    this.name = "VoyagerError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

/**
 * Request Options
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}
