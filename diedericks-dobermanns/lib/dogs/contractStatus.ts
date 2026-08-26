export function contractStatusLabel(args: {
  status: string | null;
  signedByClient: boolean;
} | null): string {
  if (!args) return 'No contract yet';
  if (args.signedByClient || args.status === 'signed' || args.status === 'signed_client' || args.status === 'signed_both') return 'Signed';
  if (args.status === 'draft') return 'Draft';
  if (args.status === 'sent' || args.status === 'viewed') return 'Sent';
  return (args.status ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'No contract yet';
}
