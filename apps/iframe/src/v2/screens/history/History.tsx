import { Scrollable } from "#src/v2/layouts/root/screen"
import { TableHistory } from "./Table"

export const PATHNAME_ROUTE_HISTORY = "/embed/history/"

export const ScreenHistory = () => {
    return (
        <Scrollable>
            <TableHistory />
        </Scrollable>
    )
}
