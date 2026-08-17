import assert from 'node:assert/strict';

import { IMAGE_SIZES, supabaseThumbUrl } from './thumbs';

/** Run: npx tsx lib/thumbs.test.ts */

function main() {
  const original =
    'https://nlmwxodvquwbjinhhbmr.supabase.co/storage/v1/object/public/gallery/foo.jpg';
  assert.equal(IMAGE_SIZES.grid.width, 900);
  assert.equal(IMAGE_SIZES.grid.quality, 82);
  const thumb = supabaseThumbUrl(original);
  assert.ok(thumb);
  assert.match(thumb, /\/render\/image\/public\/gallery\/foo\.jpg/);
  assert.match(thumb, new RegExp(`width=${IMAGE_SIZES.grid.width}`));
  assert.match(thumb, new RegExp(`quality=${IMAGE_SIZES.grid.quality}`));

  const oneX = supabaseThumbUrl(original, 'grid', 1);
  assert.ok(oneX);
  assert.match(oneX, new RegExp(`width=${Math.round(IMAGE_SIZES.grid.width / 2)}`));

  const hero = supabaseThumbUrl(original, 'hero');
  assert.ok(hero);
  assert.match(hero, new RegExp(`width=${IMAGE_SIZES.hero.width}`));
  assert.match(hero, new RegExp(`quality=${IMAGE_SIZES.hero.quality}`));

  const avatar = supabaseThumbUrl(original, 'avatar');
  assert.ok(avatar);
  assert.match(avatar, new RegExp(`width=${IMAGE_SIZES.avatar.width}`));

  console.log('thumbs.test.ts: ok');
}

main();
