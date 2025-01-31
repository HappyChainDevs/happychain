import { useAtomValue } from "jotai"
import { chainsAtom, currentChainAtom } from "#src/state/chains"
import { getAppURL } from "#src/utils/appURL"
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
    const appURL = getAppURL()

    return (
        <Layout
            labelHeader="Switch network"
            headline={
                <>
                    <span className="text-primary">{appURL}</span> wants to switch to a different network
                </>
            }
            description={
                !chain ? (
                    <>
                        <span className="font-medium text-primary">{appURL}</span> would like to switch to an unknown
                        network. <br /> Please add this new network first, then try switching network again.
                    </>
                ) : (
                    <>
                        This will allow <span className="font-medium text-primary">{appURL}</span> to switch from{" "}
                        {currentChain.chainName} to {chain?.chainName}.
                    </>
                )
            }
            actions={{
                accept: {
                    children: "Switch network",
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
