import {
  VOCABULARY,
  IRREGULAR_VERBS,
  PHRASAL_VERBS,
  COLLOCATIONS,
  PREPOSITIONS,
  USEFUL_PHRASES,
} from "./exercisePools";

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

function pickByLevel(random, list, level) {
  const filtered = list.filter((item) => item.level === level);
  if (filtered.length === 0) return pick(random, list);
  return pick(random, filtered);
}

function pickByTopic(random, list, topic) {
  const filtered = list.filter((item) => item.topic === topic);
  if (filtered.length === 0) return pick(random, list);
  return pick(random, filtered);
}

function pickByLevelAndTopic(random, list, level, topic) {
  const filtered = list.filter(
    (item) => item.level === level && item.topic === topic
  );
  if (filtered.length > 0) return pick(random, filtered);
  return pickByLevel(random, list, level);
}

function blankLastWord(sentence) {
  if (!sentence) return null;
  const trimmed = sentence.trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return null;
  let last = words.pop();
  let punctuation = "";
  const match = last.match(/([.!?]+)$/);
  if (match) {
    punctuation = match[1];
    last = last.slice(0, -punctuation.length);
  }
  if (!last) return null;
  return {
    text: `${words.join(" ")} ____${punctuation}`,
    answer: last,
  };
}

function blankFirstWord(phrase) {
  if (!phrase) return null;
  const trimmed = phrase.trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return null;
  const first = words.shift();
  if (!first) return null;
  return {
    text: `____ ${words.join(" ")}`,
    answer: first,
  };
}

function makeIdFactory(prefix) {
  let i = 1;
  return () => `${prefix}-${String(i++).padStart(4, "0")}`;
}

function baseVocabExercises(vocab, nextId) {
  return vocab.map((item) => ({
    id: nextId(),
    type: "vocab",
    level: item.level,
    topic: item.topic,
    prompt: `Traduce: ${item.es}`,
    answer: item.en,
    note: "Generado desde vocabulario",
  }));
}

function irregularVerbExercises(list, nextId) {
  return list.flatMap((verb) => [
    {
      id: nextId(),
      type: "fill",
      level: verb.level,
      topic: "irregular-verbs",
      prompt: `Past simple de "${verb.base}" (${verb.es}): ____`,
      answer: [verb.past],
      note: "Generado desde verbos irregulares",
    },
    {
      id: nextId(),
      type: "fill",
      level: verb.level,
      topic: "irregular-verbs",
      prompt: `Past participle de "${verb.base}" (${verb.es}): ____`,
      answer: [verb.pastParticiple],
      note: "Generado desde verbos irregulares",
    },
  ]);
}

function phrasalVerbExercises(list, nextId) {
  return list.flatMap((item) => [
    {
      id: nextId(),
      type: "translation",
      level: item.level,
      topic: "phrasal-verbs",
      prompt: `Traduce: ${item.es}`,
      answer: item.en,
      note: "Generado desde phrasal verbs",
    },
    {
      id: nextId(),
      type: "fill",
      level: item.level,
      topic: "phrasal-verbs",
      prompt: `Completa: I need to ____ (${item.es}).`,
      answer: [item.en],
      note: "Generado desde phrasal verbs",
    },
    {
      id: nextId(),
      type: "fill",
      level: item.level,
      topic: "phrasal-verbs",
      prompt: `Completa: We will ____ later (${item.es}).`,
      answer: [item.en],
      note: "Generado desde phrasal verbs",
    },
  ]);
}

function collocationExercises(list, nextId) {
  return list.map((item) => ({
    id: nextId(),
    type: "translation",
    level: item.level,
    topic: "collocations",
    prompt: `Traduce: ${item.es}`,
    answer: item.en,
    note: "Generado desde collocations",
  }));
}

function prepositionExercises(list, nextId) {
  return list.map((item) => ({
    id: nextId(),
    type: "fill",
    level: item.level,
    topic: "prepositions",
    prompt: item.template,
    answer: [item.en],
    note: "Generado desde preposiciones",
  }));
}

function usefulPhraseExercises(list, nextId) {
  return list.map((item) => ({
    id: nextId(),
    type: "phrase",
    level: item.level,
    topic: item.topic,
    prompt: item.es,
    answer: item.en,
    note: "Generado desde frases utiles",
  }));
}

function randomFillExercises({ count, nextId, random }) {
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const TOPICS = [
    "daily-life",
    "travel",
    "work",
    "food",
    "shopping",
    "health",
    "education",
    "technology",
    "ai",
    "prepositions",
    "phrasal-verbs",
    "collocations",
    "irregular-verbs",
  ];
  const templates = [
    {
      type: "translation",
      make: () => {
        const item = pick(random, VOCABULARY);
        return {
          id: nextId(),
          type: "translation",
          level: item.level,
          topic: item.topic,
          prompt: `Traduce: ${item.es}`,
          answer: item.en,
          note: "Generado desde vocabulario",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const item = pick(random, PREPOSITIONS);
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: "prepositions",
          prompt: item.template,
          answer: [item.en],
          note: "Generado desde preposiciones",
        };
      },
    },
    {
      type: "translation",
      make: () => {
        const item = pick(random, PHRASAL_VERBS);
        return {
          id: nextId(),
          type: "translation",
          level: item.level,
          topic: "phrasal-verbs",
          prompt: `Traduce: ${item.es}`,
          answer: item.en,
          note: "Generado desde phrasal verbs",
        };
      },
    },
    {
      type: "translation",
      make: () => {
        const item = pick(random, COLLOCATIONS);
        return {
          id: nextId(),
          type: "translation",
          level: item.level,
          topic: "collocations",
          prompt: `Traduce: ${item.es}`,
          answer: item.en,
          note: "Generado desde collocations",
        };
      },
    },
    {
      type: "phrase",
      make: () => {
        const item = pick(random, USEFUL_PHRASES);
        return {
          id: nextId(),
          type: "phrase",
          level: item.level,
          topic: item.topic,
          prompt: item.es,
          answer: item.en,
          note: "Generado desde frases utiles",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const item = pick(random, USEFUL_PHRASES);
        const blanked = blankLastWord(item.en);
        if (!blanked) {
          return {
            id: nextId(),
            type: "phrase",
            level: item.level,
            topic: item.topic,
            prompt: item.es,
            answer: item.en,
            note: "Generado desde frases utiles",
          };
        }
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: item.topic,
          prompt: `Completa (${item.es}): ${blanked.text}`,
          answer: [blanked.answer],
          hint: item.es,
          note: "Generado desde frases utiles",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const item = pick(random, IRREGULAR_VERBS);
        const usePast = random() > 0.5;
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: "irregular-verbs",
          prompt: `${usePast ? "Past simple" : "Past participle"} de "${
            item.base
          }" (${item.es}): ____`,
          answer: [usePast ? item.past : item.pastParticiple],
          note: "Generado desde verbos irregulares",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const item = pick(random, IRREGULAR_VERBS);
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: "irregular-verbs",
          prompt: `Yesterday I ____ (${item.es}).`,
          answer: [item.past],
          note: "Generado desde verbos irregulares",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const item = pick(random, COLLOCATIONS);
        const blanked = blankFirstWord(item.en);
        if (!blanked) {
          return {
            id: nextId(),
            type: "translation",
            level: item.level,
            topic: "collocations",
            prompt: `Traduce: ${item.es}`,
            answer: item.en,
            note: "Generado desde collocations",
          };
        }
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: "collocations",
          prompt: `Completa: ${blanked.text}`,
          answer: [blanked.answer],
          note: "Generado desde collocations",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const item = pick(random, VOCABULARY);
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: item.topic,
          prompt: `Completa: The word for "${item.es}" is ____.`,
          answer: [item.en],
          note: "Generado desde vocabulario",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const item = pick(random, PHRASAL_VERBS);
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: "phrasal-verbs",
          prompt: `Completa: Please ____ (${item.es}).`,
          answer: [item.en],
          note: "Generado desde phrasal verbs",
        };
      },
    },
    {
      type: "translation",
      make: () => {
        const level = pick(random, LEVELS);
        const item = pickByLevel(random, USEFUL_PHRASES, level);
        return {
          id: nextId(),
          type: "translation",
          level: item.level,
          topic: item.topic,
          prompt: `Traduce: ${item.es}`,
          answer: item.en,
          note: "Generado por nivel desde frases utiles",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const level = pick(random, LEVELS);
        const item = pickByLevel(random, PREPOSITIONS, level);
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: "prepositions",
          prompt: item.template,
          answer: [item.en],
          note: "Generado por nivel desde preposiciones",
        };
      },
    },
    {
      type: "translation",
      make: () => {
        const topic = pick(random, TOPICS);
        const item = pickByTopic(random, VOCABULARY, topic);
        return {
          id: nextId(),
          type: "translation",
          level: item.level,
          topic: item.topic,
          prompt: `Traduce: ${item.es}`,
          answer: item.en,
          note: "Generado por tema desde vocabulario",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const topic = pick(random, TOPICS);
        const item = pickByTopic(random, USEFUL_PHRASES, topic);
        const blanked = blankLastWord(item.en);
        if (!blanked) {
          return {
            id: nextId(),
            type: "phrase",
            level: item.level,
            topic: item.topic,
            prompt: item.es,
            answer: item.en,
            note: "Generado por tema desde frases utiles",
          };
        }
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: item.topic,
          prompt: `Completa: ${blanked.text}`,
          answer: [blanked.answer],
          note: "Generado por tema desde frases utiles",
        };
      },
    },
    {
      type: "fill",
      make: () => {
        const level = pick(random, LEVELS);
        const topic = pick(random, TOPICS);
        const item = pickByLevelAndTopic(random, VOCABULARY, level, topic);
        return {
          id: nextId(),
          type: "fill",
          level: item.level,
          topic: item.topic,
          prompt: `Completa: The word for "${item.es}" is ____.`,
          answer: [item.en],
          note: "Generado por nivel y tema desde vocabulario",
        };
      },
    },
    {
      type: "translation",
      make: () => {
        const level = pick(random, LEVELS);
        const topic = pick(random, TOPICS);
        const item = pickByLevelAndTopic(random, USEFUL_PHRASES, level, topic);
        return {
          id: nextId(),
          type: "translation",
          level: item.level,
          topic: item.topic,
          prompt: `Traduce: ${item.es}`,
          answer: item.en,
          note: "Generado por nivel y tema desde frases utiles",
        };
      },
    },
  ];

  return Array.from({ length: count }, () => pick(random, templates).make());
}

export function generateExercises({
  count = 700,
  seed = 20260207,
  includeBaseSets = true,
  shuffle = false,
} = {}) {
  const random = mulberry32(seed);
  const nextId = makeIdFactory("gen");
  const exercises = [];

  if (includeBaseSets) {
    exercises.push(
      ...baseVocabExercises(VOCABULARY, nextId),
      ...irregularVerbExercises(IRREGULAR_VERBS, nextId),
      ...phrasalVerbExercises(PHRASAL_VERBS, nextId),
      ...collocationExercises(COLLOCATIONS, nextId),
      ...prepositionExercises(PREPOSITIONS, nextId),
      ...usefulPhraseExercises(USEFUL_PHRASES, nextId)
    );
  }

  const remaining = Math.max(0, count - exercises.length);
  exercises.push(
    ...randomFillExercises({ count: remaining, nextId, random })
  );

  if (!shuffle) {
    return exercises;
  }

  const shuffled = exercises.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const EXERCISE_POOLS = {
  VOCABULARY,
  IRREGULAR_VERBS,
  PHRASAL_VERBS,
  COLLOCATIONS,
  PREPOSITIONS,
  USEFUL_PHRASES,
};
