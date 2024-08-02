import daisyui from 'daisyui'
import type { Config } from 'tailwindcss'

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [daisyui],
    darkMode: ['class', '[data-theme="night"]'],
    daisyui: {
        themes: ['winter', 'night'],
    },
} satisfies Config
