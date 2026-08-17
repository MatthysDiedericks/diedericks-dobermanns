/** ID format checks. Flag, never block.
 *  Keep in lockstep with diedericksdobermann-web/src/lib/identity/idNumber.ts */
export const ID_TYPES = ["sa_id", "passport", "other_national_id"] as const;
export type IdType = (typeof ID_TYPES)[number];

export const ID_CHECK_STATUSES = [
  "passed",
  "failed",
  "not_checked",
  "manual_override",
] as const;
export type IdCheckStatus = (typeof ID_CHECK_STATUSES)[number];

export const ID_TYPE_LABELS: Record<IdType, string> = {
  sa_id: "South African ID",
  passport: "Passport",
  other_national_id: "Other national ID",
};

export type SaSex = "female" | "male";
export type SaCitizenship = "citizen" | "permanent_resident";

export interface SaIdParsed {
  dobIso: string;
  sex: SaSex;
  citizenship: SaCitizenship;
}

export interface IdCheckResult {
  ok: boolean;
  status: Exclude<IdCheckStatus, "manual_override">;
  /** Shown to the applicant while they type. Never accusatory. */
  applicantHint: string | null;
  /** Admin wording. Never "verified". */
  adminSummary: string;
  parsed: SaIdParsed | null;
  /** Country vs document type — worth confirming, not a failed check. */
  confirmNote: string | null;
}

const SA_EXPECTED = 13;

export function defaultIdType(country: string | null | undefined): IdType {
  const c = (country ?? "").trim().toLowerCase();
  if (c === "south africa" || c === "za" || c === "rsa") return "sa_id";
  if (c === "namibia" || c === "eswatini" || c === "swaziland") {
    return "other_national_id";
  }
  return "passport";
}

export function normalizeIdNumber(raw: string | null | undefined, type: IdType): string {
  const trimmed = (raw ?? "").trim();
  if (type === "sa_id") return trimmed.replace(/\s+/g, "");
  if (type === "passport") return trimmed.replace(/\s+/g, "").toUpperCase();
  return trimmed.replace(/\s+/g, "");
}

function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function isAlphanumeric(value: string): boolean {
  return /^[A-Z0-9]+$/i.test(value);
}

/** YYMMDD → ISO date, or null if that day does not exist. */
export function saIdDobIso(yymmdd: string, now = new Date()): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  const as20 = 2000 + yy;
  const year = new Date(as20, mm - 1, dd) > now ? 1900 + yy : as20;
  const date = new Date(year, mm - 1, dd);
  if (date.getFullYear() !== year || date.getMonth() !== mm - 1 || date.getDate() !== dd) {
    return null;
  }
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** SA ID check digit: odd-position sum 1–11 + digit-sum of (even digits 2–12 as one number, doubled). */
export function saIdChecksumOk(id13: string): boolean {
  if (!/^\d{13}$/.test(id13)) return false;
  let oddSum = 0;
  for (let i = 0; i < 11; i += 2) oddSum += Number(id13[i]);
  const evenNumber = Number(
    id13[1] + id13[3] + id13[5] + id13[7] + id13[9] + id13[11],
  );
  const evenDigitSum = String(evenNumber * 2)
    .split("")
    .reduce((sum, d) => sum + Number(d), 0);
  const check = (10 - ((oddSum + evenDigitSum) % 10)) % 10;
  return check === Number(id13[12]);
}

export function parseSaId(raw: string | null | undefined): SaIdParsed | null {
  const id = (raw ?? "").replace(/\s+/g, "");
  if (!/^\d{13}$/.test(id)) return null;
  const dobIso = saIdDobIso(id.slice(0, 6));
  if (!dobIso) return null;
  const citizenshipDigit = id[10];
  if (citizenshipDigit !== "0" && citizenshipDigit !== "1") return null;
  if (!saIdChecksumOk(id)) return null;
  const seq = Number(id.slice(6, 10));
  return {
    dobIso,
    sex: seq <= 4999 ? "female" : "male",
    citizenship: citizenshipDigit === "0" ? "citizen" : "permanent_resident",
  };
}

function failed(
  applicantHint: string,
  adminSummary: string,
): IdCheckResult {
  return {
    ok: false,
    status: "failed",
    applicantHint,
    adminSummary,
    parsed: null,
    confirmNote: null,
  };
}

function checkSaId(normalized: string): IdCheckResult {
  const n = digitCount(normalized);
  if (!/^\d+$/.test(normalized) || n !== SA_EXPECTED) {
    const entered = /^\d+$/.test(normalized) ? n : normalized.length;
    return failed(
      `South African ID numbers are 13 digits — you have entered ${entered}.`,
      `ID failed the format check — ${entered} digits, expected 13`,
    );
  }
  const dobIso = saIdDobIso(normalized.slice(0, 6));
  if (!dobIso) {
    return failed(
      "That ID number does not look right. Please check it against your ID book or card.",
      "ID failed the format check — the embedded date is not a real day",
    );
  }
  if (normalized[10] !== "0" && normalized[10] !== "1") {
    return failed(
      "That ID number does not look right. Please check it against your ID book or card.",
      "ID failed the format check — citizenship digit must be 0 or 1",
    );
  }
  if (!saIdChecksumOk(normalized)) {
    return failed(
      "That ID number does not look right. Please check it against your ID book or card.",
      "ID failed the format check — the checksum does not match",
    );
  }
  const parsed = parseSaId(normalized);
  return {
    ok: true,
    status: "passed",
    applicantHint: "Format checks out.",
    adminSummary: "ID format checks out",
    parsed,
    confirmNote: null,
  };
}

function checkPassport(normalized: string): IdCheckResult {
  const len = normalized.length;
  if (len < 6 || len > 12 || !isAlphanumeric(normalized)) {
    return failed(
      "Passport numbers are 6–12 letters or numbers.",
      `ID failed the format check — passport numbers are 6–12 letters or numbers, this is ${len}`,
    );
  }
  return {
    ok: true,
    status: "passed",
    applicantHint: "Format checks out.",
    adminSummary: "ID format checks out",
    parsed: null,
    confirmNote: null,
  };
}

function otherNationalExpectedLength(country: string | null | undefined): number | null {
  const c = (country ?? "").trim().toLowerCase();
  if (c === "namibia") return 11;
  if (c === "eswatini" || c === "swaziland") return 13;
  return null;
}

function checkOtherNationalId(
  normalized: string,
  country: string | null | undefined,
): IdCheckResult {
  const expected = otherNationalExpectedLength(country);
  if (expected != null) {
    const n = digitCount(normalized);
    if (!/^\d+$/.test(normalized) || n !== expected) {
      const entered = /^\d+$/.test(normalized) ? n : normalized.length;
      const label = (country ?? "this country").trim() || "this country";
      return failed(
        `${label} ID numbers are ${expected} digits — you have entered ${entered}.`,
        `ID failed the format check — ${entered} digits, expected ${expected}`,
      );
    }
    return {
      ok: true,
      status: "passed",
      applicantHint: "Format checks out.",
      adminSummary: "ID format checks out",
      parsed: null,
      confirmNote: null,
    };
  }
  const len = normalized.length;
  if (len < 6 || len > 15 || !isAlphanumeric(normalized)) {
    return failed(
      "National ID numbers are 6–15 letters or numbers.",
      `ID failed the format check — expected 6–15 letters or numbers, this is ${len}`,
    );
  }
  return {
    ok: true,
    status: "passed",
    applicantHint: "Format checks out.",
    adminSummary: "ID format checks out",
    parsed: null,
    confirmNote: null,
  };
}

export function checkIdNumber(input: {
  type: IdType | null | undefined;
  number: string | null | undefined;
  country?: string | null;
}): IdCheckResult {
  const type = input.type ?? defaultIdType(input.country);
  const normalized = normalizeIdNumber(input.number, type);
  if (!normalized) {
    return {
      ok: false,
      status: "not_checked",
      applicantHint: null,
      adminSummary: "ID was not checked",
      parsed: null,
      confirmNote: null,
    };
  }
  let result: IdCheckResult;
  if (type === "sa_id") result = checkSaId(normalized);
  else if (type === "passport") result = checkPassport(normalized);
  else result = checkOtherNationalId(normalized, input.country);

  if (
    result.ok &&
    type === "sa_id" &&
    (input.country ?? "").trim() &&
    defaultIdType(input.country) !== "sa_id"
  ) {
    result = {
      ...result,
      confirmNote: `Country is ${input.country!.trim()}; number looks like a South African ID — worth confirming.`,
    };
  }
  return result;
}

/** Live hint while typing. Checksum is only mentioned once 13 digits are present. */
export function liveIdHint(input: {
  type: IdType | null | undefined;
  number: string | null | undefined;
  country?: string | null;
}): string | null {
  const type = input.type ?? defaultIdType(input.country);
  const normalized = normalizeIdNumber(input.number, type);
  if (!normalized) return null;
  if (type === "sa_id" && digitCount(normalized) < SA_EXPECTED) {
    return `South African ID numbers are 13 digits — you have entered ${digitCount(normalized)}.`;
  }
  return checkIdNumber({ type, number: input.number, country: input.country }).applicantHint;
}

export function maskIdNumber(raw: string | null | undefined): string {
  const value = (raw ?? "").replace(/\s+/g, "");
  if (!value) return "—";
  if (/^\d{13}$/.test(value)) {
    return `${value.slice(0, 6)} ${value.slice(6, 10)} ${value.slice(10, 12)}•`;
  }
  if (value.length === 1) return "•";
  return `${value.slice(0, value.length - 1)}•`;
}

/** Infer type for existing rows without changing the stored number. */
export function inferIdType(
  number: string | null | undefined,
  country: string | null | undefined,
): IdType {
  if (parseSaId(number)) return "sa_id";
  return defaultIdType(country);
}
