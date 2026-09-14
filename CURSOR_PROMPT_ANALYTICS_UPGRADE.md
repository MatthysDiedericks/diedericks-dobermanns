# Cursor Prompt — Analytics: month to date, year to date, conversion, and the application funnel

## Do this first

1. Read the whole file before changing anything.
2. **Run `CURSOR_PROMPT_APPLICATION_FUNNEL_TRACKING.md` first.** The funnel section here reads the `application_step_events` table that prompt creates. If it is not there yet, build everything else and render the funnel section as "Step tracking not live yet."
3. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`. Analytics currently exists on both — extend them, do not rebuild.
4. **No migration.** Every figure below comes from `page_views`, `applications` and `application_step_events`.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## Why

Analytics today shows four numbers: views today, visitors today, views this week, visitors this week. Useful for a pulse, useless for a decision. It cannot answer "are we doing better than last month" or "how many visitors do we need for one application".

It can, because the data is already there. `page_views` carries `visitor_hash`, `is_bot`, `country` and `referrer_host`. Nothing new needs collecting.

**And there is something in that data Matt needs to see.** Measured on 11 September 2026:

| Month | Visitors | Applications | Conversion |
|---|---|---|---|
| August 2026 | 305 | 20 | **6.56%** |
| September 2026 (to the 11th) | 244 | 3 | **1.23%** |

Conversion has fallen by a factor of five. Two of those September days had a broken form, which explains part of it — but not all. **Nobody saw this, because nothing shows it.** That is what this screen is for.

---

## Task 1 — The headline row

Replace the four existing stats with a comparison, not a snapshot. Every number gets its prior period beside it and the change between them.

**Month to date** — 1st of this month to now, against the **same number of days** in the previous month. Comparing 11 days against a full 30 is meaningless and will make every month look like a collapse until the 28th.

**Year to date** — 1 January to now, against the same window last year. `page_views` only begins in August 2026, so until January 2027 show *"since tracking began, 1 Aug 2026"* rather than a fake year-to-date. **Do not present a partial year as a full one.**

For each period show: **visitors**, **views**, **applications**, **conversion**.

Show the change as a percentage with direction. Colour it only where it is unambiguous — green for more visitors, red for fewer. **Do not colour conversion automatically**: a fall caused by a spike in low-quality traffic is not a failure, and a rise caused by a traffic collapse is not a success.

## Task 2 — Conversion by month

A table, one row per calendar month, newest first:

| Month | Visitors | Applications | Conversion | vs prior month |
|---|---|---|---|---|

**Conversion is applications ÷ unique visitors, not ÷ views.** One person refreshing the dogs page twenty times is one potential buyer, not twenty. The existing `visitor_hash` already gives you this.

Exclude bots everywhere — `is_bot = true` must never enter any figure. In September that is 360 of 7,750 views, enough to move a percentage.

Mark the current month **"in progress"** so a half-finished month is never read as a finished one.

## Task 3 — The application funnel

Below conversion, the funnel from `application_step_events`:

```
/apply page views          ###
  Step 1  Personal         ###   (-##%)
  Step 2  Your home        ###   (-##%)
  Step 3  Experience       ###   (-##%)
  Step 4  Puppy            ###   (-##%)
  Step 5  Legal            ###   (-##%)
  Step 6  Review           ###   (-##%)
  Submitted                ###   (-##%)
```

- The **drop between steps** is the headline, not the count. Highlight the single biggest drop — that is the one thing on this screen worth acting on.
- Split by **device**. Most of this traffic is phones, and a form asking for an ID number behaves very differently there.
- Honour the same period selector as the rest of the page.
- If fewer than 20 people have entered the form in the period, show the counts but **suppress the percentages** and say *"too little data to read"*. A 50% drop from two people is noise, and a number on a screen gets believed.

## Task 4 — Where the traffic comes from

You already store `referrer_host` and `country` and only show country. Add a **sources** table — referrer host, visitors, applications, conversion — so Matt can see which channel sends buyers rather than browsers.

Group empty or null referrers as **"Direct or unknown"**. Do not drop them; on this site they will be a large share and pretending otherwise distorts everything else.

---

## Task 5 — One sentence, in plain words

At the top of the page, above the numbers, a single generated line:

> This month **244 visitors** have produced **3 applications** — **1.2%**, down from **6.6%** in August.

Matt reads one line and knows whether to keep scrolling. Write it in plain language, no jargon, no arrows, no emoji.

---

## Do not

- Do not add Google Analytics, a cookie banner, or any third-party script. The current setup is cookieless and privacy-first and that is deliberate.
- Do not count admin or portal pages, and do not count bots.
- Do not de-duplicate visitors across days. A visitor is counted once per day and someone returning tomorrow counts again — that is the existing definition, it is already explained on screen, and changing it silently would break every comparison against history.
- Do not write to any table. This screen only reads.
- Do not build a chart library dependency in the app repo for this. Numbers and simple bars are enough; the app is React Native and a charting package is not worth it here.

---

## Report

1. Screenshot of the analytics screen, both platforms.
2. The month-to-date comparison, showing it compares equal numbers of days — state the two date ranges it used.
3. Your August and September figures next to these, which came from the live database on 11 Sep 2026: **Aug 305 visitors / 20 applications / 6.56%**, **Sep to the 11th 244 / 3 / 1.23%**. If your numbers differ, stop and explain why before going further.
4. The funnel with real data, and proof that the suppression rule fires — set the period to a day with fewer than 20 entries and show the percentages hidden.
5. Confirmation bots are excluded — show the figure with and without `is_bot`.
6. `npx tsc --noEmit` clean in both repos.
