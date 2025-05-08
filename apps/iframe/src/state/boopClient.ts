import { BoopClient } from "@happy.tech/boop-sdk"
import { accessorsFromAtom } from "@happy.tech/common"
import { type Atom, atom } from "jotai"
import { SUBMITTER_URL } from "#src/constants/accountAbstraction"
import { deployment } from "#src/constants/contracts"
import { currentChainAtom } from "#src/state/chains"

export const boopClientAtom: Atom<BoopClient | undefined> = atom<BoopClient | undefined>((get) => {
    const currentChain = get(currentChainAtom)
    if (!currentChain) return
    return new BoopClient({
        baseUrl: SUBMITTER_URL,
        rpcUrl: currentChain.rpcUrls[0],
        entryPoint: deployment.EntryPoint,
    })
})

export const { getValue: getBoopClient } = accessorsFromAtom(boopClientAtom)
