import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
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
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/renderer/index.html'),
                    beatmapPlayer: resolve(__dirname, 'src/renderer/beatmap-player.html')
                }
            },
            sourcemap: false,
            terserOptions: {
                compress: {
                    drop_console: true
                }
            }
        }
    }
});