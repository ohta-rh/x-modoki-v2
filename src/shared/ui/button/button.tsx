import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

const VARIANTS = {
  brand: 'bg-brand-fill text-on-brand hover:opacity-90',
  solid: 'bg-text text-bg hover:opacity-90',
  outline: 'border border-line bg-transparent text-text hover:bg-hover',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS };

/** A pill button (docs/architecture/ui-ux.md 4: 15px / 700, fully rounded). */
export function Button({ variant = 'solid', type = 'button', className, ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-full px-4 text-body font-bold transition disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
