# How to Upload Dog Photos to Supabase

## One-time setup

Open a terminal in the project root and install the script dependencies:

```bash
npm install @supabase/supabase-js sharp dotenv
```

> **sharp** handles HEIC, HEIF, JPG, PNG, WEBP — no manual conversion needed.

---

## Step 1 — Download the photos from Google Drive

1. Go to Google Drive → find the dog's folder (e.g. **Cendra**)
2. Right-click the folder → **Download**
3. Google zips it — extract the zip somewhere (e.g. `C:\Users\mathy\Downloads\Cendra`)

---

## Step 2 — Run the upload script

Open a terminal in the project root (`diedericksdobermann App`) and run:

```bash
node scripts/upload-dog-photos.mjs "C:\Users\mathy\Downloads\Cendra" 7b8de2c4-6a98-441f-996e-71d19341a809 Cendra
```

Replace the arguments:
| Argument | Value |
|---|---|
| `<folder>` | Path to the downloaded/extracted photo folder |
| `<dog-id>` | The UUID from the `dogs` table in Supabase |
| `<dog-name>` | Used as a filename prefix (optional) |

The script will:
- Convert all HEIC/PNG/JPG to JPEG automatically
- Upload full-size images to `dog-media/dogs/<dog-id>/`
- Generate 480×480 thumbnails to `dog-media/dogs/<dog-id>/thumbs/`
- Insert a `dog_media` row for each photo
- Mark the **first photo** as `is_primary = true`

---

## Dog IDs reference

### Active breeding females
| Dog | ID |
|---|---|
| Cendra | `7b8de2c4-6a98-441f-996e-71d19341a809` |
| Hailey | `fb33005e-f4a6-4bf8-b0ff-a13a7c396d86` |
| Claire | `bb08f772-5a26-47c5-94f1-8768907a191c` |
| Cyrus | `1b9c5fdb-c30e-45d3-9cd9-1a1ff7e05d25` |
| Cleopatra | `f0932f8d-c907-4f62-aa68-9334955927a7` |
| Hannah | `a37f2cfc-56df-4ab3-99a8-a41c4eda96c3` |
| Odessa | `9537e604-9aa2-456a-9d87-71dc3f093dc1` |
| Shanti | `3e9c384e-42c6-46d2-9f61-ae04960e3407` |

### Active studs
| Dog | ID |
|---|---|
| HunterKing | `64920b60-3d20-4fc1-92d5-6095658b7f2d` |
| Hugo | `e1e419da-933a-45ec-9660-57dd2c6655c3` |
| Santini | `c54ae0cf-dcba-4d83-a0eb-b6823132b0d1` |

### Deceased (legacy)
| Dog | ID |
|---|---|
| Celsea | `22944bef-eb42-4d3b-9395-a926513406aa` |
| Cuba | `b7d04552-fec1-43b3-b0a5-6ec6d0d81863` |
| Cait | `3f5c6b20-98e5-4797-a1d7-c2c152183c78` |
| Chester | `01be0b46-6cd0-44b8-9378-e2e8443d6dd2` |

### Sold
| Dog | ID |
|---|---|
| Ade | `3d36733e-58e6-4fd2-91d5-1dce2aa868c1` |
| Bliksem | `1c273986-8136-4199-9aeb-295ed422f0fa` |
| Boomer | `841b37dc-a0ac-47ce-81c5-279af53e5ebf` |
| Dexter | `2f73003f-f649-43c4-9a6c-8128fcfd6ff9` |
| Eben | `9323ac7c-3547-4576-9594-9d2b01ed7f0f` |
| Hazel | `eab62ea0-5a41-4af8-8cdc-4b0f6dff8ef2` |
| Liv | `10a36427-d786-4e9e-af15-eccee2f3651a` |
| Loki | `a674b31b-08a2-4f15-bda9-bf9562f06761` |
| Miles | `5dafb461-3116-460e-b139-13d06919d148` |
| Raptor | `3c8c4ff6-c6b5-46a6-a089-a9b225ecc1ce` |
| Zara | `9c6071f1-d465-4a2f-86fc-8f2089974828` |
| Zues | `94fb5036-b7ff-4ed0-95c9-3fa8719c2d73` |

---

## Upload ALL breeding dogs at once (from local folder)

Once `npm install @supabase/supabase-js sharp` is done, just run:

```bash
node scripts/upload-all-breeding-dogs.mjs
```

Or a single dog:

```bash
node scripts/upload-all-breeding-dogs.mjs HunterKing
```

The script reads photos from `C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's\<DogName>`.

---

## Notes

- The script reads `SUPABASE_SERVICE_ROLE_KEY` from `diedericksdobermann-web/.env.local` automatically — no extra setup needed.
- Running the script twice is safe (upsert mode).
- If a file fails, just re-run — completed files are skipped.
- **Rotate the service role key** in Supabase Dashboard → Settings → API once you're done, since it was briefly visible in chat.
