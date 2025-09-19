export const UPLOADCATEGORIES = [
  "Politics",
  "Crime",
  "Entertainment",
  "Business",
  "Health",
  "Lifestyle",
  "Technology",
  "Science",
  "Sports",
  "Info",
];

export const CATEGORIES = [
  "Politics",
  "Crime",
  "Entertainment",
  "Business",
  "Health",
  "Lifestyle",
  "Technology",
  "Science",
  "Sports",
  "Info",
];

/**
 * Rich descriptions and keyword sets for each category help us compose
 * consistent metadata that search engines can understand. These strings are
 * intentionally human readable so that they double as page copy when needed.
 */
export const CATEGORY_DETAILS: Record<
  string,
  { description: string; keywords: string[] }
> = {
  Politics: {
    description:
      "Independent political reporting, election coverage, public policy analysis and accountability journalism focused on governments across the globe.",
    keywords: [
      "politics news",
      "government",
      "public policy",
      "elections",
      "geopolitics",
    ],
  },
  Crime: {
    description:
      "Breaking crime reports, justice system updates, public safety investigations and law-enforcement accountability stories.",
    keywords: [
      "crime news",
      "courts",
      "justice system",
      "law enforcement",
      "public safety",
    ],
  },
  Entertainment: {
    description:
      "Entertainment headlines covering film, television, streaming, celebrity interviews and culture analysis from the 90s and today.",
    keywords: [
      "entertainment news",
      "movies",
      "television",
      "celebrity",
      "culture",
    ],
  },
  Business: {
    description:
      "Market-moving business news, company earnings, entrepreneurship features and deep dives on the global economy.",
    keywords: [
      "business news",
      "economy",
      "markets",
      "finance",
      "entrepreneurship",
    ],
  },
  Health: {
    description:
      "Health reporting spanning medical research, public health guidance, mental wellness and healthcare policy updates.",
    keywords: [
      "health news",
      "medical research",
      "public health",
      "wellness",
      "health policy",
    ],
  },
  Lifestyle: {
    description:
      "Lifestyle stories about travel, food, fashion, home, relationships and inspiration for living well.",
    keywords: [
      "lifestyle news",
      "travel",
      "food",
      "fashion",
      "home inspiration",
    ],
  },
  Technology: {
    description:
      "Technology reporting on innovation, startups, consumer gadgets, cybersecurity and the companies shaping the digital era.",
    keywords: [
      "technology news",
      "startups",
      "innovation",
      "gadgets",
      "cybersecurity",
    ],
  },
  Science: {
    description:
      "Scientific discoveries, space exploration, climate research and explainers that make complex breakthroughs accessible.",
    keywords: [
      "science news",
      "space",
      "climate",
      "research",
      "discoveries",
    ],
  },
  Sports: {
    description:
      "Scores, analysis and features from global sports, leagues, athletes and major tournaments.",
    keywords: [
      "sports news",
      "athletes",
      "scores",
      "tournaments",
      "analysis",
    ],
  },
  Info: {
    description:
      "In-depth explainers, guides, fact checks and service journalism that help readers stay informed and prepared.",
    keywords: [
      "explainer",
      "guides",
      "how to",
      "service journalism",
      "fact check",
    ],
  },
};

const CATEGORY_LOOKUP = new Map<string, string>(
  CATEGORIES.map((name) => [name.toLowerCase(), name] as const),
);

export function normalizeCategoryName(input: string): string | null {
  const normalized = CATEGORY_LOOKUP.get(input.toLowerCase());
  return normalized ?? null;
}

export function getCategoryDetails(category: string) {
  const name = normalizeCategoryName(category) ?? category;
  const details = CATEGORY_DETAILS[name] ?? {
    description: `Latest ${name} coverage from The Nineties Times.`,
    keywords: [name, "The Nineties Times", "90sTimes"],
  };
  return { name, ...details };
}

/*namespace Northeast.Models
{
    public enum Category
    {
        Politics,
        Crime,
        Entertainment,
        Business,
        Health,
        Lifestyle,
        Technology,
        Science,
        Sports,
        Info
    }
}
*/
