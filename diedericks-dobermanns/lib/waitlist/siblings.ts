export function siblingGroupKey(entry: {
  sibling_group_id?: string | null;
  application_id?: string | null;
  id: string;
}): string {
  return entry.sibling_group_id ?? entry.application_id ?? entry.id;
}

export function siblingTotal<T extends { sibling_group_id?: string | null; application_id?: string | null; id: string }>(
  entry: T,
  all: T[],
): number {
  const key = siblingGroupKey(entry);
  return all.filter((e) => siblingGroupKey(e) === key).length;
}

export function dogOfNLabel(requestIndex: number | null | undefined, total: number): string | null {
  if (total <= 1) return null;
  return `Dog ${requestIndex ?? 1} of ${total}`;
}

export function outstandingSiblingCount<
  T extends {
    id: string;
    sibling_group_id?: string | null;
    application_id?: string | null;
    pipeline_stage?: string | null;
    assigned_dog_id?: string | null;
  },
>(entry: T, all: T[]): number {
  const key = siblingGroupKey(entry);
  return all.filter(
    (e) =>
      siblingGroupKey(e) === key &&
      e.id !== entry.id &&
      !e.assigned_dog_id &&
      e.pipeline_stage !== 'withdrawn' &&
      e.pipeline_stage !== 'handover_complete',
  ).length;
}
