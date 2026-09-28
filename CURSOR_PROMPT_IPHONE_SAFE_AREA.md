# Cursor Prompt — iPhone side alignment, and a 404 in the main navigation

## Do this first

1. Repo: `diedericksdobermann-web`.
2. `npx tsc --noEmit` when done. Paste the real output.

---

## What I measured, so you do not chase the wrong thing

Matt reports the site is "a little bit out on the sides" on his iPhone. Tested live on 29 Sep 2026 at
375 x 812, 390 x 844 and 430 x 932, across `/`, `/dogs`, `/litters`, `/gallery` and `/apply`:

```
horizontal overflow          0 px on every page at every width
elements wider than viewport none
viewport meta                width=device-width, initial-scale=1
```

**Nothing is overflowing. Do not go looking for a runaway element or add `overflow-x: hidden`** —
that would hide a symptom that does not exist and create new bugs.

The actual finding, from 104 KB of compiled CSS:

```
env(...) used anywhere         NO
safe-area-inset used anywhere  NO
viewport-fit=cover             NO
```

And the gutters:

```
header               padding 0, first link sits at 20px
page sections        one at 20px / 20px, four at 0px / 0px
card inner text      21px from the edge
```

## Why this shows on an iPhone and not on a laptop

An iPhone's screen has **rounded corners** and a **Dynamic Island or notch**. iOS exposes the space
they consume through `env(safe-area-inset-left/right/top/bottom)`. This site never reads them.

So in portrait, a flat 20 px gutter puts text closer to the curve of the corner than it appears on a
square screen — which is exactly "a little bit out on the sides". In **landscape** it is worse: the
Island eats into one side, and because `viewport-fit=cover` is absent, Safari letterboxes the page
instead, producing uneven margins that change depending on which way the phone is turned.

The gutter is also not consistent — 20 px on section content, 21 px on card text. One pixel is
invisible on its own, but it means there is no single source of truth for the page gutter, and that
is what needs fixing rather than the pixel.

---

## Task

### 1. Let iOS tell the browser where the safe area is

In the root layout metadata, add `viewport-fit=cover`:

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

**On its own this makes things worse**, because the page then extends under the Island and the
corners. It must ship together with step 2, in the same commit.

### 2. One gutter token, respecting the safe area

Define the page gutter once and use it everywhere:

```css
--page-gutter: 1.25rem;                                    /* 20px, today's value */
padding-left:  max(var(--page-gutter), env(safe-area-inset-left));
padding-right: max(var(--page-gutter), env(safe-area-inset-right));
```

`max()` is the point: on a laptop the insets are 0 and you get the 20 px you have now; on an iPhone in
landscape you get whatever the Island actually needs. Nothing changes on desktop.

Apply it to the page shell — header, main, footer — **not to every component**. Then remove the
`px-5` / `px-4` gutters from inner sections that are only re-stating the page margin, so the 20/21
split disappears and there is one number to change.

Leave deliberate inner padding alone: a card's own `px-4` is the card's padding, not the page gutter.

### 3. The bottom edge too

The home indicator bar sits over the bottom of the screen. The floating WhatsApp button sits in that
zone:

```css
bottom: max(1.5rem, env(safe-area-inset-bottom));
```

Same for any sticky footer or fixed bar.

### 4. Check it at the sizes that matter

```
375 x 812   iPhone SE, mini
390 x 844   iPhone 12 through 15
430 x 932   iPhone Pro Max
```

Portrait **and landscape** for each. Landscape is where the absence of safe-area handling actually
bites, and it is almost certainly what Matt saw.

Confirm at each: no horizontal overflow, and every page's content starts at the same distance from
the edge.

---

## Separate finding — `/equipment` returns 404

`EQUIPMENT` is in the main navigation and `https://www.diedericksdobermanns.com/equipment` returns
**404**. Every other nav item returns 200.

Either the route was removed and the nav entry left behind, or it was renamed. Find out which and fix
whichever is wrong — a dead link in the main navigation of a premium site is worse than the alignment
Matt actually asked about.

---

## Do not

- Do not add `overflow-x: hidden` to `html` or `body`. There is no overflow. It hides real bugs.
- Do not add `viewport-fit=cover` without the safe-area padding in the same commit.
- Do not change the gutter value itself. 20 px is right; it just needs to be defined once and to
  respect the insets.
- Do not apply safe-area padding to every component — only the page shell and fixed elements.

---

## Report

1. The viewport change and the gutter token, with the files touched.
2. Screenshots at 390 x 844 **in landscape**, before and after.
3. Confirmation that horizontal overflow is still 0 at all three widths, both orientations.
4. The distinct left-edge offsets on `/dogs` after the change — there should be one, not three.
5. What `/equipment` was, and what you did about it.
6. `npx tsc --noEmit` clean.
