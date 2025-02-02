import type { Address, Hex } from "viem";
import type { HappyTx } from "../types/happyTx";

export function encode(tx: HappyTx): Hex {
    const accountHex = tx.account.slice(2);
    const destHex = tx.dest.slice(2);
    const paymasterHex = tx.paymaster.slice(2);
    const gasLimitHex = tx.gasLimit.toString(16).padStart(8, '0');
    const valueHex = tx.value.toString(16).padStart(64, '0');
    const nonceHex = tx.nonce.toString(16).padStart(64, '0');
    const maxFeePerGasHex = tx.maxFeePerGas.toString(16).padStart(64, '0');
    const submitterFeeHex = tx.submitterFee.toString(16).padStart(64, '0');

    const callDataHex = tx.callData.slice(2);
    const paymasterDataHex = tx.paymasterData.slice(2);
    const validatorDataHex = tx.validatorData.slice(2);
    const extraDataHex = tx.extraData.slice(2);

    const callDataLen = callDataHex.length / 2;
    const paymasterDataLen = paymasterDataHex.length / 2;
    const validatorDataLen = validatorDataHex.length / 2;
    const extraDataLen = extraDataHex.length / 2;
    const totalLen = callDataLen + paymasterDataLen + validatorDataLen + extraDataLen;
    
    const dynamicLenghts = 
        totalLen.toString(16).padStart(16, '0') +
        callDataLen.toString(16).padStart(10, '0') +
        paymasterDataLen.toString(16).padStart(10, '0') +
        validatorDataLen.toString(16).padStart(10, '0') +
        extraDataLen.toString(16).padStart(10, '0') +
        tx.executeGasLimit.toString(16).padStart(8, '0');

    const encodedHex = 
        accountHex +
        destHex.slice(0, 24) + // first 12 bytes
        paymasterHex +
        destHex.slice(24) + // remaining 8 bytes
        gasLimitHex +
        valueHex +
        nonceHex +
        maxFeePerGasHex +
        submitterFeeHex +
        dynamicLenghts +
        callDataHex +
        paymasterDataHex +
        validatorDataHex +
        extraDataHex;

    return `0x${encodedHex}`;
}

export function decode(encoded: Hex): HappyTx {
    const encodedBytes = encoded.slice(2);
    
    const account = `0x${encodedBytes.slice(0, 40)}` as Address;
    const destPart1 = encodedBytes.slice(40, 64);  // First 12 bytes (24 chars)
    const destPart2 = encodedBytes.slice(104, 120); // Last 8 bytes (16 chars)
    const dest = `0x${destPart1}${destPart2}` as Address;
    const paymaster = `0x${encodedBytes.slice(64, 104)}` as Address;
    const gasLimit = BigInt(`0x${encodedBytes.slice(120, 128)}`);
    const value = BigInt(`0x${encodedBytes.slice(128, 192)}`);
    const nonce = BigInt(`0x${encodedBytes.slice(192, 256)}`);
    const maxFeePerGas = BigInt(`0x${encodedBytes.slice(256, 320)}`);
    const submitterFee = BigInt(`0x${encodedBytes.slice(320, 384)}`);
    
    const dynamicLengths = encodedBytes.slice(384, 448);
    const _totalLen = Number.parseInt(dynamicLengths.slice(0, 16), 16);
    const callDataLen = Number.parseInt(dynamicLengths.slice(16, 26), 16);
    const paymasterDataLen = Number.parseInt(dynamicLengths.slice(26, 36), 16);
    const validatorDataLen = Number.parseInt(dynamicLengths.slice(36, 46), 16);
    const extraDataLen = Number.parseInt(dynamicLengths.slice(46, 56), 16);
    const executeGasLimit = BigInt(`0x${dynamicLengths.slice(56, 64)}`);
    
    let dynamicOffset = 448; // Start after static fields (384 + 64)
    
    const callData: Hex = `0x${encodedBytes.slice(dynamicOffset, dynamicOffset + callDataLen * 2)}`;
    dynamicOffset += callDataLen * 2;
    
    
    const paymasterData: Hex = `0x${encodedBytes.slice(dynamicOffset, dynamicOffset + paymasterDataLen * 2)}`;
    dynamicOffset += paymasterDataLen * 2;
    
    const validatorData: Hex = `0x${encodedBytes.slice(dynamicOffset, dynamicOffset + validatorDataLen * 2)}`;
    dynamicOffset += validatorDataLen * 2;
    
    const extraData: Hex = `0x${encodedBytes.slice(dynamicOffset, dynamicOffset + extraDataLen * 2)}`;
    
    return {
        account,
        gasLimit,
        executeGasLimit,
        dest,
        paymaster,
        value,
        nonce,
        maxFeePerGas,
        submitterFee,
        callData,
        paymasterData,
        validatorData,
        extraData
    };
}