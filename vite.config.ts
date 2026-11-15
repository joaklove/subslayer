import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 根 workspace 与本地各有一份 react，强制统一到本项目这一份，避免双 React 导致 hook 失效
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
