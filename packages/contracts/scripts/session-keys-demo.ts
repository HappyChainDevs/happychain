import "dotenv/config";
import {
    createKernelAccount,
    createZeroDevPaymasterClient,
    createKernelAccountClient,
    addressToEmptyAccount,
} from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { pimlicoActions } from "permissionless";
import { http, type Hex, createPublicClient, type Address, zeroAddress } from "viem";
import {entryPoint07Address} from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { toSudoPolicy } from "@zerodev/permissions/policies";
import {
    type ModularSigner,
    deserializePermissionAccount,
    serializePermissionAccount,
    toPermissionValidator,
} from "@zerodev/permissions";

if (
    !process.env.BUNDLER_RPC ||
    !process.env.PAYMASTER_RPC ||
    !process.env.PRIVATE_KEY
) {
    throw new Error("BUNDLER_RPC or PAYMASTER_RPC or PRIVATE_KEY is not set");
}

const publicClient = createPublicClient({
    transport: http(process.env.BUNDLER_RPC),
});

const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
const entryPoint = entryPoint07Address;

const getApproval = async (sessionKeyAddress: Address) => {
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        entryPoint,
        signer,
        kernelVersion: "0.3.1"
    });

    // Create an "empty account" as the signer -- you only need the public
    // key (address) to do this.
    const emptyAccount = addressToEmptyAccount(sessionKeyAddress);
    const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount });

    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint,
        signer: emptySessionKeySigner,
        policies: [
            // In this example, we are just using a sudo policy to allow everything.
            // In practice, you would want to set more restrictive policies.
            toSudoPolicy({}),
        ],
        kernelVersion: "0.3.1"
    });

    const sessionKeyAccount = await createKernelAccount(publicClient, {
        entryPoint,
        plugins: {
            sudo: ecdsaValidator,
            regular: permissionPlugin,
        },
        kernelVersion: "0.3.1"
    });

    return await serializePermissionAccount(sessionKeyAccount);
};

const useSessionKey = async (
    approval: string,
    sessionKeySigner: ModularSigner
) => {
    const sessionKeyAccount = await deserializePermissionAccount(
        publicClient,
        entryPoint,
        "0.3.1",
        approval,
        sessionKeySigner
    );

    const kernelPaymaster = createZeroDevPaymasterClient({
        entryPoint,
        chain: sepolia,
        transport: http(process.env.PAYMASTER_RPC),
    });
    const kernelClient = createKernelAccountClient({
        entryPoint,
        account: sessionKeyAccount,
        chain: sepolia,
        bundlerTransport: http(process.env.BUNDLER_RPC),
        middleware: {
            sponsorUserOperation: kernelPaymaster.sponsorUserOperation,
        },
    });

    const userOpHash = await kernelClient.sendUserOperation({
        userOperation: {
            callData: await sessionKeyAccount.encodeCallData({
                to: zeroAddress,
                value: BigInt(0),
                data: "0x",
            }),
        },
    });

    console.log("userOp hash:", userOpHash);

    const bundlerClient = kernelClient.extend(pimlicoActions(entryPoint));
    const _receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
    });
    console.log({ txHash: _receipt.receipt.transactionHash });
};

const revokeSessionKey = async (sessionKeyAddress: Address) => {
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        entryPoint,
        signer,
        kernelVersion: "0.3.1"
    });
    const sudoAccount = await createKernelAccount(publicClient, {
        plugins: {
            sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion: "0.3.1"
    });

    const kernelPaymaster = createZeroDevPaymasterClient({
        entryPoint,
        chain: sepolia,
        transport: http(process.env.PAYMASTER_RPC),
    });
    const sudoKernelClient = createKernelAccountClient({
        entryPoint,
        account: sudoAccount,
        chain: sepolia,
        bundlerTransport: http(process.env.BUNDLER_RPC),
        middleware: {
            sponsorUserOperation: kernelPaymaster.sponsorUserOperation,
        },
    });

    const emptyAccount = addressToEmptyAccount(sessionKeyAddress);
    const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount });

    const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint,
        signer: emptySessionKeySigner,
        policies: [
            // In this example, we are just using a sudo policy to allow everything.
            // In practice, you would want to set more restrictive policies.
            toSudoPolicy({}),
        ],
        kernelVersion: "0.3.1"
    });

    const unInstallTxHash = await sudoKernelClient.uninstallPlugin({
        plugin: permissionPlugin,
    });
    console.log({ unInstallTxHash });
};

const main = async () => {
    // The agent creates a public-private key pair and sends
    // the public key (address) to the owner.
    const sessionPrivateKey = generatePrivateKey();
    const sessionKeyAccount = privateKeyToAccount(sessionPrivateKey);

    const sessionKeySigner = await toECDSASigner({
        signer: sessionKeyAccount,
    });

    // The owner approves the session key by signing its address and sending
    // back the signature
    const approval = await getApproval(sessionKeySigner.account.address);

    // The agent constructs a full session key
    await useSessionKey(approval, sessionKeySigner);

    // revoke session key
    await revokeSessionKey(sessionKeySigner.account.address);
};

main();