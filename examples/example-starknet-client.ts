import { config } from "dotenv";
import { Account, RpcProvider } from "starknet";
import { VoyagerClient } from "../src/index.js";
import type { BlocksResponse } from "../src/types/voyager.js";

config();

const API_URL = process.env.API_URL ?? "http://localhost:4022";
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const STARKNET_ADDRESS = (process.env.STARKNET_ACCOUNT_ADDRESS ??
  process.env.STARKNET_ADDRESS ??
  process.env.STARKNET_PAYMENT_ADDRESS)!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const STARKNET_PRIVATE_KEY = process.env.STARKNET_CLIENT_PRIVATE_KEY!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const STARKNET_RPC_URL = (process.env.STARKNET_RPC_URL ??
  process.env.STARKNET_SEPOLIA_RPC_URL ??
  process.env.STARKNET_MAINNET_RPC_URL)!;

function createAccount(): Account {
  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  return new Account({
    provider,
    address: STARKNET_ADDRESS,
    signer: STARKNET_PRIVATE_KEY,
  });
}

async function main(): Promise<void> {
  // Create Starknet account
  const account = createAccount();

  // Initialize Voyager SDK with automatic payment handling
  const client = new VoyagerClient({
    account,
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
    const response = await client.get<BlocksResponse>("/api/blocks?ps=10&p=1");

    console.log(`✅ Success! Fetched ${String(response.items.length)} blocks`);
    console.log(`   Last page: ${String(response.lastPage)}`);

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

main().catch((error: unknown) => {
  console.error(
    "❌ Starknet client failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
