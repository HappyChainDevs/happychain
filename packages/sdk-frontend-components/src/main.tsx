import { render } from "preact"
import { App } from "./app.tsx"
import "./index.css"

// biome-ignore lint/style/noNonNullAssertion: boilerplate
render(<App />, document.getElementById("app")!)
