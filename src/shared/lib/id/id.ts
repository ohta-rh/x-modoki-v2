// Time-ordered 64-bit IDs (ADR-0016): 41 bits of milliseconds since EPOCH, then 22 random bits.
const EPOCH = Date.UTC(2026, 0, 1);

type Source = { now?: number; random?: number };

const RANDOM_MASK = 0x3fffff;

function random22(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] & RANDOM_MASK;
}

export function newId({ now = Date.now(), random = random22() }: Source = {}): bigint {
  return (BigInt(now - EPOCH) << 22n) | BigInt(random & RANDOM_MASK);
}

const MAX_ID = (1n << 63n) - 1n;
const ID_TEXT = /^[1-9]\d{0,18}$/;

/** The only form an ID takes outside the data access layer: DTOs, JSON, URLs (ADR-0016). */
export function toIdString(id: bigint): string {
  return id.toString();
}

/** Reads an ID from a URL or request; anything but 1–19 canonical digits up to 2^63 - 1 is null. */
export function parseId(text: string): bigint | null {
  if (!ID_TEXT.test(text)) return null;
  const id = BigInt(text);
  return id <= MAX_ID ? id : null;
}
