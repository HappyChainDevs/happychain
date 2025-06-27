import { useAtomValue } from "jotai"
import { RequestDisabled } from "#src/components/requests/common/RequestDisabled"
import { currentChainAtom } from "#src/state/chains"
import { getChains } from "#src/state/chains/index"
import { Layout } from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const WalletSwitchEthereumChain = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_switchEthereumChain">) => {
    const chains = getChains()
    const currentChain = useAtomValue(currentChainAtom)
    const chain = chains[params[0].chainId]
    const headline = "Switch chain"

    // biome-ignore format: save space
    if (import.meta.env.PROD)
        return <RequestDisabled
                headline={headline}
                description="The Happy Wallet is an HappyChain exclusive 🤠"
                reject={reject}
            />

    return (
        <Layout
            headline={headline}
            description={
                !chain ? (
                    <>
                        <p className="mb-2">
                            The app wants to switch to an unknown chain with ID{" "}
                            <span className="font-bold">{params[0].chainId}</span>
                        </p>
                        <p>Please add this chain first, then try again.</p>
                    </>
                ) : (
                    <>
                        Switching from <span className="font-bold">{currentChain.chainName}</span> to{" "}
                        <span className="font-bold">{chain?.chainName}</span>.
                    </>
                )
            }
            actions={{
                accept: {
                    children: "Switch chain",
                    "aria-disabled": !chain,
                    onClick: () => {
                        if (chain) accept({ method, params })
                    },
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        />
    )
}
