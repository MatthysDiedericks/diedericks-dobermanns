/** Measured 27 Aug 2026: 5,080,469 byte PDF → 6,774,207 byte JSON → 200. */
export const HANDOVER_ATTACH_MAX_PDF_BYTES = 5_200_000;

export function canAttachHandoverPdf(pdfBytes: number): boolean {
  return pdfBytes > 0 && pdfBytes <= HANDOVER_ATTACH_MAX_PDF_BYTES;
}
