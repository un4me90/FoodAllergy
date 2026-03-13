import './styles/main.css';
import { renderApp } from './app';

// 서비스 워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[sw] 등록 실패:', err);
    });
  });
}

// 앱 렌더링
renderApp();
