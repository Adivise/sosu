import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'src/electron/main.js')
            }
        }
    },
    preload: {
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'src/electron/preload.js')
            }
        }
    },
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve(__dirname, 'src/renderer/src')
            }
        },
        plugins: [react()],
        build: {
            sourcemap: false,
            terserOptions: {
                compress: {
                    drop_console: true
                }
            },
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/renderer/index.html')
                }
            }
        }
    }
})
