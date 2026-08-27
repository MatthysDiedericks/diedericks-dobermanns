import assert from 'node:assert/strict';

import { pickProfilePhoto, profilePhotoUrl } from './profilePhoto';

/** Run: npx tsx lib/dogs/profilePhoto.test.ts */

const chosen = {
  url: 'https://example.com/old.jpg',
  thumbnail_url: 'https://example.com/old-t.jpg',
  is_primary: true,
  uploaded_at: '2024-01-01T00:00:00Z',
};
const newest = {
  url: 'https://example.com/new.jpg',
  thumbnail_url: 'https://example.com/new-t.jpg',
  is_primary: false,
  uploaded_at: '2026-08-01T00:00:00Z',
};
const older = {
  url: 'https://example.com/mid.jpg',
  thumbnail_url: null,
  is_primary: false,
  uploaded_at: '2025-06-01T00:00:00Z',
};

assert.equal(pickProfilePhoto([older, chosen, newest]), chosen);
assert.equal(profilePhotoUrl([older, chosen, newest]), chosen.thumbnail_url);

assert.equal(pickProfilePhoto([older, newest]), newest);
assert.equal(profilePhotoUrl([older, newest]), newest.thumbnail_url);

assert.equal(profilePhotoUrl([older]), older.url);

assert.equal(pickProfilePhoto([]), null);
assert.equal(pickProfilePhoto(undefined), null);
assert.equal(profilePhotoUrl(null), null);

const video = {
  url: 'https://example.com/clip.mp4',
  is_primary: true,
  type: 'video',
  uploaded_at: '2026-08-02T00:00:00Z',
};
assert.equal(pickProfilePhoto([video, older]), older);

console.log('profilePhoto.test.ts ok');
