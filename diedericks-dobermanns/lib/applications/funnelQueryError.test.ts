import assert from "node:assert/strict";

import {
  classifyFunnelQueryError,
  funnelQueryErrorOutcome,
} from "./funnelQueryError";

/** Run: npx tsx lib/applications/funnelQueryError.test.ts */

function main() {
  assert.equal(
    classifyFunnelQueryError(
      'relation "application_step_events" does not exist',
    ),
    "missing",
  );
  assert.equal(
    classifyFunnelQueryError("Could not find the table 'public.application_step_events' in the schema cache"),
    "missing",
  );
  assert.equal(classifyFunnelQueryError("42P01 application_step_events"), "missing");

  const denied = funnelQueryErrorOutcome(
    "permission denied for table application_step_events",
  );
  assert.equal(denied.shouldLog, false);
  assert.equal(denied.trackingReady, true);
  assert.equal(classifyFunnelQueryError("42501"), "denied");

  const logged: string[] = [];
  const outcome = funnelQueryErrorOutcome(
    "permission denied for table application_step_events",
  );
  if (outcome.shouldLog) logged.push("would-log");
  assert.deepEqual(logged, []);

  const other = funnelQueryErrorOutcome("connection reset by peer");
  assert.equal(other.shouldLog, true);
  assert.equal(other.trackingReady, true);

  console.log("funnelQueryError.test.ts ok");
}

main();
