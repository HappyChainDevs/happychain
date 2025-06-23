import "dotenv/config"
import { defineConfig } from "vocs"

export default defineConfig({
    rootDir: "src",
    title: "HappyChain Docs 🤠",
    // Absolute URL for ogImageUrl below to render correctly
    logoUrl: `${process.env.HAPPY_DOCS_URL ?? "https://docs.happy.tech"}/happychain-logotype.png`,
    // docs: https://vocs.dev/docs/guides/og-images#path-based-og-images
    ogImageUrl: "https://vocs.dev/api/og?logo=%logo&title=%title",
    iconUrl: "/happyicon.png",
    aiCta: true,
    vite: {
        envPrefix: "HAPPY_",
        envDir: __dirname,
        server: { port: 4000, strictPort: true },
        // Vocs currently ignores this, always serves preview on port 4173 (or higher if busy)
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
                    text: "Introduction",
                    link: "/boop",
                },
                {
                    text: "Architecture",
                    link: "/boop/architecture",
                },
                {
                    text: "Contracts",
                    link: "/boop/contracts",
                },
                {
                    text: "Extensions",
                    link: "/boop/extensions",
                },
                {
                    text: "Submitter",
                    link: "/boop/submitter",
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
            text:
                process.env.NODE_ENV === "development"
                    ? "Plaintext Docs (Disabled in Dev)"
                    : "Plaintext Docs (for LLMs)",
            collapsed: true,
            items: [
                {
                    text: "Docs List",
                    disabled: process.env.NODE_ENV === "development",
                    // Note: this needs to be an absolute URL, or else the SPA routing
                    // will take over and result in a 404 when the page is not directly accessed.
                    link: `${process.env.HAPPY_DOCS_URL ?? "https://docs.happy.tech"}/llms.txt`,
                },
                {
                    text: "Full Docs",
                    disabled: process.env.NODE_ENV === "development",
                    // Note: this needs to be an absolute URL, or else the SPA routing
                    // will take over and result in a 404 when the page is not directly accessed.
                    link: `${process.env.HAPPY_DOCS_URL ?? "https://docs.happy.tech"}/llms-full.txt`,
                },
            ],
        },
    ],
})
