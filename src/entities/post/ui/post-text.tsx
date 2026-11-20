import Link from 'next/link';
import type { Route } from 'next';
import { type PostLink, splitText } from '@/shared/lib/text';

const linkClass = 'text-brand hover:underline';

type Props = { text: string; links: PostLink[]; size?: 'md' | 'lg' };

/**
 * A post's body: plain text that React escapes, with the http(s) URLs, #tags and @names the server
 * found (`links`) as links. The browser does not parse the text itself (#32).
 */
export function PostText({ text, links, size = 'md' }: Props) {
  return (
    <p
      className={`${size === 'lg' ? 'text-body-lg' : 'text-body'} break-words whitespace-pre-wrap`}
    >
      {splitText(text, links).map((token, index) => {
        if (token.type === 'text') return token.value;
        if (token.type === 'url') {
          return (
            <a
              key={index}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={linkClass}
            >
              {token.value}
            </a>
          );
        }
        return (
          <Link key={index} href={token.href as Route} className={linkClass}>
            {token.value}
          </Link>
        );
      })}
    </p>
  );
}
