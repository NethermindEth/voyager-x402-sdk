import { config } from "dotenv";
import { VoyagerClient } from "../src/index.js";
import type { BlocksResponse, Block } from "../src/types/voyager.js";

config();

const API_URL = process.env.API_URL ?? "http://localhost:4022";

if (!process.env.PRIVATE_KEY) {
  throw new Error(
    "Missing required environment variable: PRIVATE_KEY (EVM private key for Base Sepolia)",
  );
}

const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main(): Promise<void> {
  // Initialize Voyager SDK with automatic payment handling
  const client = new VoyagerClient({
    account: PRIVATE_KEY,
    apiUrl: API_URL,
    options: {
      onPaymentRequired: (details): void => {
        console.log(`💰 Payment: ${details.amount} ${details.token}`);
      },
      onPaymentSettled: (receipt): void => {
        console.log(`✅ Paid: ${receipt.transactionHash}`);
      },
    },
  });

  try {
    // Make API request - SDK handles payments automatically
    const blocksData = await client.get<BlocksResponse>(
      "/api/blocks?ps=10&p=1",
    );
    console.log(
      `✅ Success! Fetched ${String(blocksData.items.length)} blocks`,
    );

    // Get specific block details
    if (blocksData.items.length > 0) {
      const firstBlock = blocksData.items[0];
      if (firstBlock) {
        const block = await client.get<Block>(`/api/blocks/${firstBlock.hash}`);
        console.log(
          `   Block #${String(block.blockNumber)}: ${String(block.txnCount)} transactions`,
        );
      }
    }

    // Show payment statistics
    const stats = client.getStats();
    console.log(
      `\n📊 Stats: ${String(stats.paidRequests)} paid, ${String(stats.freeRequests)} free`,
    );
  } catch (error) {
    console.error(
      "❌ Request failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

void main();
