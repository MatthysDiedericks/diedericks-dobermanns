export const COI_INFO_SECTIONS = [
  {
    title: 'UNDERSTANDING INBREEDING COEFFICIENTS',
    body: `What is COI?
The Coefficient of Inbreeding (COI) measures the probability that both copies of a gene in a puppy are identical because they came from the same ancestor. Developed by Dr. Sewall Wright in 1922.

A COI of 6.25% means there is a 6.25% chance any gene the puppy carries is a matching copy from a shared ancestor — the same as one generation of half-sibling mating.`,
  },
  {
    title: 'OUR SCALE (Diedericks Dobermanns)',
    body: `🟢 < 3.0%    EXCELLENT
Healthy diversity. Ideal for programme sustainability.

🟡 3.0–5.0%  ACCEPTABLE
Moderate linebreeding. Monitor pups with Holter at 24 months.

🟠 5.0–6.25% CAUTION
Approaching risk zone. Consider crossing to the other line.

🔴 > 6.25%   RISK
Equivalent to half-sibling. Do not proceed without genetics review.

⛔ > 12.5%   HIGH RISK
Equivalent to full sibling mating. Never proceed.`,
  },
  {
    title: 'WHY DOBERMANNS ARE DIFFERENT',
    body: `The Dobermann breed was created from just a handful of foundation dogs. This means the entire breed already carries a baseline COI of roughly 12–15% when calculated across all known generations.

DCM (Dilated Cardiomyopathy) is genetically linked in Dobermanns. Multiple variants exist (DCM1–DCM5). High COI increases the chance that a puppy receives two copies of a defective variant.

This is why we test DCM1 through DCM5 on every breeding dog — not just DCM1 as many breeders do. And it is why we set our COI threshold at 5%, lower than the breed-standard 6.25%.`,
  },
  {
    title: 'LINE BREEDING vs INBREEDING',
    body: `Line breeding: deliberately concentrating the genetics of ONE outstanding ancestor while keeping COI below 6.25%. Used to fix type, working drive, and temperament consistently across generations.

Inbreeding: repeating close relatives (siblings, parent × offspring). COI typically > 12.5%. Rapidly amplifies both positive traits AND genetic defects.

Diedericks Dobermanns practises controlled line breeding within each line, with deliberate crosses between lines every second generation to prevent COI accumulation. No outside blood will ever be purchased.`,
  },
  {
    title: 'HOW THE CALCULATION WORKS',
    body: `We use Wright's Path Coefficient method, analysing 4 generations of pedigree (parents, grandparents, great-grandparents, great-great-grandparents). Every ancestor that appears in BOTH the sire's and dam's pedigree contributes to the COI based on how many steps removed they are.

A common ancestor 3 generations back contributes less than one 2 generations back. The formula: F = Σ(0.5)^(n+m+1) where n and m are the number of steps from the common ancestor through the sire and dam sides respectively.`,
  },
  {
    title: 'SELF-SUSTAINING PROGRAMME',
    body: `For a two-line programme to remain self-sustaining indefinitely:

• Each line needs minimum 1 active sire + 2 active dams at all times
• Within-line pairings: every 1–2 generations, check COI
• When COI approaches 5%: cross to the other line for one generation
• Retain the best cross pup and return it to the original line
• Repeat every 2nd generation to keep both lines genetically refreshed
• Never let a line drop below 1 sire — the programme cannot recover without introducing outside blood

Sources: Wright (1922), Lacy (1997), Leroy (2011); Meurs et al (2019) — DCM genetic variants in Dobermann.`,
  },
] as const;
