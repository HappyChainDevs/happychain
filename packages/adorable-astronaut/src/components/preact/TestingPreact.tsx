import { register } from "@happychain/js"
import { Badge } from "@happychain/ui/preact"
import { useReducer } from "preact/hooks"

register()
export function TestingPreact() {
    return (
        <div>
            <h1>Hello From Preact</h1>
            <Badge />
        </div>
    )
}
