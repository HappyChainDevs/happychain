import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { prettyJSON } from "hono/pretty-json"

import { DeployAccountSchema, HappyTxSchema } from "./utils/requestSchema"
import {abis, deployment} from "@happychain/contracts/happyAccounts/anvil"
import { account, publicClient, walletClient } from "./utils/clients"
import { localhost } from "viem/chains"

const app = new Hono()

app.use(prettyJSON())
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

// Routes
app.post("/deployAccount", zValidator("json", DeployAccountSchema), async (c) => {
    const { owner, salt } = c.req.valid("json");
    console.log("/deployAccount request:", owner, "and salt:", salt);

    try {
        // First predict the account address
        console.log("Predicting account address...");
        const predictedAddress = await publicClient.readContract({
            address: deployment.ScrappyAccountFactory,
            abi: abis.ScrappyAccountFactory,
            functionName: "getAddress",
            args: [salt],
        }) as `0x${string}`;
        console.log("Predicted account address:", predictedAddress);

        console.log("Calling ScrappyAccountFactory...");
        const hash = await walletClient.writeContract({
            address: deployment.ScrappyAccountFactory,
            abi: abis.ScrappyAccountFactory,
            functionName: "createAccount",
            args: [salt, owner],
            chain: localhost,
            account
        });
        console.log("Transaction hash:", hash);

        console.log("Waiting for transaction receipt...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("Transaction receipt:", receipt);

        if (receipt.status !== "success") {
            console.error("Deployment failed with receipt:", receipt);
            return c.json({
                success: false,
                message: "Transaction failed on-chain",
                receipt
            }, 400);
        }

        console.log("Deployment successful for owner:", owner);
        return c.json({
            success: true,
            message: `Deployment initiated with owner ${owner} and salt ${salt}`,
        });
    } catch (error) {
        console.error("Error during account deployment:", error);
        return c.json({ 
            success: false, 
            message: "Deployment failed",
            error: error instanceof Error ? error.message : "Unknown error"
        }, 500);
    }
});

app.post("/submitHappyTx", zValidator("json", HappyTxSchema), async (c) => {
    const hash = "0xabcdabcd"

    return c.json({
        success: true,
        txHash: hash,
    })
})

export default app
