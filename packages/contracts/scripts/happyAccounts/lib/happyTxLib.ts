import type { Address, Hex } from "viem";
import { concat, slice, toBytes, toHex } from "viem";

import type { HappyTx } from "../types/happyTx";

export function encode(tx: HappyTx): Hex {
    console.info("\nENTERING ENCODE\n")
    
    // Convert all fields to hex strings (without 0x prefix)
    console.info("Encoding Account...");
    const accountHex = tx.account.slice(2);
    console.info(`Input Account: ${tx.account}`);
    console.info(`Encoded Account: ${accountHex}`);

    console.info("Encoding Destination...");
    const destHex = tx.dest.slice(2);
    console.info(`Input Destination: ${tx.dest}`);
    console.info(`Encoded Destination: ${destHex}`);

    console.info("Encoding Paymaster...");
    const paymasterHex = tx.paymaster.slice(2);
    console.info(`Input Paymaster: ${tx.paymaster}`);
    console.info(`Encoded Paymaster: ${paymasterHex}`);

    console.info("Encoding Gas Limit...");
    const gasLimitHex = tx.gasLimit.toString(16).padStart(8, '0');
    console.info(`Input Gas Limit: ${tx.gasLimit}`);
    console.info(`Encoded Gas Limit: ${gasLimitHex}`);

    console.info("Encoding Value...");
    const valueHex = tx.value.toString(16).padStart(64, '0');
    console.info(`Input Value: ${tx.value}`);
    console.info(`Encoded Value: ${valueHex}`);

    console.info("Encoding Nonce...");
    const nonceHex = tx.nonce.toString(16).padStart(64, '0');
    console.info(`Input Nonce: ${tx.nonce}`);
    console.info(`Encoded Nonce: ${nonceHex}`);

    console.info("Encoding Max Fee Per Gas...");
    const maxFeePerGasHex = tx.maxFeePerGas.toString(16).padStart(64, '0');
    console.info(`Input Max Fee Per Gas: ${tx.maxFeePerGas}`);
    console.info(`Encoded Max Fee Per Gas: ${maxFeePerGasHex}`);

    console.info("Encoding Submitter Fee...");
    const submitterFeeHex = tx.submitterFee.toString(16).padStart(64, '0');
    console.info(`Input Submitter Fee: ${tx.submitterFee}`);
    console.info(`Encoded Submitter Fee: ${submitterFeeHex}`);

    // Convert dynamic data to hex (without 0x prefix)
    console.info("Encoding Call Data...");
    const callDataHex = tx.callData.slice(2);
    console.info(`Input Call Data: ${tx.callData}`);
    console.info(`Encoded Call Data: ${callDataHex}`);

    console.info("Encoding Paymaster Data...");
    const paymasterDataHex = tx.paymasterData.slice(2);
    console.info(`Input Paymaster Data: ${tx.paymasterData}`);
    console.info(`Encoded Paymaster Data: ${paymasterDataHex}`);

    console.info("Encoding Validator Data...");
    const validatorDataHex = tx.validatorData.slice(2);
    console.info(`Input Validator Data: ${tx.validatorData}`);
    console.info(`Encoded Validator Data: ${validatorDataHex}`);

    console.info("Encoding Extra Data...");
    const extraDataHex = tx.extraData.slice(2);
    console.info(`Input Extra Data: ${tx.extraData}`);
    console.info(`Encoded Extra Data: ${extraDataHex}`);

    // Calculate lengths (in bytes, so divide hex length by 2)
    const callDataLen = callDataHex.length / 2;
    const paymasterDataLen = paymasterDataHex.length / 2;
    const validatorDataLen = validatorDataHex.length / 2;
    const extraDataLen = extraDataHex.length / 2;
    const totalLen = callDataLen + paymasterDataLen + validatorDataLen + extraDataLen;
    
    console.info(`Dynamic Field Lengths (in bytes):
    Call Data:      ${callDataLen}
    Paymaster Data: ${paymasterDataLen}
    Validator Data: ${validatorDataLen}
    Extra Data:     ${extraDataLen}
    Total:          ${totalLen}`);
    
    // Create dynamic header (32 bytes)
    const headerHex = 
        totalLen.toString(16).padStart(16, '0') +
        callDataLen.toString(16).padStart(10, '0') +
        paymasterDataLen.toString(16).padStart(10, '0') +
        validatorDataLen.toString(16).padStart(10, '0') +
        extraDataLen.toString(16).padStart(10, '0') +
        tx.executeGasLimit.toString(16).padStart(8, '0');

    console.info(`Dynamic Header: ${headerHex}`);

    // Concatenate all parts
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
        headerHex +
        callDataHex +
        paymasterDataHex +
        validatorDataHex +
        extraDataHex;

    console.info("\nEXITING ENCODE\n")
    return `0x${encodedHex}` as Hex;
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