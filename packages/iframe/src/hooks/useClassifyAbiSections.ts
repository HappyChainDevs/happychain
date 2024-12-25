// src/hooks/useClassifyAbi.ts

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
    items: AbiItem[]
}

const isAbiConstructor = (item: AbiItem): item is AbiConstructor => item.type === "constructor"
const isAbiError = (item: AbiItem): item is AbiError => item.type === "error"
const isAbiEvent = (item: AbiItem): item is AbiEvent => item.type === "event"
const isAbiFallback = (item: AbiItem): item is AbiFallback => item.type === "fallback"
const isAbiReceive = (item: AbiItem): item is AbiReceive => item.type === "receive"
const isAbiFunction = (item: AbiItem): item is AbiFunction => item.type === "function"

export const useClassifyAbi = (abi: Abi): ClassifiedAbiSection[] => {
    return useMemo(() => {
        const sections: ClassifiedAbiSection[] = [
            { label: AbiSectionLabel.Events, items: [] },
            { label: AbiSectionLabel.Errors, items: [] },
            { label: AbiSectionLabel.Constructor, items: [] },
            { label: AbiSectionLabel.Receive, items: [] },
            { label: AbiSectionLabel.Fallback, items: [] },
            { label: AbiSectionLabel.ReadFunctions, items: [] },
            { label: AbiSectionLabel.WriteFunctions, items: [] },
        ]

        abi.forEach((item) => {
            if (isAbiEvent(item)) {
                sections.find((section) => section.label === AbiSectionLabel.Events)?.items.push(item)
            } else if (isAbiError(item)) {
                sections.find((section) => section.label === AbiSectionLabel.Errors)?.items.push(item)
            } else if (isAbiConstructor(item)) {
                sections.find((section) => section.label === AbiSectionLabel.Constructor)?.items.push(item)
            } else if (isAbiReceive(item)) {
                sections.find((section) => section.label === AbiSectionLabel.Receive)?.items.push(item)
            } else if (isAbiFallback(item)) {
                sections.find((section) => section.label === AbiSectionLabel.Fallback)?.items.push(item)
            } else if (isAbiFunction(item)) {
                const func = item as AbiFunction
                if (func.stateMutability === "view" || func.stateMutability === "pure") {
                    sections.find((section) => section.label === AbiSectionLabel.ReadFunctions)?.items.push(func)
                } else {
                    sections.find((section) => section.label === AbiSectionLabel.WriteFunctions)?.items.push(func)
                }
            }
        })

        return sections.filter((section) => section.items.length > 0)
    }, [abi])
}
