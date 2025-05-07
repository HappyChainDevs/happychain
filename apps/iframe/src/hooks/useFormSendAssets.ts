import type { Address } from "@happy.tech/common"
import { useNavigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react"
import { isAddress, parseEther } from "viem"
import { useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi"
import { getBalanceQueryKey } from "wagmi/query"
import { ZodIssueCode, z } from "zod"
import { userAtom } from "#src/state/user"
import { queryClient } from "#src/tanstack-query/config"

export const Fields = {
    Recipient: "recipient",
    Amount: "amount",
}

export type UseFormSendAssetsArgs = {
    initialAmount?: string
    initialRecipient?: string
}

const recipientSchema = z
    .string({ message: "Ensure you provide a valid Ethereum address for the recipient." })
    .refine((val) => isAddress(val), {
        message: "Ensure you provide a valid Ethereum address for the recipient.",
    })

const amountSchema = z
    .string()
    .transform((val, ctx) => {
        try {
            return parseEther(val)
        } catch {
            ctx.addIssue({ code: ZodIssueCode.custom, message: "Make sure you provide a number." })
            return z.NEVER
        }
    })
    .pipe(z.bigint().positive({ message: "Make sure you provide a positive number." }))

/**
 * Custom hook for managing token transfers & the associated form state.
 */
export function useFormSendAssets(args: UseFormSendAssetsArgs = {}) {
    const navigate = useNavigate()
    const user = useAtomValue(userAtom)
    const [recipient, setRecipient] = useState(args.initialRecipient ?? "")
    const [amount, setAmount] = useState(args.initialAmount ?? "")
    const [recipientError, setRecipientError] = useState<string>()
    const [amountError, setAmountError] = useState<string>()

    // Stub for future support of ERC-20s.
    const token = undefined

    const { data: balanceData } = useBalance({
        address: user?.address,
        query: {
            enabled: user?.address && isAddress(user?.address) && !isAddress(`${token}`),
        },
    })
    const { value: balance, formatted: formattedBalance } = balanceData ?? {}

    const {
        data: hash,
        isPending: sendIsPending,
        sendTransaction,
        reset,
    } = useSendTransaction({
        mutation: {
            onSettled() {
                void queryClient.invalidateQueries({
                    queryKey: getBalanceQueryKey({ address: user?.address }),
                })
            },
        },
    })

    const receipt = useWaitForTransactionReceipt({
        hash,
        query: { enabled: !!hash },
    })

    const onTransactionCompleted = useCallback(() => {
        reset()
        void navigate({ to: "/embed" })
    }, [navigate, reset])

    useEffect(() => {
        if (receipt.isSuccess) onTransactionCompleted()
    }, [receipt.isSuccess, onTransactionCompleted])

    /** Sets the amount to the maximum available (entire balance). */
    function handleOnClickMax() {
        if (sendIsPending || !formattedBalance) return
        setAmount(formattedBalance)
    }

    function validateRecipient(recipient: string) {
        const result = recipientSchema.safeParse(recipient)
        const error = !result.success ? result.error : undefined
        if (error && recipient !== "") {
            const message = error.issues.map((i) => i.message).join("\n")
            setRecipientError(message)
        } else {
            setRecipientError(undefined)
        }
        return error
    }

    const validateAmount = useCallback(
        (amount: string) => {
            // Can't use refine here because that causes the balance issue to be added even when the transform
            // in `amountSchema` fails. Pipe here is just a little terse than superRefine.
            const schema = amountSchema.pipe(
                z.bigint().refine((val) => val <= (balance ?? 0), {
                    message: "The amount exceeds your available balance.",
                }),
            )
            const result = schema.safeParse(amount)
            const error = !result.success ? result.error : undefined
            if (error && amount !== "") {
                const message = error.issues.map((i) => i.message).join("\n")
                setAmountError(message)
            } else {
                setAmountError(undefined)
            }
            return error
        },
        [balance],
    )

    /** Generic handler for input in fields changes. */
    function handleOnInput(e: ChangeEvent<HTMLInputElement>) {
        switch (e.currentTarget.name) {
            case Fields.Recipient:
                setRecipient(e.currentTarget.value)
                validateRecipient(e.currentTarget.value)
                break
            case Fields.Amount:
                setAmount(e.currentTarget.value)
                validateAmount(e.currentTarget.value)
                break
        }
    }

    /** Initiates transaction, but only if form data is valid. */
    function handleOnSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (sendIsPending || recipientError || amountError) return
        sendTransaction({ to: recipient as Address, value: parseEther(amount) })
    }

    return {
        /** The transaction's recipient. Might not be valid, check {@link formErrors}. */
        recipient,
        /** The amount to transfer (formatted). Might not be valid, check {@link formErrors}. */
        amount,
        /** The user's native token balance (formatted), or undefined if it wasn't fetched yet. */
        balance: formattedBalance,
        /** A string describing the recipient error, or undefined if the recipient is valid. */
        recipientError,
        /** A string describing the amount error, or undefined if the amount is valid. */
        amountError,
        /** Indicates the transaction is in flight (sending or waiting for inclusion). */
        inFlight: sendIsPending || receipt.isLoading,
        /** Indicates the transaction is in the process of being sent (RPC hasn't acknowledged reception yet). */
        sending: sendIsPending,
        /** Indicates the transaction was successfully sent and we're now waiting for its onchain inclusion. */
        waitingForInclusion: receipt.isLoading,

        handleOnClickMax,
        handleOnInput,
        handleOnSubmit,
    }
}
