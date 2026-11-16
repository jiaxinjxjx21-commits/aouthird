import assert from 'node:assert/strict';
import { generateInviteCode, normalizeInviteCode } from '../src/utils/inviteCode';

// 1) The exact code from the screenshot uses an EN DASH (U+2013); it must map to the real code.
assert.equal(normalizeInviteCode('NADD\u2013XUESYY'), 'NADD-XUESYY');
// other dash look-alikes, case, spaces, missing dash / prefix
for (const v of ['nadd-xuesyy', ' NADD - XUESYY ', 'NADD\u2014XUESYY', 'NADD\u2212XUESYY', 'NADDXUESYY', 'xuesyy', 'NADD‑XUESYY'])
  assert.equal(normalizeInviteCode(v), 'NADD-XUESYY', v);

// 2) Generated room codes always look like NADD-XXXXXX and survive normalization unchanged
const seen = new Set<string>();
for (let i = 0; i < 2000; i++) {
  const c = generateInviteCode();
  assert.match(c, /^NADD-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(normalizeInviteCode(c), c);
  seen.add(c);
}
assert.ok(seen.size > 1990, 'codes should be effectively unique');
console.log('inviteCode tests passed (' + seen.size + ' unique codes)');
