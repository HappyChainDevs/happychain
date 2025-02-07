export type CustomRpcSchema = [
    {
        Method: "submitter_estimateGas"
        Parameters: [string]
        ReturnType: string
    },
    {
        Method: "submitter_execute"
        Parameters: [string]
        ReturnType: string
    },
]
