import { useEffect, useRef } from 'react';

/**
 * Whether the person has asked to go elsewhere — a link, Back — since the screen opened. A save
 * that ends after that must not move them again: Next.js holds their navigation until the Server
 * Action is done, and a push then would replace where they chose to go (#77).
 */
export function useMovedAway() {
  const moved = useRef(false);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href]')) moved.current = true;
    };
    const onPopState = () => {
      moved.current = true;
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);
  return moved;
}
