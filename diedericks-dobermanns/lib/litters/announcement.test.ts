import assert from 'node:assert/strict';

import {
  ANNOUNCEMENT_CATEGORY,
  announcementWriteError,
  galleryGridIncludes,
  isAnnouncementUniqueViolation,
  isLitterRequiredViolation,
  litterIdSatisfiesCategory,
  publicGalleryIncludes,
} from './announcement';

/** Run: npx tsx lib/litters/announcement.test.ts */

function main() {
  assert.equal(
    isAnnouncementUniqueViolation({
      code: '23505',
      message: 'duplicate key value violates unique constraint "gallery_items_one_announcement_per_litter"',
    }),
    true,
  );
  assert.equal(
    announcementWriteError({ code: '23505', message: 'duplicate key' }).includes('Replace'),
    true,
  );

  assert.equal(litterIdSatisfiesCategory('litter_announcements', null), false);
  assert.equal(litterIdSatisfiesCategory('litter_announcements', 'litter-1'), true);
  assert.equal(litterIdSatisfiesCategory('puppies', null), true);
  assert.equal(
    isLitterRequiredViolation({
      code: '23514',
      message: 'new row for relation "gallery_items" violates check constraint "gallery_items_litter_required"',
    }),
    true,
  );

  assert.equal(publicGalleryIncludes({ litter_id: 'cleo-dharka', litterIsPublic: false }), false);
  assert.equal(publicGalleryIncludes({ litter_id: 'odessa-santini', litterIsPublic: true }), true);
  assert.equal(publicGalleryIncludes({ litter_id: null, litterIsPublic: false }), true);
  assert.equal(galleryGridIncludes('training'), true);
  assert.equal(galleryGridIncludes('planned_litters'), true);
  assert.equal(galleryGridIncludes(ANNOUNCEMENT_CATEGORY), false);

  const migrated = [
    { category: ANNOUNCEMENT_CATEGORY, litter_id: 'a', title: 'Odessa × Santini' },
    { category: ANNOUNCEMENT_CATEGORY, litter_id: 'b', title: 'Cleo poster' },
    { category: ANNOUNCEMENT_CATEGORY, litter_id: 'c', title: 'Third' },
    { category: 'training', litter_id: null, title: 'A session' },
  ];
  const resolve = (litterId: string) =>
    migrated.find((row) => row.category === ANNOUNCEMENT_CATEGORY && row.litter_id === litterId) ??
    null;
  assert.equal(resolve('a')?.title, 'Odessa × Santini');
  assert.equal(resolve('missing'), null);
  assert.equal(migrated.filter((r) => r.litter_id == null).length, 1);

  console.log('announcement.test.ts ok');
}

main();
