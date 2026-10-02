import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    assetsInlineLimit: 10_000_000,  // 10MB — 이미지를 base64로 인라인 (단일 HTML 배포)
  },
})
