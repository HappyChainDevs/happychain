import { useAtomValue } from "jotai"
import { chainsAtom, currentChainAtom } from "#src/state/chains"
import { Layout } from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const WalletSwitchEthereumChain = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_switchEthereumChain">) => {
    const chains = useAtomValue(chainsAtom)
    const currentChain = useAtomValue(currentChainAtom)
    const chain = chains[params[0].chainId]

    return (
        <Layout
            headline="Switch chain"
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
                        if (chain) accept({ eip1193params: { method, params } })
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
