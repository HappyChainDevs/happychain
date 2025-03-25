import { Scrollable } from "#src/v2/layouts/root/screen"
import { TableTokens } from "./Table"

export const PATHNAME_ROUTE_TOKENS = "/embed/tokens/"

export const ScreenTokens = () => {
    return (
        <Scrollable>
            <TableTokens />
        </Scrollable>
    )
}
