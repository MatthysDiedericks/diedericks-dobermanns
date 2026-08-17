import assert from "node:assert/strict";

import { parseHistoricDob } from "./dob";
import {
  checkIdNumber,
  liveIdHint,
  maskIdNumber,
  parseSaId,
  saIdChecksumOk,
} from "./idNumber";

/** Run: npx tsx src/lib/identity/idNumber.test.ts */

const VALID_SA = "8306030160082";

function main() {
  assert.equal(saIdChecksumOk(VALID_SA), true);
  assert.equal(saIdChecksumOk("8306030160083"), false);
  assert.equal(parseSaId(VALID_SA)?.dobIso, "1983-06-03");
  assert.equal(parseSaId(VALID_SA)?.sex, "female");

  const pass = checkIdNumber({ type: "sa_id", number: VALID_SA, country: "South Africa" });
  assert.equal(pass.status, "passed");
  assert.equal(pass.adminSummary, "ID format checks out");
  assert.equal(pass.ok, true);

  const nine = checkIdNumber({ type: "sa_id", number: "982927801", country: "South Africa" });
  assert.equal(nine.status, "failed");
  assert.match(nine.adminSummary, /9 digits, expected 13/);
  assert.match(nine.applicantHint ?? "", /13 digits — you have entered 9/);

  const flipped = VALID_SA.slice(0, 12) + (VALID_SA[12] === "2" ? "3" : "2");
  const checksumFail = checkIdNumber({ type: "sa_id", number: flipped });
  assert.equal(checksumFail.status, "failed");
  assert.match(checksumFail.applicantHint ?? "", /does not look right/);

  const namibia = checkIdNumber({
    type: "other_national_id",
    number: "73040500236",
    country: "Namibia",
  });
  assert.equal(namibia.status, "passed");

  const malawiSa = checkIdNumber({
    type: "sa_id",
    number: "7903185138086",
    country: "Malawi",
  });
  assert.equal(malawiSa.status, "passed");
  assert.match(malawiSa.confirmNote ?? "", /worth confirming/);

  const forcedPassport = checkIdNumber({
    type: "passport",
    number: "7903185138086",
    country: "Malawi",
  });
  assert.equal(forcedPassport.status, "failed");

  const live = liveIdHint({ type: "sa_id", number: "982927801" });
  assert.match(live ?? "", /you have entered 9/);

  assert.equal(maskIdNumber(VALID_SA), "830603 0160 08•");

  const slashMdy = parseHistoricDob("06/16/1973");
  assert.equal(slashMdy.kind, "iso");
  if (slashMdy.kind === "iso") assert.equal(slashMdy.iso, "1973-06-16");
  const slashDmy = parseHistoricDob("27/10/2000");
  assert.equal(slashDmy.kind, "iso");
  if (slashDmy.kind === "iso") assert.equal(slashDmy.iso, "2000-10-27");
  assert.equal(parseHistoricDob("020103").kind, "ambiguous");
  assert.equal(parseHistoricDob("03061983").kind, "ambiguous");
  const iso = parseHistoricDob("1983-06-03");
  assert.equal(iso.kind, "iso");
  if (iso.kind === "iso") assert.equal(iso.iso, "1983-06-03");

  console.log("idNumber.test.ts: ok");
}

main();
