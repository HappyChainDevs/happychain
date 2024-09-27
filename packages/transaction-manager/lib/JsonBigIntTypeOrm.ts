import { JsonType } from "@mikro-orm/core"

export class JsonBigIntTypeOrm extends JsonType {
    override convertToDatabaseValue(value: object): string {
        return JSON.stringify(value, (_, value) => (typeof value === "bigint" ? `bigint:${value}` : value))
    }

    override convertToJSValue(value: string): object {
        const parsed = JSON.parse(value)
        for (const key in parsed) {
            if (typeof parsed[key] === "string" && parsed[key].startsWith("bigint:")) {
                parsed[key] = BigInt(parsed[key].slice(7))
            }
        }
        return parsed
    }
}
