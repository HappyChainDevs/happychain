import { traceFunction } from "#lib/telemetry/traces"
import { computeBoopHash_noTrace } from "./computeBoopHash"
import { decodeBoop_noTrace } from "./decodeBoop"
import { encodeBoop_noTrace } from "./encodeBoop"
import { updateBoopFromSimulation_noTrace } from "./updateBoopFromSimulation"

/** {@inheritDoc computeBoopHash_noTrace} */
const tracedComputeBoopHash = traceFunction(computeBoopHash_noTrace, "computeBoopHash")
export { tracedComputeBoopHash as computeBoopHash }

/** {@inheritDoc decodeBoop_noTrace} */
const tracedDecodeBoop = traceFunction(decodeBoop_noTrace, "decodeBoop")
export { tracedDecodeBoop as decodeBoop }

/** {@inheritDoc encodeBoop_noTrace} */
const tracedEncodeBoop = traceFunction(encodeBoop_noTrace, "encodeBoop")
export { tracedEncodeBoop as encodeBoop }

/** {@inheritDoc updateBoopFromSimulation_noTrace} */
const tracedUpdateBoopFromSimulation = traceFunction(updateBoopFromSimulation_noTrace, "updateBoopFromSimulation")
export { tracedUpdateBoopFromSimulation as updateBoopFromSimulation }

export { computeHash } from "./computeHash"
