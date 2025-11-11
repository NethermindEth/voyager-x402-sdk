/**
 * Starknet Network Adapter
 * Handles Starknet payment creation using x402-starknet via facilitator proxy
 */

import type { Account } from "starknet";
import { createPaymentPayload } from "x402-starknet";
import type { PaymentRequirement } from "../types/index.js";
import {
  createPaymentError,
  createUnsupportedAccountError,
} from "../utils/errors.js";

/**
 * Detect if an account is a Starknet account
 */
export function isStarknetAccount(
  account: unknown,
): account is Account | string {
  if (typeof account === "string") {
    // Starknet private keys are typically 0x followed by variable length hex
    // (not exactly 64 chars like EVM)
    return (
      account.startsWith("0x") &&
      /^0x[a-fA-F0-9]+$/.test(account) &&
      account.length !== 66
    ); // Not exactly 64 hex chars (EVM)
  }

  // Check if it's a Starknet Account object
  // Starknet Account has unique properties: 'signer' and 'cairoVersion'
  return (
    typeof account === "object" &&
    account !== null &&
    "address" in account &&
    "signer" in account &&
    "cairoVersion" in account &&
    typeof (account as { address: unknown }).address === "string"
  );
}

/**
 * Convert string private key to Starknet Account
 */
export function toStarknetAccount(
  account: string | Account,
  _rpcUrl?: string,
): Account {
  if (typeof account === "string") {
    if (!isStarknetAccount(account)) {
      throw createUnsupportedAccountError(
        "Invalid Starknet private key format.",
      );
    }

    // Note: We can't derive the address from just the private key in Starknet
    // User must provide a full Account object or we need to use account discovery
    throw createUnsupportedAccountError(
      "Cannot create Starknet account from private key alone. Please provide a Starknet Account object with address and signer.",
    );
  }

  return account;
}

/**
 * Create Starknet payment payload via facilitator proxy
 *
 * The facilitator acts as a proxy to the paymaster, keeping paymaster credentials server-side.
 * This ensures 3rd party applications using the SDK never need paymaster access.
 */
export async function createStarknetPayment(
  account: Account,
  requirement: PaymentRequirement,
  facilitatorUrl: string,
): Promise<unknown> {
  try {
    // Use facilitator as paymaster proxy - this keeps paymaster credentials server-side
    const paymasterConfig = {
      endpoint: `${facilitatorUrl}/facilitator/paymaster`,
      network: requirement.network as unknown, // Type cast for network compatibility
    };

    const payload = await createPaymentPayload(
      account,
      1, // x402 version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      requirement as any, // Type cast - our PaymentRequirement is compatible
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      paymasterConfig as any, // Type cast for paymaster config
    );

    return payload;
  } catch (error) {
    throw createPaymentError(
      `Failed to create Starknet payment: ${error instanceof Error ? error.message : String(error)}`,
      true,
      error,
    );
  }
}
