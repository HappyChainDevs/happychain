import type { z } from "zod"
import type { inputSchema } from "./validation"

export type SubscribeInput = z.infer<typeof inputSchema>
