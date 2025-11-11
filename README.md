# voyager-x402-sdk

Zero-configuration SDK for Voyager x402 payment-protected APIs with support for both EVM and Starknet networks.

## Installation

```bash
npm install voyager-x402-sdk
# or
bun add voyager-x402-sdk
# or
yarn add voyager-x402-sdk
```

## Quick Start

```typescript
import { VoyagerClient } from "voyager-x402-sdk";

// Initialize with just 2 parameters!
const client = new VoyagerClient({
  account: process.env.STARKNET_PRIVATE_KEY, // or EVM private key
  apiUrl: "https://voyager-api.example.com",
});

// Use like fetch() - payments handled automatically
const blocks = await client.get("/api/blocks?ps=10&p=1");
console.log(blocks);
```

That's it! No paymaster configuration, no RPC URLs, no retry logic needed.

## Features

- **Zero Configuration**: Only need account + API URL
- **Auto-Discovery**: Networks, pricing, and endpoints discovered automatically
- **Network Agnostic**: Works with both EVM and Starknet
- **Built-in Retries**: Automatic exponential backoff for transient failures
- **Type-Safe**: Full TypeScript support with generics
- **Payment Monitoring**: Optional hooks for tracking payments
- **Framework Agnostic**: Works in Node.js, Bun, browsers, React, Vue, etc.

## Basic Usage

### Type-Safe Requests

```typescript
import { VoyagerClient, type BlocksResponse } from "voyager-x402-sdk";

const client = new VoyagerClient({
  account: process.env.STARKNET_PRIVATE_KEY,
  apiUrl: "http://localhost:4022",
});

// Fully typed response
const blocks = await client.get<BlocksResponse>("/api/blocks");
```

### With Payment Monitoring

```typescript
const client = new VoyagerClient({
  account: process.env.STARKNET_PRIVATE_KEY,
  apiUrl: "http://localhost:4022",
  options: {
    onPaymentRequired: (details) => {
      console.log(`💰 Payment: ${details.amount} ${details.token}`);
    },
    onPaymentSettled: (receipt) => {
      console.log(`✅ Paid: ${receipt.transactionHash}`);
    },
  },
});
```

### Payment Statistics

```typescript
const stats = client.getStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Paid requests: ${stats.paidRequests}`);
console.log(`Free requests: ${stats.freeRequests}`);
```

## API Reference

### VoyagerClient

#### Constructor

```typescript
new VoyagerClient(config: VoyagerConfig)
```

**Config:**

- `account`: User's wallet/account (string private key, Viem Account, or Starknet Account)
- `apiUrl`: Voyager API base URL
- `options?`: Optional advanced configuration

**Options:**

- `network?`: Network preference ('evm' | 'starknet') - auto-detected if not specified
- `retries?`: Retry configuration
- `onPaymentRequired?`: Payment required callback
- `onPaymentSettled?`: Payment settled callback
- `onError?`: Error callback
- `timeout?`: Request timeout (ms)
- `headers?`: Custom headers

#### Methods

**`get<T>(path: string, options?: RequestOptions): Promise<T>`**

Make a GET request with automatic payment.

**`post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>`**

Make a POST request with automatic payment.

**`fetch(url: string, options?: RequestInit): Promise<Response>`**

Low-level fetch with automatic payment.

**`getStats(): PaymentStats`**

Get payment statistics.

**`getConfig(): ClientConfig | null`**

Get current configuration (for debugging).

## Examples

See the `examples/` directory for working examples:

- `client.ts` - EVM/Base network example
- `starknet-client.ts` - Starknet network example

Run examples:

```bash
# EVM example (requires PRIVATE_KEY and API_URL env vars)
bun run examples/evm-client.ts

# Starknet example (requires STARKNET_* env vars)
bun run examples/starknet-client.ts
```

## Account Types

The SDK supports multiple account types:

### EVM (Base, Avalanche, etc.)

```typescript
// Private key (0x + 64 hex chars)
const client = new VoyagerClient({
  account: "0x1234...",
  apiUrl: "https://api.example.com",
});

// Viem Account
import { privateKeyToAccount } from "viem/accounts";
const account = privateKeyToAccount("0x...");
const client = new VoyagerClient({ account, apiUrl: "..." });
```

### Starknet

```typescript
// Starknet Account object
import { Account, RpcProvider } from "starknet";
const provider = new RpcProvider({ nodeUrl: "..." });
const account = new Account(provider, address, privateKey);

const client = new VoyagerClient({ account, apiUrl: "..." });
```

## Error Handling

```typescript
import { VoyagerError } from "voyager-x402-sdk";

try {
  const data = await client.get("/api/blocks");
} catch (error) {
  if (error instanceof VoyagerError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    console.log(`Retryable: ${error.retryable}`);
  }
}
```

**Error Codes:**

- `PAYMENT_FAILED` - Payment creation/settlement failed
- `NETWORK_ERROR` - Network/RPC error
- `DISCOVERY_FAILED` - Discovery API unreachable
- `CONFIG_ERROR` - Invalid configuration
- `INSUFFICIENT_BALANCE` - Not enough tokens
- `TIMEOUT` - Request timeout
- `UNSUPPORTED_ACCOUNT` - Invalid account type

## Framework Integration

### React

```tsx
import { VoyagerClient } from "voyager-x402-sdk";
import { useState, useEffect } from "react";

function BlockList() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const client = new VoyagerClient({
      account: window.ethereum, // MetaMask
      apiUrl: "https://api.example.com",
    });

    client.get("/api/blocks").then(setBlocks);
  }, []);

  return (
    <div>
      {blocks.map((b) => (
        <div key={b.hash}>{b.blockNumber}</div>
      ))}
    </div>
  );
}
```

### Node.js

```typescript
import { VoyagerClient } from "voyager-x402-sdk";

const client = new VoyagerClient({
  account: process.env.PRIVATE_KEY,
  apiUrl: process.env.VOYAGER_API_URL,
});

const data = await client.get("/api/contracts/0x123");
```

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Test
bun run test

# Lint
bun run lint

# Format
bun run format

# Run examples
bun run examples/evm-client.ts
```

## License

Apache-2.0

## Support

For issues and questions, please visit [GitHub Issues](https://github.com/your-org/voyager-x402/issues).
