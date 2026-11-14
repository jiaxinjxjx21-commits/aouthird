// Unambiguous characters (no 0/O, 1/I) so codes are easy to read out loud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Invite codes are document ids in Firestore, so they need to be hard to guess and collide. */
export function generateInviteCode(length = 6): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return 'NADD-' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
