/**
 * Apply-form funnel math. Pure — no IO, no PII.
 * Labels match what the applicant sees on the public form.
 */

export const APPLY_STEP_NAMES = [
  "Personal",
  "Your home",
  "Experience",
  "Puppy",
  "Legal",
  "Review",
] as const;

export type ApplyDevice = "mobile" | "tablet" | "desktop";

export const APPLY_DEVICES: ApplyDevice[] = ["mobile", "tablet", "desktop"];

/** Percentages from fewer than this many people in the form are noise. */
export const FUNNEL_MIN_ENTRIES = 20;

export type DeviceFunnel = {
  submitted: number;
  rows: FunnelRow[];
  tooLittleData: boolean;
  enteredForm: number;
};

export type StepEventRow = {
  submission_id: string;
  step_number: number;
  step_name: string;
  occurred_at: string;
  device: string | null;
  note: string | null;
};

export type FunnelRow = {
  id: string;
  label: string;
  count: number;
  pctOfViews: number | null;
  /** People lost from the previous row. Headline number. */
  dropPct: number | null;
  dropCount: number | null;
  isBiggestDrop: boolean;
};

export type FunnelFeedback = {
  note: string;
  occurredAt: string;
  device: string | null;
};

export type FunnelSnapshot = {
  from: string;
  to: string;
  pageViews: number;
  submitted: number;
  rows: FunnelRow[];
  byDevice: Record<ApplyDevice, DeviceFunnel>;
  biggestDropLabel: string | null;
  feedback: FunnelFeedback[];
  tooLittleData: boolean;
  enteredForm: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function defaultFunnelRange(now = new Date()): { from: string; to: string } {
  const to = toIsoDate(now);
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  return { from: toIsoDate(fromDate), to };
}

export function parseFunnelRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
  now = new Date(),
): { from: string; to: string } {
  const fallback = defaultFunnelRange(now);
  let from = fromRaw && DATE_RE.test(fromRaw) ? fromRaw : fallback.from;
  let to = toRaw && DATE_RE.test(toRaw) ? toRaw : fallback.to;
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to };
}

export function rangeIsoBounds(from: string, to: string): { startIso: string; endExclusiveIso: string } {
  return {
    startIso: `${from}T00:00:00.000Z`,
    endExclusiveIso: `${nextDay(to)}T00:00:00.000Z`,
  };
}

export function deviceFromViewport(width: number): ApplyDevice {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function countStepsByNumber(
  events: StepEventRow[],
  device?: ApplyDevice,
): number[] {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const event of events) {
    if (event.step_number < 1 || event.step_number > 6) continue;
    if (device && event.device !== device) continue;
    counts[event.step_number - 1] += 1;
  }
  return counts;
}

export function feedbackLines(events: StepEventRow[]): FunnelFeedback[] {
  return events
    .filter((e) => e.step_number === 0 && e.step_name === "feedback" && e.note?.trim())
    .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
    .map((e) => ({
      note: e.note!.trim(),
      occurredAt: e.occurred_at,
      device: e.device,
    }));
}

export function submittedByDevice(
  applications: { submission_id: string | null }[],
  events: StepEventRow[],
): Record<ApplyDevice, number> {
  const deviceOf = new Map<string, ApplyDevice>();
  for (const event of events) {
    if (!isApplyDevice(event.device)) continue;
    if (!deviceOf.has(event.submission_id)) {
      deviceOf.set(event.submission_id, event.device);
    }
  }
  const out: Record<ApplyDevice, number> = { mobile: 0, tablet: 0, desktop: 0 };
  for (const app of applications) {
    if (!app.submission_id) continue;
    const device = deviceOf.get(app.submission_id);
    if (device) out[device] += 1;
  }
  return out;
}

export function enteredFormCount(events: StepEventRow[], device?: ApplyDevice): number {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.step_number < 1 || event.step_number > 6) continue;
    if (device && event.device !== device) continue;
    ids.add(event.submission_id);
  }
  return ids.size;
}

export function buildFunnelSnapshot(input: {
  from: string;
  to: string;
  pageViews: number;
  submitted: number;
  events: StepEventRow[];
  applications: { submission_id: string | null }[];
}): FunnelSnapshot {
  const stepCounts = countStepsByNumber(input.events);
  const enteredForm = enteredFormCount(input.events);
  const tooLittleData = enteredForm < FUNNEL_MIN_ENTRIES;
  const rows = maybeSuppress(
    buildFunnelRows({
      leadLabel: "/apply page views",
      leadCount: input.pageViews,
      stepCounts,
      submitted: input.submitted,
      pctBase: input.pageViews,
    }),
    tooLittleData,
  );
  const submittedDevice = submittedByDevice(input.applications, input.events);
  const byDevice = {
    mobile: deviceSlice(input.events, "mobile", submittedDevice.mobile),
    tablet: deviceSlice(input.events, "tablet", submittedDevice.tablet),
    desktop: deviceSlice(input.events, "desktop", submittedDevice.desktop),
  };
  const biggest = tooLittleData ? undefined : rows.find((r) => r.isBiggestDrop);
  return {
    from: input.from,
    to: input.to,
    pageViews: input.pageViews,
    submitted: input.submitted,
    rows,
    byDevice,
    biggestDropLabel: biggest ? `${biggest.label} lost ${formatDrop(biggest)}` : null,
    feedback: feedbackLines(input.events),
    tooLittleData,
    enteredForm,
  };
}

export function emptyFunnelSnapshot(from: string, to: string): FunnelSnapshot {
  return buildFunnelSnapshot({
    from,
    to,
    pageViews: 0,
    submitted: 0,
    events: [],
    applications: [],
  });
}

function deviceSlice(
  events: StepEventRow[],
  device: ApplyDevice,
  submitted: number,
): DeviceFunnel {
  const stepCounts = countStepsByNumber(events, device);
  const leadCount = stepCounts[0] ?? 0;
  const enteredForm = enteredFormCount(events, device);
  const tooLittleData = enteredForm < FUNNEL_MIN_ENTRIES;
  return {
    submitted,
    enteredForm,
    tooLittleData,
    rows: maybeSuppress(
      buildFunnelRows({
        leadLabel: `Step 1 ${APPLY_STEP_NAMES[0]}`,
        leadCount,
        stepCounts: stepCounts.slice(1),
        stepOffset: 2,
        submitted,
        pctBase: leadCount,
        skipLeadAsViews: true,
      }),
      tooLittleData,
    ),
  };
}

function maybeSuppress(rows: FunnelRow[], tooLittleData: boolean): FunnelRow[] {
  if (!tooLittleData) return rows;
  return rows.map((row) => ({
    ...row,
    dropPct: null,
    pctOfViews: null,
    isBiggestDrop: false,
  }));
}

function buildFunnelRows(input: {
  leadLabel: string;
  leadCount: number;
  stepCounts: number[];
  submitted: number;
  pctBase: number;
  stepOffset?: number;
  skipLeadAsViews?: boolean;
}): FunnelRow[] {
  const offset = input.stepOffset ?? 1;
  const stepLabels = input.skipLeadAsViews
    ? input.stepCounts.map((_, i) => `Step ${i + offset} ${APPLY_STEP_NAMES[i + offset - 1]}`)
    : APPLY_STEP_NAMES.map((name, i) => `Step ${i + 1} ${name}`);
  const counts = [input.leadCount, ...input.stepCounts, input.submitted];
  const labels = [input.leadLabel, ...stepLabels, "Submitted"];
  const ids = labels.map((label, i) => `${label}-${i}`);

  const rows: FunnelRow[] = counts.map((count, i) => {
    const prev = i === 0 ? null : counts[i - 1]!;
    const lost = prev == null ? null : dropBetween(prev, count);
    return {
      id: ids[i]!,
      label: labels[i]!,
      count,
      pctOfViews: i === 0 && !input.skipLeadAsViews ? 100 : pct(count, input.pctBase),
      dropPct: lost?.dropPct ?? null,
      dropCount: lost?.dropCount ?? null,
      isBiggestDrop: false,
    };
  });

  let maxDrop = -1;
  let maxIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    const n = rows[i]!.dropCount ?? -1;
    if (n > maxDrop) {
      maxDrop = n;
      maxIdx = i;
    } else if (n === maxDrop && n > 0) {
      const pctNow = rows[i]!.dropPct ?? 0;
      const pctMax = rows[maxIdx]!.dropPct ?? 0;
      if (pctNow > pctMax) maxIdx = i;
    }
  }
  if (maxIdx >= 0 && maxDrop > 0) {
    rows[maxIdx]!.isBiggestDrop = true;
  }
  return rows;
}

function dropBetween(prev: number, curr: number): { dropPct: number; dropCount: number } | null {
  if (prev <= 0) return null;
  const dropCount = Math.max(0, prev - curr);
  return {
    dropCount,
    dropPct: Math.round((dropCount / prev) * 1000) / 10,
  };
}

function pct(n: number, d: number): number | null {
  if (d <= 0) return null;
  return Math.round((n / d) * 1000) / 10;
}

export function formatDrop(row: FunnelRow): string {
  if (row.dropPct == null || row.dropCount == null) return "—";
  return `−${row.dropPct}% (${row.dropCount})`;
}

function isApplyDevice(value: string | null): value is ApplyDevice {
  return value === "mobile" || value === "tablet" || value === "desktop";
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return toIsoDate(d);
}
