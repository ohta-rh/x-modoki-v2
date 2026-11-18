import Image from 'next/image';

type Props = { name: string; src?: string | null; size?: number };

/** A round avatar (docs/architecture/ui-ux.md 4: 40px on the timeline). */
export function Avatar({ name, src, size = 40 }: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        unoptimized
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      // Drawn, not text: a button holding the avatar names the person, not their initial (#31).
      data-initial={Array.from(name)[0]}
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-hover font-bold text-text-muted before:content-[attr(data-initial)]"
    />
  );
}
