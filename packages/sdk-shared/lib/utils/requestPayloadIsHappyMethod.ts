import type { EIP1193RequestParameters } from "../interfaces/eip1193"
import type { ProviderEventPayload } from "../interfaces/payloads"
import { permissionsLists } from "../interfaces/permissions"

const rpcMethods = Array<string>().concat(
    Array.from(permissionsLists.get("safe") ?? []),
    Array.from(permissionsLists.get("interactive") ?? []),
    Array.from(permissionsLists.get("unsafe") ?? []),
)
const happyMethods = new Set(rpcMethods.filter((a) => a.startsWith("happy_")))
export function requestPayloadIsHappyMethod(
    payload: ProviderEventPayload<EIP1193RequestParameters>["payload"],
): payload is Extract<typeof payload, { method: `happy_${string}` }> {
    return happyMethods.has(payload.method)
}
