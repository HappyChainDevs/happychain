import { useLocation, useNavigate } from "@tanstack/react-router"
import { atom, useAtom, useAtomValue } from "jotai"
import { useCallback, useEffect, useMemo } from "react"
import { type Address, formatEther, isAddress, parseEther } from "viem"
import { useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi"
import { getBalanceQueryKey } from "wagmi/query"
import { coerce, object, string } from "zod"
import { userAtom } from "#src/state/user"
import { queryClient } from "#src/tanstack-query/config"

/**
 * Form field names values
 */
export enum FieldFormSendAssets {
    Recipient = "send-asset-recipient",
    Amount = "send-asset-amount",
}

const DEFAULT_FORM_STATE = {
    [FieldFormSendAssets.Recipient]: undefined,
    [FieldFormSendAssets.Amount]: 0,
}

/**
 * Form inputs values
 */
const formSendAssetsAtom = atom<{
    [FieldFormSendAssets.Recipient]?: Address
    [FieldFormSendAssets.Amount]?: number
}>(DEFAULT_FORM_STATE)

/**
 * Send asset form validation schema
 */
const schemaFormSendAsset = object({
    [FieldFormSendAssets.Recipient]: string({
        message: "Ensure you provide a valid Ethereum address for the recipient.",
    }).refine((val) => isAddress(val), {
        message: "Ensure you provide a valid Ethereum address for the recipient.",
    }),
    [FieldFormSendAssets.Amount]: coerce
        .number({
            message: "Ensure you enter a positive amount number.",
        })
        .positive({ message: "Ensure you enter a positive amount number." }),
})

/**
 * Custom hook for managing send assets form state and its operations
 */
export function useFormSendAssets(asset?: Address) {
    const navigate = useNavigate()
    const user = useAtomValue(userAtom)
    const formAtom = useAtom(formSendAssetsAtom)
    const [form, setForm] = formAtom
    const location = useLocation()

    /**
     * Get user's native token balance.
     * Only enabled when user is connected and no asset address is provided
     */
    const queryBalanceNativeToken = useBalance({
        address: user?.address,
        query: {
            enabled: user?.address && isAddress(user?.address) && !isAddress(`${asset}`),
        },
    })

    const mutationSendTransaction = useSendTransaction({
        mutation: {
            onSettled() {
                queryClient.invalidateQueries({
                    queryKey: getBalanceQueryKey({
                        address: user?.address,
                    }),
                })
            },
        },
    })

    const queryWaitForTransactionReceipt = useWaitForTransactionReceipt({
        hash: mutationSendTransaction?.data,
        query: {
            enabled: !!mutationSendTransaction.data,
        },
    })

    const maximumValueNativeToken = useMemo(() => {
        if (queryBalanceNativeToken?.data?.value) return +formatEther(queryBalanceNativeToken?.data?.value)
        return 0
    }, [queryBalanceNativeToken?.data?.value])

    /**
     * Run custom validation on form fields to refine form errors
     */
    const formErrors = useMemo(() => {
        const validationSchema = schemaFormSendAsset.refine(
            (vals) => {
                return vals[FieldFormSendAssets.Amount] <= maximumValueNativeToken
            },
            {
                message: "The amount exceeds your available balance",
                path: [FieldFormSendAssets.Amount],
            },
        )

        const result = validationSchema.safeParse(form)
        if (!result.success) {
            return result.error.flatten()
        }

        return null
    }, [form, maximumValueNativeToken])

    /**
     * Sets the native token amount to the maximum available balance
     */
    function handleOnClickMaxNativeTokenBalance() {
        if (mutationSendTransaction.status === "pending" || maximumValueNativeToken === 0) return
        setForm({
            ...form,
            [FieldFormSendAssets.Amount]: maximumValueNativeToken,
        })
    }

    /**
     * Ensures form data is valid befor initiating transaction
     */
    function handleOnSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (mutationSendTransaction.status === "pending" || formErrors) return
        mutationSendTransaction.sendTransaction({
            to: form[FieldFormSendAssets.Recipient] as Address,
            value: parseEther(`${form[FieldFormSendAssets.Amount]}`),
        })
    }

    /**
     * Updates form state when input value changes
     */
    function handleOnInput(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({
            ...form,
            [e.currentTarget.name]: e.currentTarget.value,
        })
    }

    const onTransactionCompleted = useCallback(() => {
        mutationSendTransaction.reset()
        setForm(DEFAULT_FORM_STATE)
        navigate({ to: "/embed" })
    }, [setForm, navigate, mutationSendTransaction])

    useEffect(() => {
        if (queryWaitForTransactionReceipt.isSuccess) onTransactionCompleted()
    }, [queryWaitForTransactionReceipt.isSuccess, onTransactionCompleted])

    /**
     * I the user is navigating from `/send` to `/embed` (via GLobalHeader)
     * while a tx is in-flight (approved), this fires so as to reset the form
     * to its default state.
     */
    useEffect(() => {
        if (
            location.pathname === "/embed" &&
            (mutationSendTransaction.status === "pending" || queryWaitForTransactionReceipt.isLoading)
        ) {
            setForm(DEFAULT_FORM_STATE)
        }
    }, [location.pathname, mutationSendTransaction.status, queryWaitForTransactionReceipt.isLoading, setForm])

    return {
        formAtom,
        formErrors,
        handleOnClickMaxNativeTokenBalance,
        handleOnInput,
        handleOnSubmit,
        maximumValueNativeToken,
        mutationSendTransaction,
        queryBalanceNativeToken,
        queryWaitForTransactionReceipt,
    }
}
