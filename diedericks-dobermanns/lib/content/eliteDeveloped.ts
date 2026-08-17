/** Public copy for The Elite Developed Puppy Programme. Do not water down. */

export const ELITE_DEVELOPED_TITLE = "The Elite Developed Puppy Programme";
export const ELITE_DEVELOPED_TAGLINE = "Born With Purpose. Built With Discipline.";
export const ELITE_DEVELOPED_FOOTER =
  "Diedericks Dobermanns · Born With Purpose. Built With Discipline.";

export const ELITE_DEVELOPED_INTRO = [
  "An Elite Developed Puppy leaves Diedericks Dobermanns at six months old, having spent the most formative period of its life in the hands of the people who bred it.",
  "Those six months cannot be bought back later. The windows in which a young Dobermann learns what the world is, what noise means, what a stranger is, and what its handler expects of it open once and close quietly. What happens inside them shapes the adult dog permanently.",
  "This is what we do with that time.",
] as const;

export const ELITE_DEVELOPED_HOW = {
  title: "How the programme is built",
  paragraphs: [
    "Six strands run through the programme. They are not stages to be completed and set aside — they develop together, each one reinforcing the others.",
    "A puppy that is confident in the world learns obedience faster. A puppy with clean obedience can be taken safely into new environments. A puppy with both can begin protection foundation without confusion or conflict. **The order matters, and so does the overlap.**",
  ],
} as const;

export type EliteStrand = {
  number: number;
  title: string;
  when: string;
  lead: string[];
  bullets: string[];
  note?: string;
  why: string;
};

export const ELITE_DEVELOPED_STRANDS: EliteStrand[] = [
  {
    number: 1,
    title: "Foundation Training",
    when: "From eight weeks",
    lead: [
      "Before a dog can be trained, it must learn *how* to learn.",
      "Foundation work builds the relationship everything else depends on: engagement with the handler, willingness to offer behaviour, and the beginnings of impulse control. We shape the puppy's understanding that working with a person is rewarding, clear and predictable.",
    ],
    bullets: [
      "Marker and reward conditioning — teaching the puppy what \"yes\" means",
      "Name recognition and voluntary attention",
      "Food and toy drive development, channelled and controlled",
      "Early impulse control: waiting, settling, releasing on cue",
      "Crate confidence and calm restraint",
      "Body handling — feet, ears, mouth, grooming and veterinary tolerance",
    ],
    why: "a puppy that has learned to think under mild pressure becomes a dog that can think under real pressure. Everything later in the programme rests on this.",
  },
  {
    number: 2,
    title: "Home Obedience",
    when: "From ten weeks, throughout",
    lead: [
      "A working dog that cannot live in a house is not a family dog.",
      "Home obedience is the quiet, practical work that most training programmes skip and most owners actually care about. It is taught in a real home environment, not only on a training field.",
    ],
    bullets: [
      "House training and clean crate habits",
      "Settling on a place command while the household moves around",
      "Door manners — no bolting, no charging visitors",
      "Calm behaviour around food preparation and family meals",
      "Appropriate greeting of guests",
      "Toleration of household noise, movement and disruption",
    ],
    why: "the first fortnight in a new home decides how a family feels about their dog for the next decade. We send a puppy that already knows how to live indoors.",
  },
  {
    number: 3,
    title: "Obedience",
    when: "From twelve weeks, building throughout",
    lead: [
      "Formal obedience, taught to a standard we would be comfortable demonstrating in public.",
    ],
    bullets: [
      "Heel position, on lead and progressing off lead",
      "Sit, down and stand from motion",
      "Stay with duration, distance and distraction, built in that order",
      "Recall under increasing levels of distraction",
      "Directional control and place work",
      "Sustained handler focus",
    ],
    note: "We train with a **balanced methodology** — clear reward for correct behaviour, fair and consistent correction where the dog understands the exercise and chooses otherwise. Every dog is met where it is. A sensitive dog and a hard dog do not receive the same handling, and pretending otherwise produces neither reliability nor confidence.",
    why: "an obedient dog is a safe dog. A protection-trained dog without reliable obedience is a liability, and we will not produce one.",
  },
  {
    number: 4,
    title: "Socialisation",
    when: "Continuous, structured",
    lead: [
      "Socialisation is not exposure. Exposure is simply putting a puppy somewhere; socialisation is managing what it learns while it is there.",
    ],
    bullets: [
      "Structured introductions to adults, children and the elderly",
      "Stable, balanced adult dogs — never uncontrolled dog parks",
      "Livestock, poultry and other animals where appropriate",
      "Handling by strangers, including veterinary and grooming contexts",
      "Neutrality training: the puppy learns that most people and dogs are simply not its concern",
    ],
    note: "We work deliberately around the recognised **fear periods** in a young dog's development. A frightening experience at the wrong week can leave a mark that takes a year to undo — so during those windows we consolidate rather than push.",
    why: "we are not producing a dog that loves everyone. We are producing a dog that is *neutral* — confident, unbothered, and reserving its attention for its family. Neutrality is the foundation of a sound protection dog.",
  },
  {
    number: 5,
    title: "Environmental Conditioning",
    when: "From twelve weeks, progressively",
    lead: [
      "A dog is only as reliable as the range of places it has proven itself.",
    ],
    bullets: [
      "Varied surfaces — tile, steel, gravel, grating, water, unstable footing",
      "Heights, stairs, enclosed and echoing spaces",
      "Traffic, machinery, gunfire and sudden noise, introduced at distance and closed gradually",
      "Urban environments, shopping precincts, loading areas",
      "Vehicles: travelling calmly, loading and unloading under control",
      "Night work and low-light conditions",
      "Weather, crowds, and general unpredictability",
    ],
    note: "Each exposure is introduced below the puppy's threshold and built up only as it shows genuine confidence. **We are not testing the dog. We are proving to the dog that the world is manageable.**",
    why: "an untested dog is an unknown dog. Environmental conditioning is what separates a dog that works at home from one that works anywhere.",
  },
  {
    number: 6,
    title: "Protection Foundation",
    when: "Introduced from approximately sixteen weeks, on the individual dog's readiness",
    lead: [
      "Protection work at this stage is not bite work in the way people imagine. It is the careful building of the drives, confidence and clarity that genuine protection training will later require.",
    ],
    bullets: [
      "Prey drive development through rag and tug work",
      "Grip development — full, calm, confident mouth",
      "Targeting and building the desire to engage",
      "Early confidence-building against passive and mild pressure",
      "Clean outs and control on the equipment",
      "Clear separation between work and neutrality: the puppy learns when it is working and when it is not",
    ],
    note: "**Timing is decided by the dog, never by the calendar.** Some puppies are ready at sixteen weeks; others need longer. Starting protection foundation before a dog is mentally ready produces conflict and, in the worst cases, permanent damage to confidence. We do not force it, and we will tell you plainly if your puppy needed more time.",
    why: "foundation determines ceiling. A dog with a poor foundation can be trained to perform, but it will never be genuinely reliable under pressure.",
  },
];

export const ELITE_DEVELOPED_HONESTY = {
  willBeTitle: "What your puppy will be at six months",
  willBe:
    "A confident, well-mannered young Dobermann with genuine obedience, broad environmental exposure, and the foundation on which protection work can be properly built.",
  willNotTitle: "What your puppy will not be",
  willNotHeadline: "A finished dog.",
  willNot: [
    "An Elite Developed Puppy is developed, not fully trained. At six months it is a talented adolescent with an excellent start — and adolescence is still ahead. The dog will test boundaries. Some behaviour will look as though it has been forgotten. It has not; it is being questioned, which is normal and temporary.",
    "**What we build must be maintained.** A dog that is not worked will lose clarity within months. We are direct about this because buyers who understand it are the ones whose dogs go on to be exceptional — and because we would rather be honest before a sale than apologetic after one.",
  ],
} as const;

export const ELITE_DEVELOPED_HANDOVER = {
  title: "Delivery and handover",
  intro:
    "Your dog is not couriered. We deliver personally and conduct a formal handover in your home, where we work through:",
  bullets: [
    "Every command the dog knows, and exactly how it has been taught",
    "How the dog has been rewarded and corrected, so you can continue consistently",
    "Its individual temperament — what it finds easy, what it finds difficult",
    "Feeding, exercise and health management",
    "Your training plan for the next six months",
  ],
  close:
    "We remain available afterwards. A dog we bred and developed carries our name for its whole life, and we take that seriously.",
} as const;

export const ELITE_DEVELOPED_CONTINUING = {
  title: "Continuing the work",
  body: "Every Elite Developed Puppy leaves with a written development record and a structured plan for the months ahead. Owners who wish to go further — advanced obedience, full personal protection, or PSA sport — are welcome to continue with us.",
} as const;

export const ELITE_WHATSAPP_PREFILL =
  "Hello Diedericks Dobermanns, I would like to ask about the Elite Developed Puppy Programme.";
