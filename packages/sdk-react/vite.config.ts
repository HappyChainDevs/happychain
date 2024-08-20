import { resolve } from 'node:path'

import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, './lib/index.ts'),
            name: 'happychain',
            fileName: (format) => `index.${format}.js`,
        },
        rollupOptions: {
            external: ['react', '@happychain/js', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    '@happychain/js': 'HappyChain',
                    'react-dom': 'ReactDOM',
                },
            },
        },
        copyPublicDir: false,
        sourcemap: true,
        emptyOutDir: true,
    },

    resolve: {
        alias: {
            // '@happychain/js': resolve('../sdk-vanillajs/lib/main.ts'),
        },
    },

    plugins: [
        dts({
            // nicer output, but takes time
            rollupTypes: true,
            tsconfigPath: 'tsconfig.app.json',
            exclude: ['**/*.test.tsx', '**/*.test.ts'],
        }),
        react(),
    ],
})
