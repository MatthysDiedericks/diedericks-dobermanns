# System review — 6 September 2026

Adversarial audit against the live system. Mode: full audit.

**Verdict: no client can see another client's data. The two live exposures are both to the open internet, not between clients, and one of them is latent — it fires the moment you publish the Claire litter.**

---

## Ground truth established first

| Check | Result |
|---|---|
| App repo `HEAD` vs `origin/main` | identical (`e36c828`) — nothing stranded |
| Web repo `HEAD` vs `origin/main` | identical (`b12818a`) — nothing stranded |
| Live site | serving, 200s, portal login renders |
| RLS enabled | **every** table in `public` |
| SECURITY DEFINER functions without `search_path` | **zero** |
| Storage buckets public | `dog-media`, `gallery` only (marketing images — correct) |
| Private buckets | documents, contract-signatures, broadcasts, litter-media, training-videos |

---

## Reproduced: client isolation holds

Ran as Leo Middelberg's real JWT (`5b569a83…`), a real client with one puppy, against real data.

| Table | Total rows | Leo sees | Verdict |
|---|---|---|---|
| applications | 22 | **0** | correct |
| contacts | 267 | **0** | correct |
| waiting_list | 18 | **0** | correct |
| payments | 0 | 0 | n/a |
| invoices | 185 | **1** | his own |
| quotes | 22 | **1** | his own |
| contracts | 14 | **2** | both his — DD-AGR-1135 + voided addendum |
| documents | 145 | 42 | see below |
| dogs | 173 | 32 | 31 public + his own puppy |

**The 42 documents check out.** Anonymous visitors already see 38 of them (kennel DNA tests, pedigrees, hip scores). Of the 4 extra Leo gets, exactly 2 are private and both are his: his own proof of payment, and his own puppy's microchip certificate. The other 2 are registration certificates for Claire and Santini — **your own kennel dogs**, owner_id null, not any client's. No cross-client document read.

**Write side is solid.** Tested directly with his credentials:

- self-escalation to admin → **refused** by trigger `prevent_role_self_escalation()`
- re-point his own dog at another user (the `WITH CHECK` trap) → **0 rows**
- claim all unowned dogs → **0 rows**
- flip document visibility flags → **0 rows**

---

## Findings

### [HIGH] 18 microchip numbers readable by anyone on the internet

**Reproduced:** yes — as the `anon` role, `select count(microchip_number) from dogs` returns **18**.
**Impact:** a microchip number is a permanent animal identifier tied to owner name and address in the national registry. No login required.
**Cause:** `DOG_DETAIL_SELECT` in `hooks/useDogs.ts` includes `microchip_number`, and `useDog(id)` runs it with only `.eq('id', id)` — no `is_public` filter. RLS is the sole gate, and it permits public dogs.
**Note:** `DOG_LIST_SELECT` is already clean. Fixing the wrong file leaves this open.
**Fix:** remove `microchip_number` from `DOG_DETAIL_SELECT` and the website equivalent.

### [HIGH — latent] Publishing the Claire litter will expose nine sale prices

**Reproduced:** partially — as `anon`, prices readable is **0 today**, but only because no public dog has a price set. That is luck, not a control.
**Impact:** `price` is in both `DOG_LIST_SELECT` and `DOG_DETAIL_SELECT`. The nine sold Claire × Santini pups carry R15,000–R55,000. Publishing them ships all nine prices, littermates side by side, a 3.7× spread.
**Fix:** remove `price` from both public selects, deploy, **then** `revoke select (price) on public.dogs from anon`. Order matters — reversing it 403s the whole query and takes the public site down.

### [MEDIUM] Registration never links a buyer to their dog

**Reproduced:** yes — Leo's puppy was invisible to him until corrected by hand today.
**Impact:** `claim_my_records()` claims applications, contacts, quotes, invoices, documents, waiting list and contracts — never dogs. **20 dogs** are queued to fail the same way as their owners register.
**Fix:** add a dogs block scoped on `owner_contact_id`, skipping owner/buyer conflicts. Use `is distinct from`, not `<>`.

### [MEDIUM] One dog has contradictory ownership

**Reproduced:** yes — Puppy 9 "Yellow": `owner_contact_id` says Shanel Halgreen, `buyer_contact_id` says Elrid Gerber.
**Impact:** auto-linking on the wrong one hands a stranger that puppy's records. Currently unlinked, so no live exposure.
**Fix:** Matt rules on the real owner. Until then the claim logic must skip conflicting rows.

### [LOW] Uploads are unbounded

**Reproduced:** yes — `storage.buckets` shows `file_size_limit` null and `allowed_mime_types` null on six of seven buckets. Only `training-videos` is capped (500 MB, video MIME types).
**Impact:** any authenticated user can upload files of any size and any type into documents, dog-media, gallery, litter-media.
**Fix:** set a size limit and MIME allow-list per bucket.

### [LOW] Two tables granted to anon with no policies

**Reproduced:** yes — `rate_limit_buckets`, `rate_limit_secrets`: RLS on, **zero** policies, granted to anon and authenticated.
**Impact:** none for security — RLS with no policy fails closed. But if the app expects to read these, rate limiting is silently dead.
**Fix:** confirm the app reads them via a SECURITY DEFINER function; if not, the grants are misleading and should go.

### [NOTE] Health data absent across the breeding programme

Every `genetics_dcm1_status`, `genetics_dcm2_status`, `genetics_vwd_status`, `hip_score` and `elbow_score` is **null** for all 14 breeding dogs — while breeding decisions are being made from paper certificates. Santini's real result (PDK4 carrier, TTN clear, RBM20 clear) exists only in a PDF.

### [NOTE] Nine legacy invoices marked paid with no payment rows

Invoices 1001–1012 (2022 issue dates, imported 4 Sep) are `status='paid'` with zero rows in `payments`. Consistent with a legacy import, but the ledger cannot reconcile them.

---

## What I did NOT cover — read this

- **I did not load the portal in a browser as Leo.** My isolation evidence is SQL under his JWT. That is *supporting* evidence, not primary. **A query run by an admin-context server component would not be caught by anything I did** — that is exactly how the invoice leak survived two previous audits. To close this properly someone must sign in as a real client and count what renders on `/portal/invoices`, `/portal/documents` and `/portal/dogs`.
- I did not attempt cross-client **storage object** fetches by path.
- I did not verify which Vercel project owns the live domain (three near-identical projects exist).
- I did not review the edge functions' own authorisation beyond confirming they are deployed.
- I did not test the trainer role, only client and anonymous.
