import type { z } from "zod"
import type { inputSchema, outputSchema } from "./validation"

export type DeleteConfigInput = z.infer<typeof inputSchema>
export type DeleteConfigOutput = z.infer<typeof outputSchema>
