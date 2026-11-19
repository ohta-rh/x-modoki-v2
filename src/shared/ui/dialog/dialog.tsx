'use client';
import { type ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import type * as Kit from '@/shared/ui/kit/dialog';

type KitDialog = typeof Kit;

// The dialog parts (Base UI) arrive with the first dialog that opens, not with every page (#32,
// ADR-0059). Browser only: a dialog open on the server uses the kit itself.
let kit: KitDialog | null = null;

const DialogContext = createContext<KitDialog | null>(null);
const useKit = () => useContext(DialogContext)!;

type RootProps = ComponentProps<KitDialog['Dialog']> & { open: boolean };

/**
 * A dialog opened by its `open` prop: nothing until it first opens, then Base UI's dialog. Once
 * here it stays mounted, so closing animates as before.
 */
export function Dialog(props: RootProps) {
  const [loaded, setLoaded] = useState(kit);
  useEffect(() => {
    if (!props.open || loaded) return;
    void import('@/shared/ui/kit/dialog').then((module) => setLoaded((kit = module)));
  }, [props.open, loaded]);
  if (!loaded) return null;
  return (
    <DialogContext.Provider value={loaded}>
      <loaded.Dialog {...props} />
    </DialogContext.Provider>
  );
}

export function DialogContent(props: ComponentProps<KitDialog['DialogContent']>) {
  const Content = useKit().DialogContent;
  return <Content {...props} />;
}

export function DialogTitle(props: ComponentProps<KitDialog['DialogTitle']>) {
  const Title = useKit().DialogTitle;
  return <Title {...props} />;
}

export function DialogDescription(props: ComponentProps<KitDialog['DialogDescription']>) {
  const Description = useKit().DialogDescription;
  return <Description {...props} />;
}
