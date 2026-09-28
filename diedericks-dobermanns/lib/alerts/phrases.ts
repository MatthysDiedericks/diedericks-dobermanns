export type PhraseKind =
  | "document"
  | "vaccination"
  | "deworming"
  | "contract"
  | "invite"
  | "quote"
  | "payable";

type PhraseItem = {
  kind: PhraseKind;
  label: string;
  context: string | null;
  daysLeft: number;
};

function usesDueWording(kind: PhraseKind): boolean {
  return kind === "vaccination" || kind === "deworming" || kind === "payable";
}

/** "expired 3 days ago" / "expires in 23 days" / "due in 4 days". */
export function duePhrase(item: Pick<PhraseItem, "kind" | "daysLeft">): string {
  if (item.daysLeft < 0) {
    const n = Math.abs(item.daysLeft);
    return n === 1 ? "expired 1 day ago" : `expired ${n} days ago`;
  }
  if (item.daysLeft === 0) return usesDueWording(item.kind) ? "due today" : "expires today";
  const unit = item.daysLeft === 1 ? "day" : "days";
  if (usesDueWording(item.kind)) return `due in ${item.daysLeft} ${unit}`;
  return `expires in ${item.daysLeft} ${unit}`;
}

export function attentionText(item: PhraseItem): string {
  const phrase = duePhrase(item);
  if (item.context && (item.kind === "vaccination" || item.kind === "deworming")) {
    return `${item.context}'s ${item.label} ${phrase}`;
  }
  if (item.context) return `${item.label} · ${item.context} ${phrase}`;
  return `${item.label} ${phrase}`;
}

export function attentionHeadline(count: number): string {
  return count === 1 ? "1 thing needs attention" : `${count} things need attention`;
}
