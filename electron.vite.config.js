import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    main: {
        build: {
            minify: "terser",
            treeshake: true
        }
    },
    preload: {},
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src')
            }
        },
        plugins: [react()],
        build: {
            sourcemap: false,
            terserOptions: {
                compress: {
                    drop_console: true
                }
            }
        }
    }
});