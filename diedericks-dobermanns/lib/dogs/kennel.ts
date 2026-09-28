/**
 * Which dogs are the kennel's own animals.
 *
 * `ownership_status` cannot answer this — no row is `'kennel'`. That field
 * describes dogs that have left (`with_owner`, `lost_contact`, `returned`, …).
 * `programme_tier` cannot either: most of the kennel has none.
 *
 * The live predicate is `status`. Keep every consumer on `isKennelDog` so the
 * day it is wrong there is one place to fix it.
 *
 * Keep in lockstep with diedericksdobermann-web/src/lib/dogs/kennel.ts.
 */

import { differenceInDays, format, parseISO } from "date-fns";

import { profilePhotoUrl, type ProfilePhotoInput } from "./profilePhoto";
import { summariseProgeny, type ProgenyDogRow } from "./progenySummary";

export const KENNEL_DOG_STATUSES = ["keep", "stud", "in_training", "available"] as const;

export type KennelDogStatus = (typeof KENNEL_DOG_STATUSES)[number];

/** Retired and deceased stay off the default list until the toggle. */
export const KENNEL_ARCHIVE_STATUSES = ["retired", "deceased"] as const;

export const MY_DOGS_STATUSES = [...KENNEL_DOG_STATUSES, ...KENNEL_ARCHIVE_STATUSES] as const;

export type KennelSort = "status" | "name" | "age";

export type KennelGapFlag = "No microchip" | "No photo" | "No papers";

export type KennelHeatCycle = {
  heat_start_date: string;
  is_predicted: boolean;
  predicted_next_heat_date?: string | null;
};

export type KennelDogSource = {
  id: string;
  name: string;
  call_name?: string | null;
  registered_name?: string | null;
  sex?: string | null;
  status?: string | null;
  date_of_birth?: string | null;
  microchip_number?: string | null;
  colour?: string | null;
  collar_colour?: string | null;
  /** Registration papers. A blank number is the "No papers" gap. */
  registration_number?: string | null;
  deceased_at?: string | null;
  outcome_date?: string | null;
  media?: ProfilePhotoInput[] | null;
};

export type KennelPhoto =
  | { kind: "image"; url: string }
  | { kind: "initial"; letter: string };

export type KennelCard = {
  id: string;
  callName: string;
  registeredName: string | null;
  sex: string | null;
  status: string;
  chip: string;
  age: string | null;
  dobLabel: string | null;
  dateOfBirth: string | null;
  microchip: string | null;
  colourLine: string | null;
  photo: KennelPhoto;
  flags: KennelGapFlag[];
  detailLine: string | null;
  archived: boolean;
  archiveLabel: string | null;
  href: string;
};

function statusOf(
  input: { status?: string | null } | string | null | undefined,
): string {
  if (typeof input === "object" && input !== null) return input.status ?? "";
  return input ?? "";
}

/**
 * True for the four statuses that are physically the kennel's dogs.
 * False for sold, deceased, reserved, and everything else.
 */
export function isKennelDog(
  input: { status?: string | null } | string | null | undefined,
): boolean {
  return (KENNEL_DOG_STATUSES as readonly string[]).includes(statusOf(input));
}

export function isKennelArchiveDog(
  input: { status?: string | null } | string | null | undefined,
): boolean {
  return (KENNEL_ARCHIVE_STATUSES as readonly string[]).includes(statusOf(input));
}

/** Default list is kennel dogs only. The toggle adds retired and deceased. */
export function includeOnMyDogs(
  dog: { status?: string | null },
  showArchived: boolean,
): boolean {
  if (isKennelDog(dog)) return true;
  return showArchived && isKennelArchiveDog(dog);
}

export function visibleMyDogs<T extends { archived: boolean }>(
  cards: T[],
  showArchived: boolean,
): T[] {
  if (showArchived) return cards;
  return cards.filter((card) => !card.archived);
}

export function kennelCallName(dog: {
  name: string;
  call_name?: string | null;
}): string {
  const call = dog.call_name?.trim();
  if (call) return call;
  return dog.name.trim();
}

/** Registered name only when it is not the same string as the call name. */
export function kennelRegisteredLine(dog: {
  name: string;
  call_name?: string | null;
  registered_name?: string | null;
}): string | null {
  const registered = dog.registered_name?.trim();
  if (!registered) return null;
  if (registered.toLowerCase() === kennelCallName(dog).toLowerCase()) return null;
  return registered;
}

export function kennelInitial(name: string): string {
  const letter = name.trim().charAt(0).toUpperCase();
  return letter || "?";
}

/**
 * Pinned cover, otherwise the daily rotation, via profilePhoto.
 * No URL means an initial block — never an image with an empty source.
 */
export function kennelPhoto(
  media: ProfilePhotoInput[] | null | undefined,
  name: string,
  now: Date = new Date(),
  dogId?: string,
): KennelPhoto {
  const url = profilePhotoUrl(media, now, dogId);
  if (!url) return { kind: "initial", letter: kennelInitial(name) };
  return { kind: "image", url };
}

/** Profile route. The whole card links here. */
export function kennelCardHref(id: string): string {
  return `/admin/dogs/${id}`;
}

/**
 * One chip for sex and role. Keep females are brood bitches; studs stay Stud.
 */
export function kennelStatusChip(dog: {
  status?: string | null;
  sex?: string | null;
}): string {
  const status = dog.status ?? "";
  const mark = dog.sex === "female" ? "♀" : dog.sex === "male" ? "♂" : "";
  let role = status;
  if (status === "stud") role = "Stud";
  else if (status === "keep") role = dog.sex === "male" ? "Keep" : "Brood";
  else if (status === "in_training") role = "In training";
  else if (status === "available") role = "Available";
  else if (status === "retired") role = "Retired";
  else if (status === "deceased") role = "Deceased";
  return mark ? `${mark} ${role}` : role;
}

/** Short age: `7y 5m`. Under a year is `5m`. */
export function kennelAgeLabel(
  dob: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!dob) return null;
  const birth = parseISO(dob.slice(0, 10));
  if (Number.isNaN(birth.getTime())) return null;
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}m`;
  if (rem === 0) return `${years}y`;
  return `${years}y ${rem}m`;
}

export function kennelDateLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return format(parseISO(value.slice(0, 10)), "d MMM yyyy");
  } catch {
    return null;
  }
}

export function kennelColourLine(dog: {
  colour?: string | null;
  collar_colour?: string | null;
}): string | null {
  const colour = dog.colour?.trim();
  const collar = dog.collar_colour?.trim();
  if (colour && collar) return `${colour} · ${collar} collar`;
  if (colour) return colour;
  if (collar) return `${collar} collar`;
  return null;
}

export function kennelGapFlags(dog: {
  microchip_number?: string | null;
  registration_number?: string | null;
  hasPhoto: boolean;
}): KennelGapFlag[] {
  const flags: KennelGapFlag[] = [];
  if (!dog.microchip_number?.trim()) flags.push("No microchip");
  if (!dog.hasPhoto) flags.push("No photo");
  if (!dog.registration_number?.trim()) flags.push("No papers");
  return flags;
}

function daysAgo(days: number): string | null {
  if (days < 0) return null;
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Last actual heat and days since, plus a predicted next date when one exists.
 * Females with no cycles still get a line so the gap is on the card.
 */
export function kennelHeatLine(
  cycles: KennelHeatCycle[],
  now: Date = new Date(),
): string {
  const actual = cycles
    .filter((cycle) => !cycle.is_predicted && cycle.heat_start_date)
    .sort((a, b) => b.heat_start_date.localeCompare(a.heat_start_date));
  const last = actual[0] ?? null;
  const predictedDates = cycles
    .filter((cycle) => cycle.is_predicted && cycle.heat_start_date)
    .map((cycle) => cycle.heat_start_date.slice(0, 10))
    .sort();
  const nextFromField = last?.predicted_next_heat_date?.slice(0, 10) || null;
  const nextFromCycle = last
    ? predictedDates.find((date) => date > last.heat_start_date.slice(0, 10)) ?? null
    : predictedDates[0] ?? null;
  const next = nextFromField || nextFromCycle;

  if (!last) {
    return next ? `Next heat ${kennelDateLabel(next) ?? next}` : "No heat recorded";
  }

  const start = last.heat_start_date.slice(0, 10);
  const when = kennelDateLabel(start) ?? start;
  let since: number | null = null;
  try {
    since = differenceInDays(now, parseISO(start));
  } catch {
    since = null;
  }
  const ago = since == null ? null : daysAgo(since);
  const head = ago ? `Last heat ${when} · ${ago}` : `Last heat ${when}`;
  if (!next) return head;
  return `${head} · next ${kennelDateLabel(next) ?? next}`;
}

/** `14 pups bred`, from progenySummary. Hidden when there are none. */
export function kennelProgenyLine(pups: ProgenyDogRow[]): string | null {
  const total = summariseProgeny(pups).total;
  if (total <= 0) return null;
  return `${total} ${total === 1 ? "pup" : "pups"} bred`;
}

export function kennelArchiveLabel(dog: {
  status?: string | null;
  deceased_at?: string | null;
  outcome_date?: string | null;
}): string | null {
  if (dog.status === "deceased") {
    const when = kennelDateLabel(dog.deceased_at || dog.outcome_date);
    return when ? `Deceased ${when}` : "Deceased";
  }
  if (dog.status === "retired") {
    const when = kennelDateLabel(dog.outcome_date);
    return when ? `Retired ${when}` : "Retired";
  }
  return null;
}

export function kennelCountLine(dogs: { sex?: string | null }[]): string {
  const females = dogs.filter((dog) => dog.sex === "female").length;
  const males = dogs.filter((dog) => dog.sex === "male").length;
  const dogWord = dogs.length === 1 ? "dog" : "dogs";
  const femaleWord = females === 1 ? "female" : "females";
  const maleWord = males === 1 ? "male" : "males";
  return `${dogs.length} ${dogWord} · ${females} ${femaleWord} · ${males} ${maleWord}`;
}

export function kennelSectionHeading(label: string, count: number): string {
  return `${label} · ${count}`;
}

const STATUS_RANK: Record<string, number> = {
  stud: 0,
  keep: 1,
  in_training: 2,
  available: 3,
  retired: 4,
  deceased: 5,
};

export function sortKennelDogs<
  T extends { callName: string; status: string; dateOfBirth: string | null },
>(dogs: T[], sort: KennelSort): T[] {
  const copy = [...dogs];
  copy.sort((a, b) => {
    if (sort === "name") return a.callName.localeCompare(b.callName);
    if (sort === "age") {
      const ad = a.dateOfBirth ?? "9999-99-99";
      const bd = b.dateOfBirth ?? "9999-99-99";
      const byAge = ad.localeCompare(bd);
      if (byAge !== 0) return byAge;
      return a.callName.localeCompare(b.callName);
    }
    const byStatus = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    return a.callName.localeCompare(b.callName);
  });
  return copy;
}

export function splitBySex<T extends { sex: string | null }>(dogs: T[]): {
  females: T[];
  males: T[];
  other: T[];
} {
  const females: T[] = [];
  const males: T[] = [];
  const other: T[] = [];
  for (const dog of dogs) {
    if (dog.sex === "female") females.push(dog);
    else if (dog.sex === "male") males.push(dog);
    else other.push(dog);
  }
  return { females, males, other };
}

export function toKennelCard(input: {
  dog: KennelDogSource;
  heats?: KennelHeatCycle[];
  progeny?: ProgenyDogRow[];
  now?: Date;
}): KennelCard {
  const { dog } = input;
  const now = input.now ?? new Date();
  const callName = kennelCallName(dog);
  const photo = kennelPhoto(dog.media, callName, now, dog.id);
  const sex = dog.sex ?? null;
  let detailLine: string | null = null;
  if (sex === "female") detailLine = kennelHeatLine(input.heats ?? [], now);
  if (sex === "male") detailLine = kennelProgenyLine(input.progeny ?? []);
  return {
    id: dog.id,
    callName,
    registeredName: kennelRegisteredLine(dog),
    sex,
    status: dog.status ?? "",
    chip: kennelStatusChip(dog),
    age: kennelAgeLabel(dog.date_of_birth, now),
    dobLabel: kennelDateLabel(dog.date_of_birth),
    dateOfBirth: dog.date_of_birth?.slice(0, 10) ?? null,
    microchip: dog.microchip_number?.trim() || null,
    colourLine: kennelColourLine(dog),
    photo,
    flags: kennelGapFlags({
      microchip_number: dog.microchip_number,
      registration_number: dog.registration_number,
      hasPhoto: photo.kind === "image",
    }),
    detailLine,
    archived: isKennelArchiveDog(dog),
    archiveLabel: kennelArchiveLabel(dog),
    href: kennelCardHref(dog.id),
  };
}
