import { z } from "zod"
import { deployment } from "#src/deployments"

export const EstimateGasOutputSchema = z
    .object({
        simulationResult: z.object({
            status: z.string(),
            validationStatus: z.string(),
            entryPoint: z.string(),
        }),
        maxFeePerGas: z.string(),
        submitterFee: z.string(),
        gasLimit: z.string(),
        executeGasLimit: z.string(),
        status: z.string(),
    })
    .openapi({
        example: {
            simulationResult: {
                status: "success",
                validationStatus: "success",
                entryPoint: deployment.HappyEntryPoint,
            },
            maxFeePerGas: "0",
            submitterFee: "0",
            gasLimit: "0",
            executeGasLimit: "0",
            status: "success",
        },
    })
