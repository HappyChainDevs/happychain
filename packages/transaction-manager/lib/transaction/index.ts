import type {  Address, Abi, ContractFunctionArgs, ContractFunctionName } from "viem";

export type Transaction =  {
    address: Address,
    abi: Abi,
    functionName: string,
    args?: ContractFunctionArgs<
    Abi | readonly unknown[],
    "pure" | "view",
    ContractFunctionName
  >;
}