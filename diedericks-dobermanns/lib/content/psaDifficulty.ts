/**
 * Why PSA is the hard one. Keep in lockstep with
 * diedericksdobermann-web/src/lib/content/psaDifficulty.ts — edit both, or they drift.
 */

export const PSA_LEAD_HEADLINE =
  "We rate PSA the most difficult protection sport in the world.";

export const PSA_LEAD_BODY =
  "Not because of the exercises. Because of the pressure. PSA is built to find out what a dog actually is — its true character and its nerve profile under conditions no amount of drilling can rehearse. It tests the handler just as hard: whether they can read, hold and work a dog of that calibre when it matters.";

export const PSA_WHY =
  "A PSA dog works through **stick hits**, **gunshots** and deliberate environmental stressors — including running chainsaws. The scenarios change, the surfaces change, the decoys are unfamiliar and they are working against the dog, not with it. A dog that has rehearsed a routine falls apart. A dog with genuine nerve does not.";

/** Always render this immediately above PSA_RANKED_SPORTS. Never show the list without it. */
export const PSA_RANKING_FRAMING =
  "Our view, based on the pressure placed on the dog:";

export const PSA_RANKED_SPORTS = [
  { name: "PSA", detail: "Protection Sports Association" },
  { name: "KNPV", detail: "Dutch police dog programme" },
  { name: "Mondio Ring", detail: null },
  { name: "French Ring", detail: null },
  { name: "Belgian Ring", detail: null },
  { name: "IGP", detail: null },
] as const;

export const PSA_RANKING_CAVEAT =
  "Every one of these is a serious sport and every title in them is earned. This is our assessment of the pressure each places on the dog, not a judgement of the handlers who compete in them.";

/** Hedge stays. Unhedged, one counter-example makes the page look careless. */
export const PSA_RECORD =
  "To our knowledge, **fewer than ten Dobermanns have ever passed PSA's test of courage and gone on to pass trials. Three of them are ours.**";
