import { z } from "zod"

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
                entryPoint: "0x1234",
            },
            maxFeePerGas: "123",
            submitterFee: "123",
            gasLimit: "123",
            executeGasLimit: "123",
            status: "success",
        },
    })
