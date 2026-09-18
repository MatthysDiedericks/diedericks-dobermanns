/**
 * Business rules for recording a litter. The database cannot know that Cait is
 * deceased or that Ade has been sold — those change over time — so the form
 * and the server action both call validateLitter and refuse the same cases.
 *
 * Keep this file identical to the app copy at
 * diedericks-dobermanns/lib/litters/validate.ts.
 */

export type LitterDogRef = {
  id: string;
  name: string;
  sex: string | null;
  status: string | null;
  deceased_at: string | null;
};

export type LitterProblem = {
  field:
    | "name"
    | "status"
    | "mother_id"
    | "father_id"
    | "expected_date"
    | "actual_date"
    | "litter_letter";
  message: string;
};

export type ValidateLitterInput = {
  name?: string | null;
  status: string;
  mother_id?: string | null;
  father_id?: string | null;
  expected_date?: string | null;
  actual_date?: string | null;
  dam?: LitterDogRef | null;
  sire?: LitterDogRef | null;
  /** Off by default. Historical litters from a dam who has since left the programme. */
  includeRetiredAndDeceasedDams?: boolean;
  /**
   * When editing, skip parent-eligibility for a parent that is not being
   * changed — a dam who later dies must not block other edits on that litter.
   */
  existingMotherId?: string | null;
  existingFatherId?: string | null;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const SIRE_STATUSES = new Set(["stud", "keep"]);
const PLANNED_STATUSES = new Set(["planned"]);
const EXPECTED_STATUSES = new Set(["expected"]);
/** Matches litters_status_check. archived is a born litter hidden from working lists. */
const BORN_STATUSES = new Set(["born", "placed", "archived"]);

/** Trim; empty string becomes null. */
export function blank(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function isFemaleSex(sex: string | null | undefined): boolean {
  const value = (sex ?? "").trim().toLowerCase();
  return value === "female" || value === "f";
}

export function isMaleSex(sex: string | null | undefined): boolean {
  const value = (sex ?? "").trim().toLowerCase();
  return value === "male" || value === "m";
}

export function dogIsDeceased(dog: {
  status?: string | null;
  deceased_at?: string | null;
}): boolean {
  return dog.status === "deceased" || Boolean(blank(dog.deceased_at));
}

function dogName(dog: LitterDogRef | null | undefined, fallback: string): string {
  return blank(dog?.name) ?? fallback;
}

function parentChanged(
  nextId: string | null,
  existingId: string | null | undefined,
): boolean {
  if (existingId == null || existingId === "") return true;
  return nextId !== existingId;
}

/**
 * `Dam × Sire – Mon YYYY`. Returns null when a picker or the date is missing
 * so the form can stay invalid until both parents and a date are chosen.
 */
export function generateLitterName(
  damName: string | null | undefined,
  sireName: string | null | undefined,
  date: string | null | undefined,
): string | null {
  const dam = blank(damName);
  const sire = blank(sireName);
  const raw = blank(date);
  if (!dam || !sire || !raw) return null;
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(raw);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `${dam} × ${sire} – ${month} ${match[1]}`;
}

/** Date used in the generated name: birth date if set, otherwise the expected date. */
export function litterNameDate(
  expectedDate: string | null | undefined,
  actualDate: string | null | undefined,
): string | null {
  return blank(actualDate) ?? blank(expectedDate);
}

/** Next unused A–Z letter for a dam; wraps to A if the alphabet is exhausted. */
export function nextLitterLetter(
  used: Array<string | null | undefined>,
): string {
  const taken = new Set(
    used
      .map((letter) => (letter ?? "").trim().toUpperCase())
      .filter((letter) => letter.length === 1),
  );
  for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(65 + i);
    if (!taken.has(letter)) return letter;
  }
  return "A";
}

export function validateLitter(input: ValidateLitterInput): LitterProblem[] {
  const problems: LitterProblem[] = [];
  const name = blank(input.name);
  const status = (input.status ?? "").trim().toLowerCase();
  const motherId = blank(input.mother_id);
  const fatherId = blank(input.father_id);
  const expectedDate = blank(input.expected_date);
  const actualDate = blank(input.actual_date);
  const includeHistorical = Boolean(input.includeRetiredAndDeceasedDams);

  if (!name) {
    problems.push({
      field: "name",
      message:
        "Give this litter a name — it will show as LITTER in the list without one.",
    });
  }

  if (!motherId) {
    problems.push({ field: "mother_id", message: "Pick a dam before saving." });
  }
  if (!fatherId) {
    problems.push({ field: "father_id", message: "Pick a sire before saving." });
  }

  if (PLANNED_STATUSES.has(status) && actualDate) {
    problems.push({
      field: "actual_date",
      message:
        "A planned litter cannot have a birth date. Clear the actual date, or change the status to born.",
    });
  }
  if (EXPECTED_STATUSES.has(status) && actualDate) {
    problems.push({
      field: "actual_date",
      message:
        "An expected litter cannot have a birth date. Clear the actual date, or change the status to born.",
    });
  }
  if (EXPECTED_STATUSES.has(status) && !expectedDate) {
    problems.push({
      field: "expected_date",
      message: "An expected litter needs an expected date.",
    });
  }
  if (BORN_STATUSES.has(status) && !actualDate) {
    problems.push({
      field: "actual_date",
      message: "A born litter needs an actual birth date.",
    });
  }

  if (motherId && parentChanged(motherId, input.existingMotherId)) {
    const dam = input.dam && input.dam.id === motherId ? input.dam : null;
    if (!dam) {
      problems.push({
        field: "mother_id",
        message: "That dam is not in the records.",
      });
    } else {
      const label = dogName(dam, "This dam");
      if (!isFemaleSex(dam.sex)) {
        problems.push({
          field: "mother_id",
          message: `${label} is not a female and cannot be a dam.`,
        });
      }
      if (dogIsDeceased(dam) && !includeHistorical) {
        problems.push({
          field: "mother_id",
          message: `${label} is recorded as deceased and cannot be a dam`,
        });
      } else if (dam.status === "sold") {
        problems.push({
          field: "mother_id",
          message: `${label} is recorded as sold and cannot be a dam.`,
        });
      } else if (dam.status === "retired" && !includeHistorical && !dogIsDeceased(dam)) {
        problems.push({
          field: "mother_id",
          message: `${label} is recorded as retired. Turn on “include retired and deceased dams” if this is a historical litter.`,
        });
      } else if (
        dam.status === "donated" ||
        dam.status === "gifted"
      ) {
        problems.push({
          field: "mother_id",
          message: `${label} has left the kennel and cannot be a dam.`,
        });
      }
    }
  }

  if (fatherId && parentChanged(fatherId, input.existingFatherId)) {
    const sire = input.sire && input.sire.id === fatherId ? input.sire : null;
    if (!sire) {
      problems.push({
        field: "father_id",
        message: "That sire is not in the records.",
      });
    } else {
      const label = dogName(sire, "This sire");
      if (!isMaleSex(sire.sex)) {
        problems.push({
          field: "father_id",
          message: `${label} is not a male and cannot be a sire.`,
        });
      }
      if (dogIsDeceased(sire)) {
        problems.push({
          field: "father_id",
          message: `${label} is recorded as deceased and cannot be a sire.`,
        });
      } else if (sire.status === "sold") {
        problems.push({
          field: "father_id",
          message: `${label} is recorded as sold and cannot be a sire.`,
        });
      } else if (!SIRE_STATUSES.has(sire.status ?? "")) {
        problems.push({
          field: "father_id",
          message: `${label} is not available as a stud.`,
        });
      }
    }
  }

  return problems;
}

export function firstLitterError(problems: LitterProblem[]): string | undefined {
  return problems[0]?.message;
}
