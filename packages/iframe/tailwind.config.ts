import daisyui from "daisyui"
import type { Config } from "tailwindcss"

export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        screens: {
            // smaller is 'closed' wallet
            // larger than this size is fully open wallet (or modal)
            lg: { raw: "(min-height: 72px) and (min-width: 210px)" },
        },
        extend: {},
    },
    plugins: [daisyui],
    darkMode: ["class", '[data-theme="night"]'],
    daisyui: {
        logs: false,
        themes: ["winter", "night"],
    },
} satisfies Config
