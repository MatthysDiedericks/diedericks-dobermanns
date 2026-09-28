# Cursor Prompt — Make the pedigree look like a certificate, not a spreadsheet

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration, and no data changes.** The ancestor data was cleaned on 15 Sep 2026 —
   registry numbers stripped out of the titles line, ancestor names normalised to the spelling on
   the registration papers. This job is presentation only.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What this has to look like

Matt holds KUSA and AKC certificates for these dogs. Those are the benchmark, and clients
compare the two. A certificate reads as **one framed object** — a border, a header, a crest,
ruled cells of equal weight, generous margins. Ours currently reads as a spreadsheet that ran
out of room.

Look at `/dogs/9323ac7c-3547-4576-9594-9d2b01ed7f0f` (Eben) before you start. Five things are
wrong, and they compound.

## The five faults

**1. The photos are ruined by the crop.** `PedigreeCell.tsx:45`:

```tsx
className="mb-1.5 h-16 w-full object-cover object-top"
```

A fixed 64px band across the full cell width, cropped from the **top**. A dog photographed
standing in a field gives you sky and grass; the dog is cut out. On Eben's chart his sire's cell
is a strip of lavender field, and Eben's own is a head peeking over a lawn. **These are good
photographs being destroyed by the frame.**

Use a **portrait aspect ratio** — roughly 3:4, which is how a dog actually fits a frame — and
crop from the **centre**, not the top. Give the photo a fixed footprint so every cell that has
one looks the same. `aspect-[3/4]` with `object-cover object-center` and a capped height.

**2. Cell content floats in the middle of enormous boxes.** The grid gives a generation-1 cell
eight rows and a generation-4 cell one, and every cell is `justify-center`. So the sire's name
sits marooned in the vertical middle of a box eight times taller than it needs. That is the
sprawl and the reason nothing lines up across columns.

**Anchor the content to the top of each cell** (`justify-start`) so names across a column sit on a
common line, and let the tall cells carry their extra height as quiet space below — or better,
centre the *photo block* and top-align the text beneath it. Either reads as deliberate. The
current arrangement does not.

**3. Empty cells look like a broken page.** `EmptyPedigreeCell` renders a bare dark rectangle with
a border at 8% opacity. Most of Eben's fourth generation is empty, so the right-hand third of the
chart is a field of grey boxes.

An unknown ancestor is a normal fact in a pedigree — **render it as an intentional blank**, not a
missing tile. Consider a faint centred em-dash or the crest monogram at very low opacity, and drop
the border entirely so empty cells recede instead of competing.

**4. There is no frame.** The chart floats on the page with no containing border, no title, no
crest, no kennel name. Wrap it: a thin gold rule around the whole chart, a header band with the
crest and **DIEDERICKS DOBERMANNS** and the dog's registered name, and a footer line carrying the
registration number and the date. That single change does most of the work of making it read as a
document.

**5. The horizontal rule cuts through the content.** `PedigreeChart.tsx:98-102` draws a 1px gold
line across the full width at 50% to divide sire line from dam line. It passes straight through
whatever cell happens to be there. Either inset it into the gutters between cells, or drop it —
the SIRE LINE / DAM LINE labels already carry that meaning.

## What to keep

- The **SIRE LINE / DAM LINE** rotated labels. They are good and they are what a certificate does.
- The gold-on-near-black palette, Cinzel for headings, Lato for body. The brand is right.
- The generation column headings.
- The per-generation density rules in `lib/pedigree/density.ts` — showing fewer fields as the
  generations get deeper is correct. Tune the sizes if you need to, but keep the principle.
- The link behaviour on ancestors that exist as dogs in our system.

## Task — the work

Rework `PedigreeChart.tsx` and `PedigreeCell.tsx` on the website against the five faults above,
then bring the app's `components/dogs/PedigreeTree.tsx` to match. The two must look like the same
document rendered at two sizes, not two different designs.

**Four generations does not fit on a phone.** Do not try to make it. On a narrow screen, show the
subject with sire and dam, and let the deeper generations open in a column view or a horizontal
scroll with the first column pinned. A four-column grid squeezed into 375px is unreadable and it
is why this currently needs sideways scrolling to make any sense.

**Print matters.** Clients print these. Check it on A4 landscape: the frame should hold, the
`print:hidden` controls should disappear, and nothing should break across a page boundary
mid-cell.

## Do not

- Do not change any ancestor data. It was corrected against the registration papers today.
- Do not remove the `Add photo` button — it is how the gaps get filled — but keep it out of the
  printed and public views.
- Do not introduce a new colour. Everything needed is already in the brand tokens.
- Do not add a migration.

---

## Report

1. Screenshot of Eben's pedigree before and after, full width.
2. The same for **Santini** — he now has a complete four-generation pedigree with titles on almost
   every ancestor, so he is the test of a dense chart. Eben is the test of a sparse one.
3. Screenshot at 375px wide showing the narrow-screen behaviour.
4. A print preview at A4 landscape.
5. The same three on the app.
6. `npx tsc --noEmit` clean in both repos.
