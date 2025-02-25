import { defineConfig } from "@terrazzo/cli"
import cssPlugin from "@terrazzo/plugin-css"

const baseCssPluginConfig = {
  transform: (token) => {
    if (token.$type === "dimension" && typeof token.$value.value === "number" && token.$value.unit === "px") {
        return `${token.$value.value / 16}rem`
    }
  },
}
export default defineConfig({
  plugins: [
    cssPlugin({
      ...baseCssPluginConfig,
        variableName: (token) => `--happy-ds-${token.id}`.replaceAll(".", "-"),
        filename: "base.css",
    }),
  ],
})
