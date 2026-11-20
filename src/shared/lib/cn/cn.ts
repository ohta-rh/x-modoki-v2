import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The type sizes declared in src/_app/styles/global.css (ui-ux.md 4); without them tailwind-merge
// would read text-body as a text colour and drop it next to text-white.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['body', 'body-lg', 'title'] }] } },
});

/** Joins class names and lets a later Tailwind class win over a conflicting earlier one. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
