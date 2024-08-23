import type { Config } from "tailwindcss"

export default {
    prefix: "hc-",
    content: ["./lib/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {},
    },
    plugins: [],
} satisfies Config
