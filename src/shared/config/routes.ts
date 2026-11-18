// Navigation entries (docs/architecture/ui-ux.md 3). Messages come in a later phase, so not listed.
// Paths are typed as Next.js routes here, in one place: most pages arrive in later PBIs, and once
// they exist typedRoutes checks them like any other link.
import type { Route } from 'next';
export type NavKey = 'home' | 'explore' | 'notifications' | 'bookmarks' | 'profile';

export type NavItem = { key: NavKey; label: string; href: Route };

const route = (path: string) => path as Route;

export const LOGIN_PATH = route('/i/flow/login');
export const SIGNUP_PATH = route('/i/flow/signup');
export const COMPOSE_PATH = route('/compose/post');
export const SETTINGS_PATH = route('/settings');

/** The left navigation, top to bottom. `username` is the signed-in user, if any. */
export function navItems(username?: string): NavItem[] {
  return [
    { key: 'home', label: 'ホーム', href: route('/home') },
    { key: 'explore', label: '話題を検索', href: route('/explore') },
    { key: 'notifications', label: '通知', href: route('/notifications') },
    { key: 'bookmarks', label: 'ブックマーク', href: route('/i/bookmarks') },
    { key: 'profile', label: 'プロフィール', href: username ? route(`/${username}`) : LOGIN_PATH },
  ];
}

/** The bottom tab bar under 640px. */
export const tabItems: NavItem[] = [
  { key: 'home', label: 'ホーム', href: route('/home') },
  { key: 'explore', label: '検索', href: route('/explore') },
  { key: 'notifications', label: '通知', href: route('/notifications') },
];
