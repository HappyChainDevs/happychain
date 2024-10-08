import type { Plugin } from "vite"
import { DevelopmentPlugin } from "./plugin/DevelopmentPlugin"
import { ProductionClientPlugin } from "./plugin/ProductionClientPlugin"

export function SharedWorkerPlugin(): Plugin[] {
    return [DevelopmentPlugin(), ProductionClientPlugin()]
}
