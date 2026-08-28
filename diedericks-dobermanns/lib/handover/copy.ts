export function defaultHandoverSubject(puppyName: string): string {
  return `Handover pack — ${puppyName}`;
}

export function defaultHandoverMessage(input: {
  buyerName: string | null;
  puppyName: string;
  portalUrl: string;
}): string {
  const who = input.buyerName?.trim() || 'there';
  return [
    `Dear ${who},`,
    '',
    `Please find ${input.puppyName}'s handover pack. Keep it with the folder you receive at go-home.`,
    '',
    'If this email goes missing, the same pack is in your portal after go-home:',
    input.portalUrl,
    '',
    'Diedericks Dobermanns',
  ].join('\n');
}
