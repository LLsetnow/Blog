import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api/blog': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "variables" as *;
          @use "glassmorphism" as *;
        `,
        includePaths: [resolve(__dirname, 'src/styles')],
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
})
