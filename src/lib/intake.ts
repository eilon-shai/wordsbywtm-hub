// ---------------------------------------------------------------------------
// Per-occasion intake spec — the occasion-specific copy + relationship taxonomy
// for the organizer CreateForm. The contributor form derives its own fields from
// collectionConfig.contributorFormFields; this supplies the create-flow labels
// (section headings, field labels/placeholders, relationship options, consent
// copy) that were previously hardcoded to the memorial/eulogy intake.
//
// Faithful to each original product's vocabulary (e.g. MilestoneScribe's
// workplace relationship taxonomy) while fitting the collaborative create flow.
// ---------------------------------------------------------------------------

export interface RelationshipOption {
  value: string;
  label: string;
}

export interface OccasionIntake {
  /** Heading for the "about the honoree" section, e.g. "About them". */
  aboutThemHeading: string;
  /** Honoree-name field. */
  honoreeLabel: string;
  honoreePlaceholder: string;
  /** Main memory/story field. */
  memoryLabel: string;
  memoryPlaceholder: string;
  /** Qualities / "known for" field. */
  qualitiesLabel: string;
  qualitiesPlaceholder: string;
  /** Relationship select options (organizer's own connection to the honoree). */
  relationshipOptions: RelationshipOption[];
  /** Short free-text describing the relationship. */
  relationshipDescriptionLabel: string;
  relationshipDescriptionPlaceholder: string;
  /** Optional "anything else" context field (also carries role/tenure etc.). */
  additionalContextLabel: string;
  additionalContextPlaceholder: string;
  /** Consent checkbox copy. */
  consentLabel: string;
}

// Memorial / eulogy — the original hardcoded values (unchanged behavior).
const memorialIntake: OccasionIntake = {
  aboutThemHeading: 'About them',
  honoreeLabel: 'Their name',
  honoreePlaceholder: 'e.g. Michael, Mike, or Michael James Chen',
  memoryLabel: '2–3 specific memories or stories',
  memoryPlaceholder:
    "The smell of her kimchi filling the house every Sunday. The way he'd quietly slip a $20 into your pocket on the way out. A specific moment — even a small one — beats a list of nice words.",
  qualitiesLabel: 'What qualities made them who they were?',
  qualitiesPlaceholder: 'e.g. endlessly patient, quietly funny, the first to show up when anyone needed help',
  relationshipOptions: [
    { value: 'child', label: 'Son or Daughter' },
    { value: 'parent', label: 'Mother or Father' },
    { value: 'sibling', label: 'Brother or Sister' },
    { value: 'spouse', label: 'Husband, Wife, or Partner' },
    { value: 'friend', label: 'Close Friend' },
    { value: 'colleague', label: 'Colleague or Mentor' },
    { value: 'other', label: 'Other' },
  ],
  relationshipDescriptionLabel: 'Describe your relationship briefly',
  relationshipDescriptionPlaceholder: 'e.g. her eldest daughter, his best friend of 30 years',
  additionalContextLabel: 'Anything else we should know',
  additionalContextPlaceholder:
    'e.g. She was deeply religious — Catholic faith was central to her life; the death was sudden; the service is non-religious.',
  consentLabel: 'I’m okay with my memory being woven into the tribute you’ll receive.',
};

// Retirement — MilestoneScribe's workplace vocabulary, adapted to the
// collaborative gather-from-many flow. Role/tenure are captured via the
// additional-context field (the synthesis prompt weaves them in if present).
const retirementIntake: OccasionIntake = {
  aboutThemHeading: 'About the retiree',
  honoreeLabel: 'The retiree’s name',
  honoreePlaceholder: 'e.g. Susan, Sue, or Susan Patel',
  memoryLabel: 'A story, milestone, or moment from their career',
  memoryPlaceholder:
    'The project they pulled off against the odds. The way they mentored everyone who sat near them. A specific moment beats a list of accolades.',
  qualitiesLabel: 'What were they known for at work?',
  qualitiesPlaceholder: 'e.g. unflappable under pressure, the one everyone went to, terrible puns in every meeting',
  relationshipOptions: [
    { value: 'colleague', label: 'Colleague / teammate' },
    { value: 'direct_manager', label: 'Their manager' },
    { value: 'report', label: 'They were my manager' },
    { value: 'skip_manager', label: 'Senior leader' },
    { value: 'hr_coordinator', label: 'HR / People team' },
    { value: 'friend_family', label: 'Friend or family' },
    { value: 'other', label: 'Other' },
  ],
  relationshipDescriptionLabel: 'Describe your connection briefly',
  relationshipDescriptionPlaceholder: 'e.g. worked on her team for 8 years, his first manager, sat next to him',
  additionalContextLabel: 'Anything else we should know',
  additionalContextPlaceholder:
    'e.g. their role and years of service, the team or company, whether the send-off is a party or a meeting.',
  consentLabel: 'I’m okay with my memory being woven into the send-off you’ll receive.',
};

// Wedding — VocalVow's speech vocabulary (wedding-party roles), adapted to a
// collaborative toast gathered from both sides. The honoree is the couple, so
// the create form asks for both names.
const weddingIntake: OccasionIntake = {
  aboutThemHeading: 'About the couple',
  honoreeLabel: 'The couple’s names',
  honoreePlaceholder: 'e.g. Sam & Alex',
  memoryLabel: 'A story or moment about the couple',
  memoryPlaceholder:
    'How they met, the proposal, the way they are together. A specific moment beats a list of compliments.',
  qualitiesLabel: 'What do you love about them as a couple?',
  qualitiesPlaceholder: 'e.g. they make each other braver, how at home everyone feels around them',
  relationshipOptions: [
    { value: 'best_man', label: 'Best man' },
    { value: 'maid_of_honor', label: 'Maid of honor' },
    { value: 'wedding_party', label: 'Bridesmaid / groomsman' },
    { value: 'parent', label: 'Parent of the couple' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'family', label: 'Family' },
    { value: 'friend', label: 'Friend' },
    { value: 'colleague', label: 'Colleague' },
    { value: 'other', label: 'Other' },
  ],
  relationshipDescriptionLabel: 'Describe your connection briefly',
  relationshipDescriptionPlaceholder: 'e.g. the groom’s best friend since college, the bride’s older sister',
  additionalContextLabel: 'Anything else we should know',
  additionalContextPlaceholder:
    'e.g. the wedding date, whether it’s a formal or casual celebration, anything to keep light or avoid.',
  consentLabel: 'I’m okay with my story being woven into the toast you’ll receive.',
};

// Anniversary — collaborative MILESTONE tribute (gather from the couple's circle
// → one tribute for a big anniversary party). Honoree is the couple.
const anniversaryIntake: OccasionIntake = {
  aboutThemHeading: 'About the couple',
  honoreeLabel: 'The couple’s names',
  honoreePlaceholder: 'e.g. Sam & Alex',
  memoryLabel: 'A story or moment from their years together',
  memoryPlaceholder:
    'The trip they still argue about, the way they are at the dinner table, a moment that captures the two of them. A specific moment beats a list of compliments.',
  qualitiesLabel: 'What have they shown you about love over the years?',
  qualitiesPlaceholder: 'e.g. they still make each other laugh, the way they show up for everyone, partners in everything',
  relationshipOptions: [
    { value: 'child', label: 'Their child' },
    { value: 'grandchild', label: 'Their grandchild' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'family', label: 'Family' },
    { value: 'friend', label: 'Friend' },
    { value: 'colleague', label: 'Colleague' },
    { value: 'other', label: 'Other' },
  ],
  relationshipDescriptionLabel: 'Describe your connection briefly',
  relationshipDescriptionPlaceholder: 'e.g. their daughter, friends with them for 40 years',
  additionalContextLabel: 'Anything else we should know',
  additionalContextPlaceholder:
    'e.g. which anniversary (25th, 50th), the kind of celebration, anything to keep light or avoid.',
  consentLabel: 'I’m okay with my story being woven into the toast you’ll receive.',
};

const INTAKE_SPECS: Record<string, OccasionIntake> = {
  memorial: memorialIntake,
  retirement: retirementIntake,
  wedding: weddingIntake,
  anniversary: anniversaryIntake,
};

/** Intake spec for an occasion; falls back to the memorial spec if none exists. */
export function getIntake(occasion: string): OccasionIntake {
  return INTAKE_SPECS[occasion] ?? memorialIntake;
}
