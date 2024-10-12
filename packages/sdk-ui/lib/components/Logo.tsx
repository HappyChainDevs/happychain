/** @jsxImportSource preact */
import type { EIP6963ProviderInfo } from "mipd"

export function Logo({ info }: { info?: EIP6963ProviderInfo }) {
    return <img src={info?.icon} alt={`${info?.name} logo`} className={"happychain-icon"} />
}
