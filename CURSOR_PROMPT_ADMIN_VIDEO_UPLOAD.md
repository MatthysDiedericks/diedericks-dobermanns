# Cursor Prompt — Admin Dog Video Upload

Paste this whole file into Cursor's chat (Agent mode) with the `diedericksdobermann App` folder open as the workspace root.

---

## Context

**Project:** Diedericks Dobermanns mobile app — React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind.
**Backend:** Supabase project `nlmwxodvquwbjinhhbmr`. Table `dog_media` already supports `type: 'photo' | 'video'` (see `types/app.types.ts` — no migration needed). Storage bucket `dog-media` is public-read, admin-write only (RLS already enforced via `is_admin()` — see `supabase/migrations/0004_storage.sql`, no policy changes needed).

**What already exists (do not recreate, only reference/reuse):**
- `hooks/useDogMedia.ts` — loads/uploads/deletes **photos** for a dog (filters `dog_media.type = 'photo'`). Has `uploadPhotos`, `deletePhoto`, `setPrimary`, `updateCaption`, `reorderPhotos`.
- `app/(admin)/dogs/[id]/photos.tsx` — the admin screen that currently only handles photos. This is the screen you're extending.
- `components/dogs/PhotoUploadSheet.tsx` — bottom sheet for picking/uploading photos. Use this as the structural pattern for the new video upload sheet (same `@gorhom/bottom-sheet` usage, same error/progress UI conventions).
- `components/dogs/PhotoGrid.tsx` — existing photo grid with long-press options (primary, caption, delete, reorder). Reference its interaction pattern for the new video list, but videos will be a simpler list, not a reorderable grid.
- `components/dogs/DogGalleryVideoItem.tsx` — **already built and working** (uses `expo-video`'s `useVideoPlayer` + `VideoView`). This is the client-facing tap-to-play video tile used in `app/(tabs)/dogs/[id].tsx`. Reuse this exact component for previewing videos in the admin screen too — don't build a second video player.
- `lib/storage.ts` — `uploadFile()`, `deleteStorageObjects()`, `getPublicUrl()`, `storagePathFromPublicUrl()`. **Important:** `uploadFile()` currently hardcodes `MAX_FILE_BYTES = 5 * 1024 * 1024` (5MB) — this is correct for compressed photos but will reject every video. You must add an optional override, not remove the existing photo limit.
- `expo-video` (`~56.1.4`) is already installed and working — SDK-matched, do not touch its version.
- `expo-image-picker` is already installed and already used for photos with `mediaTypes: ['images']` — it also supports `mediaTypes: ['videos']` for picking/recording video, so **no new picker dependency is needed** for selecting the file.

**Brand tokens:** Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`. Follow the existing screen's spacing/typography — don't invent new styling.

---

## Task

Add video upload and management to the admin dog Photos screen (rename conceptually to "Photos & Videos" but keep the same route). Admin should be able to:
1. See a "Videos" section below the existing photo grid, listing all videos uploaded for that dog (using the existing `DogGalleryVideoItem` component for each).
2. Tap "Add Video" to record a new video or pick one from their library.
3. See an upload progress/spinner state while the video uploads (video uploads are slow — several MB to tens of MB — so this must not look frozen).
4. Delete a video (with a confirmation, same pattern as photo delete).
5. Add/edit a caption for a video (same pattern as photo caption).

Explicitly **not** in scope for this task: video compression/transcoding (out of scope — Supabase Storage stores the file as-is), video trimming/editing, reordering videos, setting a "primary" video (that concept only applies to photos).

---

## Exact files to create or edit

1. **Edit `lib/storage.ts`** — add an optional `maxBytes` field to `UploadOptions` that overrides `MAX_FILE_BYTES` when provided (default stays 5MB so photo behavior is unchanged). Example:
   ```ts
   export interface UploadOptions {
     bucket: StorageBucket;
     path: string;
     uri: string;
     contentType: string;
     sizeBytes?: number;
     maxBytes?: number; // NEW — overrides the default 5MB cap when provided
   }
   ```
   Then in `uploadFile()`, use `opts.maxBytes ?? MAX_FILE_BYTES` for the size check.

2. **Add `expo-video-thumbnails`** via `npx expo install expo-video-thumbnails` (do NOT `npm install` it directly — same rule as every other `expo-*` package in this project: loose/bare installs have already caused one production crash this project, see `package.json` history). Use it to generate a static thumbnail image from the picked video file immediately after selection, so the video list has a preview image without needing to play the video.

3. **New file `hooks/useDogVideos.ts`** (keep under 200 lines) — mirrors the structure of `hooks/useDogMedia.ts` but for `type: 'video'`:
   - `load()` — query `dog_media` where `dog_id = X and type = 'video'`, order by `uploaded_at desc`.
   - `uploadVideo(asset, onStatusChange)` — uploads the video file to `dog-media` bucket at path `dogs/${dogId}/videos/${fileId}.mp4`, uploads the generated thumbnail to `dogs/${dogId}/videos/thumbs/${fileId}.jpg`, inserts a `dog_media` row with `type: 'video'`. Pass `maxBytes: 200 * 1024 * 1024` (200MB) to `uploadFile()` for the video (not the thumbnail — thumbnail stays under the default photo limit). One video at a time, not a batch picker like photos.
   - `deleteVideo(mediaId)` — same pattern as `deletePhoto`, removes both the video object and its thumbnail from Storage, then deletes the DB row.
   - `updateCaption(mediaId, caption)` — same as the photo version.
   - Return shape: `{ videos, loading, error, refresh, uploadVideo, deleteVideo, updateCaption }`.

4. **New file `components/dogs/VideoUploadSheet.tsx`** (keep under 200 lines) — bottom sheet modeled directly on `PhotoUploadSheet.tsx`:
   - Two buttons: "Record Video" (camera) and "Choose from Library", both using `ImagePicker` with `mediaTypes: ['videos']`.
   - Enforce a reasonable duration cap client-side if `expo-image-picker` supports `videoMaxDuration` for this SDK — check the installed types before using it; if unavailable, skip silently rather than guessing an API that doesn't exist (this exact mistake — using a prop that isn't in the actual installed types — already caused a build failure earlier this project; verify against `node_modules/expo-image-picker`'s type definitions before using any option not already used elsewhere in this codebase).
   - Because there's no real byte-level progress from `uploadFile()`, show an indeterminate state: a spinner plus the text "Uploading video… this can take a minute" rather than a fake percentage bar.
   - Same error handling and cancel/dismiss pattern as `PhotoUploadSheet.tsx`.

5. **New file `components/dogs/AdminVideoList.tsx`** (keep under 150 lines) — renders the "Videos" section: a header row (`"Videos"` label + count badge, matching the existing photo count badge style), then for each video: `DogGalleryVideoItem` for preview/playback, plus a small row below it with an editable caption field and a delete button (long-press or a visible trash icon — your call, match whatever affordance `PhotoGrid.tsx` uses for consistency). Empty state: "No videos yet" when the list is empty, styled consistently with other empty states in this codebase.

6. **Edit `app/(admin)/dogs/[id]/photos.tsx`** — add the `useDogVideos` hook alongside the existing `useDogMedia` hook, render `AdminVideoList` below the existing `PhotoGrid` section, add a second FAB or inline "Add Video" button near the existing "Add Photos" FAB (don't remove or restyle the existing photo FAB), and wire up `VideoUploadSheet` the same way `PhotoUploadSheet` is wired. Keep this file under 300 lines — if it's getting close, that's a sign some of the new JSX belongs inside `AdminVideoList.tsx` instead of inline here.

---

## Critical warnings

- Do **not** change `MAX_FILE_BYTES` itself or remove the 5MB default — photos must keep compressing to under 5MB exactly as they do today. Only add the optional override.
- Do **not** touch `hooks/useDogMedia.ts`, `components/dogs/PhotoUploadSheet.tsx`, or `components/dogs/PhotoGrid.tsx` — those are working and out of scope. Build the video equivalents as separate files.
- Do **not** modify `components/dogs/DogGalleryVideoItem.tsx` or `components/Training/TrainingVideoPlayer.tsx` — both were just fixed after a real crash this session (an invalid `allowsFullscreen` prop that doesn't exist on the installed `expo-video` version's `VideoView`). Reuse `DogGalleryVideoItem` as-is; do not add props to it that aren't already in `node_modules/expo-video/build/VideoView.types.d.ts`.
- Before using **any** prop on `VideoView`, `useVideoPlayer`, or `ImagePicker`, check it actually exists in the installed package's `.d.ts` files under `node_modules/`. Do not assume an API from general Expo knowledge — this project has already broken a production build twice from using APIs that didn't match the actually-installed version.
- Do not create a new Supabase Storage bucket or new RLS policy — `dog-media` bucket and its existing `is_admin()`-gated policies already cover video files (bucket has no MIME-type restriction, only size, which you're handling client-side).
- No `SELECT *` in any Supabase query — list exact columns, matching the style of `MEDIA_SELECT` in `useDogMedia.ts`.

---

## Testing checklist (verify all before saying this is done)

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Recording a new video via camera uploads successfully and appears in the Videos section
- [ ] Picking an existing video from the library uploads successfully
- [ ] A generated thumbnail shows in the video list before playback is tapped
- [ ] Tapping a video plays it inline using the existing `DogGalleryVideoItem` behavior
- [ ] Deleting a video removes both the video file and thumbnail from Storage (check Supabase Dashboard → Storage → dog-media) and removes the DB row
- [ ] Caption edit and save works and persists after a refresh
- [ ] Uploading a video larger than 200MB shows a clear error instead of crashing or hanging
- [ ] Existing photo upload/delete/reorder/primary flows are completely unaffected — re-test the Photos section after making these changes
- [ ] Non-admin users cannot see the "Add Video" button (role check, matching how the rest of this screen already gates admin-only actions)
- [ ] No file created in this task exceeds 300 lines

---

## Execution order

1. `lib/storage.ts` change (small, low-risk, do first)
2. `npx expo install expo-video-thumbnails`
3. `hooks/useDogVideos.ts`
4. `components/dogs/VideoUploadSheet.tsx`
5. `components/dogs/AdminVideoList.tsx`
6. Wire into `app/(admin)/dogs/[id]/photos.tsx`
7. `npx tsc --noEmit`
8. Manual test pass through the checklist above on a real device build (not web preview — camera/video picker won't work in `expo start --web`)
