import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
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
