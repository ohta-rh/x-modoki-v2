/**
 * What a person typed, as it is stored and searched: without U+0000 (PostgreSQL's text refuses it,
 * #89), in NFC (a word typed with combining marks finds the same word, #66), and without spaces or
 * line breaks around it (#67). Every place that takes typed text uses this one function.
 */
export function cleanText(value: string): string {
  return value.replaceAll('\u0000', '').normalize('NFC').trim();
}
