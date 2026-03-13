import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    // 强制使用单一 React 副本
    dedupe: ['react', 'react-dom'],
    alias: {
      // 配置 @ 指向 src 目录
      '@': path.resolve(__dirname, './src'),
    },
  },
})
