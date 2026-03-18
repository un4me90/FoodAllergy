import './styles/main.css';
import { renderApp } from './app';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[sw] 등록 실패:', err);
    });
  });
}

renderApp();
