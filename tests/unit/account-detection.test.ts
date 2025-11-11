/**
 * Account Detection Tests
 */

import { describe, it, expect } from "bun:test";
import { isEVMAccount } from "../../src/adapters/evm";
import { isStarknetAccount } from "../../src/adapters/starknet";

describe("Account Detection", () => {
  describe("EVM Account Detection", () => {
    it("should detect valid EVM private key (0x + 64 hex chars)", () => {
      const validKey = "0x" + "a".repeat(64);
      expect(isEVMAccount(validKey)).toBe(true);
    });

    it("should reject invalid EVM private key (wrong length)", () => {
      const invalidKey = "0x" + "a".repeat(63);
      expect(isEVMAccount(invalidKey)).toBe(false);
    });

    it("should reject invalid EVM private key (no 0x prefix)", () => {
      const invalidKey = "a".repeat(64);
      expect(isEVMAccount(invalidKey)).toBe(false);
    });

    it("should reject invalid EVM private key (non-hex chars)", () => {
      const invalidKey = "0x" + "z".repeat(64);
      expect(isEVMAccount(invalidKey)).toBe(false);
    });

    it("should detect Viem Account object", () => {
      const viemAccount = {
        address: "0x1234567890123456789012345678901234567890",
        signMessage: () => Promise.resolve("0x"),
      };
      expect(isEVMAccount(viemAccount)).toBe(true);
    });
  });

  describe("Starknet Account Detection", () => {
    it("should detect valid Starknet private key (not exactly 64 hex)", () => {
      const validKey = "0x" + "a".repeat(63); // 63 chars, not 64
      expect(isStarknetAccount(validKey)).toBe(true);
    });

    it("should reject EVM-length keys (64 hex chars)", () => {
      const evmKey = "0x" + "a".repeat(64);
      expect(isStarknetAccount(evmKey)).toBe(false);
    });

    it("should detect Starknet Account object", () => {
      const starknetAccount = {
        address: "0x1234",
        signer: {},
        cairoVersion: "1",
      };
      expect(isStarknetAccount(starknetAccount)).toBe(true);
    });

    it("should reject invalid Starknet private key (no 0x)", () => {
      const invalidKey = "a".repeat(63);
      expect(isStarknetAccount(invalidKey)).toBe(false);
    });
  });
});
