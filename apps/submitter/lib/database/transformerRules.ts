import { bigintToString, isBigIntString, stringToBigInt } from "@happy.tech/common"
import type { TransformerRules } from "./plugins/SerializerPlugin"

/**
 * Conversion rules to serialize bigints into strings when saving to the database,
 * then deserialize them back into bigints when reading from the database.
 *
 * This allows us to use `bigints` in our typescript code without worrying about sqlite's bigint
 * limitations or having to deal with everything being 'text'
 */
export const transformerRules: TransformerRules = {
    bigint: {
        // stringify bigints with prefix
        from(value: bigint) {
            return bigintToString(value)
        },
    },

    string: {
        // if its a serialized bigint, lets deserialize
        to(value: string) {
            return isBigIntString(value) ? stringToBigInt(value) : value
        },
    },
}
