# Diedericks Dobermanns — Strategic App Review
**Date:** 2026-07-22 · **Reviewer:** Claude (Senior Architect role)
**Vision reviewed against:** One product — public showcase + client relationships + full business backend — on one database, visually premium, easy for clients AND for you.

---

## 1. Verdict up front

The architecture already matches your vision. You are not missing structure — you are missing the **relationship layer** and the **social publishing layer**. The app today is excellent at *managing* the business and *showing* the dogs, but thin at *keeping in touch*. That's the gap between "a typical website" and what you said you actually want: long-term client relationships through the app.

Score by your own goals:

| Goal | Status | Grade |
|---|---|---|
| Website-style public showcase (see our dogs) | Built — public area has dogs, puppies, litters, gallery, achievements, testimonials, FAQ, apply | A |
| One database, app + website | Built — Expo app + Next.js site share the same Supabase project | A |
| Backend manages the whole business | Built — 20 admin modules (finance, breeding, litters, health, waitlist, quotes, invoices, contracts, docs, training, todos, messaging…) | A- |
| Selected backend elements exposed to clients | Built — portal shows their dogs, litters, contracts, invoices, health schedule, training updates, puppy tracker | B+ |
| Long-term relationship building | **Partially built** — broadcast module exists, but push notifications not live, no client-facing updates feed | C |
| Post to Facebook + Instagram from the app | **Not built** — SocialBar/WhatsAppFab only link out | D |
| Natural flow / ease of use | Good bones, rough edges in auth flow and first-run experience | B- |

---

## 2. What is genuinely strong (don't touch)

- **Five clean role layers**: (public) → (portal) client → (trainer) → (tabs)+(admin) you. Nobody sees what they shouldn't (RLS enforced at DB level, not just UI).
- **Business depth**: waitlist → quote → invoice → contract → e-sign is a complete sales pipeline most breeders run on paper and WhatsApp.
- **155 screens, 65 hooks, consistent brand** (dark + gold, Cinzel/Lato). The premium feel is real.
- **The data model**: pedigrees, heat cycles, litters, growth benchmarks, finance with VAT — this is a serious operational system, not a brochure.

## 3. The three gaps that matter (priority order)

### Gap 1 — The relationship engine is dormant (highest value, do first)
You have a Broadcast module (`(admin)/broadcast` with channel toggles and group selection) and a messaging module — but the delivery rails aren't live:
- **Push notifications are not configured** (FCM for Android, APNs for iOS — both still open tasks). Until push works, "keeping in touch" depends on clients opening the app on their own.
- **No client-facing updates feed.** The portal is transactional (my dogs, my invoices). There's no "news from the kennel" stream — new litter announced, show results, training milestones. That feed is what makes clients open the app weekly instead of twice a year.

**Recommendation:** one Cursor prompt: `kennel_updates` table (title, body, media, audience: public/clients/group), admin composer reusing the Broadcast UI, feed card on portal home + public home, and fire a push per post once FCM is configured. This single feature converts the app from a tool into a channel.

### Gap 2 — Social publishing (your explicit ask)
Posting to Facebook + Instagram from inside the app is feasible and the right move — compose once, publish everywhere:
- **How it works:** Meta Graph API. Requires (one-time, manual): a Facebook Business Page, an Instagram Business/Creator account linked to that Page, a Meta developer app, and a long-lived Page access token stored as a Supabase Edge Function secret (never in the app).
- **Build:** one Edge Function `publish-social` (accepts caption + image URLs from Supabase Storage, posts to FB Page and IG via API) + an admin "Publish" composer screen with checkboxes: ☐ App feed ☐ Facebook ☐ Instagram.
- **Sequencing:** build this AFTER Gap 1, because the same composer should feed both — one post → app feed + FB + IG. Don't build two composers.
- **Caveat:** IG API requires images hosted at a public URL (Supabase Storage public bucket works) and a Business account — personal IG accounts cannot API-post.

### Gap 3 — First-touch experience (what today's testing proved)
A client's first 5 minutes are the weakest part of the app, and that's exactly where relationships start:
- Auth flow polish: OTP flow built today (right call), but back-navigation gaps got *you* stuck (#74) — a stranger would have given up.
- No onboarding: after first login, a new client lands with empty states and no guidance. Add a one-time welcome card: "Browse available puppies → Submit an application → Track it here."
- Old build confusion: yesterday's build didn't have today's flow. Before any client-facing test, always confirm the build date matches the code (add build version visibly in Settings).

## 4. Smaller findings

- **Website parity:** domain is now owned — add it to Vercel (dm5/dm6) so the public layer lives at diedericksdobermanns.com. The site and app should stay content-identical; both already read the same tables, so this is DNS work, not code work.
- **WhatsApp:** the FAB links out today. Real WhatsApp Business API (broadcast lists, automated litter updates) is a future upgrade that slots into the same Broadcast composer — don't build it separately.
- **Trainer layer** exists but is thin (bookings, dogs, profile) — fine for now; grows when training revenue grows.
- **Admin density:** the dashboard is powerful but busy. Once real data volumes arrive, revisit which 5 numbers you check daily and pin those top-left.

## 5. Recommended sequence (next 4 moves)

1. **Finish what's in flight** — new APK, OTP end-to-end test, auth back-buttons (#74/#75). Ship a flow a stranger can complete.
2. **Domain live** — diedericksdobermanns.com on Vercel + Supabase CORS. One evening.
3. **Updates feed + push (Gap 1)** — FCM config + kennel_updates + composer + portal/public feed cards. This is the relationship engine.
4. **Social publishing (Gap 2)** — Meta setup (manual) + publish-social Edge Function + extend the composer with FB/IG toggles.

Then app stores (Play first — your audience is Android-heavy, $25 one-time, no D-U-N-S wait).

## 6. Opportunities research (2026-07-22) — what the market and AI make possible

Benchmarked against BreedTools, BreederBuddy, Good Dog, and 2026 AI app trends. **Core finding: your operational depth already matches or beats the leading breeder platforms.** The opportunities are all on the client-facing and AI side:

### Worth adding (kept the core idea, these amplify it)

1. **Public litter pages with live weights & milestones** (BreedTools' standout feature). You already capture weights, milestones, photos per puppy — competitors expose a curated public page per litter that buyers refresh obsessively while waiting. You have the data; this is a read-only view, not a new system. Massive engagement for zero new data entry.
2. **Structured "puppy journey" updates** (Good Dog's model: regular updates leading up to pickup day). Formalize a cadence: once a puppy is reserved, the app prompts YOU weekly ("Post Hannah's litter week-4 photos") and pushes each update to that buyer. Turns your existing puppy-tracker into an anticipation machine — this is the relationship engine at its strongest, pre-handover when excitement peaks.
3. **AI concierge chatbot** (80% of routine enquiries are automatable; industry standard by 2026). Trained on your FAQ, breeding philosophy, application process, and product tiers — answers "how much", "when is the next litter", "what's included" 24/7 on the website + app public area, and hands serious buyers to the application form. Claude API via an Edge Function; your architecture is already prepared for this.
4. **AI caption writer inside the social composer** — when publishing to App/FB/IG (roadmap D4), one button drafts the caption from the photos + dog data in your brand voice. Small build, daily time saver, makes consistent posting actually happen.

### Noted but deliberately NOT adding now

- **AI photo health screening** (Samsung/TTcare-style eye/skin/teeth/gait analysis, 95%+ accuracy claims) — impressive, but third-party tech; revisit as an integration once the platforms open APIs. Not core to relationships or operations.
- **24/7 puppy livestream cams** — differentiator for some US breeders, but high effort/bandwidth; the weekly structured photo/video update (item 2) captures 90% of the value with 5% of the effort.
- **Voice/multimodal interfaces** — trend, not a fit for this audience yet.
- **AI puppy–buyer matching** — you already have `usePreferenceMatch`; an AI layer on top is a later refinement, not a gap.

## 7. On "create skills"

Skills can't be created from inside this session (Settings → Capabilities is where new skills are added). But the two that matter already exist and were used for this review: **app-developer** (architecture standards) and **diedericks-dobermanns** (brand/product). If you want a third, the highest-value one would be a **"dd-product-reviewer"** skill containing this document's goals table — so every future feature gets scored against the same 7 goals before it's built. Say the word and I'll draft its content for you to save.
