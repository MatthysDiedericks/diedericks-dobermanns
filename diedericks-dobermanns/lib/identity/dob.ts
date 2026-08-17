/**
 * Historic application dates of birth were free text. Only rewrite a value
 * when exactly one calendar date fits. Guessing is worse than leaving it.
 */

export type HistoricDob =
  | { kind: "iso"; iso: string }
  | { kind: "ambiguous"; raw: string }
  | { kind: "unparseable"; raw: string }
  | { kind: "empty" };

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function validYmd(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type ParsedParts =
  | { kind: "iso"; iso: string }
  | { kind: "ambiguous"; raw: string }
  | { kind: "unparseable"; raw: string };

function fromParts(a: number, b: number, year: number): ParsedParts {
  const dmy = b >= 1 && b <= 12 && a >= 1 && a <= 31 ? validYmd(year, b, a) : null;
  const mdy = a >= 1 && a <= 12 && b >= 1 && b <= 31 ? validYmd(year, a, b) : null;
  if (dmy && mdy && dmy !== mdy) return { kind: "ambiguous", raw: "" };
  const iso = dmy ?? mdy;
  if (!iso) return { kind: "unparseable", raw: "" };
  return { kind: "iso", iso };
}

export function parseHistoricDob(raw: string | null | undefined): HistoricDob {
  if (raw == null || !String(raw).trim()) return { kind: "empty" };
  const value = String(raw).trim();

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const iso = validYmd(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    return iso ? { kind: "iso", iso } : { kind: "unparseable", raw: value };
  }

  const slashed = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (slashed) {
    const result = fromParts(Number(slashed[1]), Number(slashed[2]), Number(slashed[3]));
    return result.kind === "iso" ? result : { ...result, raw: value };
  }

  if (/^\d{8}$/.test(value)) {
    const yFirst = validYmd(Number(value.slice(0, 4)), Number(value.slice(4, 6)), Number(value.slice(6, 8)));
    const dmy = fromParts(Number(value.slice(0, 2)), Number(value.slice(2, 4)), Number(value.slice(4, 8)));
    if (yFirst && dmy.kind === "iso" && yFirst !== dmy.iso) {
      return { kind: "ambiguous", raw: value };
    }
    if (yFirst && (dmy.kind !== "iso" || yFirst === dmy.iso)) return { kind: "iso", iso: yFirst };
    if (dmy.kind === "iso") return dmy;
    return { ...dmy, raw: value };
  }

  if (/^\d{6}$/.test(value)) {
    return { kind: "ambiguous", raw: value };
  }

  return { kind: "unparseable", raw: value };
}

export function formatDobWords(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatDobDisplay(raw: string | null | undefined): string {
  const parsed = parseHistoricDob(raw);
  if (parsed.kind === "iso") return formatDobWords(parsed.iso) ?? parsed.iso;
  if (parsed.kind === "empty") return "—";
  return parsed.raw;
}

export function dobMismatchSentence(
  idDobIso: string | null | undefined,
  formRaw: string | null | undefined,
): string | null {
  if (!idDobIso) return null;
  const form = parseHistoricDob(formRaw);
  const idWords = formatDobWords(idDobIso);
  if (!idWords) return null;
  if (form.kind === "iso") {
    if (form.iso === idDobIso) return null;
    const formWords = formatDobWords(form.iso) ?? form.iso;
    return `ID says ${idWords}, the form says ${formWords}.`;
  }
  if (form.kind === "empty") return null;
  return `ID says ${idWords}, the form says ${form.raw}.`;
}
