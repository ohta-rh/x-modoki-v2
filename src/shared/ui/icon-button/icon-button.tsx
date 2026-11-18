import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  /** Read aloud as the button's name; an icon-only button must have one (ui-ux.md 10). */
  label: string;
  icon: LucideIcon;
};

export function IconButton({ label, icon: Icon, className, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full text-text transition-colors hover:bg-hover',
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
