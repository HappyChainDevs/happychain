import { defineConfig } from "vocs"

export default defineConfig({
    rootDir: "docs",
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
            link: "/transaction-manager",
            items: [
                {
                    text: "Getting Started",
                    link: "/transaction-manager/getting-started",
                },
                {
                    text: "API Reference",
                    link: "/transaction-manager/api",
                },
            ],
        },
    ],
})
