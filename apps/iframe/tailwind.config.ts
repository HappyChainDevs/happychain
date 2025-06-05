import daisyui from "daisyui"
import type { Config } from "tailwindcss"
import defaultTheme from "tailwindcss/defaultTheme"
import plugin from "tailwindcss/plugin"

export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        screens: {
            // smaller is 'closed' wallet
            // larger than this size is fully open wallet (or modal)
            lg: { raw: "(min-height: 72px) and (min-width: 210px)" },
        },
        extend: {
            fontFamily: {
                sans: ["Inter", ...defaultTheme.fontFamily.sans],
            },
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
    plugins: [
        daisyui,
        plugin(({ addVariant }) => {
            addVariant("content-focused", ["&:focus", "&:focus-within"])
            addVariant("input-invalid", [
                "&:user-invalid[data-invalid]",
                "&:has(:user-invalid)[data-invalid]",
                "&:[data-invalid]",
                "&:has([data-invalid])",
            ])
            addVariant("click-disabled", ["&[aria-disabled=true]", "&:disabled"])
            addVariant("input-disabled", [
                // Only target input/textarea that are readonly/disabled
                "&:is(input, textarea):read-only",
                "&:is(input, textarea):disabled",
                "&[aria-disabled=true]:is(input, textarea)",
                // Target readonly/disabled inputs/textareas within the element
                "&:has(:is(input, textarea):read-only)",
                "&:has(:is(input, textarea):disabled)",
                "&:has([aria-disabled=true]:is(input, textarea))",
            ])
        }),
        plugin(({ addUtilities }) => {
            addUtilities({
                ".scrollbar-stable": {
                    scrollbarGutter: "stable both-edges",
                },
                ".scrollbar-hidden": {
                    scrollbarWidth: "none", // Firefox
                    "-ms-overflow-style": "none", // IE 10+
                },
                ".scrollbar-hidden::-webkit-scrollbar": {
                    display: "none", // Chrome / Safari
                },
                ".scrollbar-thin": {
                    // Firefox
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(100, 100, 100, 0.5) transparent",
                },
                ".scrollbar-thin::-webkit-scrollbar": {
                    width: "6px",
                    height: "6px",
                },
                ".scrollbar-thin::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(100, 100, 100, 0.5)",
                    borderRadius: "6px",
                },
            })
        }),
    ],
    darkMode: ["selector", '[data-theme="night"]'],
    daisyui: {
        logs: false,
        themes: ["winter", "night"],
    },
} satisfies Config
