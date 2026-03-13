import { hasCompletedSetup } from './services/storage';
import { renderSetup } from './pages/Setup';
import { renderHome } from './pages/Home';
import { renderSettings } from './pages/Settings';

const app = document.getElementById('app')!;

function getRoute(): string {
  return location.hash.replace('#', '') || '/';
}

function navigate(path: string): void {
  location.hash = path;
}

function renderRoute(): void {
  const route = getRoute();

  // 설정 미완료 시 강제로 설정 페이지로
  if (!hasCompletedSetup() && route !== '/setup') {
    navigate('/setup');
    return;
  }

  app.innerHTML = '';

  if (route === '/setup') {
    renderSetup(app, () => navigate('/'));
  } else if (route === '/settings') {
    renderSettings(app, () => navigate('/'));
  } else {
    renderHome(app, () => navigate('/settings'));
  }
}

export function renderApp(): void {
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}
