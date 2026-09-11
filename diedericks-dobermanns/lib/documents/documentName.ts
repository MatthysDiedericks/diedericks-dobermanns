/** Names that bury a file instead of filing it. */

export const MEANINGLESS_DOCUMENT_NAME_MESSAGE =
  "Give this document a name you would recognise in a year: 'Cleopatra — hip and elbow score' rather than 'doc0786…'.";

export function stemOfFilename(name: string): string {
  return name.trim().replace(/\.[a-z0-9]+$/i, '');
}

export function isMeaninglessDocumentName(name: string | null | undefined): boolean {
  const raw = (name ?? '').trim();
  if (!raw) return true;
  const stem = stemOfFilename(raw);
  if (!stem) return true;
  if (/^\d+$/.test(stem)) return true;
  if (/^doc07/i.test(stem)) return true;
  if (/^doc\d{6,}/i.test(stem)) return true;
  if (/^dog_attachment/i.test(stem)) return true;
  if (/^img[_-]?\d+/i.test(stem)) return true;
  if (/to be labelled/i.test(stem)) return true;
  return false;
}

export function suggestedDocumentName(dogName: string, categoryLabel: string): string {
  const dog = dogName.trim() || 'Dog';
  const cat = categoryLabel.trim() || 'document';
  return `${dog} — ${cat}`;
}
