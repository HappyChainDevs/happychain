/**
 * This file was generated by kysely-codegen.
 * Please do not edit it manually.
 */

export interface Boop {
  account: Address;
  boopHash: Hash;
  callData: Hex;
  dest: Address;
  entryPoint: Address;
  executeGasLimit: number;
  extraData: Hex;
  gasLimit: number;
  maxFeePerGas: bigint;
  nonceTrack: bigint;
  nonceValue: bigint;
  payer: Address;
  submitterFee: bigint;
  validateGasLimit: number;
  validatePaymentGasLimit: number;
  validatorData: Hex;
  value: bigint;
}

export interface Receipt {
  blockHash: Hash;
  blockNumber: bigint;
  boopHash: Hash;
  description: string;
  evmTxHash: Hash;
  gasPrice: bigint;
  logs: string;
  revertData: Hex;
  status: OnchainStatus;
}

export interface DB {
  boops: Boop;
  receipts: Receipt;
}
