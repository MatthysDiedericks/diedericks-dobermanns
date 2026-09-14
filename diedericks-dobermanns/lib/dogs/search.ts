/**
 * One dog matcher for every search box. Colour and sex are first-class —
 * typing "black" or "female" is how staff actually look for a pup.
 *
 * Directory search (groupDogSearch) then layers intent: microchip, birth year,
 * dam/sire offspring, litter, buyer. Pickers use matchDogs / dogsMatching.
 */

export const DOG_SEARCH_PLACEHOLDER =
  "Search names, microchips, litters, sires, dams, owners and birth years…";

export const DOG_SEARCH_HINT =
  "Searching names, microchips, litters, sires, dams, owners and birth years.";

export const DOG_SEARCH_DEBOUNCE_MS = 250;

export type DogSearchReason =
  | "name"
  | "call_name"
  | "registered_name"
  | "colour"
  | "sex"
  | "collar"
  | "litter"
  | "microchip"
  | "registration"
  | "year"
  | "dam"
  | "sire"
  | "buyer"
  | "status";

export type DogSearchable = {
  id: string;
  name: string;
  call_name?: string | null;
  registered_name?: string | null;
  sex?: string | null;
  colour?: string | null;
  collar_colour?: string | null;
  status?: string | null;
  microchip_number?: string | null;
  registration_number?: string | null;
  date_of_birth?: string | null;
  litter_id?: string | null;
  litter_name?: string | null;
  /** DogPicker historically used camelCase. */
  litterName?: string | null;
  litter_letter?: string | null;
  litter_date?: string | null;
  father_id?: string | null;
  mother_id?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  buyer_name?: string | null;
  new_owner_name?: string | null;
  reserved_for_name?: string | null;
  birth_order?: number | null;
  deceased_at?: string | null;
  document_count?: number | null;
  buyer_contact_id?: string | null;
  owner_contact_id?: string | null;
};

export type DogSearchHit<T extends DogSearchable = DogSearchable> = {
  dog: T;
  reasons: DogSearchReason[];
};

export type DogSearchGroupKind =
  | "microchip"
  | "year"
  | "dam"
  | "sire"
  | "litter"
  | "buyer"
  | "name";

export type DogSearchLitterBucket<T extends DogSearchable = DogSearchable> = {
  litterId: string | null;
  label: string;
  date: string | null;
  damName: string;
  sireName: string;
  puppies: T[];
};

export type DogSearchGroup<T extends DogSearchable = DogSearchable> = {
  kind: DogSearchGroupKind;
  heading: string;
  dogs: T[];
  litters: DogSearchLitterBucket<T>[];
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function includesQ(haystack: string | null | undefined, q: string): boolean {
  if (!q) return true;
  return norm(haystack).includes(q);
}

export function microchipDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isMicrochipQuery(query: string): boolean {
  return microchipDigits(query).length === 15;
}

export function isYearQuery(query: string): number | null {
  const t = query.trim();
  if (!/^\d{4}$/.test(t)) return null;
  const year = Number(t);
  if (year < 1990 || year > 2030) return null;
  return year;
}

function litterNameOf(dog: DogSearchable): string {
  return dog.litter_name || dog.litterName || "";
}

function ownerNames(dog: DogSearchable): string[] {
  return [dog.buyer_name, dog.new_owner_name, dog.reserved_for_name].filter(
    (n): n is string => Boolean(n?.trim()),
  );
}

function colourHaystack(colour: string | null | undefined): string {
  if (!colour) return "";
  const raw = colour.toLowerCase();
  const spaced = raw.replace(/_/g, " ");
  const ampersand = spaced.replace(" tan", " & tan");
  return `${raw} ${spaced} ${ampersand}`;
}

function collarHaystack(collar: string | null | undefined): string {
  if (!collar || collar === "none") return "";
  return collar.replace(/_/g, " ");
}

function sexMatches(sex: string | null | undefined, q: string): boolean {
  const s = norm(sex);
  if (!s) return false;
  if (s.includes(q)) return true;
  const female =
    q === "f" ||
    q === "female" ||
    q === "bitch" ||
    q.startsWith("female") ||
    q === "females";
  const male =
    q === "m" ||
    q === "male" ||
    q === "stud" ||
    q.startsWith("male") ||
    q === "males";
  if (female && (s.startsWith("f") || s === "bitch")) return true;
  if (male && (s.startsWith("m") || s === "stud")) return true;
  return false;
}

function birthYear(dog: DogSearchable): number | null {
  if (!dog.date_of_birth) return null;
  const y = Number(dog.date_of_birth.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

export function displayDogName(dog: Pick<DogSearchable, "name" | "call_name">): string {
  return dog.call_name?.trim() || dog.name;
}

/**
 * Reasons a single dog matches a query. Empty query → empty reasons (caller
 * treats that as "show everything").
 */
export function matchReasons(dog: DogSearchable, query: string): DogSearchReason[] {
  const raw = query.trim();
  if (!raw) return [];
  const q = raw.toLowerCase();
  const reasons: DogSearchReason[] = [];

  if (isMicrochipQuery(raw)) {
    const digits = microchipDigits(raw);
    if (microchipDigits(dog.microchip_number) === digits) reasons.push("microchip");
    return reasons;
  }

  const year = isYearQuery(raw);
  if (year != null) {
    if (birthYear(dog) === year) reasons.push("year");
    return reasons;
  }

  if (includesQ(dog.name, q)) reasons.push("name");
  if (dog.call_name && includesQ(dog.call_name, q) && !reasons.includes("name")) {
    reasons.push("call_name");
  }
  if (dog.registered_name && includesQ(dog.registered_name, q)) {
    reasons.push("registered_name");
  }
  if (colourHaystack(dog.colour).includes(q)) reasons.push("colour");
  if (sexMatches(dog.sex, q)) reasons.push("sex");
  if (collarHaystack(dog.collar_colour).includes(q)) reasons.push("collar");
  if (
    includesQ(litterNameOf(dog), q) ||
    (dog.litter_letter && norm(dog.litter_letter) === q) ||
    (dog.litter_letter && `litter ${norm(dog.litter_letter)}` === q)
  ) {
    reasons.push("litter");
  }
  if (dog.microchip_number && microchipDigits(dog.microchip_number).includes(microchipDigits(raw) || q)) {
    if (microchipDigits(raw).length >= 4) reasons.push("microchip");
  }
  if (includesQ(dog.registration_number, q)) reasons.push("registration");
  if (ownerNames(dog).some((n) => includesQ(n, q))) reasons.push("buyer");
  if (dog.status && includesQ(dog.status.replace(/_/g, " "), q)) reasons.push("status");

  return reasons;
}

export function matchDogs<T extends DogSearchable>(dogs: T[], query: string): DogSearchHit<T>[] {
  const q = query.trim();
  if (!q) return dogs.map((dog) => ({ dog, reasons: [] }));
  const hits: DogSearchHit<T>[] = [];
  for (const dog of dogs) {
    const reasons = matchReasons(dog, q);
    if (reasons.length) hits.push({ dog, reasons });
  }
  return hits;
}

/** Convenience for pickers that only need the matching rows. */
export function dogsMatching<T extends DogSearchable>(dogs: T[], query: string): T[] {
  return matchDogs(dogs, query).map((h) => h.dog);
}

export function matchesDogSearch<T extends DogSearchable>(dog: T, query: string): boolean {
  if (!query.trim()) return true;
  return matchReasons(dog, query).length > 0;
}

export function noDogMatchLine(query: string): string {
  return `Nothing matches '${query}'. ${DOG_SEARCH_HINT}`;
}

function nameKey(dog: DogSearchable): string {
  return norm(displayDogName(dog));
}

function personMatchesName(dog: DogSearchable, q: string): boolean {
  return (
    includesQ(dog.name, q) ||
    includesQ(dog.call_name, q) ||
    includesQ(dog.registered_name, q)
  );
}

function namesById<T extends DogSearchable>(dogs: T[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const d of dogs) map.set(d.id, displayDogName(d));
  return map;
}

export function shortMonthYear(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function sortPuppies<T extends DogSearchable>(puppies: T[]): T[] {
  return [...puppies].sort((a, b) => {
    const ao = a.birth_order ?? 9999;
    const bo = b.birth_order ?? 9999;
    if (ao !== bo) return ao - bo;
    return displayDogName(a).localeCompare(displayDogName(b));
  });
}

function bucketLitters<T extends DogSearchable>(
  puppies: T[],
  names: Map<string, string>,
): DogSearchLitterBucket<T>[] {
  const byLitter = new Map<string, T[]>();
  const ungrouped: T[] = [];
  for (const p of puppies) {
    if (!p.litter_id) {
      ungrouped.push(p);
      continue;
    }
    const list = byLitter.get(p.litter_id) ?? [];
    list.push(p);
    byLitter.set(p.litter_id, list);
  }

  const buckets: DogSearchLitterBucket<T>[] = [];
  for (const [litterId, list] of byLitter) {
    const sample = list[0]!;
    const dam =
      sample.mother_name?.trim() ||
      (sample.mother_id ? names.get(sample.mother_id) : null) ||
      "Unknown dam";
    const sire =
      sample.father_name?.trim() ||
      (sample.father_id ? names.get(sample.father_id) : null) ||
      "Unknown sire";
    const letter = sample.litter_letter?.trim();
    const litterName = litterNameOf(sample).trim();
    const label = letter ? `litter ${letter}` : litterName || "Litter";
    buckets.push({
      litterId,
      label,
      date: sample.litter_date || sample.date_of_birth || null,
      damName: dam,
      sireName: sire,
      puppies: sortPuppies(list),
    });
  }
  buckets.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  if (ungrouped.length) {
    buckets.push({
      litterId: null,
      label: "Ungrouped",
      date: null,
      damName: ungrouped[0]?.mother_name || "Unknown dam",
      sireName: ungrouped[0]?.father_name || "Unknown sire",
      puppies: sortPuppies(ungrouped),
    });
  }
  return buckets;
}

function litterLine<T extends DogSearchable>(bucket: DogSearchLitterBucket<T>): string {
  const when = shortMonthYear(bucket.date);
  const pair = `${bucket.damName} × ${bucket.sireName}`;
  const count = `${bucket.puppies.length} ${bucket.puppies.length === 1 ? "puppy" : "puppies"}`;
  return when ? `${pair}, ${when} · ${count}` : `${pair} · ${count}`;
}

function uniqueLitters<T extends DogSearchable>(dogs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const d of dogs) {
    if (!d.litter_id) continue;
    const list = map.get(d.litter_id) ?? [];
    list.push(d);
    map.set(d.litter_id, list);
  }
  return map;
}

function litterMatchesQuery<T extends DogSearchable>(sample: T, q: string): boolean {
  const letter = norm(sample.litter_letter);
  if (letter && (letter === q || `litter ${letter}` === q)) return true;
  const name = norm(litterNameOf(sample));
  if (name && name.includes(q)) return true;
  return false;
}

/**
 * Directory search: interpret the query and group hits by why they matched.
 * Pickers should keep using matchDogs — this is the "one field that decides".
 */
export function groupDogSearch<T extends DogSearchable>(
  dogs: T[],
  query: string,
): DogSearchGroup<T>[] {
  const raw = query.trim();
  if (!raw) return [];
  const q = raw.toLowerCase();
  const names = namesById(dogs);
  const groups: DogSearchGroup<T>[] = [];

  if (isMicrochipQuery(raw)) {
    const hits = dogsMatching(dogs, raw);
    groups.push({
      kind: "microchip",
      heading: hits.length
        ? `MICROCHIP · ${microchipDigits(raw)}`
        : `MICROCHIP · ${microchipDigits(raw)} — no dog`,
      dogs: hits,
      litters: [],
    });
    return groups;
  }

  const year = isYearQuery(raw);
  if (year != null) {
    const hits = dogsMatching(dogs, raw);
    groups.push({
      kind: "year",
      heading: `BORN IN ${year} — ${hits.length} ${hits.length === 1 ? "dog" : "dogs"}`,
      dogs: hits,
      litters: [],
    });
    return groups;
  }

  const byId = new Map(dogs.map((d) => [d.id, d]));

  const matchingDams = dogs.filter((d) => personMatchesName(d, q));
  for (const dam of matchingDams) {
    const offspring = dogs.filter((p) => p.mother_id === dam.id && p.id !== dam.id);
    if (!offspring.length) continue;
    const litters = bucketLitters(offspring, names);
    groups.push({
      kind: "dam",
      heading: `DAM · ${displayDogName(dam)} — ${offspring.length} offspring across ${litters.length} ${
        litters.length === 1 ? "litter" : "litters"
      }`,
      dogs: [],
      litters,
    });
  }

  const matchingSires = dogs.filter((d) => personMatchesName(d, q));
  for (const sire of matchingSires) {
    const offspring = dogs.filter((p) => p.father_id === sire.id && p.id !== sire.id);
    if (!offspring.length) continue;
    const litters = bucketLitters(offspring, names);
    groups.push({
      kind: "sire",
      heading: `SIRE · ${displayDogName(sire)} — ${offspring.length} offspring across ${litters.length} ${
        litters.length === 1 ? "litter" : "litters"
      }`,
      dogs: [],
      litters,
    });
  }

  const seenLitter = new Set<string>();
  for (const [litterId, list] of uniqueLitters(dogs)) {
    const sample = list[0]!;
    if (!litterMatchesQuery(sample, q)) continue;
    if (seenLitter.has(litterId)) continue;
    seenLitter.add(litterId);
    const litters = bucketLitters(list, names);
    const bucket = litters[0];
    if (!bucket) continue;
    groups.push({
      kind: "litter",
      heading: `LITTER · ${bucket.damName} × ${bucket.sireName}${
        bucket.date ? `, ${shortMonthYear(bucket.date)}` : ""
      }${sample.litter_letter ? ` · litter ${sample.litter_letter}` : ""}`,
      dogs: [],
      litters,
    });
  }

  const buyerBuckets = new Map<string, T[]>();
  for (const dog of dogs) {
    for (const owner of ownerNames(dog)) {
      if (!includesQ(owner, q)) continue;
      const key = owner.trim();
      const list = buyerBuckets.get(key) ?? [];
      if (!list.some((d) => d.id === dog.id)) list.push(dog);
      buyerBuckets.set(key, list);
    }
  }
  for (const [owner, list] of buyerBuckets) {
    groups.push({
      kind: "buyer",
      heading: `OWNER · ${owner} — ${list.length} ${list.length === 1 ? "dog" : "dogs"}`,
      dogs: list,
      litters: [],
    });
  }

  const named = dogs.filter((d) => {
    const reasons = matchReasons(d, raw);
    return reasons.some((r) =>
      r === "name" ||
      r === "call_name" ||
      r === "registered_name" ||
      r === "colour" ||
      r === "sex" ||
      r === "collar" ||
      r === "registration" ||
      r === "microchip" ||
      r === "status",
    );
  });
  if (named.length) {
    const quoted = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw;
    groups.push({
      kind: "name",
      heading: `DOGS NAMED “${quoted}”`,
      dogs: named,
      litters: [],
    });
  }

  void byId;
  return groups;
}

export function litterBucketLine<T extends DogSearchable>(
  bucket: DogSearchLitterBucket<T>,
): string {
  return litterLine(bucket);
}

export function nameKeyOf(dog: DogSearchable): string {
  return nameKey(dog);
}
