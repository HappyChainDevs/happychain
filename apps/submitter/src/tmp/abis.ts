// TODO: import from contracts - this is temp file, delete when possible
export const HAPPY_ENTRYPOINT_ABI = [
    {
        type: "function",
        name: "submit",
        stateMutability: "nonpayable",
        inputs: [
            {
                name: "encodedHappyTx",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [
            {
                name: "output",
                type: "tuple",
                internalType: "struct SubmitOutput",
                components: [
                    {
                        name: "gas",
                        type: "uint32",
                        internalType: "uint32",
                    },
                    {
                        name: "executeGas",
                        type: "uint32",
                        internalType: "uint32",
                    },
                    {
                        name: "validationStatus",
                        type: "bytes4",
                        internalType: "bytes4",
                    },
                    {
                        name: "callStatus",
                        type: "uint8",
                        internalType: "enum CallStatus",
                    },
                    {
                        name: "revertData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
        ],
    },
] as const
