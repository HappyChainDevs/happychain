import { createListCollection } from "@happy.tech/uikit-react"
import { useForm } from "@tanstack/react-form"
import { useNavigate } from "@tanstack/react-router"
import { readContracts } from "@wagmi/core"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { type Address, type Hash, erc20Abi, isAddress, parseEther, parseUnits } from "viem"
import { useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { getBalanceQueryKey, useMutation } from "wagmi/query"
import { coerce, number, object, string } from "zod"
import { userAtom } from "#src/state/user"
import { watchedAssetsAtom } from "#src/state/watchedAssets"
import { queryClient } from "#src/tanstack-query/config"
import { config } from "#src/wagmi/config.ts"
import { useTokenBalance } from "./useTokenBalance"

/**
 * Form field names values
 */
export enum FieldFormSendAssets {
    Token = "send-asset-token-address",
    TokenDecimals = "send-asset-token-decimals",
    Recipient = "send-asset-recipient",
    Amount = "send-asset-amount",
}

type DataFormSendToken = {
    [FieldFormSendAssets.Amount]: number
    [FieldFormSendAssets.TokenDecimals]: number
    [FieldFormSendAssets.Token]?: Address | ""
    [FieldFormSendAssets.Recipient]: Address
}

export type TokensComboboxItem = {
    type: "ERC20" | "native"
    address: Address | ""
    decimals: number
    label: string
    value: Address | ""
}

/**
 * Send asset form validation schema
 */
export const schemaFormSendAsset = object({
    [FieldFormSendAssets.Token]: string()
        .length(0)
        .or(
            string().refine((val) => isAddress(val), {
                message: "Ensure you select a token.",
            }),
        ),
    [FieldFormSendAssets.TokenDecimals]: number().positive().default(18),
    [FieldFormSendAssets.Recipient]: string({
        message: "Ensure you provide a valid Ethereum address for the recipient.",
    }).refine((val) => isAddress(val), {
        message: "Ensure you provide a valid Ethereum address for the recipient.",
    }),
    [FieldFormSendAssets.Amount]: coerce
        .number({
            message: "Ensure you enter a positive number for the amount.",
        })
        .positive({ message: "Ensure you enter a positive number for the amount." }),
})

/**
 * Custom hook for managing send assets form state and its operations
 */
export function useFormSendAssets() {
    const navigate = useNavigate()
    const user = useAtomValue(userAtom)

    // Tokens combobox
    const watchedAssets = useAtomValue(watchedAssetsAtom)
    const userAssets = watchedAssets?.[user!.address] ?? []
    const [initialTokensList, setInitialTokensList] = useState([
        {
            address: "",
            symbol: "HAPPY",
            label: "HAPPY",
            type: "native",
            decimals: 18,
            value: "",
        },
        ...userAssets.map((asset) => ({
            ...asset.options,
            type: asset.type,
            label: asset.options.symbol,
            value: asset.options.address,
        })),
    ])
    const [defaultSelectedToken] = useState(initialTokensList[0])
    const [tokens, setTokens] = useState(initialTokensList)
    const collectionTokens = useMemo(() => createListCollection({ items: tokens }), [tokens])

    // Form config
    const form = useForm({
        defaultValues: {
            [FieldFormSendAssets.Recipient]: "",
            [FieldFormSendAssets.Token]: defaultSelectedToken.value,
            [FieldFormSendAssets.TokenDecimals]: 18,
            [FieldFormSendAssets.Amount]: 0,
        },
        validators: {
            //@ts-expect-error - onChange clashing with the validator for some reason
            onChange: schemaFormSendAsset.refine((values) => {
                if (
                    values[FieldFormSendAssets.Token] === "" ||
                    userAssets.find((token) => token.options.address === values[FieldFormSendAssets.Token])
                )
                    return {
                        message: "Select a valid token.",
                    }
            }),
        },
        onSubmit: ({ value }) => {
            if (mutationSendToken.status === "pending") return
            mutationSendToken.mutate(value as DataFormSendToken)
        },
    })

    // Balance (known token)
    const {
        queryBalanceNativeToken,
        queryBalanceERC20Token,
        erc20TokenAddress: [, setERC20TokenAddress],
        balance,
    } = useTokenBalance({
        userAddress: user?.address as Address,
        tokenAddress: defaultSelectedToken.address as Address,
    })

    // Combobox handlers
    async function handleTokensComboboxInputChange(details: { inputValue: string }) {
        const unknownTokenAddress = details.inputValue.trim()
        const matchValue = unknownTokenAddress.toLowerCase()
        if (isAddress(matchValue) && !tokens.find((item) => item.value.toLowerCase() === matchValue)) {
            const erc20Contract = {
                abi: erc20Abi,
                address: unknownTokenAddress as Address,
            }
            const [decimalsData, symbolData] = await readContracts(config, {
                contracts: [
                    {
                        ...erc20Contract,
                        functionName: "decimals",
                    },
                    {
                        ...erc20Contract,
                        functionName: "symbol",
                    },
                ],
            })
            if (decimalsData.error || symbolData.error) {
                setTokens(initialTokensList)
                return
            }

            const decimals = decimalsData.result as number
            const symbol = symbolData.result as string

            const unknownToken = {
                type: "ERC20",
                label: symbol,
                value: unknownTokenAddress,
                address: unknownTokenAddress,
                symbol,
                decimals,
            }
            setInitialTokensList([...initialTokensList, unknownToken])
            setTokens([unknownToken, ...initialTokensList.filter((tokens) => tokens.address !== unknownTokenAddress)])

            return
        } else {
            const filtered = tokens.filter(
                (item) =>
                    item.value.toLowerCase().includes(matchValue) || item.label.toLowerCase().includes(matchValue),
            )
            setTokens(filtered.length === 0 || matchValue.length === 0 ? initialTokensList : filtered)
        }
    }

    function handleTokensComboboxValueChange(item: TokensComboboxItem) {
        form.setFieldValue(FieldFormSendAssets.Token, item.value)
        form.setFieldValue(FieldFormSendAssets.TokenDecimals, item?.decimals ?? 18)
        setERC20TokenAddress(item.value as Address)
    }

    // Form mutations & queries
    const mutationSendNativeToken = useSendTransaction()
    const mutationTransferERC20 = useWriteContract()

    const mutationSendToken = useMutation({
        mutationFn: async (values: DataFormSendToken) => {
            mutationSendNativeToken.reset()
            mutationTransferERC20.reset()

            const from = user?.address as Address
            const to = values[FieldFormSendAssets.Recipient] as Address
            const tokenAddress = values[FieldFormSendAssets.Token] as Address
            if (isAddress(tokenAddress)) {
                // ERC20: `transfer`
                const amount = parseUnits(
                    `${values[FieldFormSendAssets.Amount]}`,
                    values[FieldFormSendAssets.TokenDecimals] as number,
                )
                return await mutationTransferERC20.writeContractAsync({
                    abi: erc20Abi,
                    address: tokenAddress as Address,
                    functionName: "transferFrom",
                    args: [from, to, amount],
                })
            } else {
                // Native token - `sendTransaction`
                return await mutationSendNativeToken.sendTransaction({
                    to: values[FieldFormSendAssets.Recipient] as Address,
                    value: parseEther(`${values[FieldFormSendAssets.Amount]}`),
                })
            }
        },
        onSettled() {
            queryClient.invalidateQueries({
                queryKey: getBalanceQueryKey({
                    address: user?.address,
                }),
            })
        },
    })

    const queryWaitForTransactionReceipt = useWaitForTransactionReceipt({
        hash: mutationSendToken?.data as Hash,
        query: {
            enabled: !!mutationSendToken.data,
        },
    })

    // Side effects
    const onTransactionCompleted = useCallback(() => {
        mutationSendToken.reset()
        navigate({ to: "/embed" })
    }, [navigate, mutationSendToken])

    useEffect(() => {
        if (queryWaitForTransactionReceipt.isSuccess) onTransactionCompleted()
    }, [queryWaitForTransactionReceipt.isSuccess, onTransactionCompleted])

    return {
        // Form state, mutations, queries
        form,
        mutationSendTransaction: mutationSendToken,
        queryWaitForTransactionReceipt,

        // Token combobox
        tokens: {
            defaultSelection: defaultSelectedToken,
            items: tokens,
            collection: collectionTokens,
        },
        handleTokensComboboxInputChange,
        handleTokensComboboxValueChange,

        // Max token amount
        maxTokenAmount: {
            status: isAddress(form.getFieldValue(FieldFormSendAssets.Token))
                ? queryBalanceERC20Token.status
                : queryBalanceNativeToken.status,
            value: balance,
        },
    }
}
