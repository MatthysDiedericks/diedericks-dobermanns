/** Owner photo cadence — mirrors website lib/portal/ownerPhotos.ts */

export type OwnerPhotoWindow = {
  windowOpenAt: string | null;
  photosInWindow: number;
  canUpload: boolean;
  nextWindowAt: string | null;
};

export function formatWindowDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ownerPhotoWindowLabel(w: OwnerPhotoWindow): string {
  if (!w.windowOpenAt) {
    return 'Photo updates are not available for this dog yet.';
  }
  const next = formatWindowDate(w.nextWindowAt);
  if (!w.canUpload && w.photosInWindow === 0) {
    return `Your next photo window opens ${next}.`;
  }
  if (!w.canUpload && w.photosInWindow >= 3) {
    return `3 of 3 photos this window · next window opens ${next}`;
  }
  if (!w.canUpload) {
    return `Photo window closed · next window opens ${next}`;
  }
  return `${w.photosInWindow} of 3 photos this window · next window opens ${next}`;
}

export function mapOwnerPhotoWindow(row: {
  window_open_at: string | null;
  photos_in_window: number | null;
  can_upload: boolean | null;
  next_window_at: string | null;
} | null): OwnerPhotoWindow {
  if (!row) {
    return {
      windowOpenAt: null,
      photosInWindow: 0,
      canUpload: false,
      nextWindowAt: null,
    };
  }
  return {
    windowOpenAt: row.window_open_at,
    photosInWindow: row.photos_in_window ?? 0,
    canUpload: Boolean(row.can_upload),
    nextWindowAt: row.next_window_at,
  };
}
