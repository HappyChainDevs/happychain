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
            collapsed: false,
            items: [
                {
                    text: "Overview",
                    link: "/sdk",
                },
                {
                    text: "JavaScript & TypeScript",
                    items: [
                        {
                            text: "Getting Started",
                            link: "/sdk/js",
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
                            link: "/sdk/react",
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
                            link: "/sdk/vue",
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
            text: "Boop (Account Abstraction)",
            collapsed: false,
            items: [
                {
                    text: "Overview",
                    link: "/boop",
                },
                {
                    text: "Architecture",
                    link: "/boop/architecture",
                },
                {
                    text: "Client SDK",
                    items: [
                        {
                            text: "Getting Started",
                            link: "/boop/sdk",
                        },
                        {
                            text: "API Reference",
                            link: "/boop/sdk/api",
                        },
                    ],
                },
                {
                    text: "Boop Submitter",
                    link: "/boop/submitter",
                },
                {
                    text: "Boop Contracts",
                    link: "/boop/contracts",
                },
                {
                    text: "REST API",
                    link: "/boop/rest",
                },
            ],
        },
        {
            text: "TXM (Transaction Manager)",
            collapsed: true,
            items: [
                {
                    text: "Getting Started",
                    link: "/txm",
                },
                {
                    text: "API Reference",
                    link: "/txm/api",
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
