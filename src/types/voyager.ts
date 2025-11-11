/**
 * Voyager API Response Types
 * Type definitions for Voyager API endpoints
 */

/**
 * Block Item
 */
export interface Block {
  blockNumber: number;
  hash: string;
  timestamp: number;
  txnCount: number;
  eventCount: number;
  status: string;
}

/**
 * Blocks List Response
 */
export interface BlocksResponse {
  items: Array<Block>;
  lastPage: number;
}

/**
 * Transaction Item
 */
export interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  type: string;
  status: string;
  actualFee?: string;
  maxFee?: string;
}

/**
 * Transactions List Response
 */
export interface TransactionsResponse {
  items: Array<Transaction>;
  lastPage: number;
}

/**
 * Contract Item
 */
export interface Contract {
  address: string;
  classHash: string;
  type?: string;
  deployedAt?: number;
}

/**
 * Contracts List Response
 */
export interface ContractsResponse {
  items: Array<Contract>;
  lastPage: number;
}

/**
 * Health Check Response
 */
export interface HealthResponse {
  status: string;
  service: string;
  voyagerApi: string;
}
