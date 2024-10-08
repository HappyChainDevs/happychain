import { render } from "preact"
import { App } from "./app.tsx"
import "./index.css"

// biome-ignore lint/style/noNonNullAssertion: <explanation>
render(<App />, document.getElementById("app")!)
