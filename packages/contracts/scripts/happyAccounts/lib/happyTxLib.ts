import type { Address, Hex } from "viem";
import type { HappyTx } from "../types/happyTx";

export function encode(tx: HappyTx): Hex {
    const accountHex = tx.account.slice(2);
    const destHex = tx.dest.slice(2);
    const paymasterHex = tx.paymaster.slice(2);
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
    console.info("\nENTERING DECODE\n");
    
    // Remove 0x prefix
    const encodedBytes = encoded.slice(2);
    
    // Decode static fields
    console.info("Decoding Account...");
    const account = `0x${encodedBytes.slice(0, 40)}` as Address;
    console.info(`Decoded Account: ${account}`);
    
    console.info("Decoding Destination...");
    const destPart1 = encodedBytes.slice(40, 64);  // First 12 bytes (24 chars)
    const destPart2 = encodedBytes.slice(104, 120); // Last 8 bytes (16 chars)
    const dest = `0x${destPart1}${destPart2}` as Address;
    console.info(`Decoded Destination: ${dest}`);
    
    console.info("Decoding Paymaster...");
    const paymaster = `0x${encodedBytes.slice(64, 104)}` as Address;
    console.info(`Decoded Paymaster: ${paymaster}`);
    
    console.info("Decoding Gas Limit...");
    const gasLimit = BigInt(`0x${encodedBytes.slice(120, 128)}`);
    console.info(`Decoded Gas Limit: ${gasLimit}`);
    
    console.info("Decoding Value...");
    const value = BigInt(`0x${encodedBytes.slice(128, 192)}`);
    console.info(`Decoded Value: ${value}`);
    
    console.info("Decoding Nonce...");
    const nonce = BigInt(`0x${encodedBytes.slice(192, 256)}`);
    console.info(`Decoded Nonce: ${nonce}`);
    
    console.info("Decoding Max Fee Per Gas...");
    const maxFeePerGas = BigInt(`0x${encodedBytes.slice(256, 320)}`);
    console.info(`Decoded Max Fee Per Gas: ${maxFeePerGas}`);
    
    console.info("Decoding Submitter Fee...");
    const submitterFee = BigInt(`0x${encodedBytes.slice(320, 384)}`);
    console.info(`Decoded Submitter Fee: ${submitterFee}`);
    
    // Decode dynamic header (32 bytes = 64 chars)
    const headerHex = encodedBytes.slice(384, 448);
    console.info("Decoding Dynamic Header...");
    console.info(`Header Hex: ${headerHex}`);
    
    // Parse lengths from header
    const totalLen = Number.parseInt(headerHex.slice(0, 16), 16);
    const callDataLen = Number.parseInt(headerHex.slice(16, 26), 16);
    const paymasterDataLen = Number.parseInt(headerHex.slice(26, 36), 16);
    const validatorDataLen = Number.parseInt(headerHex.slice(36, 46), 16);
    const extraDataLen = Number.parseInt(headerHex.slice(46, 56), 16);
    const executeGasLimit = BigInt(`0x${headerHex.slice(56, 64)}`);
    
    console.info(`Dynamic Field Lengths (in bytes):
    Total:          ${totalLen}
    Call Data:      ${callDataLen}
    Paymaster Data: ${paymasterDataLen}
    Validator Data: ${validatorDataLen}
    Extra Data:     ${extraDataLen}
    Execute Gas:    ${executeGasLimit}`);
    
    // Decode dynamic fields
    let offset = 448; // Start after header (384 + 64)
    
    console.info("Decoding Call Data...");
    const callData: Hex = `0x${encodedBytes.slice(offset, offset + callDataLen * 2)}`;
    console.info(`Decoded Call Data: ${callData}`);
    offset += callDataLen * 2;
    
    console.info("Decoding Paymaster Data...");
    const paymasterData: Hex = `0x${encodedBytes.slice(offset, offset + paymasterDataLen * 2)}`;
    console.info(`Decoded Paymaster Data: ${paymasterData}`);
    offset += paymasterDataLen * 2;
    
    console.info("Decoding Validator Data...");
    const validatorData: Hex = `0x${encodedBytes.slice(offset, offset + validatorDataLen * 2)}`;
    console.info(`Decoded Validator Data: ${validatorData}`);
    offset += validatorDataLen * 2;
    
    console.info("Decoding Extra Data...");
    const extraData: Hex = `0x${encodedBytes.slice(offset, offset + extraDataLen * 2)}`;
    console.info(`Decoded Extra Data: ${extraData}`);
    
    console.info("\nEXITING DECODE\n");
    
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