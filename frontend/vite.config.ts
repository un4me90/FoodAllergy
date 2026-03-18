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
      strategies: 'generateSW',
      injectRegister: false,
      workbox: {
        globPatterns: [],
        swDest: 'dist/wb-sw.js',
      },
      manifest: {
        name: '석암초 안전급식',
        short_name: '석암초 안전급식',
        description: '석암초 급식 메뉴와 우리 아이 맞춤 알레르기 정보를 제공합니다.',
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
