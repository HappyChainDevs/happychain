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
        extend: {
            keyframes: {
                hideScrollbar: {
                    from: { overflow: "hidden" },
                    to: { overflow: "hidden" },
                },
                fadeIn: {
                    from: { opacity: "0", overflow: "hidden" },
                    to: { opacity: "1", overflow: "hidden" },
                },
                fadeOut: {
                    from: { opacity: "1", overflow: "hidden" },
                    to: { opacity: "0", overflow: "hidden" },
                },

                collapseDown: {
                    from: {
                        opacity: "0.01",
                        height: "0",
                        overflow: "hidden",
                    },
                    to: {
                        opacity: "1",
                        height: "var(--height)",
                        overflow: "hidden",
                    },
                },
                collapseUp: {
                    from: {
                        opacity: "1",
                        height: "var(--height)",
                        overflow: "hidden",
                    },
                    to: {
                        opacity: "0.01",
                        height: "0",
                        overflow: "hidden",
                    },
                },
                growIn: {
                    from: {
                        transform: "translateY(25%)",
                        opacity: "0",
                        overflow: "hidden",
                    },
                    to: {
                        transform: "translateY(0%)",
                        opacity: "1",
                        overflow: "hidden",
                    },
                },
                growOut: {
                    to: {
                        transform: "translateY(25%)",
                        opacity: "0",
                        overflow: "hidden",
                    },
                },
                slideDown: {
                    from: {
                        transform: "translateY(-100%)",
                        overflow: "hidden",
                    },
                    to: {
                        transform: "translateY(0)",
                        overflow: "hidden",
                    },
                },
                appear: {
                    from: {
                        opacity: "0",
                        transform: "translateY(-2.5%)",
                        overflow: "hidden",
                    },
                    to: {
                        opacity: "1",
                        transform: "translateY(0)",
                        overflow: "hidden",
                    },
                },
                exit: {
                    to: {
                        opacity: "0",
                        transform: "translateY(-2.5%)",
                        overflow: "hidden",
                    },
                },
            },
            animation: {
                hideScrollbar: "",
                fadeIn: "fadeIn 250ms ease-out",
                fadeOut: "fadeOut 300ms ease-in",
                appear: "appear 200ms ease-out",
                exit: "exit 200ms ease-in",
                collapseDown: "collapseDown 110ms cubic-bezier(0, 0, 0.38, 0.9)",
                collapseUp: "collapseUp 110ms cubic-bezier(0, 0, 0.38, 0.9)",
                growIn: "growIn 250ms ease-out",
                growOut: "growOut 200ms ease-in",
                slideDown: "slideDown 200ms cubic-bezier(0, 0, 0.38, 0.9)",
            },
        },
    },
    plugins: [daisyui],
    darkMode: ["selector", '[data-theme="night"]'],
    daisyui: {
        logs: false,
        themes: ["winter", "night"],
    },
} satisfies Config
