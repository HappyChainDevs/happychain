import type { Config } from "tailwindcss"
import defaultTheme from "tailwindcss/defaultTheme"

export default {
    content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Pixelify Sans", ...defaultTheme.fontFamily.sans],
            },
            colors: {
                "theme-bg": "#0000A8",
                "theme-text": "#fff",
                "theme-text-highlight": "#F0F00A",
                "theme-btn": "#00A8A8",
                "theme-highlight": "#00A800",
            },
            boxShadow: {
                theme: "10px 10px 0 0 rgba(0,0,0,1)",
                "theme-sm": "5px 5px 0 0 rgba(0,0,0,1)",
            },
        },
    },
    plugins: [],
} satisfies Config
