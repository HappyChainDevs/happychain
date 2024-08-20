import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { hmrPlugin, presets } from 'vite-plugin-web-components-hmr'

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            hmrPlugin({
                include: ['./lib/**/*.ts'],
                presets: [presets.lit],
            }),
            dts({
                rollupTypes: true,
                tsconfigPath: './tsconfig.lib.json',
                exclude: ['**/*.test.tsx', '**/*.test.ts'],
            }),
        ],
        build: {
            lib: {
                name: 'HappyChain',
                entry: 'lib/index.ts',
                fileName: (format) => `index.${format}.js`,
            },
            rollupOptions: {
                external: mode === 'production' ? '' : /^lit-element/,
            },
            copyPublicDir: false,
            sourcemap: true,
            emptyOutDir: true,
        },
    }
})
