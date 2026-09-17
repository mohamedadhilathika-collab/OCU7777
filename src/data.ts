import { ComicVolume, GiftCode, AcademyResource, AcademySettings } from './types';

export const OCU_COMICS: ComicVolume[] = [
  {
    id: 'genesis-void',
    volumeNumber: 1,
    title: 'Genesis of the Void',
    releaseStatus: 'Released',
    shortDescription: 'Witness the cataclysmic events that shattered the cosmic balance and awakened the ancient cosmic horrors.',
    longDescription: 'In this breathtaking initial chapter, a team of pioneering quantum scientists accidentally trigger the Kinetic Event. As reality tears open, Marcus Vance undergoes a stunning transformation, while a deeper terror—long imprisoned within a neutron star—begins to stir. "Genesis of the Void" sets the ultimate foundation for the OCU.',
    price: 149,
    pages: 48,
    writer: 'Jonathan Hickman',
    artist: 'Esad Ribic',
    coverGradient: 'from-blue-900 via-purple-950 to-neutral-950',
    releaseDate: 'October 2024'
  },
  {
    id: 'vanguard-reborn',
    volumeNumber: 2,
    title: 'Vanguard Reborn',
    releaseStatus: 'Released',
    shortDescription: 'Earths greatest protectors unite under Aegis in an epic battle to defend humanity from extra-dimensional threats.',
    longDescription: 'Following the Paris Rift incident, Earth has become a beacon for cosmic predators. Aegis recognizes that a scattered line of defense is a broken one. He recruits the elusive Vortex and the newly crashed star-born Aetherion. Together, they form the Vanguard—unaware that their unity is exactly what the shadow forces wanted.',
    price: 199,
    pages: 64,
    writer: 'Jonathan Hickman',
    artist: 'Esad Ribic',
    coverGradient: 'from-red-900 via-neutral-900 to-black',
    releaseDate: 'February 2025'
  },
  {
    id: 'echoes-aetherion',
    volumeNumber: 3,
    title: 'Echoes of Aetherion',
    releaseStatus: 'Released',
    shortDescription: 'Discover the cosmic origin of the star-weaver and the tragic collapse of the Ophiuchus dynasty.',
    longDescription: 'Travel billions of light years away to explore the final days of Ophiuchus. This volume traces the tragic history of Kaelen Thule, his training under stellar elders, the devastating invasion of the Void Singularity, and the desperate, burning escape to Earth. Contains deep revelations about Malachor\'s grand strategy.',
    price: 249,
    pages: 56,
    writer: 'Al Ewing',
    artist: 'Valerio Schiti',
    coverGradient: 'from-yellow-900/60 via-amber-950 to-neutral-950',
    releaseDate: 'May 2025'
  },
  {
    id: 'malachor-protocol',
    volumeNumber: 4,
    title: 'The Malachor Protocol',
    releaseStatus: 'Pre-Order',
    shortDescription: 'The final showdown approaches. Malachor launches dark matter anchors onto Earths lay-lines.',
    longDescription: 'The climax of the first phase of the OCU. Malachor’s shadowy influence has successfully corrupted key global politicians, creating a dark lattice that threatens to collapse our solar system. The Vanguard must execute a dangerous counter-assault on multiple fronts, in the deep ocean, inside quantum space, and on the surface of the Moon.',
    price: 299,
    pages: 80,
    writer: 'Jonathan Hickman',
    artist: 'Peach Momoko',
    coverGradient: 'from-violet-950 via-indigo-950 to-neutral-950',
    releaseDate: 'September 2026'
  }
];

export const INITIAL_GIFT_CODES: GiftCode[] = [
  { code: 'OCU-GIFT-7X9A-K2M1', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-P4L8-Q7WN', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-M9ZT-3KXA', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-H2QY-8VLR', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-N5CW-R4JP', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-B8MK-T6XE', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-F3RA-9UZQ', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-Y7NP-2DHK', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-C6JL-W8MV', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-K4XS-5QBT', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-R8VD-N3LP', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-T5QM-H7XC', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-Z2WR-K8FN', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-U9LA-P6DY', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-G4XE-M2QV', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-J7PK-R9TW', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-X6NB-C3AH', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-L8YU-F5ZR', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-D3VM-Q7SK', enabled: true, status: 'Unredeemed', remainingUses: 1 },
  { code: 'OCU-GIFT-W9HT-J4GX', enabled: true, status: 'Unredeemed', remainingUses: 1 }
];

export const INITIAL_ACADEMY_SETTINGS: AcademySettings = {
  heading: 'OCU ACADEMY',
  subheading: 'High-yield revision blueprints, chapter-by-chapter breakdowns, solved question sets, and student study kits tailored for 11th-Grade state board academic excellence.'
};

export const INITIAL_ACADEMY_RESOURCES: AcademyResource[] = [
  {
    id: 'accountancy',
    title: '11th-Grade Accountancy Revision (State Board)',
    stream: 'Commerce & Financial Studies',
    badge: 'State Board Syllabus',
    description: 'Master double-entry bookkeeping, trial balance adjustments, depreciation accounting, and financial statement formulation with step-by-step solved examples.',
    features: [
      'Golden Rules of Accounting with Practical Journal Entries',
      'Bank Reconciliation Statement (BRS) Formats & Timing Differences',
      'Straight Line & Diminishing Value Depreciation Worksheets',
      'Final Accounts Formulation with 12 Comprehensive Adjustments',
      'Rectification of Errors & Suspense Account Problem Sets'
    ],
    chapters: [
      { name: 'Unit 1: Introduction to Accounting & Journaling', detail: 'Rules of debit/credit, accounting equation, source documents, voucher preparation.' },
      { name: 'Unit 2: Subsidiary Books & Bank Reconciliation', detail: 'Three-column cash books, petty cash imprints, and BRS timing differences.' },
      { name: 'Unit 3: Trial Balance, Depreciation & Final Accounts', detail: 'Asset scrap calculations, Trading and P&L accounts, and Balance Sheet formulation.' }
    ],
    examTips: [
      'Always verify debit and credit column totals before posting adjusting journal entries.',
      'Remember that prepaid expenses are deducted from respective expenditure and shown under Assets.',
      'Check whether depreciation is per annum or lump-sum for partial calendar years.'
    ],
    docPages: 48,
    tier: 'free',
    priceINR: 0,
    pdfFileName: '11th_Accountancy_StateBoard_Revision_Kit.pdf',
    pdfUrl: ''
  },
  {
    id: 'english',
    title: '11th-Grade English Exam Prep',
    stream: 'Literature & Language Arts',
    badge: 'State Board Core',
    description: 'Complete line-by-line prose analysis, poetic device breakdowns, formal writing frameworks (letters, notices, reports), and high-frequency grammar drills.',
    features: [
      'Detailed Chapter-Wise Prose Explanations & Character Sketches',
      'Poetry Stanza Explanations, Rhyme Schemes & Figurative Devices',
      'Standardized Templates for Formal Letters, Notices & Report Writing',
      'Grammar Precision: Active/Passive Voice, Reported Speech & Concord',
      'Unseen Comprehension Passage Speed-Reading Methodologies'
    ],
    chapters: [
      { name: 'Section A: Reading Comprehension Mastery', detail: 'Speed-reading strategies, contextual inference extraction, and thematic vocabulary.' },
      { name: 'Section B: Advanced Creative & Business Writing', detail: '50-word notice constraints, letter to the editor format, and event reporting.' },
      { name: 'Section C: Prescribed Prose & Poetry Critical Annotations', detail: 'Theme analysis, historical context, symbolism, and character motivations.' }
    ],
    examTips: [
      'Explicitly cite poetic devices (metaphor, simile, personification) in 3-mark stanza questions.',
      'Keep notices strictly within a boxed border and adhere to the 50-word threshold.',
      'Underline key character traits and chapter quotations in long-answer responses.'
    ],
    docPages: 62,
    tier: 'free',
    priceINR: 0,
    pdfFileName: '11th_English_Exam_Preparation_Manual.pdf',
    pdfUrl: ''
  },
  {
    id: 'ocu-notes',
    title: 'OCU Notes & General Study Materials',
    stream: 'General Academic Repository',
    badge: 'Omni Study Kit',
    description: 'Consolidated high-yield formula cheat-sheets, memorization mind maps, past board question paper breakdowns, and strategic 30-day revision schedules.',
    features: [
      'Comprehensive Formula & Definition Quick-Reference Sheets',
      '5-Year Solved Past State Board Question Bank & Answer Keys',
      '30-Day Spaced Repetition Study Timetable & Daily Targets',
      'Model Question Papers with Official Marking Rubrics',
      'Exam Day Time-Management Blueprint & Stress-Reduction Guide'
    ],
    chapters: [
      { name: 'Module 1: High-Yield Memory Maps & Quick Formulations', detail: 'One-page condensed reference guides for commerce formulas and grammar syntax.' },
      { name: 'Module 2: Solved Past Board Exam Papers (PYQs)', detail: 'Detailed marking schemes illustrating how examiners award step marks.' },
      { name: 'Module 3: 30-Day Sprint Schedule & Mindset Protocol', detail: 'Daily micro-goals designed to prevent burnout and ensure 3 full syllabus revisions.' }
    ],
    examTips: [
      'Review your consolidated formula sheet for 15 minutes before bedtime every night.',
      'Solve at least two full 3-hour sample papers in exam conditions to build stamina.',
      'Start answering from section with highest marks weightage where you feel most confident.'
    ],
    docPages: 84,
    tier: 'free',
    priceINR: 0,
    pdfFileName: 'OCU_General_Notes_Master_Toolkit.pdf',
    pdfUrl: ''
  }
];


