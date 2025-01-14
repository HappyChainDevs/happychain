import type { Address, Hex } from "viem";
import { concat, pad, slice, toBytes, toHex } from "viem";
import type { HappyTx } from "../types/happyTx";

export function encode(tx: HappyTx): Hex {
    // Convert all fields to bytes and pad appropriately
    const accountBytes = slice(toBytes(tx.account), 0, 20);
    const destBytes = toBytes(tx.dest);
    const paymasterBytes = slice(toBytes(tx.paymaster), 0, 20);
    const gasLimitBytes = toBytes(tx.gasLimit, { size: 4 });
    const valueBytes = pad(toBytes(tx.value), { size: 32 });
    const nonceBytes = pad(toBytes(tx.nonce), { size: 32 });
    const maxFeePerGasBytes = pad(toBytes(tx.maxFeePerGas), { size: 32 });
    const submitterFeeBytes = pad(toBytes(tx.submitterFee), { size: 32 });

    // Convert dynamic data to bytes
    const callDataBytes = toBytes(tx.callData);
    const paymasterDataBytes = toBytes(tx.paymasterData);
    const validatorDataBytes = toBytes(tx.validatorData);
    const extraDataBytes = toBytes(tx.extraData);

    // Calculate lengths
    const totalLen = callDataBytes.length + paymasterDataBytes.length + 
                    validatorDataBytes.length + extraDataBytes.length;
    
    // Create dynamic field header
    const dynamicHeader = new Uint8Array(32);
    const view = new DataView(dynamicHeader.buffer);
    view.setUint8(0, totalLen);
    view.setUint8(1, callDataBytes.length);
    view.setUint8(2, paymasterDataBytes.length);
    view.setUint8(3, validatorDataBytes.length);
    view.setUint8(4, extraDataBytes.length);
    view.setUint32(28, Number(tx.executeGasLimit));

    // Concatenate all parts
    return concat([
        concat([accountBytes, slice(destBytes, 0, 12)]),  // Slot 0
        concat([paymasterBytes, slice(destBytes, 12, 20), gasLimitBytes]),  // Slot 1
        valueBytes,  // Value fields
        nonceBytes,
        maxFeePerGasBytes,
        submitterFeeBytes,
        toHex(dynamicHeader),  // Dynamic header
        tx.callData,  // Dynamic fields
        tx.paymasterData,
        tx.validatorData,
        tx.extraData
    ]) as Hex;
}

export function decode(encoded: Hex): HappyTx {
    const bytes = toBytes(encoded);
    
    // Decode static fields
    const account = toHex(slice(bytes, 0, 20)) as Address;
    const destPart1 = slice(bytes, 20, 32);
    const paymaster = toHex(slice(bytes, 32, 52)) as Address;
    const destPart2 = slice(bytes, 52, 60);
    const dest = toHex(concat([destPart1, destPart2])) as Address;
    const gasLimit = BigInt(new DataView(slice(bytes, 60, 64).buffer).getUint32(0));

    // Decode value fields
    const value = BigInt('0x' + toHex(slice(bytes, 64, 96)).slice(2));
    const nonce = BigInt('0x' + toHex(slice(bytes, 96, 128)).slice(2));
    const maxFeePerGas = BigInt('0x' + toHex(slice(bytes, 128, 160)).slice(2));
    const submitterFee = BigInt('0x' + toHex(slice(bytes, 160, 192)).slice(2));

    // Decode dynamic header
    const dynamicHeader = slice(bytes, 192, 224);
    const len1 = dynamicHeader[1];  // callData length
    const len2 = dynamicHeader[2];  // paymasterData length
    const len3 = dynamicHeader[3];  // validatorData length
    const len4 = dynamicHeader[4];  // extraData length
    const executeGasLimit = BigInt(new DataView(dynamicHeader.buffer).getUint32(28));

    // Decode dynamic fields
    let offset = 224;
    const callData = toHex(slice(bytes, offset, offset + len1));
    offset += len1;
    const paymasterData = toHex(slice(bytes, offset, offset + len2));
    offset += len2;
    const validatorData = toHex(slice(bytes, offset, offset + len3));
    offset += len3;
    const extraData = toHex(slice(bytes, offset, offset + len4));

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