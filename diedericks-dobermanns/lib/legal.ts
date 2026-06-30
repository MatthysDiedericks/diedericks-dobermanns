/**
 * Terms & Conditions of Sale content. Kept as structured data so the legal copy
 * lives in one place and can be rendered consistently (and versioned) across the
 * app — the public Terms screen, the application acceptance step, and the portal.
 */

export const TERMS_VERSION = '1.0';
export const TERMS_EFFECTIVE_DATE = '2026';

export const TERMS_IMPORTANT = `By submitting an application, paying a deposit, or accepting delivery of a dog from Diedericks Dobermanns, the Purchaser agrees to be bound by these Terms and Conditions in their entirety. These Terms constitute a legally binding agreement under South African law. If you do not agree, do not proceed with your application.`;

export interface TermDefinition {
  term: string;
  meaning: string;
}

export const TERMS_DEFINITIONS: TermDefinition[] = [
  { term: 'Diedericks', meaning: 'means Diedericks Dobermanns, its owners, representatives, and agents.' },
  { term: 'Purchaser', meaning: 'means the individual or entity purchasing or receiving a dog from Diedericks.' },
  { term: 'Dog', meaning: 'means any Dobermann puppy, developed puppy, or adult dog supplied by Diedericks under this agreement.' },
  { term: 'Deposit', meaning: 'means the non-refundable reservation payment made to secure a Dog.' },
  { term: 'Handover', meaning: 'means the formal transfer of the Dog to the Purchaser, whether in person or via arranged delivery.' },
  {
    term: 'Welfare Breach',
    meaning:
      'means any act, omission, or condition that in the reasonable opinion of Diedericks constitutes neglect, abuse, endangerment, or inadequate care of the Dog.',
  },
];

export interface TermsBlock {
  /** A paragraph of body text. */
  text?: string;
  /** A bulleted list. */
  bullets?: string[];
}

export interface TermsSection {
  number: string;
  title: string;
  blocks: TermsBlock[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    number: '2',
    title: 'Application and Reservation',
    blocks: [
      { text: '2.1 All applications are subject to screening and approval at the sole discretion of Diedericks. Submission of an application does not guarantee placement of a Dog.' },
      { text: '2.2 A deposit is required to secure a reservation. The deposit amount will be confirmed in writing at the time of approval.' },
      { text: '2.3 Deposits are strictly non-refundable under all circumstances, including but not limited to: change of mind, personal circumstances, death or illness of a litter member, or failure to meet our placement criteria on review.' },
      { text: '2.4 Diedericks reserves the right to withdraw any Dog from sale at any time prior to Handover, for any reason deemed necessary in the interests of the Dog or the integrity of the breeding programme. In such an event, the deposit shall be refunded in full as the sole remedy available to the Purchaser.' },
      { text: '2.5 The placing of a deposit does not transfer ownership of the Dog. Ownership transfers only upon full payment of the purchase price and completion of formal Handover.' },
    ],
  },
  {
    number: '3',
    title: 'Purchase Price and Payment',
    blocks: [
      { text: '3.1 The full purchase price must be paid in cleared funds prior to or at the time of Handover, unless otherwise agreed in writing by Diedericks.' },
      { text: '3.2 Diedericks accepts no responsibility for exchange rate fluctuations in international transactions. All payments must be received in the agreed currency at the agreed amount.' },
      { text: '3.3 Ownership of the Dog does not pass to the Purchaser until payment has been received in full.' },
    ],
  },
  {
    number: '4',
    title: 'Breeding Rights — Strictly Prohibited',
    blocks: [
      { text: '4.1 All dogs sold by Diedericks are sold WITHOUT breeding rights. This applies to all tiers: Standard Puppies, Elite Developed Puppies, and Elite Family Protection Dogs.' },
      { text: '4.2 The Purchaser is expressly prohibited from:' },
      {
        bullets: [
          'Using the Dog for any breeding purpose whatsoever;',
          'Allowing the Dog to be mated, whether intentionally or through negligence;',
          'Registering the Dog for breeding with any kennel club or breed registry;',
          'Selling, transferring, or offering the Dog for breeding to any third party.',
        ],
      },
      { text: '4.3 Breeding rights may only be granted by Diedericks in a separate, written Breeding Rights Agreement signed by both parties. No verbal agreement, implied consent, or prior conduct shall constitute the granting of breeding rights.' },
      { text: '4.4 Any breach of this clause entitles Diedericks to immediate reclaim of the Dog without compensation to the Purchaser. Any puppies produced in breach of this clause remain the property of Diedericks.' },
      { text: '4.5 Dogs sold without breeding rights will be supplied with a registration limited to companion/performance use only, where applicable.' },
    ],
  },
  {
    number: '5',
    title: 'Welfare Obligations — The Purchaser\u2019s Duty of Care',
    blocks: [
      { text: '5.1 The Purchaser accepts full responsibility for the health, safety, welfare, and wellbeing of the Dog from the moment of Handover.' },
      { text: '5.2 The Purchaser agrees to:' },
      {
        bullets: [
          'Provide the Dog with adequate food, clean water, shelter, and veterinary care at all times;',
          'Ensure the Dog is housed in a safe, secure environment appropriate to the breed;',
          'Maintain all vaccinations and preventative health treatments as recommended by a qualified veterinarian;',
          'Not subject the Dog to any form of abuse, neglect, or cruelty;',
          'Not use the Dog in any illegal activity, dogfighting, or any activity that causes the Dog unnecessary suffering;',
          'Notify Diedericks within 48 hours if the Dog is lost, stolen, involved in a serious incident, or requires emergency veterinary intervention.',
        ],
      },
      { text: '5.3 The Purchaser acknowledges that Diedericks places every Dog with the Purchaser based on trust. That trust must be honoured.' },
    ],
  },
  {
    number: '6',
    title: 'Right of Reclaim — Welfare Intervention',
    blocks: [
      { text: '6.1 Diedericks reserves the absolute and unconditional right to reclaim any Dog at any time, without prior notice, and without compensation to the Purchaser, where Diedericks reasonably believes that a Welfare Breach has occurred or is occurring.' },
      { text: '6.2 Grounds for reclaim include but are not limited to:' },
      {
        bullets: [
          'Evidence of neglect, abuse, or inadequate care;',
          'Failure to provide adequate veterinary treatment;',
          'Unsafe, unsanitary, or inappropriate living conditions;',
          'Breach of the no-breeding-rights clause;',
          'Illegal use of the Dog;',
          'Abandonment or surrender of the Dog to a third party without Diedericks\u2019 written consent;',
          'Any other circumstance in which Diedericks determines, in its sole and reasonable discretion, that the Dog\u2019s welfare is at risk.',
        ],
      },
      { text: '6.3 Diedericks may exercise this right of reclaim based on information received from any source, including but not limited to: direct observation, veterinary reports, third-party reports, photographic or video evidence, or social media documentation.' },
      { text: '6.4 The Purchaser grants Diedericks irrevocable authority to take possession of the Dog upon presentation of this agreement. The Purchaser waives any right to resist or delay such reclaim.' },
      { text: '6.5 Upon reclaim, Diedericks shall bear no obligation to return the Dog to the Purchaser, refund any portion of the purchase price, or provide compensation of any nature. The welfare of the Dog is paramount.' },
      { text: '6.6 The Purchaser agrees to cooperate fully with any welfare inspection conducted by Diedericks or its authorised representative. Failure to cooperate shall itself constitute grounds for reclaim.' },
    ],
  },
  {
    number: '7',
    title: 'Transfer and Rehoming',
    blocks: [
      { text: '7.1 The Dog may not be sold, gifted, transferred, rehomed, surrendered, or placed with any third party without the prior written consent of Diedericks.' },
      { text: '7.2 Should the Purchaser be unable to keep the Dog for any reason, the Purchaser must first offer the Dog back to Diedericks. Diedericks shall have the right of first refusal at no cost.' },
      { text: '7.3 Diedericks must approve any rehoming arrangement. Any unapproved transfer shall be deemed a breach of these Terms, entitling Diedericks to immediate reclaim.' },
      { text: '7.4 The new owner in any approved transfer must sign and agree to these Terms in full before the transfer is concluded.' },
    ],
  },
  {
    number: '8',
    title: 'Health Guarantee',
    blocks: [
      { text: '8.1 Diedericks warrants that all Dogs are vaccinated, dewormed, microchipped, and certified by a registered veterinarian as healthy at the time of Handover.' },
      { text: '8.2 Parents of all puppies are health tested for Dilated Cardiomyopathy (DCM1–DCM5), hip dysplasia (HD), and elbow dysplasia (ED) in accordance with Diedericks\u2019 breeding protocol.' },
      { text: '8.3 The Purchaser is required to have the Dog examined by a registered veterinarian within 72 hours of Handover. Failure to do so voids any health-related claim.' },
      { text: '8.4 Diedericks provides a limited health guarantee against life-threatening congenital conditions diagnosed within 12 months of Handover, subject to the following conditions:' },
      {
        bullets: [
          'Written veterinary diagnosis from a registered veterinarian must be provided;',
          'The condition must be congenital and not the result of injury, environmental factors, or Purchaser negligence;',
          'The Dog must have received all vaccinations and veterinary care as recommended.',
        ],
      },
      { text: '8.5 The health guarantee is limited to replacement of the Dog at Diedericks\u2019 discretion. No cash refund will be issued under any circumstances.' },
      { text: '8.6 Diedericks makes no guarantee regarding working ability, sport performance, or protection aptitude beyond the training documentation provided at Handover.' },
    ],
  },
  {
    number: '9',
    title: 'Training and Behaviour',
    blocks: [
      { text: '9.1 For Elite Developed Puppies and Elite Family Protection Dogs, Diedericks provides a formal Handover session that includes handling instruction and training guidance. The Purchaser is required to participate fully in this session.' },
      { text: '9.2 The Purchaser acknowledges that ongoing training, socialisation, and correct handling are essential to maintaining the Dog\u2019s behaviour and temperament. Diedericks is not responsible for behavioural issues arising from inconsistent handling, inadequate training, or failure to follow Handover guidance.' },
      { text: '9.3 The Purchaser agrees not to subject the Dog to any training method, device, or practitioner that Diedericks reasonably considers harmful, abusive, or contrary to the Dog\u2019s welfare and training foundation.' },
      { text: '9.4 Any significant change in training approach or trainer must be communicated to Diedericks in advance. Diedericks reserves the right to withdraw aftercare support if it determines that the Dog\u2019s training is being undermined.' },
    ],
  },
  {
    number: '10',
    title: 'Liability',
    blocks: [
      { text: '10.1 The Purchaser accepts full legal liability for any injury, damage, or harm caused by the Dog from the moment of Handover.' },
      { text: '10.2 Diedericks shall not be liable for any injury, death, damage, or loss arising from the behaviour of the Dog after Handover, including but not limited to: bites, attacks, property damage, or incidents involving children or other animals.' },
      { text: '10.3 The Purchaser indemnifies and holds Diedericks harmless from any claim, action, demand, or liability arising from the Dog\u2019s behaviour after Handover.' },
      { text: '10.4 The Purchaser is solely responsible for ensuring adequate third-party liability insurance is in place where required by law or common sense.' },
    ],
  },
  {
    number: '11',
    title: 'Confidentiality and Privacy',
    blocks: [
      { text: '11.1 The Purchaser agrees that the personal information provided during the application process is collected and processed in accordance with applicable data protection law, including the Protection of Personal Information Act 4 of 2013 (POPIA) where applicable.' },
      { text: '11.2 Diedericks may use the Purchaser\u2019s information to: process the application, manage the relationship, send relevant updates about the Dog, and contact the Purchaser regarding welfare matters.' },
      { text: '11.3 Diedericks may share information with veterinarians, trainers, or regulatory authorities where the welfare of the Dog requires it.' },
    ],
  },
  {
    number: '12',
    title: 'Dispute Resolution',
    blocks: [
      { text: '12.1 These Terms are governed by the laws of the Republic of South Africa.' },
      { text: '12.2 In the event of a dispute, the parties agree to attempt resolution through good-faith negotiation in the first instance.' },
      { text: '12.3 If negotiation fails, disputes shall be referred to a mutually agreed mediator before any legal proceedings are instituted.' },
      { text: '12.4 The Purchaser consents to the jurisdiction of the South African courts for the resolution of any dispute arising from these Terms.' },
    ],
  },
  {
    number: '13',
    title: 'General',
    blocks: [
      { text: '13.1 These Terms constitute the entire agreement between the parties and supersede all prior representations, discussions, and agreements.' },
      { text: '13.2 No verbal agreement, implied term, or prior conduct shall vary these Terms unless confirmed in a written amendment signed by Diedericks.' },
      { text: '13.3 If any provision of these Terms is found to be unenforceable, the remaining provisions continue in full force.' },
      { text: '13.4 Diedericks reserves the right to update these Terms from time to time. The version in force at the time of application and payment shall apply to that transaction.' },
      { text: '13.5 These Terms are binding on the Purchaser\u2019s heirs, successors, and assigns.' },
    ],
  },
];

export const TERMS_ACCEPTANCE_POINTS = [
  'They have read and understood these Terms and Conditions in full.',
  'They agree to be bound by them without reservation.',
  'They understand that Diedericks Dobermanns places the welfare of every dog above all other considerations — and that this agreement exists to protect that standard.',
];

export const TERMS_LEGAL_NOTE = `These Terms and Conditions have been prepared as a starting framework under South African law. For full legal enforceability, particularly regarding the reclaim clause and international sales, engagement with a qualified South African attorney prior to enforcement is recommended.`;
