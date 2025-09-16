import { DailyHoroscope, SignHoroscope } from './types';
import { ZODIAC_SIGNS, formatDateRange } from './signs';

const ENERGY_WORDS = [
  'Magnetic momentum',
  'Steady resonance',
  'Curious cadence',
  'Heart-led tide',
  'Solar flourish',
  'Mindful craftsmanship',
  'Balanced breeze',
  'Alchemical depth',
  'Vision quest',
  'Mountain stride',
  'Future-forward spark',
  'Dreamstream glow',
];

const MOODS = [
  'Trailblazing',
  'Comfort-craving',
  'Story weaving',
  'Sentimental',
  'Spotlight-ready',
  'Solution seeking',
  'Graceful',
  'Devoted',
  'Expansive',
  'Strategic',
  'Inventive',
  'Ethereal',
];

const COLORS = [
  'Crimson ember',
  'Verdant moss',
  'Skyline silver',
  'Moonlit pearl',
  'Golden flare',
  'Sage parchment',
  'Rose quartz',
  'Noir garnet',
  'Cobalt horizon',
  'Granite slate',
  'Electric aqua',
  'Seafoam opal',
];

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return date;
  }
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildSummary(date: string): { summary: string; cosmicWeather: string; lunarPhase: string; highlight: string } {
  const prettyDate = formatDate(date);
  return {
    summary: `Celestial currents for ${prettyDate} emphasise intentional presence. Temper the pace, invite reflection, and let conversations with the cosmos refine your plans.`,
    cosmicWeather:
      'Planetary harmonics layer fire and water signatures, asking us to blend conviction with compassion in our everyday exchanges.',
    lunarPhase:
      'The Moon sketches a gentle trine with Saturn, rewarding steady rituals and systems that honour both body and intuition.',
    highlight:
      'Small acts of care ripple far today—attend to your relationships with the same reverence you give your ambitions.',
  };
}

function luckyNumbersFor(index: number, seed: number): number[] {
  const numbers = new Set<number>();
  let value = seed + index * 11;
  while (numbers.size < 5) {
    value = (value * 17 + 13) % 89;
    numbers.add((value % 53) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

function generalOutlook(signName: string, keywords: string[]): string {
  const flavour = keywords[0];
  return `${signName}, your ${flavour} instincts tune into the collective pulse today. Notice where a single bold move can align your personal rhythm with the wider world.`;
}

function loveOutlook(element: string, rulingPlanet: string): string {
  return `Lead with your ${element.toLowerCase()} heart. Conversations under ${rulingPlanet} guidance open a window for tenderness—share a vulnerability to strengthen trust.`;
}

function careerOutlook(modality: string, keywords: string[]): string {
  const focus = keywords[1] ?? 'dedicated';
  return `${modality} momentum supports professional pivots. Translate your ${focus} thinking into a tangible milestone and celebrate incremental progress.`;
}

function wellnessOutlook(element: string, keywords: string[]): string {
  const cue = keywords[2] ?? 'grounded';
  return `Anchor the day with a ${element.toLowerCase()} ritual—a mindful walk, nourishing meal, or breathing practice keeps your ${cue} energy replenished.`;
}

function peopleRelations(signName: string): string {
  return `A trusted ally seeks your perspective. Co-create plans and let mutual inspiration remind you why collaboration with ${signName} at the helm sparks magic.`;
}

function petRelations(element: string): string {
  return `Animal companions mirror your mood; offer play or quiet cuddles according to the ${element.toLowerCase()} tone you’re setting.`;
}

function planetRelations(rulingPlanet: string): string {
  return `${rulingPlanet} whispers about timing—listen for intuitive nudges before saying yes to new commitments.`;
}

function starRelations(modality: string): string {
  return `${modality} stars outline a constellation of possibility. Chart micro goals and let constellations of past wins guide today’s choices.`;
}

function stoneRelations(element: string): string {
  switch (element) {
    case 'Fire':
      return 'Carnelian warms your confidence; hold it during affirmations for a potent solar spark.';
    case 'Earth':
      return 'Green aventurine grounds optimism—keep a stone in your pocket to steady practical steps.';
    case 'Air':
      return 'Blue lace agate soothes busy thoughts, clarifying conversations and creative brainstorming.';
    case 'Water':
    default:
      return 'Moonstone attunes your tides—place it near water to amplify intuition and gentle resilience.';
  }
}

function ritualGuidance(element: string): string {
  return `Begin with a ${element.toLowerCase()} ritual—light a candle, tend a plant, open the window, or brew a tea that honours today’s element.`;
}

function reflectionGuidance(modality: string, signName: string): string {
  return `${modality} wisdom invites journaling. Ask yourself where ${signName} can release an old pattern and invite fresher flow.`;
}

function adventureGuidance(keywords: string[]): string {
  const idea = keywords[2] ?? keywords[0];
  return `Schedule a micro-adventure that highlights your ${idea} spirit—an unfamiliar route, a new recipe, or a podcast swap with a friend.`;
}

export function buildFallbackHoroscope(date: string): DailyHoroscope {
  const { summary, cosmicWeather, lunarPhase, highlight } = buildSummary(date);
  const baseTimestamp = new Date().toISOString();

  const signs: SignHoroscope[] = ZODIAC_SIGNS.map((sign, index) => {
    const energy = ENERGY_WORDS[index % ENERGY_WORDS.length];
    const mood = MOODS[index % MOODS.length];
    const color = COLORS[index % COLORS.length];
    const luckyNumbers = luckyNumbersFor(index, new Date(date).getUTCDate());

    return {
      id: sign.id,
      name: sign.name,
      dateRange: formatDateRange(sign),
      element: sign.element,
      modality: sign.modality,
      rulingPlanet: sign.rulingPlanet,
      icon: sign.icon,
      headline: `${sign.name} Focus`,
      summary: generalOutlook(sign.name, sign.keywords),
      energy,
      outlook: {
        general: generalOutlook(sign.name, sign.keywords),
        love: loveOutlook(sign.element, sign.rulingPlanet),
        career: careerOutlook(sign.modality, sign.keywords),
        wellness: wellnessOutlook(sign.element, sign.keywords),
      },
      relations: {
        people: peopleRelations(sign.name),
        pets: petRelations(sign.element),
        planets: planetRelations(sign.rulingPlanet),
        stars: starRelations(sign.modality),
        stones: stoneRelations(sign.element),
      },
      guidance: {
        ritual: ritualGuidance(sign.element),
        reflection: reflectionGuidance(sign.modality, sign.name),
        adventure: adventureGuidance(sign.keywords),
      },
      mood,
      color,
      mantra: `${sign.name} breathes in confidence and exhales possibility.`,
      luckyNumbers,
    };
  });

  return {
    generatedFor: date,
    generatedAt: baseTimestamp,
    summary,
    cosmicWeather,
    lunarPhase,
    highlight,
    signs,
  };
}
