# CURSOR PROMPT — Tell clients how to reach a human in every automatic email

Every automatic email currently ends with the words "Diedericks Dobermanns" and nothing else. They
are sent from **`no-reply@diedericksdobermanns.com`**, so a client who hits Reply gets silence.

A buyer who cannot register, cannot open a quote, or simply has a question has no route back —
which is exactly what happened this week. One client was blocked from registering and the only
reason Matt found out was a WhatsApp screenshot; anyone less persistent would have given up.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`.

---

## One change, every email

`src/lib/notifications/email.ts` exports `emailShell(heading, bodyHtml)` and **every** client-facing
mail already goes through it — `applicantEmails`, `quoteSentEmail`, `goHomeEmails`,
`contracts/emails`, `kennelAlerts`, `adminAlerts`. Add the footer there. **Do not add it template by
template** — seven copies will drift, and the one that matters will be the one that was missed.

Footer copy, above the existing "Diedericks Dobermanns" line, visually quieter than the body:

> Any trouble or questions? Email us at **diedericksdobermannssa@gmail.com** or WhatsApp **+27 78 215 0832** and we will help.

The email address is a `mailto:` link. The WhatsApp number is a `https://wa.me/27782150832` link —
**digits only, no plus, no spaces**, or the link breaks silently on some phones.

## Read the values, do not hard-code them

Both live in `app_settings` and are already correct:

```
contact_email     diedericksdobermannssa@gmail.com
contact_whatsapp  +27782150832
```

Read them at send time. Matt changes his numbers; a hard-coded one becomes wrong without anyone
noticing until a client cannot reach him.

**If a setting is missing or empty, omit that line rather than rendering an empty link or the word
"undefined".** A footer offering a blank address is worse than no footer.

There is an existing `whatsappLink()` helper in `src/lib/settings-keys.ts` — reuse it rather than
building the URL again.

## Do not put it on admin emails

`adminAlerts` and `kennelAlerts` go to Matt and Felicia. Telling Matt to email himself for help is
noise, and noise is how a footer teaches people to stop reading footers.

Add a parameter — `emailShell(heading, bodyHtml, { audience: "client" | "internal" })`, defaulting
to `"client"` so nothing client-facing can be missed by omission. Set `internal` explicitly on the
two admin modules and on the daily error digest.

## The app

`diedericks-dobermanns` sends push notifications rather than email, and push has no room for a
footer. **Instead: every error or empty state in the app that leaves a client stuck must offer the
same WhatsApp link.** Check the sign-in failure, the registration failure, and the empty-portal
state. The point is the client always has a route to a person — email is only one channel.

---

## Rules

- One footer, in `emailShell`. No per-template copies.
- Values from `app_settings`, never hard-coded.
- A missing setting hides that line; it never renders empty or "undefined".
- Client emails get it by default; internal ones must opt out explicitly.
- No file over 300 lines.

## Verify

- [ ] The application confirmation, approval, quote-sent, contract and go-home emails all show the footer, with working `mailto:` and `wa.me` links.
- [ ] Clicking the WhatsApp link on a phone opens a chat to +27 78 215 0832.
- [ ] Changing `contact_whatsapp` in admin settings changes the next email sent — verify by sending one, not by reading the code.
- [ ] Blanking `contact_email` hides that line and leaves the WhatsApp line intact.
- [ ] Admin alerts, kennel alerts and the daily error digest do **not** show it.
- [ ] A new client-facing email added later gets the footer without the author doing anything.
- [ ] The app offers the WhatsApp link on sign-in failure, registration failure and an empty portal.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
