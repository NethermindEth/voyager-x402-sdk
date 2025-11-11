/**
 * Facilitator Paymaster Proxy Client
 * Routes paymaster requests through the facilitator instead of directly to paymaster
 * This keeps paymaster credentials server-side only
 */

/**
 * Paymaster client that proxies through facilitator
 */
export interface FacilitatorPaymasterClient {
  endpoint: string; // Facilitator endpoint, not paymaster
  network: string;
}

/**
 * Create a paymaster client that uses facilitator as proxy
 */
export function createFacilitatorPaymasterClient(
  facilitatorUrl: string,
  network: string,
): FacilitatorPaymasterClient {
  return {
    endpoint: `${facilitatorUrl}/facilitator/paymaster`,
    network,
  };
}

/**
 * Build transaction through facilitator proxy
 */
export async function buildTransactionViaFacilitator(
  client: FacilitatorPaymasterClient,
  senderAddress: string,
  calls: Array<unknown>,
  options?: { mode?: string },
): Promise<unknown> {
  const response = await fetch(`${client.endpoint}/build`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      network: client.network,
      senderAddress,
      calls,
      mode: options?.mode ?? "sponsored",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Facilitator paymaster proxy failed: ${JSON.stringify(error)}`,
    );
  }

  return response.json();
}
