import { defineConfig } from 'vocs'

export default defineConfig({
    title: 'HappyChain SDK',
    topNav: [
        { text: 'Guide & API', link: '/docs/getting-started', match: '/docs' },
        { text: 'Blog', link: '/blog' },
        {
            text: 'Version',
            items: [
                {
                    text: 'JavaScript',
                    link: '/js/quick-start',
                },
                {
                    text: 'React',
                    link: '/react/quick-start',
                },
            ],
        },
    ],
    sidebar: [
        {
            text: 'JavaScript',
            collapsed: true,
            items: [
                {
                    text: 'Quick Start',
                    link: '/js/quick-start',
                },
                {
                    text: 'Features',
                    link: '/js/features',
                },
                {
                    text: 'Install',
                    link: '/js/install',
                },
                {
                    text: 'Setup',
                    link: '/js/setup',
                },
            ],
        },
        {
            text: 'React',
            collapsed: true,
            items: [
                {
                    text: 'Quick Start',
                    link: '/react/quick-start',
                },
                {
                    text: 'Features',
                    link: '/react/features',
                },
                {
                    text: 'Install',
                    link: '/react/install',
                },
                {
                    text: 'Setup',
                    link: '/react/setup',
                },
            ],
        },
        {
            text: 'API',
            items: [
                {
                    text: 'JavaScript',
                    collapsed: true,
                    items: [
                        { text: 'HappyProvider', link: '/api/js/HappyProvider' },
                        { text: 'HappyWallet', link: '/api/js/HappyWallet' },
                        { text: 'Events', link: '/api/js/events' },
                    ],
                },
                {
                    text: 'React',
                    collapsed: true,
                    items: [
                        { text: 'HappyWalletProvider', link: '/api/react/HappyWalletProvider' },
                        { text: 'useHappyChain', link: '/api/react/useHappyChain' },
                    ],
                },
            ],
        },
    ],
})
