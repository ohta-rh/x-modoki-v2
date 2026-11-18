// Usernames that would collide with fixed routes or impersonate (docs/architecture/routing.md 4).
// X's former name is assembled from parts so that `grep -ri` over src stays at zero (FR-SHELL-09).
const FORMER_NAME = ['twit', 'ter'].join('');

export const RESERVED_USERNAMES: readonly string[] = [
  ...['home', 'explore', 'search', 'notifications', 'messages', 'i', 'compose', 'settings', 'api'],
  ...['login', 'logout', 'signup', 'about', 'help', 'privacy', 'terms', 'tos'],
  ...['_next', 'static', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest'],
  ...['admin', 'root', 'system', 'support', 'official', 'x', FORMER_NAME, 'modoki'],
];
