import assert from 'node:assert/strict';

import { parseTitlesHealth } from './parseTitlesHealth';

/** Proves the app imports the shared parser. Run: npx tsx lib/pedigree/parseTitlesHealth.test.ts */

const EXAMPLES = [
  'IPO-1 BH',
  'IPO 1, ZTP 1A HD-A1',
  'HD-1 CARDIO FREE',
  'HDB1-B1',
  'HD00, ED00',
  'HDA2-B1',
  'CH ZTP/V-1A HD00, ED00',
  'INTCH CH-RKF RUS-RD GEO-SERB BG BY LT RUS-G HDA IPO 1',
  'JCHSRB CHSRB CAC HD-B',
  'ZTP 1A, HD-A CHRKF CHHUN CHLUX 7CABCIB',
  'World Winner',
  'OFA24G hips (Good), OFEL24 elbows · AKC WS48960801 (MEX) · DNA V751611',
  'RN DJ CGC TKN · OFA24F hips, OFEL24 elbows, EYE76',
];

function main() {
  assert.equal(EXAMPLES.length, 13);
  for (const example of EXAMPLES) {
    const parsed = parseTitlesHealth(example);
    assert.equal(parsed.original, example, `verbatim: ${example}`);
  }
  const unknown = parseTitlesHealth('FOOBAR XYZ-99');
  assert.equal(unknown.original, 'FOOBAR XYZ-99');
  assert.equal(unknown.flags.workingTitle, false);
  assert.equal(unknown.flags.champion, false);
  assert.equal(parseTitlesHealth('CHIC').flags.champion, false);
  assert.equal(parseTitlesHealth('CHIC').flags.cardiacCleared, true);
  console.log('parseTitlesHealth.test.ts (app re-export) ok');
}

main();
