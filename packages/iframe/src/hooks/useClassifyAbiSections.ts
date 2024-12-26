import type { Abi, AbiConstructor, AbiError, AbiEvent, AbiFallback, AbiFunction, AbiReceive } from "abitype"
import { useMemo } from "react"
import type { AbiItem } from "viem"

export enum AbiSectionLabel {
    Events = "Events",
    Errors = "Errors",
    Constructor = "Constructor",
    Receive = "Receive",
    Fallback = "Fallback",
    ReadFunctions = "Read Functions",
    WriteFunctions = "Write Functions",
}

interface ClassifiedAbiSection {
    label: AbiSectionLabel
    items: Abi
}

type SectionMap = {
    [AbiSectionLabel.Events]: AbiEvent[]
    [AbiSectionLabel.Errors]: AbiError[]
    [AbiSectionLabel.Constructor]: AbiConstructor[]
    [AbiSectionLabel.Receive]: AbiReceive[]
    [AbiSectionLabel.Fallback]: AbiFallback[]
    [AbiSectionLabel.ReadFunctions]: AbiFunction[]
    [AbiSectionLabel.WriteFunctions]: AbiFunction[]
}

/**
 * Hook that classifies different sections of a user-inputted ABI
 * into distinct categories such as events, errors, constructors,
 * receive functions, fallback functions, and read/write functions.
 * This is used in the popup for the custom `happy_walletUseAbi` RPC call.
 *
 * The classifications are returned as an array of objects, each
 * containing a label and the corresponding items, allowing for
 * easier identification and organization of ABI components in
 * the UI. This design is inspired by the UI [here](https://viem-playground.netlify.app/).
 */
export const useClassifyAbi = (abi: Abi): ClassifiedAbiSection[] => {
    return useMemo(() => {
        const sectionMap: SectionMap = {
            [AbiSectionLabel.Events]: [],
            [AbiSectionLabel.Errors]: [],
            [AbiSectionLabel.Constructor]: [],
            [AbiSectionLabel.Receive]: [],
            [AbiSectionLabel.Fallback]: [],
            [AbiSectionLabel.ReadFunctions]: [],
            [AbiSectionLabel.WriteFunctions]: [],
        }

        for (const item of abi) {
            switch (item.type) {
                case "event":
                    sectionMap[AbiSectionLabel.Events].push(item as AbiEvent)
                    break
                case "error":
                    sectionMap[AbiSectionLabel.Errors].push(item as AbiError)
                    break
                case "constructor":
                    sectionMap[AbiSectionLabel.Constructor].push(item as AbiConstructor)
                    break
                case "receive":
                    sectionMap[AbiSectionLabel.Receive].push(item as AbiReceive)
                    break
                case "fallback":
                    sectionMap[AbiSectionLabel.Fallback].push(item as AbiFallback)
                    break
                case "function": {
                    const func = item as AbiFunction
                    if (func.stateMutability === "view" || func.stateMutability === "pure") {
                        sectionMap[AbiSectionLabel.ReadFunctions].push(func)
                    } else {
                        sectionMap[AbiSectionLabel.WriteFunctions].push(func)
                    }
                    break
                }
                default:
                    console.log("Unknown ABI section:", item)
                    break
            }
        }

        return Object.entries(sectionMap)
            .map(([label, items]) => ({
                label: label as AbiSectionLabel,
                items: items as AbiItem[],
            }))
            .filter((section) => section.items.length > 0)
    }, [abi])
}
