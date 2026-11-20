/** Where a post's links are and where they lead, as indices into its text (#32). */
export type PostLink = {
  type: 'url' | 'hashtag' | 'mention';
  start: number;
  end: number;
  href: string;
};

export type PostToken =
  { type: 'text'; value: string } | { type: PostLink['type']; value: string; href: string };
