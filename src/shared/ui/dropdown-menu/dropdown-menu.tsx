'use client';
import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type * as Kit from '@/shared/ui/kit/dropdown-menu';

type KitMenu = typeof Kit;

// The menu parts (Base UI) arrive with the first menu someone reaches for, not with every page
// (#32, ADR-0059). Browser only: the server never loads them.
let kit: KitMenu | null = null;
let loading: Promise<KitMenu> | null = null;

function load(): Promise<KitMenu> {
  loading ??= import('@/shared/ui/kit/dropdown-menu').then((module) => (kit = module));
  return loading;
}

type Context = {
  kit: KitMenu | null;
  preload: () => void;
  open: () => void;
  /** The plain button was pressed: the real one presses itself once it is here. */
  pressing: boolean;
  pressed: () => void;
};
const MenuContext = createContext<Context | null>(null);
const useMenu = () => useContext(MenuContext)!;

// Plain children only: a render function would need the menu's state before it is here.
type RootProps = Omit<ComponentProps<KitMenu['DropdownMenu']>, 'children'> & {
  children: ReactNode;
};

/** A menu: a plain button until someone reaches for it, then Base UI's menu, opened. */
export function DropdownMenu({ children, ...props }: RootProps) {
  const [loaded, setLoaded] = useState(kit);
  const [opened, setOpened] = useState(false);
  // Loading on intent only fetches: swapping the button then would drop a keyboard user's focus.
  const preload = () => void load();
  const open = () => {
    setOpened(true);
    void load().then(setLoaded);
  };
  const context = { kit: loaded, preload, open, pressing: opened, pressed: () => setOpened(false) };
  if (!loaded) return <MenuContext.Provider value={context}>{children}</MenuContext.Provider>;
  return (
    <MenuContext.Provider value={context}>
      <loaded.DropdownMenu {...props}>{children}</loaded.DropdownMenu>
    </MenuContext.Provider>
  );
}

type TriggerProps = ComponentProps<KitMenu['DropdownMenuTrigger']> & { className?: string };

/** Until the parts are here: the same button, which loads them on intent and opens on press. */
export function DropdownMenuTrigger({ children, className, ...props }: TriggerProps) {
  const { kit: loaded, preload, open, pressing, pressed } = useMenu();
  const real = useRef<HTMLButtonElement>(null);
  // Opened through the real button, focused first: Base UI then gives focus back to it on close.
  // Opened any other way (defaultOpen), it returned focus elsewhere in the post (#32).
  useEffect(() => {
    if (!pressing || !real.current) return;
    real.current.focus();
    real.current.click();
    pressed();
  });
  if (loaded) {
    return (
      <loaded.DropdownMenuTrigger ref={real} className={className} {...props}>
        {children}
      </loaded.DropdownMenuTrigger>
    );
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open();
  };
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={false}
      className={className}
      {...(props as ComponentProps<'button'>)}
      onPointerEnter={preload}
      onFocus={preload}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      {children as ReactNode}
    </button>
  );
}

/** The popup: nothing until the menu has been opened once. */
export function DropdownMenuContent(props: ComponentProps<KitMenu['DropdownMenuContent']>) {
  const { kit: loaded } = useMenu();
  return loaded ? <loaded.DropdownMenuContent {...props} /> : null;
}

/** An item: only ever rendered inside the popup, so the parts are already here. */
export function DropdownMenuItem(props: ComponentProps<KitMenu['DropdownMenuItem']>) {
  const Item = useMenu().kit!.DropdownMenuItem;
  return <Item {...props} />;
}
