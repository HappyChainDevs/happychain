import { defineConfig } from "vocs"

export default defineConfig({
    rootDir: "src",
    title: "HappyChain Docs 🤠",
    iconUrl: "/happyicon.png",
    vite: {
        server: { port: 4000, strictPort: true },
        preview: { port: 4000, strictPort: true },
        resolve: {
            alias: {
                "@happy.tech/submitter/client": "../submitter/lib/client",
                "@happy.tech/submitter": "../submitter/lib",
                "@happy.tech/boop-sdk": "../../packages/boop-sdk/lib",
                "@happy.tech/common": "../../support/common/lib",
            },
        },
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
                            link: "/boop/sdk/getting-started",
                        },
                        {
                            text: "API Reference",
                            link: "/boop/sdk/api",
                        },
                    ],
                },
                {
                    text: "Rest API",
                    link: "/boop/rest-api",
                },
            ],
        },
        {
            text: "Plaintext Docs (for LLMs)",
            collapsed: true,
            items: [
                {
                    text: "Docs List",
                    // Note: this needs to be an absolute URL, or else the SPA routing
                    // will take over and result in a 404 when the page is not directly accessed.
                    link: "https://docs.happy.tech/llms.txt",
                },
                {
                    text: "Full Docs",
                    // Note: this needs to be an absolute URL, or else the SPA routing
                    // will take over and result in a 404 when the page is not directly accessed.
                    link: "https://docs.happy.tech/llms-full.txt",
                },
            ],
        },
    ],
})
