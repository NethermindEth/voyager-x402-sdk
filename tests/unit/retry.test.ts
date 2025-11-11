/**
 * Retry Logic Tests
 */

import { describe, it, expect } from "bun:test";
import { retryWithBackoff, isRetryableError } from "../../src/utils/retry";

describe("Retry Logic", () => {
  describe("isRetryableError", () => {
    it("should detect retryable errors", () => {
      const testCases = [
        { error: new Error("UNKNOWN_ERROR occurred"), expected: true },
        { error: new Error("Transaction_execution_error"), expected: true },
        { error: new Error("Paymaster failed"), expected: true },
        { error: new Error("Network timeout"), expected: true },
        { error: new Error("Connection ETIMEDOUT"), expected: true },
      ];

      const patterns = [
        "unknown_error",
        "transaction_execution_error",
        "paymaster",
        "network",
        "timeout",
        "ETIMEDOUT",
      ];

      for (const { error, expected } of testCases) {
        const result = isRetryableError(error, patterns);
        if (result !== expected) {
          console.log(
            `Failed for error: "${error.message}", expected: ${String(expected)}, got: ${String(result)}`,
          );
        }
        expect(result).toBe(expected);
      }
    });

    it("should reject non-retryable errors", () => {
      const error = new Error("Invalid signature");
      const patterns = ["unknown_error", "timeout"];

      expect(isRetryableError(error, patterns)).toBe(false);
    });
  });

  describe("retryWithBackoff", () => {
    it("should succeed on first attempt", async () => {
      let attempts = 0;
      const testFunction = (): Promise<string> => {
        attempts++;
        return Promise.resolve("success");
      };

      const result = await retryWithBackoff(testFunction, { maxAttempts: 3 });

      expect(result).toBe("success");
      expect(attempts).toBe(1);
    });

    it("should retry on retryable errors", async () => {
      let attempts = 0;
      const testFunction = (): Promise<string> => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error("timeout error"));
        }
        return Promise.resolve("success");
      };

      const result = await retryWithBackoff(testFunction, {
        maxAttempts: 5,
        initialDelay: 10,
      });

      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });

    it("should throw after max retries", async () => {
      const testFunction = (): Promise<never> => {
        return Promise.reject(new Error("timeout error"));
      };

      try {
        await retryWithBackoff(testFunction, {
          maxAttempts: 3,
          initialDelay: 10,
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("timeout error");
      }
    });

    it("should not retry non-retryable errors", async () => {
      let attempts = 0;
      const testFunction = (): Promise<never> => {
        attempts++;
        return Promise.reject(new Error("invalid signature"));
      };

      try {
        await retryWithBackoff(testFunction, {
          maxAttempts: 5,
          initialDelay: 10,
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("invalid signature");
      }

      // Give it a moment to ensure no retries
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(attempts).toBe(1);
    });

    it("should call onRetry callback", async () => {
      let attempts = 0;
      let retryCallbacks = 0;

      const testFunction = (): Promise<string> => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error("timeout"));
        }
        return Promise.resolve("success");
      };

      await retryWithBackoff(
        testFunction,
        { maxAttempts: 5, initialDelay: 10 },
        (attempt, _delay, error): void => {
          retryCallbacks++;
          expect(error.message).toBe("timeout");
          expect(attempt).toBeLessThan(3);
        },
      );

      expect(retryCallbacks).toBe(2); // Failed twice, succeeded third time
    });
  });
});
