import type { Plugin } from "vite"
import { DevelopmentPlugin } from "./plugin/DevelopmentPlugin"
import { ProductionClientPlugin } from "./plugin/ProductionClientPlugin"
import { WorkerShimPlugin } from "./plugin/WorkerShimPlugin"

type Options = { disabled?: boolean }

export function SharedWorkerPlugin({ disabled = false }: Options = {}): Plugin[] {
    return disabled //
        ? [WorkerShimPlugin()]
        : [DevelopmentPlugin(), ProductionClientPlugin()]
}
