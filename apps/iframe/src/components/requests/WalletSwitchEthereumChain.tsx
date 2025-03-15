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
                        Unknown chain with ID <span className="font-bold">{params[0].chainId}</span> would like to
                        switch to an unknown network. <br /> Please add this chain first, then try again.
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
