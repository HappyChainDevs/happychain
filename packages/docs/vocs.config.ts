import { defineConfig } from "vocs"

export default defineConfig({
    rootDir: "docs",
    title: "HappyChain SDK",
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
            text: "JavaScript",
            items: [
                {
                    text: "Getting Started",
                    link: "/js/getting-started",
                },
                {
                    text: "API Reference",
                    link: "/js/api",
                },
            ],
        },
        {
            text: "React",
            items: [
                {
                    text: "Getting Started",
                    link: "/react/getting-started",
                },
                {
                    text: "API Reference",
                    link: "/react/api",
                },
            ],
        },
    ],
})
