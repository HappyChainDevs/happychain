export interface EIP1559Parameters {
    elasticityMultiplier: bigint
    baseFeeChangeDenominator: bigint
    minBaseFee: bigint
}

export const ethereumDefaultEIP1559Parameters: EIP1559Parameters = {
    elasticityMultiplier: 2n,
    baseFeeChangeDenominator: 8n,
    minBaseFee: 0n,
}

export const opStackDefaultEIP1559Parameters: EIP1559Parameters = {
    elasticityMultiplier: 6n,
    baseFeeChangeDenominator: 250n,
    minBaseFee: 0n,
}
