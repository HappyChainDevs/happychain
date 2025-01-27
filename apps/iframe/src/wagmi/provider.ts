import type { EIP1193Provider } from "viem"
import { SuperProvider } from "#src/SuperProvider"

export const iframeProvider = SuperProvider.getInstance() as Omit<SuperProvider, "request" | "on" | "removeListener"> &
    EIP1193Provider
