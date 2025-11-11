/**
 * EVM Network Adapter
 * Handles EVM payment creation using x402-fetch
 */

import type { Account } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
import { createUnsupportedAccountError } from "../utils/errors.js";

/**
 * Detect if an account is an EVM account
 */
export function isEVMAccount(account: unknown): account is Account | string {
  if (typeof account === "string") {
    // Check if it's a valid EVM private key (0x + 64 hex chars)
    return /^0x[a-fA-F0-9]{64}$/.test(account);
  }

  // Check if it's a Viem Account object
  return (
    typeof account === "object" &&
    account !== null &&
    "address" in account &&
    "signMessage" in account &&
    typeof (account as { address: unknown }).address === "string"
  );
}

/**
 * Convert string private key to Viem Account
 */
export function toEVMAccount(account: string | Account): Account {
  if (typeof account === "string") {
    if (!isEVMAccount(account)) {
      throw createUnsupportedAccountError(
        "Invalid EVM private key format. Expected 0x + 64 hex characters.",
      );
    }
    return privateKeyToAccount(account as `0x${string}`);
  }

  return account;
}

/**
 * Fetch function type for EVM payments
 */
export type EVMFetchFunction = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Create wrapped fetch for EVM payments
 */
export function createEVMFetch(account: Account): EVMFetchFunction {
  // x402-fetch expects an object with signMessage method
  // Viem Account already has this interface
  return wrapFetchWithPayment(fetch, account as never);
}
