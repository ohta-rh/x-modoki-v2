import Link from 'next/link';
import type { Route } from 'next';
import { tokenizePost } from '@/shared/lib/text';

const linkClass = 'text-brand hover:underline';

/** A post's body: plain text that React escapes, with http(s) URLs, #tags and @names as links. */
export function PostText({ text }: { text: string }) {
  return (
    <p className="text-body break-words whitespace-pre-wrap">
      {tokenizePost(text).map((token, index) => {
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
