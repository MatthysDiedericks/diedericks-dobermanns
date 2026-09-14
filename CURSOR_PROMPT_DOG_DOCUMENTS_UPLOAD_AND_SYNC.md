# Cursor Prompt — Dog documents: upload properly, and know what is missing

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Everything here uses columns that already exist.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## The actual situation, checked against the live database on 10 Sep 2026

Matt tried to file a document against Cleopatra and there was no reliable way to do it. Three separate things are wrong, and none of them is what it looks like.

**1. One file on disk was never imported.** Matt's folders under `Desktop\Dobermann Photo's\` hold 12 PDFs. Eleven are already in the system and correctly filed. Exactly one is not:

```
Dobermann Photo's\Cleopatra\dog_attachment_20259510203592_0.pdf
```

Nothing told him that. He only found out by looking.

**2. The folder a file sits in does not tell you which dog it belongs to.** The `Cleopatra` folder contains pedigrees for **Santini, Hailey, Hannah, Hillo and Kim** as well as Cleopatra. A previous import got this right by reading the filename, not the folder. Any new import must do the same. **Never file a document by the folder it was found in.**

**3. 22 dog documents have no usable name.** Three of them read "Santini — scanned document 1 (to be labelled)" with category `other`. The rest are worse. A document nobody can identify is not filed, it is buried.

---

## Task 1 — A script that says what is on disk but not in the system

`scripts/check-dog-documents.mjs`. **Read-only. It uploads nothing and changes nothing.**

- Walk `C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's` recursively for `.pdf`, `.jpg`, `.jpeg`, `.png`.
- For each file, look for a `documents` row with a matching `original_filename`.
- Print three lists:
  - **In the system** — count only, not every name.
  - **On disk, not in the system** — full path for each. Right now this must be exactly **1**: the Cleopatra attachment above.
  - **In the system, not on disk** — informational; files uploaded from elsewhere are fine and expected.

Match on `original_filename`, case-insensitive, trimmed. If two files share a name in different folders, print both and flag it rather than assuming they are the same document.

Load the environment the same way `backup-supabase.mjs` does — that helper already handles the app repo using `.env` and the website using `.env.local`. Reuse it; do not write a third copy.

**Do not make this script upload anything.** Matt uploads through the app so the category and name are chosen by a person. A script that guesses is how 22 documents ended up called "1".

## Task 2 — Uploading a document to a dog must be a normal thing to do

On the dog detail page, **both platforms**, there must be a clear **Add document** action that:

- takes the file,
- requires a **category**, read from `document_categories` filtered on `dog` (after migration `0173` — if it is not applied yet, say so and stop rather than hard-coding a list),
- requires a **document name** — see Task 4,
- lets Matt optionally set a document date and an expiry date,
- writes `entity_type = 'dog'`, `entity_id` = that dog, `client_visible = false` and `is_public = false` **by default**.

Reuse the existing uploader components. Do not build a third one.

**Default to private.** Making a document public is a deliberate act, and on 8 Sep 38 documents were public that should not have been. Public is a tick-box the person has to find, never the default.

If this already exists on one platform and not the other, port it rather than rewriting — and say which was the reference.

## Task 3 — Surface the 22 unlabelled documents

The app already has `app/(admin)/documents/unlabelled.tsx`. Check whether the website has an equivalent; if not, build one from that as the reference.

It should list every dog document where the name is meaningless — purely numeric, starting `doc07`, starting `dog_attachment`, empty, or containing "to be labelled" — and let Matt fix the **name** and **category** inline, one row at a time, without leaving the page. Show the file inline so he can see what he is naming.

Expected count today: **22**. Report the number you actually find.

## Task 4 — Stop it happening again

Reject a document name that carries no information, at the point of upload, on both platforms:

- purely numeric (`1`, `23`)
- the raw scanner or camera filename (`doc07862320260821081858`, `dog_attachment_20259510203592_0`, `IMG_1234`)
- empty or whitespace

Show the person a clear message — *"Give this document a name you would recognise in a year: 'Cleopatra — hip and elbow score' rather than 'doc0786…'."* — and prefill the field with a sensible suggestion built from the dog's name and the chosen category, so the easy path is also the right one.

This is a validation rule, not a lecture. One inline message, then let them get on with it.

---

## Do not

- Do not upload, move, rename or delete anything in `Dobermann Photo's`. Those are Matt's originals.
- Do not bulk-import the folder. One file is missing and Matt will file it himself once Task 2 works.
- Do not change `client_visible` or `is_public` on any existing document row.
- Do not rename existing documents automatically. Task 3 is Matt naming them, not you guessing.
- Do not add a migration.

---

## Report

1. `node scripts/check-dog-documents.mjs` output. **On disk, not in the system must be exactly 1**, and it must be the Cleopatra attachment. If you get a different number, stop and show it before changing anything.
2. Screenshot of Add document on a dog page, on both platforms, showing the category list loaded from the database.
3. The unlabelled count you found — expected 22.
4. The rejection message, shown for a name of `doc07862320260821081858`.
5. `npx tsc --noEmit` clean in both repos.

**Then prove it.** Upload `dog_attachment_20259510203592_0.pdf` to Cleopatra through the new screen, give it a real name and category, and confirm the row lands with `entity_type = 'dog'`, Cleopatra's id `f0932f8d-c907-4f62-aa68-9334955927a7`, `client_visible = false` and `is_public = false`. Then re-run the script and confirm **nothing** is left on disk but not in the system.
