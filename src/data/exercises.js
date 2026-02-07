// Exercise data model:
// {
//   id: string,
//   type: "translation" | "fill" | "vocab" | "phrase",
//   level: "A1" | "A2" | "B1" | "B2",
//   topic: string,
//   prompt: string,
//   answer: string | string[],
//   synonyms?: string[],
//   note?: string
// }

import { generateExercises } from "./exerciseGenerator";

const EXERCISE_SEED_KEY = "exerciseSeed";

function getSessionSeed() {
  if (typeof window === "undefined") {
    return Date.now();
  }

  try {
    const stored = window.localStorage.getItem(EXERCISE_SEED_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    const seed = Date.now();
    window.localStorage.setItem(EXERCISE_SEED_KEY, String(seed));
    return seed;
  } catch (error) {
    return Date.now();
  }
}

const AUTO_GENERATED_EXERCISES = generateExercises({
  count: 1000,
  seed: getSessionSeed(),
  includeBaseSets: true,
  shuffle: true,
});

export const EXERCISES = [
  // Translation / phrases
  {
    id: "ex-001",
    type: "translation",
    level: "A1",
    topic: "daily-life",
    prompt: "Llego tarde",
    answer: "I'm running late",
    synonyms: ["I am running late"],
  },
  {
    id: "ex-002",
    type: "phrase",
    level: "A1",
    topic: "daily-life",
    prompt: "No entiendo",
    answer: "I don't understand",
  },
  {
    id: "ex-003",
    type: "phrase",
    level: "A1",
    topic: "daily-life",
    prompt: "Podrias repetir eso",
    answer: "Could you repeat that?",
  },
  // Prepositions
  {
    id: "ex-010",
    type: "fill",
    level: "A1",
    topic: "prepositions",
    prompt: "I live ___ Madrid.",
    answer: ["in"],
  },
  {
    id: "ex-011",
    type: "fill",
    level: "A2",
    topic: "prepositions",
    prompt: "She arrived ___ the airport at 9.",
    answer: ["at"],
  },
  // Phrasal verbs
  {
    id: "ex-020",
    type: "translation",
    level: "A2",
    topic: "phrasal-verbs",
    prompt: "Encendi la luz",
    answer: "I turned on the light",
    synonyms: ["I switched on the light"],
  },
  {
    id: "ex-021",
    type: "translation",
    level: "A2",
    topic: "phrasal-verbs",
    prompt: "Estoy buscando mis llaves",
    answer: "I'm looking for my keys",
  },
  // Verb tenses
  {
    id: "ex-030",
    type: "translation",
    level: "A2",
    topic: "past-simple",
    prompt: "Ayer fui al trabajo",
    answer: "I went to work yesterday",
    synonyms: ["Yesterday I went to work"],
  },
  {
    id: "ex-031",
    type: "fill",
    level: "B1",
    topic: "present-perfect",
    prompt: "She has ____ (live) here since 2020.",
    answer: ["lived"],
  },
  {
    id: "ex-032",
    type: "fill",
    level: "B1",
    topic: "future",
    prompt: "Tomorrow I will ____ (meet) my teacher.",
    answer: ["meet"],
  },
  // Daily life - A1/A2
  {
    id: "ex-040",
    type: "translation",
    level: "A1",
    topic: "daily-life",
    prompt: "Tengo hambre",
    answer: "I'm hungry",
    synonyms: ["I am hungry"],
  },
  {
    id: "ex-041",
    type: "translation",
    level: "A1",
    topic: "daily-life",
    prompt: "Tengo sed",
    answer: "I'm thirsty",
    synonyms: ["I am thirsty"],
  },
  {
    id: "ex-042",
    type: "translation",
    level: "A1",
    topic: "daily-life",
    prompt: "Estoy cansado",
    answer: "I'm tired",
    synonyms: ["I am tired"],
  },
  {
    id: "ex-043",
    type: "translation",
    level: "A1",
    topic: "daily-life",
    prompt: "Necesito ayuda",
    answer: "I need help",
  },
  {
    id: "ex-044",
    type: "translation",
    level: "A1",
    topic: "daily-life",
    prompt: "No tengo dinero",
    answer: "I don't have money",
    synonyms: ["I do not have money"],
  },
  {
    id: "ex-045",
    type: "phrase",
    level: "A1",
    topic: "daily-life",
    prompt: "Perdon, no se",
    answer: "Sorry, I don't know",
    synonyms: ["Sorry, I do not know"],
  },
  {
    id: "ex-046",
    type: "phrase",
    level: "A1",
    topic: "daily-life",
    prompt: "Que significa esto",
    answer: "What does this mean?",
    synonyms: ["What does this mean"],
  },
  {
    id: "ex-047",
    type: "phrase",
    level: "A1",
    topic: "daily-life",
    prompt: "Puedes ayudarme",
    answer: "Can you help me?",
    synonyms: ["Can you help me"],
  },
  {
    id: "ex-048",
    type: "phrase",
    level: "A1",
    topic: "daily-life",
    prompt: "No puedo ahora",
    answer: "I can't right now",
    synonyms: ["I cannot right now"],
  },
  {
    id: "ex-049",
    type: "phrase",
    level: "A2",
    topic: "daily-life",
    prompt: "Estoy esperando",
    answer: "I'm waiting",
    synonyms: ["I am waiting"],
  },
  // Travel / directions
  {
    id: "ex-050",
    type: "translation",
    level: "A2",
    topic: "travel",
    prompt: "Tengo una reserva",
    answer: "I have a reservation",
  },
  {
    id: "ex-051",
    type: "translation",
    level: "A2",
    topic: "travel",
    prompt: "Quiero cancelar mi vuelo",
    answer: "I want to cancel my flight",
  },
  {
    id: "ex-052",
    type: "translation",
    level: "A2",
    topic: "travel",
    prompt: "Donde esta la estacion",
    answer: "Where is the station?",
    synonyms: ["Where is the station"],
  },
  {
    id: "ex-053",
    type: "fill",
    level: "A2",
    topic: "prepositions",
    prompt: "The hotel is ___ the corner.",
    answer: ["on"],
  },
  {
    id: "ex-054",
    type: "fill",
    level: "A2",
    topic: "prepositions",
    prompt: "We are walking ___ the park.",
    answer: ["through"],
  },
  {
    id: "ex-055",
    type: "fill",
    level: "A2",
    topic: "prepositions",
    prompt: "Turn left ___ the bank.",
    answer: ["at"],
  },
  // Work / office
  {
    id: "ex-060",
    type: "translation",
    level: "A2",
    topic: "work",
    prompt: "Tengo una reunion a las nueve",
    answer: "I have a meeting at nine",
  },
  {
    id: "ex-061",
    type: "translation",
    level: "A2",
    topic: "work",
    prompt: "Necesito enviar el informe",
    answer: "I need to send the report",
  },
  {
    id: "ex-062",
    type: "translation",
    level: "A2",
    topic: "work",
    prompt: "Podemos discutir esto mañana",
    answer: "We can discuss this tomorrow",
  },
  {
    id: "ex-063",
    type: "translation",
    level: "A2",
    topic: "work",
    prompt: "Estoy trabajando en eso",
    answer: "I'm working on it",
    synonyms: ["I am working on it"],
  },
  {
    id: "ex-064",
    type: "fill",
    level: "A2",
    topic: "work",
    prompt: "Please ____ (send) the file today.",
    answer: ["send"],
  },
  // Food / restaurant
  {
    id: "ex-070",
    type: "translation",
    level: "A1",
    topic: "food",
    prompt: "Quiero un cafe",
    answer: "I want a coffee",
  },
  {
    id: "ex-071",
    type: "translation",
    level: "A1",
    topic: "food",
    prompt: "La cuenta, por favor",
    answer: "The bill, please",
    synonyms: ["The check, please"],
  },
  {
    id: "ex-072",
    type: "translation",
    level: "A2",
    topic: "food",
    prompt: "Me gusta esta sopa",
    answer: "I like this soup",
  },
  {
    id: "ex-073",
    type: "fill",
    level: "A2",
    topic: "food",
    prompt: "Can I have a glass ___ water?",
    answer: ["of"],
  },
  // Shopping
  {
    id: "ex-080",
    type: "translation",
    level: "A1",
    topic: "shopping",
    prompt: "Cuanto cuesta",
    answer: "How much does it cost?",
    synonyms: ["How much does it cost"],
  },
  {
    id: "ex-081",
    type: "translation",
    level: "A1",
    topic: "shopping",
    prompt: "Estoy solo mirando",
    answer: "I'm just looking",
    synonyms: ["I am just looking"],
  },
  {
    id: "ex-082",
    type: "translation",
    level: "A2",
    topic: "shopping",
    prompt: "Quiero devolver esto",
    answer: "I want to return this",
  },
  // Health
  {
    id: "ex-090",
    type: "translation",
    level: "A2",
    topic: "health",
    prompt: "Me duele la cabeza",
    answer: "I have a headache",
  },
  {
    id: "ex-091",
    type: "translation",
    level: "A2",
    topic: "health",
    prompt: "Necesito un medico",
    answer: "I need a doctor",
  },
  {
    id: "ex-092",
    type: "phrase",
    level: "A2",
    topic: "health",
    prompt: "Me siento mejor hoy",
    answer: "I feel better today",
  },
  // Phrasal verbs (extra)
  {
    id: "ex-100",
    type: "translation",
    level: "A2",
    topic: "phrasal-verbs",
    prompt: "Apaga la luz",
    answer: "Turn off the light",
  },
  {
    id: "ex-101",
    type: "translation",
    level: "A2",
    topic: "phrasal-verbs",
    prompt: "Vamos a salir esta noche",
    answer: "We are going out tonight",
    synonyms: ["We're going out tonight"],
  },
  {
    id: "ex-102",
    type: "translation",
    level: "B1",
    topic: "phrasal-verbs",
    prompt: "Necesito averiguar la verdad",
    answer: "I need to find out the truth",
  },
  {
    id: "ex-103",
    type: "translation",
    level: "B1",
    topic: "phrasal-verbs",
    prompt: "Sigue adelante",
    answer: "Carry on",
  },
  // Grammar - modals
  {
    id: "ex-110",
    type: "fill",
    level: "A2",
    topic: "modal-verbs",
    prompt: "You ____ wear a seatbelt.",
    answer: ["must", "have to"],
  },
  {
    id: "ex-111",
    type: "fill",
    level: "A2",
    topic: "modal-verbs",
    prompt: "I ____ swim when I was five.",
    answer: ["could"],
  },
  {
    id: "ex-112",
    type: "fill",
    level: "B1",
    topic: "modal-verbs",
    prompt: "You ____ want to check this again.",
    answer: ["might", "may"],
  },
  // Grammar - tenses
  {
    id: "ex-120",
    type: "translation",
    level: "A2",
    topic: "present-continuous",
    prompt: "Estoy cocinando ahora",
    answer: "I'm cooking now",
    synonyms: ["I am cooking now"],
  },
  {
    id: "ex-121",
    type: "translation",
    level: "A2",
    topic: "past-continuous",
    prompt: "Estaba lloviendo cuando sali",
    answer: "It was raining when I left",
  },
  {
    id: "ex-122",
    type: "translation",
    level: "B1",
    topic: "present-perfect",
    prompt: "He perdido mis llaves",
    answer: "I've lost my keys",
    synonyms: ["I have lost my keys"],
  },
  {
    id: "ex-123",
    type: "fill",
    level: "B1",
    topic: "present-perfect",
    prompt: "We have ____ (finish) the task.",
    answer: ["finished"],
  },
  {
    id: "ex-124",
    type: "fill",
    level: "B1",
    topic: "past-simple",
    prompt: "They ____ (arrive) late yesterday.",
    answer: ["arrived"],
  },
  {
    id: "ex-125",
    type: "fill",
    level: "B1",
    topic: "future",
    prompt: "I will ____ (call) you later.",
    answer: ["call"],
  },
  // Collocations
  {
    id: "ex-126",
    type: "translation",
    level: "A2",
    topic: "collocations",
    prompt: "Tomar una decision",
    answer: "Make a decision",
  },
  {
    id: "ex-127",
    type: "translation",
    level: "A2",
    topic: "collocations",
    prompt: "Hacer la tarea",
    answer: "Do homework",
  },
  {
    id: "ex-128",
    type: "translation",
    level: "A2",
    topic: "collocations",
    prompt: "Hacer una llamada",
    answer: "Make a call",
    synonyms: ["Make a phone call"],
  },
  {
    id: "ex-129",
    type: "translation",
    level: "A2",
    topic: "collocations",
    prompt: "Hacer ejercicio",
    answer: "Do exercise",
  },
  // Questions
  {
    id: "ex-130",
    type: "phrase",
    level: "A1",
    topic: "questions",
    prompt: "Puedes repetir eso",
    answer: "Can you repeat that?",
  },
  {
    id: "ex-131",
    type: "phrase",
    level: "A1",
    topic: "questions",
    prompt: "De donde eres",
    answer: "Where are you from?",
  },
  {
    id: "ex-132",
    type: "phrase",
    level: "A2",
    topic: "questions",
    prompt: "A que hora empieza",
    answer: "What time does it start?",
  },
  // Comparatives / superlatives
  {
    id: "ex-140",
    type: "fill",
    level: "A2",
    topic: "comparatives",
    prompt: "This book is ____ (good) than that one.",
    answer: ["better"],
  },
  {
    id: "ex-141",
    type: "fill",
    level: "A2",
    topic: "comparatives",
    prompt: "My car is ____ (fast) than yours.",
    answer: ["faster"],
  },
  {
    id: "ex-142",
    type: "fill",
    level: "B1",
    topic: "superlatives",
    prompt: "This is the ____ (cheap) option.",
    answer: ["cheapest"],
  },
  // Conditionals
  {
    id: "ex-150",
    type: "translation",
    level: "B1",
    topic: "conditionals",
    prompt: "Si tengo tiempo, te llamo",
    answer: "If I have time, I'll call you",
    synonyms: ["If I have time, I will call you"],
  },
  {
    id: "ex-151",
    type: "translation",
    level: "B2",
    topic: "conditionals",
    prompt: "Si hubiera sabido, te habria dicho",
    answer: "If I had known, I would have told you",
  },
  // Technology
  {
    id: "ex-160",
    type: "translation",
    level: "A2",
    topic: "technology",
    prompt: "Mi telefono no funciona",
    answer: "My phone doesn't work",
    synonyms: ["My phone does not work"],
  },
  {
    id: "ex-161",
    type: "translation",
    level: "A2",
    topic: "technology",
    prompt: "Necesito cargar la bateria",
    answer: "I need to charge the battery",
  },
  {
    id: "ex-162",
    type: "fill",
    level: "B1",
    topic: "technology",
    prompt: "Please ____ (download) the file.",
    answer: ["download"],
  },
  // Education
  {
    id: "ex-170",
    type: "translation",
    level: "A1",
    topic: "education",
    prompt: "Estoy estudiando ingles",
    answer: "I'm studying English",
    synonyms: ["I am studying English"],
  },
  {
    id: "ex-171",
    type: "translation",
    level: "A2",
    topic: "education",
    prompt: "Necesito practicar mas",
    answer: "I need to practice more",
  },
  {
    id: "ex-172",
    type: "phrase",
    level: "A2",
    topic: "education",
    prompt: "Puedes hablar mas despacio",
    answer: "Can you speak more slowly?",
  },
  // Time / routines
  {
    id: "ex-180",
    type: "phrase",
    level: "A1",
    topic: "time",
    prompt: "Que hora es",
    answer: "What time is it?",
  },
  {
    id: "ex-181",
    type: "translation",
    level: "A2",
    topic: "time",
    prompt: "Me despierto temprano",
    answer: "I wake up early",
  },
  {
    id: "ex-182",
    type: "translation",
    level: "A2",
    topic: "time",
    prompt: "Voy a dormir tarde",
    answer: "I go to bed late",
  },
  // Directions
  {
    id: "ex-190",
    type: "phrase",
    level: "A2",
    topic: "directions",
    prompt: "Sigue todo recto",
    answer: "Go straight ahead",
  },
  {
    id: "ex-191",
    type: "phrase",
    level: "A2",
    topic: "directions",
    prompt: "Gira a la derecha",
    answer: "Turn right",
  },
  {
    id: "ex-192",
    type: "phrase",
    level: "A2",
    topic: "directions",
    prompt: "Gira a la izquierda",
    answer: "Turn left",
  },
  {
    id: "ex-200",
    type: "translation",
    level: "B2",
    topic: "work",
    prompt: "Pongámonos al día con el proyecto",
    answer: "Let's catch up on the project",
    synonyms: ["Let's get up to date with the project"]
  },
  {
    id: "ex-201",
    type: "phrase",
    level: "B1",
    topic: "work",
    prompt: "Quedo a la espera de sus noticias",
    answer: "I look forward to hearing from you",
    note: "Frase estándar para cerrar emails formales."
  },
  {
    id: "ex-202",
    type: "fill",
    level: "B2",
    topic: "work",
    prompt: "We need to ___ (investigar) the cause of the problem.",
    answer: ["look into"],
    note: "Phrasal verb común en entornos técnicos."
  },
  {
    id: "ex-203",
    type: "translation",
    level: "B2",
    topic: "work",
    prompt: "Aclaremos los detalles antes de firmar",
    answer: "Let's iron out the details before signing",
    synonyms: ["Let's clear up the details"]
  },

  // PHRASAL VERBS AVANZADOS (B1-B2)
  {
    id: "ex-210",
    type: "fill",
    level: "B1",
    topic: "phrasal-verbs",
    prompt: "The meeting was ___ (cancelada) due to the strike.",
    answer: ["called off"],
    note: "Call off = Cancelar algo planeado."
  },
  {
    id: "ex-211",
    type: "translation",
    level: "B2",
    topic: "phrasal-verbs",
    prompt: "Se me ocurrió una idea genial",
    answer: "I came up with a great idea",
  },
  {
    id: "ex-212",
    type: "fill",
    level: "B2",
    topic: "phrasal-verbs",
    prompt: "I can't ___ (tolerar) this noise anymore.",
    answer: ["put up with"],
    note: "Put up with = Soportar o tolerar."
  },

  // GRAMÁTICA: CONDICIONALES (B1-B2)
  {
    id: "ex-220",
    type: "fill",
    level: "B2",
    topic: "conditionals",
    prompt: "If I ___ (know) you were coming, I would have baked a cake.",
    answer: ["had known"],
    note: "Tercera condicional: situaciones hipotéticas del pasado."
  },
  {
    id: "ex-221",
    type: "translation",
    level: "B1",
    topic: "conditionals",
    prompt: "Si yo fuera tú, no lo haría",
    answer: "If I were you, I wouldn't do it",
    synonyms: ["If I were you, I would not do it"]
  },

  // IDIOMS & COMMON EXPRESSIONS
  {
    id: "ex-230",
    type: "translation",
    level: "B2",
    topic: "idioms",
    prompt: "Eso es pan comido",
    answer: "That's a piece of cake",
    synonyms: ["It's a piece of cake"]
  },
  {
    id: "ex-231",
    type: "phrase",
    level: "B1",
    topic: "idioms",
    prompt: "Me suena de algo",
    answer: "It rings a bell",
  },
  {
    id: "ex-232",
    type: "translation",
    level: "B2",
    topic: "idioms",
    prompt: "Cuesta un ojo de la cara",
    answer: "It costs an arm and a leg",
  },

  // DAILY LIFE (MÁS VARIEDAD)
  {
    id: "ex-240",
    type: "translation",
    level: "A2",
    topic: "daily-life",
    prompt: "¿Cómo has estado?",
    answer: "How have you been?",
  },
  {
    id: "ex-241",
    type: "phrase",
    level: "B1",
    topic: "daily-life",
    prompt: "No te preocupes, no importa",
    answer: "Never mind",
    synonyms: ["Don't worry, it doesn't matter"]
  },
  {
    id: "ex-242",
    type: "fill",
    level: "B1",
    topic: "prepositions",
    prompt: "I am fed up ___ my job.",
    answer: ["with"],
    note: "Be fed up with = Estar harto de algo."
  },
    // Daily life A1-A2
  { id: "ex-250", type: "translation", level: "A1", topic: "daily-life", prompt: "Tengo frio", answer: "I'm cold" },
  { id: "ex-251", type: "translation", level: "A1", topic: "daily-life", prompt: "Tengo calor", answer: "I'm hot" },
  { id: "ex-252", type: "translation", level: "A1", topic: "daily-life", prompt: "Estoy feliz", answer: "I'm happy" },
  { id: "ex-253", type: "translation", level: "A2", topic: "daily-life", prompt: "Estoy preocupado", answer: "I'm worried" },
  { id: "ex-254", type: "fill", level: "A2", topic: "daily-life", prompt: "She is ___ (feliz) today.", answer: ["happy"] },

  // Travel
  { id: "ex-260", type: "translation", level: "A2", topic: "travel", prompt: "Necesito un taxi", answer: "I need a taxi" },
  { id: "ex-261", type: "fill", level: "A2", topic: "travel", prompt: "We are staying ___ a hotel.", answer: ["at"] },
  { id: "ex-262", type: "translation", level: "B1", topic: "travel", prompt: "El tren se ha retrasado", answer: "The train has been delayed" },

  // Work B1-B2
  { id: "ex-270", type: "translation", level: "B1", topic: "work", prompt: "Debemos revisar el presupuesto", answer: "We need to review the budget" },
  { id: "ex-271", type: "fill", level: "B2", topic: "work", prompt: "She is in charge ___ the new project.", answer: ["of"] },
  { id: "ex-272", type: "translation", level: "B2", topic: "work", prompt: "Tenemos que posponer la reunión", answer: "We have to put off the meeting" },

  // Food
  { id: "ex-280", type: "translation", level: "A1", topic: "food", prompt: "Quiero agua", answer: "I want water" },
  { id: "ex-281", type: "translation", level: "A2", topic: "food", prompt: "Me gustaría reservar una mesa", answer: "I'd like to book a table" },
  { id: "ex-282", type: "fill", level: "A2", topic: "food", prompt: "Can I have some ___ (pan)?", answer: ["bread"] },

  // Education
  { id: "ex-290", type: "translation", level: "A1", topic: "education", prompt: "Estoy aprendiendo matemáticas", answer: "I'm learning math" },
  { id: "ex-291", type: "fill", level: "A2", topic: "education", prompt: "He ___ (estudiar) English for two years.", answer: ["studied"] },

  // Irregular verbs extra
  { id: "ex-300", type: "fill", level: "B1", topic: "irregular-verbs", prompt: "She has ___ (escribir) a letter.", answer: ["written"] },
  { id: "ex-301", type: "fill", level: "B1", topic: "irregular-verbs", prompt: "They ___ (traer) the books yesterday.", answer: ["brought"] },

  // Phrasal verbs avanzados
  { id: "ex-310", type: "fill", level: "B2", topic: "phrasal-verbs", prompt: "We need to ___ (examinar) the details carefully.", answer: ["look into"] },
  { id: "ex-311", type: "translation", level: "B2", topic: "phrasal-verbs", prompt: "Me deshice de mis viejos libros", answer: "I got rid of my old books" },

  // Conditionals
  { id: "ex-320", type: "fill", level: "B2", topic: "conditionals", prompt: "If I ___ (tener) more time, I would travel.", answer: ["had"] },
  { id: "ex-321", type: "translation", level: "B2", topic: "conditionals", prompt: "Si hubieras estudiado, habrías aprobado", answer: "If you had studied, you would have passed" },

  // Idioms / common expressions
  { id: "ex-330", type: "translation", level: "B2", topic: "idioms", prompt: "Estoy al borde del colapso", answer: "I'm at the end of my rope" },
  { id: "ex-331", type: "phrase", level: "B1", topic: "idioms", prompt: "Me costó mucho trabajo", answer: "It took me a lot of effort" },

  // Misc / connectors
  { id: "ex-340", type: "fill", level: "B1", topic: "prepositions", prompt: "I am good ___ playing tennis.", answer: ["at"] },
  { id: "ex-341", type: "fill", level: "B2", topic: "prepositions", prompt: "They are interested ___ learning new languages.", answer: ["in"] },

  // Daily-life situational phrases
  { id: "ex-350", type: "phrase", level: "B1", topic: "daily-life", prompt: "¿Qué tal tu día?", answer: "How was your day?" },
  { id: "ex-351", type: "phrase", level: "B1", topic: "daily-life", prompt: "Cuídate mucho", answer: "Take care" },
  ...AUTO_GENERATED_EXERCISES,
];

export const EXERCISE_REMOTE_SHAPE = {
  id: "ex-100",
  type: "translation",
  level: "A1",
  topic: "daily-life",
  prompt: "Necesito practicar todos los dias",
  answer: "I need to practice every day",
};
