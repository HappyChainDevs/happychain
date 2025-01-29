import { defineConfig } from "vocs"

export default defineConfig({
    rootDir: "src",
    title: "HappyChain Docs",
    socials: [
        {
            link: "https://x.com/HappyChainDevs",
            icon: "x",
        },
        {
            link: "https://github.com/HappyChainDevs",
            icon: "github",
        },
    ],
    sidebar: [
        {
            text: "SDK",
            link: "/sdk",
            items: [
                {
                    text: "JavaScript & TypeScript",
                    items: [
                        {
                            text: "Getting Started",
                            link: "/sdk/js/getting-started",
                        },
                        {
                            text: "API Reference",
                            link: "/sdk/js/api",
                        },
                    ],
                },
                {
                    text: "React",
                    items: [
                        {
                            text: "Getting Started",
                            link: "/sdk/react/getting-started",
                        },
                        {
                            text: "API Reference",
                            link: "/sdk/react/api",
                        },
                    ],
                },
            ],
        },
        {
            text: "Transaction Manager",
            link: "/txm",
            items: [
                {
                    text: "Getting Started",
                    link: "/txm/getting-started",
                },
                {
                    text: "API Reference",
                    link: "/txm/api",
                },
            ],
        },
    ],
})
