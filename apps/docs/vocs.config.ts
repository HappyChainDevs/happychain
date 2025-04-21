import { defineConfig } from "vocs"

export default defineConfig({
    rootDir: "src",
    title: "HappyChain Docs 🤠",
    vite: {
        server: { port: 4000, strictPort: true },
        preview: { port: 4000, strictPort: true },
    },
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
            text: "Chain Information",
            link: "/chain",
        },
        {
            text: "Happy Wallet SDK",
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
                {
                    text: "Vue",
                    items: [
                        {
                            text: "Getting Started",
                            link: "/sdk/vue/getting-started",
                        },
                        {
                            text: "API Reference",
                            link: "/sdk/vue/api",
                        },
                    ],
                },
            ],
        },
        {
            text: "TXM (Transaction Manager)",
            link: "/txm",
            collapsed: true,
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
        {
            text: "Boop (Account Abstraction)",
            collapsed: false,
            items: [
                {
                    text: "Client SDK",
                    items: [
                        {
                            text: "Getting Started",
                            link: "/submitter/client/getting-started",
                        },
                        {
                            text: "API Reference",
                            link: "/submitter/client/api",
                        },
                    ],
                },
            ],
        },
    ],
})
