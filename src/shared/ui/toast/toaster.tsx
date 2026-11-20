'use client';
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

type ToastOptions = { title: string; description?: ReactNode };
type Kit = {
  toast: { add: (options: ToastOptions) => unknown };
  Toaster: ComponentType<{ children?: ReactNode }>;
};

// Toasts added before the kit is here wait in this queue (browser only: no server ever adds one).
const waiting: ToastOptions[] = [];
const listeners = new Set<() => void>();
let kit: Kit | null = null;

/**
 * Shows a short message at the bottom of the screen (ui-ux.md 7). The toast parts are loaded with
 * the first message, not with every page (#32).
 */
export const toast = {
  add(options: ToastOptions) {
    if (kit) {
      kit.toast.add(options);
      return;
    }
    waiting.push(options);
    for (const listener of listeners) listener();
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Where toasts appear. Its parts load when the browser is idle after the page is drawn, or with the
 * first toast if that comes sooner: the region is then in the page before its first message, which
 * screen readers need to announce it (#64), and it is not in the page's first JavaScript (#32).
 */
export function Toaster() {
  const pending = useSyncExternalStore(
    subscribe,
    () => waiting.length > 0,
    () => false,
  );
  const [loaded, setLoaded] = useState<Kit | null>(kit);
  useEffect(() => {
    if (loaded) return;
    const load = () => void import('@/shared/ui/kit/toast').then((module) => setLoaded(module));
    if (pending) load();
    else if ('requestIdleCallback' in window) window.requestIdleCallback(load);
    else setTimeout(load, 0);
  }, [pending, loaded]);
  useEffect(() => {
    if (!loaded) return;
    kit = loaded;
    for (const options of waiting.splice(0)) loaded.toast.add(options);
  }, [loaded]);
  return loaded ? <loaded.Toaster /> : null;
}
