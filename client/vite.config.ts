import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../shared'),
    },
  },
  // 预打包重量级依赖，减少 WSL2 NAT 跨 VM 请求数
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios'],
  },
  server: {
    port: 5173,
    // 预热首屏模块，避免浏览器端级联请求
    warmup: {
      clientFiles: ['./src/main.ts', './src/router/index.ts', './src/App.vue'],
    },
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/avatars': { target: 'http://localhost:3000', changeOrigin: true },
      '/images': { target: 'http://localhost:3000', changeOrigin: true },
      '/logos': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
