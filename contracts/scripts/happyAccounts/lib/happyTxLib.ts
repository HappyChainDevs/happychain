import type { Address, Hex } from "viem";
import type { HappyTx } from "../types/happyTx";

export function encode(tx: HappyTx): Hex {
    // Static fields
    const accountHex = tx.account.slice(2);
    const gasLimitHex = tx.gasLimit.toString(16).padStart(8, '0');
    const executeGasLimitHex = tx.executeGasLimit.toString(16).padStart(8, '0');
    const destHex = tx.dest.slice(2);
    const paymasterHex = tx.paymaster.slice(2);
    const valueHex = tx.value.toString(16).padStart(64, '0');
    const nonceTrackHex = tx.nonceTrack.toString(16).padStart(48, '0'); // 24 bytes
    const nonceValueHex = tx.nonceValue.toString(16).padStart(16, '0'); // 8 bytes
    const maxFeePerGasHex = tx.maxFeePerGas.toString(16).padStart(64, '0');
    const submitterFeeHex = tx.submitterFee.toString(16).padStart(64, '0');

    // Dynamic fields with their 4-byte length prefixes
    const callDataHex = tx.callData.slice(2);
    const paymasterDataHex = tx.paymasterData.slice(2);
    const validatorDataHex = tx.validatorData.slice(2);
    const extraDataHex = tx.extraData.slice(2);

    const callDataLenHex = (callDataHex.length / 2).toString(16).padStart(8, '0');
    const paymasterDataLenHex = (paymasterDataHex.length / 2).toString(16).padStart(8, '0');
    const validatorDataLenHex = (validatorDataHex.length / 2).toString(16).padStart(8, '0');
    const extraDataLenHex = (extraDataHex.length / 2).toString(16).padStart(8, '0');

    // Concatenate all fields in order
    const encodedHex = 
        // Static fields (196 bytes total)
        accountHex +           // 20 bytes
        gasLimitHex +          // 4 bytes
        executeGasLimitHex +   // 4 bytes
        destHex +              // 20 bytes
        paymasterHex +         // 20 bytes
        valueHex +             // 32 bytes
        nonceTrackHex +        // 24 bytes
        nonceValueHex +        // 8 bytes
        maxFeePerGasHex +      // 32 bytes
        submitterFeeHex +      // 32 bytes
        // Dynamic fields with length prefixes
        callDataLenHex + callDataHex +
        paymasterDataLenHex + paymasterDataHex +
        validatorDataLenHex + validatorDataHex +
        extraDataLenHex + extraDataHex;

    return `0x${encodedHex}`;
}

export function decode(encoded: Hex): HappyTx {
    const encodedBytes = encoded.slice(2);
    let offset = 0;

    // Read static fields (196 bytes total)
    const account = `0x${encodedBytes.slice(offset, offset + 40)}` as Address;
    offset += 40; // 20 bytes

    const gasLimit = BigInt(`0x${encodedBytes.slice(offset, offset + 8)}`);
    offset += 8; // 4 bytes

    const executeGasLimit = BigInt(`0x${encodedBytes.slice(offset, offset + 8)}`);
    offset += 8; // 4 bytes

    const dest = `0x${encodedBytes.slice(offset, offset + 40)}` as Address;
    offset += 40; // 20 bytes

    const paymaster = `0x${encodedBytes.slice(offset, offset + 40)}` as Address;
    offset += 40; // 20 bytes

    const value = BigInt(`0x${encodedBytes.slice(offset, offset + 64)}`);
    offset += 64; // 32 bytes

    const nonceTrack = BigInt(`0x${encodedBytes.slice(offset, offset + 48)}`);
    offset += 48; // 24 bytes

    const nonceValue = BigInt(`0x${encodedBytes.slice(offset, offset + 16)}`);
    offset += 16; // 8 bytes

    const maxFeePerGas = BigInt(`0x${encodedBytes.slice(offset, offset + 64)}`);
    offset += 64; // 32 bytes

    const submitterFee = BigInt(`0x${encodedBytes.slice(offset, offset + 64)}`);
    offset += 64; // 32 bytes

    // Read dynamic fields with their 4-byte length prefixes
    const callDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16);
    offset += 8;
    const callData: Hex = `0x${encodedBytes.slice(offset, offset + callDataLen * 2)}`;
    offset += callDataLen * 2;

    const paymasterDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16);
    offset += 8;
    const paymasterData: Hex = `0x${encodedBytes.slice(offset, offset + paymasterDataLen * 2)}`;
    offset += paymasterDataLen * 2;

    const validatorDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16);
    offset += 8;
    const validatorData: Hex = `0x${encodedBytes.slice(offset, offset + validatorDataLen * 2)}`;
    offset += validatorDataLen * 2;

    const extraDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16);
    offset += 8;
    const extraData: Hex = `0x${encodedBytes.slice(offset, offset + extraDataLen * 2)}`;

    return {
        account,
        gasLimit,
        executeGasLimit,
        dest,
        paymaster,
        value,
        nonceTrack,
        nonceValue,
        maxFeePerGas,
        submitterFee,
        callData,
        paymasterData,
        validatorData,
        extraData
    };
}