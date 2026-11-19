import { useEffect, useRef } from 'react';

/**
 * Whether the person has asked to go elsewhere — a link in this tab, Back — since the form was last
 * sent. A save that ends after that must not move them again: Next.js holds their navigation until
 * the Server Action is done, and a push then would replace where they chose to go (#77). Sending
 * the form starts the watch afresh; a click that opens another tab or window does not count.
 */
export function useMovedAway() {
  const moved = useRef(false);
  useEffect(() => {
    const onSubmit = () => {
      moved.current = false;
    };
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      const elsewhere =
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        link?.getAttribute('target') === '_blank';
      if (link && !elsewhere) moved.current = true;
    };
    const onPopState = () => {
      moved.current = true;
    };
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);
  return moved;
}
