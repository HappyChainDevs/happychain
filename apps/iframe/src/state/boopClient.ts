import { BoopClient } from "@happy.tech/boop-sdk"
import { SUBMITTER_URL } from "#src/constants/accountAbstraction.ts"

export const boopClient = new BoopClient({
    baseUrl: SUBMITTER_URL,
})
