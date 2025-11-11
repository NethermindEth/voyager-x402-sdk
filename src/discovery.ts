/**
 * Discovery Engine
 * Auto-discovers API configuration using x402 Discovery API
 */

import type {
  DiscoveryResponse,
  ClientConfig,
  EndpointConfig,
  PricingInfo,
} from "./types/index.js";
import { createDiscoveryError } from "./utils/errors.js";

/**
 * Discover API configuration from /discovery/resources endpoint
 *
 * @param apiUrl - Base API URL
 * @param timeout - Request timeout in milliseconds
 * @returns Client configuration
 */
export async function discoverConfiguration(
  apiUrl: string,
  timeout = 10000,
): Promise<ClientConfig> {
  // Discovery endpoint is on the facilitator, not the API server
  // Infer facilitator URL from API URL (API: 4022, Facilitator: 4023)
  const facilitatorUrl = apiUrl.replace(":4022", ":4023");
  const discoveryUrl = `${facilitatorUrl}/discovery/resources`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    const response = await fetch(discoveryUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw createDiscoveryError(
        `Discovery API returned ${String(response.status)}: ${response.statusText}`,
        false,
        { status: response.status, statusText: response.statusText },
      );
    }

    const discovery = (await response.json()) as DiscoveryResponse;

    // Extract configuration from discovery response
    const config = parseDiscoveryResponse(discovery, apiUrl);

    return config;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createDiscoveryError(
        `Discovery request timed out after ${String(timeout)}ms`,
        true,
      );
    }

    throw createDiscoveryError(
      `Failed to discover API configuration: ${error instanceof Error ? error.message : String(error)}`,
      true,
      error,
    );
  }
}

/**
 * Parse discovery response into client configuration
 */
function parseDiscoveryResponse(
  discovery: DiscoveryResponse,
  apiUrl: string,
): ClientConfig {
  // Extract unique networks from all payment options
  const networksSet = new Set<string>();
  const endpointsMap = new Map<string, EndpointConfig>();

  for (const item of discovery.items) {
    // Extract path from resource URL
    const url = new URL(item.resource);
    const path = url.pathname;

    // Build pricing info for this endpoint
    const pricing: Array<PricingInfo> = item.accepts.map((accept) => {
      networksSet.add(accept.network);

      return {
        network: accept.network,
        amount: accept.maxAmountRequired,
        token: accept.asset,
        recipient: accept.payTo,
      };
    });

    endpointsMap.set(path, {
      path,
      pricing,
    });
  }

  // Infer facilitator URL from API URL
  // Assumption: API runs on port 4022, facilitator on 4023
  const facilitatorUrl = apiUrl.replace(":4022", ":4023");

  return {
    endpoints: Array.from(endpointsMap.values()),
    facilitatorUrl,
    networks: Array.from(networksSet),
  };
}

/**
 * Get pricing for a specific endpoint and network
 */
export function getPricingForEndpoint(
  config: ClientConfig,
  path: string,
  network: string,
): PricingInfo | undefined {
  const endpoint = config.endpoints.find((endpoint) => endpoint.path === path);
  if (!endpoint) {
    return undefined;
  }

  return endpoint.pricing.find((pricing) => pricing.network === network);
}

/**
 * Check if a network is supported by the API
 */
export function isNetworkSupported(
  config: ClientConfig,
  network: string,
): boolean {
  return config.networks.includes(network);
}

// Prevent unused export warning
export type { ClientConfig };
