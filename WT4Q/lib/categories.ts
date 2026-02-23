export type CategoryKey =
  | 'Politics'
  | 'Crime'
  | 'Entertainment'
  | 'Business'
  | 'Health'
  | 'Lifestyle'
  | 'Technology'
  | 'Science'
  | 'Sports'
  | 'Info';

export type CategoryDefinition = {
  key: CategoryKey;
  label: string;
  description: string;
  keywords: string[];
};

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: 'Entertainment',
    label: 'TV, Movies & Music',
    description:
      'Sitcom marathons, blockbuster nights, boy bands, grunge, and the MTV moments that ruled the 90s.',
    keywords: [
      '90s TV',
      '90s movies',
      '90s music',
      'MTV era',
      'pop culture',
    ],
  },
  {
    key: 'Technology',
    label: 'Gadgets & Internet',
    description:
      'Dial-up drama, early web adventures, console wars, and the tech that reshaped the decade.',
    keywords: [
      'dial-up',
      'early internet',
      '90s gadgets',
      'retro tech',
      'console wars',
    ],
  },
  {
    key: 'Lifestyle',
    label: 'Style & Snacks',
    description:
      'From windbreakers to mall food courts, this is the 90s lifestyle starter pack.',
    keywords: [
      '90s fashion',
      'mall culture',
      'snacks',
      'sleepovers',
      'style',
    ],
  },
  {
    key: 'Sports',
    label: 'Sports & Rivalries',
    description:
      'Legendary athletes, iconic rivalries, and sports moments that defined the 90s.',
    keywords: [
      '90s sports',
      'athletes',
      'rivalries',
      'highlights',
      'stadiums',
    ],
  },
  {
    key: 'Business',
    label: 'Brands & Money',
    description:
      'Dot-com boom, iconic brands, and the money moves that shaped the 90s economy.',
    keywords: [
      '90s brands',
      'dot-com',
      'economy',
      'mall brands',
      'marketing',
    ],
  },
  {
    key: 'Science',
    label: 'Space & Science',
    description:
      'Hubble fixes, space missions, and science breakthroughs with 90s swagger.',
    keywords: [
      'space missions',
      'Hubble',
      '90s science',
      'NASA',
      'discoveries',
    ],
  },
  {
    key: 'Politics',
    label: 'History & Headlines',
    description:
      'Big moments that shaped the 90s: elections, world events, and cultural shifts.',
    keywords: [
      '90s history',
      'world events',
      'culture shifts',
      'headlines',
      'timeline',
    ],
  },
  {
    key: 'Crime',
    label: 'Mysteries & True Crime',
    description:
      'High-profile cases, courtroom drama, and the true-crime stories that gripped the decade.',
    keywords: [
      '90s true crime',
      'mysteries',
      'courtroom',
      'investigations',
      'case files',
    ],
  },
  {
    key: 'Health',
    label: 'Wellness & Fitness',
    description:
      'Fitness fads, health breakthroughs, and the 90s approach to self-care.',
    keywords: [
      '90s fitness',
      'wellness',
      'health trends',
      'self care',
      'workout',
    ],
  },
  {
    key: 'Info',
    label: 'Time Capsule',
    description:
      'Deep dives, guides, and memory-lane stories that keep the 90s alive.',
    keywords: [
      'time capsule',
      'nostalgia',
      '90s memories',
      'throwback',
      'guide',
    ],
  },
];

export const CATEGORIES: CategoryKey[] = CATEGORY_DEFINITIONS.map((c) => c.key);
export const UPLOADCATEGORIES: CategoryKey[] = [...CATEGORIES];

const CATEGORY_LOOKUP = new Map<string, CategoryKey>(
  CATEGORIES.map((name) => [name.toLowerCase(), name] as const),
);

const CATEGORY_LABELS = new Map<CategoryKey, string>(
  CATEGORY_DEFINITIONS.map((def) => [def.key, def.label] as const),
);

export function normalizeCategoryName(input: string): CategoryKey | null {
  const normalized = CATEGORY_LOOKUP.get(input.toLowerCase());
  return normalized ?? null;
}

export function getCategoryLabel(category: string): string {
  const normalized = normalizeCategoryName(category) ?? (category as CategoryKey);
  return CATEGORY_LABELS.get(normalized) ?? category;
}

export function getCategoryDetails(category: string) {
  const name = normalizeCategoryName(category) ?? (category as CategoryKey);
  const def = CATEGORY_DEFINITIONS.find((c) => c.key === name);
  return {
    name,
    label: def?.label ?? name,
    description:
      def?.description ??
      `Fresh 90s-inspired stories and throwbacks in ${name}.`,
    keywords: def?.keywords ?? [name, '90s nostalgia', 'The Nineties Times'],
  };
}
