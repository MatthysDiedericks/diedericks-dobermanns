export function pedigreeDisplayName(args: {
  registeredName?: string | null;
  callName?: string | null;
  name: string;
}): string {
  const registered = args.registeredName?.trim() || '';
  const call = args.callName?.trim() || '';
  const name = args.name.trim();
  const primary = registered || name || 'Unknown';
  if (call && call !== primary && call !== registered) {
    return `${primary} (${call})`;
  }
  return primary;
}
