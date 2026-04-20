import './styles/main.css';
import { renderApp } from './app';
import { withAppBase } from './config/base';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(withAppBase('sw.js')).catch(err => {
      console.warn('[sw] 등록 실패:', err);
    });
  });
}

renderApp();
