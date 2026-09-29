import assert from "node:assert/strict";

import {
  HOLD_REASON_TOO_SHORT,
  buildWaitlistHoldWrite,
  clearedWaitlistHold,
  holdOverridePrompt,
  holdRanksAfterPeer,
  isWaitlistHoldExpired,
  isWaitlistOnHold,
  queuePositionInStage,
  queuePositionLabel,
  waitlistHoldChipLabel,
  waitlistHoldExpiredChipLabel,
} from "./hold";

/** Run: npx tsx lib/waitlist/hold.test.ts */

const today = new Date("2026-09-29T12:00:00");

function standing(id: string, anchor: string, holdUntil?: string) {
  return {
    id,
    pipeline_stage: "deposit_paid",
    queue_anchor_at: anchor,
    created_at: anchor,
    hold_until: holdUntil ?? null,
  };
}

function main() {
  assert.equal(isWaitlistOnHold("2026-12-29", today), true);
  assert.equal(isWaitlistHoldExpired("2026-09-28", today), true);
  assert.equal(waitlistHoldChipLabel("2026-12-29"), "On hold until 29 Dec 2026");
  assert.equal(waitlistHoldExpiredChipLabel("2026-09-28"), "Hold expired 28 Sep");

  const held = standing("alyssa", "2026-01-01T00:00:00.000Z", "2026-12-29");
  const open = standing("open", "2026-06-01T00:00:00.000Z");
  assert.equal(holdRanksAfterPeer(held, open, today), 1);
  assert.equal(queuePositionInStage(held, [held, open]), 1);
  assert.equal(queuePositionLabel(1), "Queue position 1");
  assert.equal(
    holdOverridePrompt(
      { ...held, hold_reason: "Asked to take a puppy at a later stage, not from the current litter." },
      today,
    ),
    "On hold until 29 Dec 2026. Asked to take a puppy at a later stage, not from the current litter. Allocate this puppy anyway?",
  );

  const expired = standing("expired", "2026-01-01T00:00:00.000Z", "2026-09-01");
  assert.equal(holdRanksAfterPeer(expired, open, today), 0);
  assert.equal(holdOverridePrompt({ ...expired, hold_reason: "Was waiting." }, today), null);

  assert.equal(
    buildWaitlistHoldWrite({ reason: "", holdUntil: "2026-12-29", actorId: "u1" }).error,
    HOLD_REASON_TOO_SHORT,
  );
  assert.equal(
    buildWaitlistHoldWrite({ reason: "no", holdUntil: "2026-12-29", actorId: "u1" }).error,
    HOLD_REASON_TOO_SHORT,
  );
  assert.deepEqual(clearedWaitlistHold(), {
    hold_reason: null,
    hold_until: null,
    hold_set_by: null,
    hold_set_at: null,
  });

  console.log("hold.test.ts ok");
}

main();
