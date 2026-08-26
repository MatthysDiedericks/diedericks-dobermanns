export function clientUploadStatusLine(row: {
  review_status: string | null;
  review_note: string | null;
}): string {
  if (row.review_status === 'verified' || row.review_status === 'cleared') {
    return 'Confirmed by Diedericks Dobermanns';
  }
  if (row.review_status === 'rejected') {
    return row.review_note?.trim() || 'A clearer copy is needed — please upload again.';
  }
  return 'Sent to Diedericks Dobermanns — awaiting confirmation';
}
