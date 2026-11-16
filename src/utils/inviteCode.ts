// Unambiguous characters (no 0/O, 1/I) so codes are easy to read out loud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Invite codes are document ids in Firestore, so they need to be hard to guess and collide. */
export function generateInviteCode(length = 6): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return 'NADD-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/**
 * Codes typed or pasted on phones often contain look-alike dashes (en dash, minus sign, ...),
 * stray spaces, or lower-case letters. Map all of that back to the canonical "NADD-XXXXXX".
 */
export function normalizeInviteCode(input: string): string {
  let c = (input || '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\s+/g, '');
  if (/^NADD[A-Z0-9]{4,10}$/.test(c)) c = `NADD-${c.slice(4)}`; // dash missing
  else if (/^[A-Z0-9]{4,10}$/.test(c)) c = `NADD-${c}`; // prefix missing
  return c;
}
