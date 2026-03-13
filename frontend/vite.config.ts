import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  plugins: [
    VitePWA({
      // 서비스 워커는 public/sw.js를 직접 사용 (main.ts에서 수동 등록)
      // vite-plugin-pwa는 manifest 생성만 담당
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      workbox: {
        // 기본 generateSW는 사용하지 않고, 커스텀 sw.js를 public에 배치
        // 대신 runtimeCaching만 설정
        globPatterns: [],
        // 커스텀 서비스워커(public/sw.js)와 충돌하지 않도록 다른 파일명 사용
        swDest: 'dist/wb-sw.js',
      },
      manifest: {
        name: '급식 알레르기 알림',
        short_name: '급식알림',
        description: '매일 아침 오늘 급식의 알레르기를 알려드립니다',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        lang: 'ko',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
