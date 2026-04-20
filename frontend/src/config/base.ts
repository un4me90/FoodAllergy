const rawBaseUrl = import.meta.env.BASE_URL || '/';

export const appBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;
export const appBasePath = appBaseUrl === '/' ? '' : appBaseUrl.replace(/\/$/, '');
export const apiBaseUrl = appBasePath ? `${appBasePath}/api` : '/api';

export function withAppBase(path: string): string {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${appBaseUrl}${normalizedPath}`;
}
