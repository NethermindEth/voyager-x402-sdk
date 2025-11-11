/**
 * Voyager Client
 * Zero-configuration SDK for Voyager x402 payment-protected APIs
 */

import type { Account as ViemAccount } from "viem";
import type { Account as StarknetAccount } from "starknet";
import type {
  VoyagerConfig,
  VoyagerOptions,
  ClientConfig,
  PaymentRequirement,
  PaymentStats,
  RequestOptions,
  NetworkType,
  SupportedAccount,
} from "./types/index.js";
import { discoverConfiguration } from "./discovery.js";
import {
  isEVMAccount,
  toEVMAccount,
  createEVMFetch,
  type EVMFetchFunction,
} from "./adapters/evm.js";
import {
  isStarknetAccount,
  toStarknetAccount,
  createStarknetPayment,
} from "./adapters/starknet.js";
import { retryWithBackoff } from "./utils/retry.js";
import {
  createConfigError,
  createPaymentError,
  wrapError,
} from "./utils/errors.js";
import { encodePaymentHeader } from "./utils/encoding.js";

/**
 * VoyagerClient - Main SDK class
 */
export class VoyagerClient {
  private readonly apiUrl: string;
  private readonly account: SupportedAccount;
  private readonly options: VoyagerOptions;
  private readonly accountType: NetworkType;
  private readonly evmFetch?: EVMFetchFunction;

  private config: ClientConfig | null = null;
  private stats: PaymentStats = {
    totalRequests: 0,
    paidRequests: 0,
    freeRequests: 0,
    totalSpent: {},
    averageLatency: 0,
  };

  constructor(voyagerConfig: VoyagerConfig) {
    this.apiUrl = voyagerConfig.apiUrl;
    this.account = voyagerConfig.account;
    this.options = voyagerConfig.options ?? {};

    // Auto-detect account type
    this.accountType = this.detectAccountType();

    // Override with explicit network preference if provided
    if (this.options.network) {
      this.accountType = this.options.network;
    }

    // Create EVM wrapped fetch if using EVM account
    if (this.accountType === "evm") {
      const evmAccount = toEVMAccount(this.account as string | ViemAccount);
      this.evmFetch = createEVMFetch(evmAccount);
    }
  }

  /**
   * Detect account type from the account object/string
   */
  private detectAccountType(): NetworkType {
    // Check Starknet first since Starknet Account objects are more specific
    if (isStarknetAccount(this.account)) {
      return "starknet";
    }

    if (isEVMAccount(this.account)) {
      return "evm";
    }

    throw createConfigError(
      "Unsupported account type. Please provide an EVM private key, Viem Account, or Starknet Account.",
    );
  }

  /**
   * Initialize the client by discovering API configuration
   */
  async initialize(): Promise<void> {
    if (this.config) {
      // Already initialized
      return;
    }

    try {
      this.config = await discoverConfiguration(
        this.apiUrl,
        this.options.timeout,
      );
    } catch (error) {
      throw wrapError(error, "Failed to initialize Voyager client");
    }
  }

  /**
   * Get current client configuration (for debugging)
   */
  getConfig(): ClientConfig | null {
    return this.config;
  }

  /**
   * Get payment statistics
   */
  getStats(): PaymentStats {
    return { ...this.stats };
  }

  /**
   * Make a GET request with automatic payment handling
   */
  async get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const response = await this.fetch(url, {
      method: "GET",
      ...options,
    });

    return (await response.json()) as T;
  }

  /**
   * Make a POST request with automatic payment handling
   */
  async post<T = unknown>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });

    return (await response.json()) as T;
  }

  /**
   * Low-level fetch with automatic payment handling
   */
  async fetch(
    url: string,
    options: RequestInit & RequestOptions = {},
  ): Promise<Response> {
    // Ensure initialized
    await this.initialize();

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // For EVM accounts, use x402-fetch wrapped fetch
      if (this.accountType === "evm" && this.evmFetch) {
        const response = await this.evmFetch(url, options);

        // Update stats
        if (response.headers.has("x-payment-response")) {
          this.stats.paidRequests++;
          // Parse payment response to track spending
          const paymentHeader = response.headers.get("x-payment-response");
          if (paymentHeader && this.options.onPaymentSettled) {
            try {
              const decoded = JSON.parse(
                Buffer.from(paymentHeader, "base64").toString(),
              ) as {
                transaction: string;
                network: string;
                payer: string;
                success?: boolean;
              };

              this.options.onPaymentSettled({
                transactionHash: decoded.transaction,
                network: decoded.network,
                payer: decoded.payer,
                timestamp: Date.now(),
                success: decoded.success ?? true,
              });
            } catch {
              // Ignore parsing errors
            }
          }
        } else {
          this.stats.freeRequests++;
        }

        this.updateAverageLatency(Date.now() - startTime);
        return response;
      }

      // For Starknet accounts, use manual payment flow
      const initialHeaders = new Headers(options.headers ?? undefined);
      initialHeaders.set("X-Payment-Networks", this.accountType);

      // Add custom headers from config
      if (this.options.headers) {
        for (const [key, value] of Object.entries(this.options.headers)) {
          initialHeaders.set(key, value);
        }
      }

      let response = await fetch(url, {
        ...options,
        headers: initialHeaders,
      });

      // If not 402, return immediately (free endpoint or payment already made)
      if (response.status !== 402) {
        this.stats.freeRequests++;
        this.updateAverageLatency(Date.now() - startTime);
        return response;
      }

      // Parse payment requirements from 402 response
      const payload = (await response.json()) as {
        accepts: Array<PaymentRequirement>;
      };

      // Select matching payment requirement
      const requirement = this.selectPaymentRequirement(payload.accepts);

      if (!requirement) {
        throw createPaymentError(
          `No compatible payment option found for ${this.accountType} network. Available: ${payload.accepts.map((r) => r.network).join(", ")}`,
        );
      }

      // Notify payment required
      if (this.options.onPaymentRequired) {
        this.options.onPaymentRequired({
          network: requirement.network,
          token: requirement.asset,
          amount: requirement.maxAmountRequired,
          recipient: requirement.payTo,
          endpoint: url,
        });
      }

      // Create payment payload with retries
      const paymentPayload = await retryWithBackoff(
        () => this.createPayment(requirement),
        this.options.retries,
        (attempt, delay, error) => {
          // Log retry attempt if error handler provided
          if (this.options.onError) {
            this.options.onError(
              wrapError(
                error,
                `Payment creation failed (attempt ${String(attempt)}), retrying in ${String(delay)}ms...`,
              ),
            );
          }
        },
      );

      // Retry request with payment
      const headers = new Headers(options.headers ?? undefined);
      headers.set("X-Payment", encodePaymentHeader(paymentPayload));

      response = await fetch(url, {
        ...options,
        headers,
      });

      // Track payment statistics
      this.stats.paidRequests++;
      this.trackPayment(requirement);
      this.updateAverageLatency(Date.now() - startTime);

      // Parse and notify payment settlement
      const paymentResponse = response.headers.get("X-Payment-Response");
      if (paymentResponse !== null && this.options.onPaymentSettled) {
        try {
          const decoded = JSON.parse(
            Buffer.from(paymentResponse, "base64").toString(),
          ) as {
            transaction: string;
            network: string;
            payer: string;
            success?: boolean;
          };

          this.options.onPaymentSettled({
            transactionHash: decoded.transaction,
            network: decoded.network,
            payer: decoded.payer,
            timestamp: Date.now(),
            success: decoded.success ?? true,
          });
        } catch {
          // Ignore parsing errors for payment response
        }
      }

      return response;
    } catch (error) {
      this.updateAverageLatency(Date.now() - startTime);

      // Notify error
      if (this.options.onError) {
        this.options.onError(wrapError(error));
      }

      throw wrapError(error);
    }
  }

  /**
   * Select a compatible payment requirement based on account type
   */
  private selectPaymentRequirement(
    accepts: Array<PaymentRequirement>,
  ): PaymentRequirement | undefined {
    if (this.accountType === "evm") {
      // Find EVM network (base, avalanche, ethereum, etc.)
      return accepts.find((req) => !req.network.startsWith("starknet-"));
    } else {
      // Find Starknet network
      return accepts.find((req) => req.network.startsWith("starknet-"));
    }
  }

  /**
   * Create payment payload based on account type
   * Note: Only used for Starknet. EVM uses x402-fetch wrapped fetch.
   */
  private async createPayment(
    requirement: PaymentRequirement,
  ): Promise<unknown> {
    const account = toStarknetAccount(this.account as string | StarknetAccount);

    // Get facilitator URL from config (initialized during first request)
    const facilitatorUrl = this.config?.facilitatorUrl;
    if (!facilitatorUrl) {
      throw new Error("Client not initialized - facilitator URL not available");
    }

    return createStarknetPayment(account, requirement, facilitatorUrl);
  }

  /**
   * Track payment in statistics
   */
  private trackPayment(requirement: PaymentRequirement): void {
    const { network } = requirement;

    // Initialize if network doesn't exist
    const existingSpent = this.stats.totalSpent[network];
    if (existingSpent === undefined) {
      this.stats.totalSpent[network] = {
        amount: requirement.maxAmountRequired,
        token: requirement.asset,
      };
      return;
    }

    // Add amount (note: this is simplified, real implementation would parse BigInt)
    const current = BigInt(existingSpent.amount);
    const additional = BigInt(requirement.maxAmountRequired);
    this.stats.totalSpent[network] = {
      amount: (current + additional).toString(),
      token: requirement.asset,
    };
  }

  /**
   * Update average latency
   */
  private updateAverageLatency(latency: number): void {
    const total = this.stats.totalRequests;
    const currentAvg = this.stats.averageLatency;
    this.stats.averageLatency = (currentAvg * (total - 1) + latency) / total;
  }
}
