import { validator as zValidator } from "hono-openapi/zod"
import {
    AdminWalletParamSchema,
    GameCreateRequestSchema,
    GameIdParamSchema,
    GameQuerySchema,
    GameScoresQuerySchema,
    GameUpdateRequestSchema,
    ScoreSubmitRequestSchema,
    UserWalletParamSchema,
} from "./gameSchemas"

export const GameQueryValidation = zValidator("query", GameQuerySchema)
export const GameCreateValidation = zValidator("json", GameCreateRequestSchema)
export const GameIdParamValidation = zValidator("param", GameIdParamSchema)
export const AdminWalletParamValidation = zValidator("param", AdminWalletParamSchema)
export const GameUpdateValidation = zValidator("json", GameUpdateRequestSchema)
export const ScoreSubmitValidation = zValidator("json", ScoreSubmitRequestSchema)
export const GameScoresQueryValidation = zValidator("query", GameScoresQuerySchema)
export const UserWalletParamValidation = zValidator("param", UserWalletParamSchema)
