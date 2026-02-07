import { useEffect, useMemo, useRef, useState } from "react";
import { EXERCISES } from "./data/exercises.js";
import { loadState, saveState, clearState } from "./utils/storage.js";
import { checkAnswer } from "./utils/checker.js";
import { todayKey, yesterdayKey, isSameDay } from "./utils/time.js";

// Simple rules:
// - Prioritize exercises failed yesterday.
// - Only introduce new exercises when previous ones are mastered.
// - Mastery level moves up/down with answers (spaced repetition, simple version).

const DAILY_LIMIT = 10; // default daily goal
const DAILY_GOAL_OPTIONS = [5, 10, 15];
const REMOTE_EXERCISES_URL = ""; // Example: "https://raw.githubusercontent.com/user/repo/main/exercises.json"
const UI_PREFS_KEY = "daily_english_ui_prefs_v1";
const SERIES_LENGTH = 10;
const CHALLENGE_REWARD = 0.2;
const WEEK_GOAL = 4;
const SWIPE_THRESHOLD = 60;

const MODULES = [
  { id: "all", label: "Todo" },
  { id: "daily-life", label: "Vida diaria" },
  { id: "prepositions", label: "Preposiciones" },
  { id: "phrasal-verbs", label: "Phrasal verbs" },
  { id: "past-simple", label: "Past simple" },
  { id: "present-perfect", label: "Present perfect" },
  { id: "future", label: "Future" },
  { id: "travel", label: "Viajes" },
  { id: "work", label: "Trabajo" },
  { id: "food", label: "Comida" },
  { id: "shopping", label: "Compras" },
  { id: "health", label: "Salud" },
  { id: "education", label: "Educacion" },
  { id: "technology", label: "Tecnologia" },
  { id: "ai", label: "IA" },
  { id: "questions", label: "Preguntas" },
  { id: "irregular-verbs", label: "Irregulares" },
  { id: "collocations", label: "Collocations" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LEVEL_RANK = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

const TOPIC_TIPS = {
  prepositions:
    "Tip: at para puntos concretos (hora/lugar exacto), in para espacios cerrados/ciudades/paises/meses, on para superficies/dias. Ojo con in the morning/at night/on Monday.",
  "phrasal-verbs":
    "Tip: un phrasal verb puede ser separable o no. Si es separable, el pronombre va en medio (turn it off). Aprende el significado como unidad.",
  "modal-verbs":
    "Tip: los modales van antes del verbo base (sin 'to') y no cambian con he/she/it. Usa could para cortesía, must para obligacion, might/may para posibilidad.",
  conditionals:
    "Tip: 0/1 condicional usan presente en if. Para hipoteticos: if + past, would + verbo. Para pasado irreal: if + past perfect, would have + participio.",
  collocations:
    "Tip: algunas combinaciones son fijas: make a decision, do homework, take a break. No traduzcas palabra por palabra; memoriza la pareja.",
  technology:
    "Tip: en tech usa verbos concretos (deploy, crash, fix) y sustantivos precisos (latency, outage, backlog). Evita vaguedad: se specifico.",
  ai:
    "Tip: en IA habla de datos, sesgo, precision/recall y generalizacion. Diferencia modelo, entrenamiento e inferencia.",
  "daily-life":
    "Tip: usa presente simple para rutinas (I work) y presente continuo para acciones de ahora (I'm working). Con estados usa be (I'm tired/hungry).",
  future:
    "Tip: will para decisiones espontaneas/promesas, be going to para planes/intencion, present continuous para planes ya acordados (I'm meeting).",
  idioms:
    "Tip: no se traducen literal. Busca el equivalente en ingles y mantenlos en frases naturales; suelen ir en registro informal.",
  "irregular-verbs":
    "Tip: memoriza base/past/participle en bloques (go/went/gone). En preguntas/negaciones usa did + base (no *did went*).",
  "past-simple":
    "Tip: usa pasado simple para acciones terminadas con tiempo definido. Regulares terminan en -ed; irregulares cambian forma. En preguntas usa did + base.",
  "present-perfect":
    "Tip: usa present perfect para experiencias o acciones con impacto ahora (I have lost...). Con for/since indica duracion.",
  superlatives:
    "Tip: el superlativo lleva the: the biggest/the most interesting. Adjetivos cortos: -est; largos: most + adj. Ojo con good -> best.",
  travel:
    "Tip: prioriza expresiones de ubicacion, transporte y peticiones corteses (Could I...?). Usa where/how much/which para preguntas frecuentes.",
  work:
    "Tip: usa verbos de accion (send, review, fix) y marcadores de tiempo (by EOD, tomorrow). Mantiene tono profesional y directo.",
};

function getDailyMasteryCap(dailyGoal) {
  if (dailyGoal === 5) return 0.5;
  if (dailyGoal === 10) return 0.75;
  return 1;
}

function defaultProgress() {
  return {
    attempts: 0,
    failures: 0,
    lastFailedAt: null,
    masteryLevel: 0,
    lastConfidence: null,
  };
}

function maskWordKeepApostrophe(word) {
  if (!word) return "";
  const first = word[0];
  const rest = word.slice(1).replace(/[A-Za-z]/g, "_");
  return `${first}${rest}`;
}

function hintFromAnswer(answer, level) {
  const base = Array.isArray(answer) ? answer[0] : answer;
  if (!base) return "";
  const rawWords = String(base).trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return "";

  if (level === "B2" || level === "C1" || level === "C2") {
    const first = rawWords[0] || "";
    return `${first[0] || ""}... (${rawWords.length} palabras)`;
  }

  if (level === "B1") {
    return rawWords.map((word) => `${word[0] || ""}...`).join(" ");
  }

  return rawWords.map(maskWordKeepApostrophe).join(" ");
}

function isMastered(progress) {
  return (progress?.masteryLevel || 0) >= 0.8;
}

function isValidExercise(ex) {
  return (
    ex &&
    typeof ex.id === "string" &&
    typeof ex.type === "string" &&
    typeof ex.level === "string" &&
    typeof ex.topic === "string" &&
    typeof ex.prompt === "string" &&
    (typeof ex.answer === "string" || Array.isArray(ex.answer))
  );
}

function pickFocusTopic(exercises, progressById) {
  const counts = {};
  exercises.forEach((ex) => {
    const failures = progressById[ex.id]?.failures || 0;
    if (!failures) return;
    counts[ex.topic] = (counts[ex.topic] || 0) + failures;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffleWithSeed(items, seedKey) {
  const result = [...items];
  let seed = hashString(seedKey);
  for (let i = result.length - 1; i > 0; i -= 1) {
    seed += 1;
    const j = Math.floor(seededRandom(seed) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRecentDays(count) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days.reverse();
}

function markActivityDay(activityDays, dateKey) {
  if (activityDays.includes(dateKey)) return activityDays;
  return [...activityDays, dateKey];
}

function previousDayKey(dateKey) {
  if (!dateKey) return yesterdayKey();
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return yesterdayKey();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function computeStreakDays(activityDays, today) {
  const days = new Set(activityDays || []);
  if (days.size === 0) return 0;
  let cursor = days.has(today) ? today : yesterdayKey();
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return streak;
}

function streakTier(streakDays) {
  if (streakDays >= 30) return 5;
  if (streakDays >= 14) return 4;
  if (streakDays >= 7) return 3;
  if (streakDays >= 3) return 2;
  if (streakDays >= 1) return 1;
  return 0;
}

function getExtraExample(exercises, current) {
  if (!current) return null;
  const candidate = exercises.find(
    (ex) => ex.topic === current.topic && ex.id !== current.id
  );
  if (!candidate) return null;
  return {
    prompt: candidate.prompt,
    answer: Array.isArray(candidate.answer)
      ? candidate.answer.join(" / ")
      : candidate.answer,
  };
}

async function fetchRemoteExercises(url) {
  if (!url) return [];
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter(isValidExercise);
  } catch {
    return [];
  }
}

function buildDailyQueue(
  exercises,
  progressById,
  moduleId,
  levelCap,
  limitOverride
) {
  const filteredByLevel = levelCap
    ? exercises.filter((ex) => (LEVEL_RANK[ex.level] || 1) <= levelCap)
    : exercises;
  const pool =
    moduleId && moduleId !== "all"
      ? filteredByLevel.filter((ex) => ex.topic === moduleId)
      : filteredByLevel;
  const yesterday = yesterdayKey();
  const failedYesterday = pool.filter(
    (ex) => progressById[ex.id]?.lastFailedAt === yesterday
  );

  const unmasteredSeen = pool.filter((ex) => {
    const progress = progressById[ex.id];
    const seen = Boolean(progress);
    return seen && !isMastered(progress) && progress.lastFailedAt !== yesterday;
  });

  const hasUnmastered = failedYesterday.length > 0 || unmasteredSeen.length > 0;
  const newItems = hasUnmastered
    ? []
    : pool.filter((ex) => !progressById[ex.id]);

  const focusTopic = pickFocusTopic(pool, progressById);
  const focusItems = focusTopic
    ? pool.filter((ex) => ex.topic === focusTopic && !isMastered(progressById[ex.id]))
    : [];

  const baseQueue = [...unmasteredSeen, ...newItems];
  const merged = [
    ...focusItems.slice(0, 3),
    ...baseQueue.filter((ex) => !focusItems.some((fi) => fi.id === ex.id)),
  ];
  const randomized = shuffleWithSeed(
    merged,
    `${todayKey()}|${moduleId || "all"}|${levelCap || "all"}`
  );
  const limit =
    typeof limitOverride === "number"
      ? limitOverride
      : moduleId && moduleId !== "all"
        ? SERIES_LENGTH
        : DAILY_LIMIT;
  return [...failedYesterday, ...randomized].slice(0, limit);
}

function pickDailyChallenge(exercises, levelCap) {
  if (!levelCap) return null;
  const nextLevel = LEVELS[levelCap] || null;
  if (!nextLevel) return null;
  const byLevel = exercises.filter((ex) => ex.level === nextLevel);
  if (byLevel.length === 0) return null;
  const seedKey = `challenge|${todayKey()}|${nextLevel}`;
  const pool = byLevel;
  const shuffled = shuffleWithSeed(pool, seedKey);
  return shuffled[0];
}

export default function App() {
  const saved = useMemo(() => loadState(), []);
  const [exercises, setExercises] = useState(EXERCISES);
  const [focusMode, setFocusMode] = useState(() => {
    try {
      const raw = localStorage.getItem(UI_PREFS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.focusMode);
    } catch {
      return false;
    }
  });
  const [highContrast, setHighContrast] = useState(() => {
    try {
      const raw = localStorage.getItem(UI_PREFS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.highContrast);
    } catch {
      return false;
    }
  });
  const [moduleId, setModuleId] = useState(() => {
    try {
      const raw = localStorage.getItem(UI_PREFS_KEY);
      if (!raw) return "all";
      const parsed = JSON.parse(raw);
      return parsed?.moduleId || "all";
    } catch {
      return "all";
    }
  });
  const [levelCap, setLevelCap] = useState(() => {
    try {
      const raw = localStorage.getItem(UI_PREFS_KEY);
      if (!raw) return LEVEL_RANK.A1;
      const parsed = JSON.parse(raw);
      return Number(parsed?.levelCap) || LEVEL_RANK.A1;
    } catch {
      return LEVEL_RANK.A1;
    }
  });
  const [speechRate, setSpeechRate] = useState(() => {
    try {
      const raw = localStorage.getItem(UI_PREFS_KEY);
      if (!raw) return 1;
      const parsed = JSON.parse(raw);
      return Number(parsed?.speechRate) || 1;
    } catch {
      return 1;
    }
  });
  const [dailyGoal, setDailyGoal] = useState(() => {
    try {
      const raw = localStorage.getItem(UI_PREFS_KEY);
      if (!raw) return DAILY_LIMIT;
      const parsed = JSON.parse(raw);
      return Number(parsed?.dailyGoal) || DAILY_LIMIT;
    } catch {
      return DAILY_LIMIT;
    }
  });
  const [confidence, setConfidence] = useState(2);
  const [state, setState] = useState(() => {
    const today = todayKey();
    if (saved && saved.session && isSameDay(saved.lastSessionDate, today)) {
      return {
        ...saved,
        dailyChallenge:
          saved?.dailyChallenge?.date === today
            ? saved.dailyChallenge
            : { date: today, completed: false },
        session: {
          ...saved.session,
          answeredIds: saved.session?.answeredIds || [],
          correctIds: saved.session?.correctIds || [],
        },
      };
    }

    // New day: build a fresh queue.
    const progressById = saved?.progressById || {};
    const queue = buildDailyQueue(
      EXERCISES,
      progressById,
      moduleId,
      levelCap,
      dailyGoal
    );
    const streakDays = computeStreakDays(saved?.activityDays || [], today);

    return {
      progressById,
      lastSessionDate: today,
      streakDays,
      activityDays: saved?.activityDays || [],
      dailyChallenge: { date: today, completed: false },
      session: {
        date: today,
        queueIds: queue.map((ex) => ex.id),
        index: 0,
        completed: 0,
        answeredIds: [],
        correctIds: [],
        moduleId,
        levelCap,
        dailyGoal,
      },
    };
  });

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [challengeFeedback, setChallengeFeedback] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!REMOTE_EXERCISES_URL) return undefined;
    fetchRemoteExercises(REMOTE_EXERCISES_URL).then((remote) => {
      if (cancelled) return;
      if (remote.length > 0) {
        setExercises(remote);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextPrefs = {
      focusMode,
      highContrast,
      moduleId,
      levelCap,
      speechRate,
      dailyGoal,
    };
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(nextPrefs));
  }, [focusMode, highContrast, moduleId, levelCap, speechRate, dailyGoal]);

  useEffect(() => {
    const sessionMatchesFilters =
      state.session?.moduleId === moduleId &&
      state.session?.levelCap === levelCap &&
      state.session?.dailyGoal === dailyGoal &&
      isSameDay(state.session?.date, todayKey());

    if (sessionMatchesFilters) return undefined;

    setIsLoadingQueue(true);
    setAnswer("");
    setFeedback(null);

    const timeoutId = setTimeout(() => {
      const queue = buildDailyQueue(
        exercises,
        state.progressById,
        moduleId,
        levelCap,
        dailyGoal
      );
      const nextState = {
        ...state,
        lastSessionDate: todayKey(),
        session: {
          date: todayKey(),
          queueIds: queue.map((ex) => ex.id),
          index: 0,
          completed: 0,
          answeredIds: [],
          correctIds: [],
          moduleId,
          levelCap,
          dailyGoal,
        },
      };
      persist(nextState);
      setIsLoadingQueue(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [moduleId, exercises, levelCap, dailyGoal]);

  function resetUIPreferences() {
    setFocusMode(false);
    setHighContrast(false);
    setModuleId("all");
    setLevelCap(LEVEL_RANK.A1);
    setSpeechRate(1);
    setDailyGoal(DAILY_LIMIT);
    localStorage.removeItem(UI_PREFS_KEY);
  }

  function resetProgress() {
    const confirmed = window.confirm(
      "Esto borrara tu progreso y no se puede deshacer. Quieres continuar?"
    );
    if (!confirmed) return;
    clearState();
    const progressById = {};
    const queue = buildDailyQueue(
      exercises,
      progressById,
      moduleId,
      levelCap,
      dailyGoal
    );
    const nextState = {
      progressById,
      lastSessionDate: todayKey(),
      streakDays: 0,
      activityDays: [],
      dailyChallenge: { date: todayKey(), completed: false },
      session: {
        date: todayKey(),
        queueIds: queue.map((ex) => ex.id),
        index: 0,
        completed: 0,
        answeredIds: [],
        correctIds: [],
        moduleId,
        levelCap,
        dailyGoal,
      },
    };
    setAnswer("");
    setFeedback(null);
    setChallengeAnswer("");
    setChallengeFeedback(null);
    persist(nextState);
  }

  const queue = state.session.queueIds
    .map((id) => exercises.find((ex) => ex.id === id))
    .filter(Boolean);
  const current = queue[state.session.index];
  const dailyChallenge = pickDailyChallenge(exercises, levelCap);
  const isChallengeDoneToday =
    state.dailyChallenge?.date === todayKey() &&
    state.dailyChallenge?.completed;
  const touchStart = useRef({ x: 0, y: 0 });

  function persist(next) {
    setState(next);
    saveState(next);
  }

  function updateProgress(exercise, isCorrect, confidenceLevel) {
    const currentProgress = state.progressById[exercise.id] || defaultProgress();
    const nextProgress = { ...currentProgress };
    nextProgress.attempts += 1;
    nextProgress.lastConfidence = confidenceLevel ?? null;

    if (isCorrect) {
      const masteryCap = getDailyMasteryCap(dailyGoal);
      nextProgress.masteryLevel = Math.min(
        masteryCap,
        nextProgress.masteryLevel + 0.4
      );
    } else {
      nextProgress.failures += 1;
      nextProgress.lastFailedAt = todayKey();
      nextProgress.masteryLevel = Math.max(
        0,
        nextProgress.masteryLevel - 0.3
      );
    }

    return nextProgress;
  }

  function handleAnswer(isForgotten = false) {
    if (!current) return;

    const isCorrect =
      !isForgotten && checkAnswer(answer, current.answer, current.synonyms);
    const extraExample = !isCorrect ? getExtraExample(exercises, current) : null;

    const previousProgress = state.progressById[current.id] || defaultProgress();
    const nextProgress = {
      ...state.progressById,
      [current.id]: updateProgress(current, isCorrect, confidence),
    };
    const nextCorrectIds = new Set(state.session.correctIds || []);
    const nextAnsweredIds = new Set(state.session.answeredIds || []);
    if (isCorrect) {
      nextCorrectIds.add(current.id);
    } else {
      nextCorrectIds.delete(current.id);
    }
    nextAnsweredIds.add(current.id);
    const nextSession = {
      ...state.session,
      answeredIds: Array.from(nextAnsweredIds),
      correctIds: Array.from(nextCorrectIds),
    };

    const nextState = {
      ...state,
      progressById: nextProgress,
      lastSessionDate: todayKey(),
      activityDays: state.activityDays || [],
      streakDays: state.streakDays || 0,
      session: nextSession,
    };

    persist(nextState);
    setConfidence(2);

    setFeedback({
      ok: isCorrect,
      message: isCorrect
        ? "Correcto. Buen trabajo."
        : `Respuesta esperada: ${
            Array.isArray(current.answer)
              ? current.answer.join(" / ")
              : current.answer
          }`,
      hint: isCorrect ? null : hintFromAnswer(current.answer, current.level),
      extraExample,
      masteryDelta: isCorrect
        ? Math.round(
            ((nextProgress[current.id]?.masteryLevel || 0) -
              (previousProgress?.masteryLevel || 0)) *
              100
          )
        : 0,
    });
  }

  function handleChallengeAnswer() {
    if (!dailyChallenge || isChallengeDoneToday) return;
    const isCorrect = checkAnswer(
      challengeAnswer,
      dailyChallenge.answer,
      dailyChallenge.synonyms
    );
    const currentProgress =
      state.progressById[dailyChallenge.id] || defaultProgress();
    const masteryCap = getDailyMasteryCap(dailyGoal);
    const nextProgress = {
      ...currentProgress,
      attempts: currentProgress.attempts + 1,
      masteryLevel: Math.min(
        masteryCap,
        currentProgress.masteryLevel + CHALLENGE_REWARD
      ),
    };
    const nextState = {
      ...state,
      progressById: isCorrect
        ? {
            ...state.progressById,
            [dailyChallenge.id]: nextProgress,
          }
        : state.progressById,
      dailyChallenge: { date: todayKey(), completed: true },
    };
    persist(nextState);
    setChallengeFeedback({
      ok: isCorrect,
      message: isCorrect
        ? `Correcto. +${Math.round(CHALLENGE_REWARD * 100)}% de dominio.`
        : "Respuesta incorrecta. El reto se marca como completado.",
    });
    setChallengeAnswer("");
  }

  function nextExercise() {
    if (!current) return;
    setFeedback(null);
    setAnswer("");

    const nextAnsweredIds = new Set(state.session.answeredIds || []);
    nextAnsweredIds.add(current.id);
    const nextSession = {
      ...state.session,
      completed: Math.min(state.session.completed + 1, queue.length),
      index: Math.min(state.session.index + 1, queue.length),
      answeredIds: Array.from(nextAnsweredIds),
    };

    const isSessionComplete =
      nextSession.completed >= queue.length && queue.length > 0;
    const nextActivityDays = isSessionComplete
      ? markActivityDay(state.activityDays || [], todayKey())
      : state.activityDays || [];
    const nextStreakDays = isSessionComplete
      ? computeStreakDays(nextActivityDays, todayKey())
      : state.streakDays || 0;

    persist({
      ...state,
      activityDays: nextActivityDays,
      streakDays: nextStreakDays,
      session: nextSession,
    });
  }

  function confirmSessionReset(nextModuleId, nextLevelCap, nextDailyGoal) {
    const sessionDate = state.session?.date;
    const isToday = sessionDate && isSameDay(sessionDate, todayKey());
    const willChangeModule =
      typeof nextModuleId === "string" &&
      nextModuleId !== state.session?.moduleId;
    const willChangeLevel =
      typeof nextLevelCap === "number" &&
      nextLevelCap !== state.session?.levelCap;
    const willChangeDailyGoal =
      typeof nextDailyGoal === "number" &&
      nextDailyGoal !== state.session?.dailyGoal;
    const hasProgress =
      (state.session?.completed || 0) > 0 || (state.session?.index || 0) > 0;

    if (
      isToday &&
      hasProgress &&
      (willChangeModule || willChangeLevel || willChangeDailyGoal)
    ) {
      return window.confirm(
        "Si cambias el nivel, el modulo o la meta diaria se reiniciara la sesion de hoy. Quieres continuar?"
      );
    }
    return true;
  }

  const remainingToday = Math.max(queue.length - state.session.completed, 0);
  const displayStreakDays = computeStreakDays(state.activityDays || [], todayKey());
  const currentStreakTier = streakTier(displayStreakDays);
  const correctCount = Math.min(
    state.session.correctIds?.length || 0,
    dailyGoal
  );
  const answeredCount = Math.min(
    state.session.answeredIds?.length || 0,
    dailyGoal
  );
  const remainingCount = Math.max(dailyGoal - answeredCount, 0);
  const capPercent = Math.round(getDailyMasteryCap(dailyGoal) * 100);
  const challengeBonusPercent =
    dailyChallenge && !isChallengeDoneToday
      ? Math.round(
          (capPercent / Math.max(dailyGoal, 1)) * (CHALLENGE_REWARD / 0.4)
        )
      : 0;
  const progressPercent = Math.round(
    (correctCount / Math.max(dailyGoal, 1)) * capPercent
  );
  const potentialPercent = Math.round(
    ((correctCount + remainingCount) / Math.max(dailyGoal, 1)) * capPercent
  );
  const bonusProjectionPercent = Math.min(
    100,
    progressPercent + challengeBonusPercent
  );
  const failedYesterdayIds = exercises
    .filter((ex) => state.progressById[ex.id]?.lastFailedAt === yesterdayKey())
    .map((ex) => ex.id);
  const unmasteredIds = exercises
    .filter(
      (ex) =>
        state.progressById[ex.id] &&
        !isMastered(state.progressById[ex.id])
    )
    .map((ex) => ex.id);
  const recentDays = getRecentDays(7);
  const completedRecent = recentDays.filter((day) =>
    (state.activityDays || []).includes(day)
  ).length;
  const weeklyProgress = Math.min(
    100,
    Math.round((completedRecent / WEEK_GOAL) * 100)
  );

  function speakCurrent() {
    if (!current) return;
    if (!("speechSynthesis" in window)) return;
    const text = Array.isArray(current.answer)
      ? current.answer[0]
      : current.answer;
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  }
  const failuresByTopic = exercises.reduce((acc, ex) => {
    const failures = state.progressById[ex.id]?.failures || 0;
    if (failures > 0) {
      acc[ex.topic] = (acc[ex.topic] || 0) + failures;
    }
    return acc;
  }, {});
  const topFailures = Object.entries(failuresByTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const selectedModule =
    MODULES.find((module) => module.id === moduleId) || MODULES[0];

  const surfaceClass = highContrast
    ? "border-slate-700 bg-slate-900/80 text-slate-100"
    : "border-slate-200/80 bg-white/80 text-slate-900";
  const subtleText = highContrast ? "text-slate-300" : "text-slate-600";
  const borderMuted = highContrast ? "border-slate-700" : "border-slate-200";

  return (
    <div
      className={`min-h-screen px-3 py-5 sm:px-6 sm:py-10 ${
        highContrast
          ? "bg-slate-950 text-slate-100"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${
                highContrast
                  ? "border-slate-700 bg-slate-900/70 text-slate-300"
                  : "border-slate-200 bg-white/80 text-slate-500"
              }`}
            >
              Daily practice
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  highContrast
                    ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                onClick={() => setFocusMode((prev) => !prev)}
              >
                {focusMode ? "Salir focus" : "Modo focus"}
              </button>
              <button
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  highContrast
                    ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                onClick={() => setHighContrast((prev) => !prev)}
              >
                {highContrast ? "Tema claro" : "Alto contraste"}
              </button>
              <button
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  highContrast
                    ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                onClick={resetUIPreferences}
              >
                Reset UI
              </button>
              <button
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  highContrast
                    ? "border-rose-700 bg-rose-900/50 text-rose-200 hover:border-rose-500"
                    : "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
                }`}
                onClick={resetProgress}
              >
                Reiniciar progreso
              </button>
            </div>
          </div>

          {!focusMode && (
            <>
              <h2 className="text-3xl font-semibold tracking-tight">
                Daily English Learning
              </h2>
              <p className={`text-sm ${subtleText}`}>
                Practica diaria de 5-10 minutos. Una frase a la vez.
              </p>
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div
                  className={`rounded-2xl border px-3 py-2 text-sm shadow-sm ${surfaceClass}`}
                >
                  <p className="text-xs uppercase tracking-wide opacity-70">
                    Racha
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">
                      {displayStreakDays} dias
                    </p>
                    {currentStreakTier > 0 && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          highContrast
                            ? "bg-amber-900/60 text-amber-200"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        Fuego {currentStreakTier}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {getRecentDays(7).map((day) => (
                      <span
                        key={day}
                        className={`h-2 rounded-full ${
                          (state.activityDays || []).includes(day)
                            ? highContrast
                              ? "bg-emerald-400"
                              : "bg-emerald-600"
                            : highContrast
                              ? "bg-slate-700"
                              : "bg-slate-200"
                        }`}
                        title={day}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border px-3 py-2 text-sm shadow-sm ${surfaceClass}`}
                >
                  <p className="text-xs uppercase tracking-wide opacity-70">
                    Progreso hoy
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative h-2 w-full rounded-full bg-slate-200/60">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${
                          highContrast ? "bg-emerald-200/40" : "bg-emerald-300/50"
                        }`}
                        style={{ width: `${potentialPercent}%` }}
                      />
                      {challengeBonusPercent > 0 && (
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            highContrast
                              ? "bg-amber-300/40"
                              : "bg-amber-400/50"
                          }`}
                          style={{ width: `${bonusProjectionPercent}%` }}
                        />
                      )}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${
                          highContrast ? "bg-emerald-400" : "bg-emerald-600"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      Semana
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full rounded-full bg-slate-200/60">
                        <div
                          className={`h-2 rounded-full ${
                            highContrast ? "bg-slate-200" : "bg-slate-900"
                          }`}
                          style={{ width: `${weeklyProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold">
                        {completedRecent}/{WEEK_GOAL}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                <label className="flex items-center gap-2">
                  <span className={subtleText}>Modulo</span>
                  <select
                    className={`rounded-full border px-2 py-1 text-xs ${
                      highContrast
                        ? "border-slate-700 bg-slate-900 text-slate-200"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    value={moduleId}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (!confirmSessionReset(nextValue, levelCap, dailyGoal)) return;
                      setModuleId(nextValue);
                    }}
                  >
                    {MODULES.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className={subtleText}>Nivel</span>
                  <select
                    className={`rounded-full border px-2 py-1 text-xs ${
                      highContrast
                        ? "border-slate-700 bg-slate-900 text-slate-200"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    value={levelCap}
                    onChange={(e) => {
                      const nextValue = Number(e.target.value);
                      if (!confirmSessionReset(moduleId, nextValue, dailyGoal))
                        return;
                      setLevelCap(nextValue);
                    }}
                  >
                    {LEVELS.map((level) => (
                      <option key={level} value={LEVEL_RANK[level]}>
                        Hasta {level}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className={subtleText}>Meta diaria</span>
                  <select
                    className={`rounded-full border px-2 py-1 text-xs ${
                      highContrast
                        ? "border-slate-700 bg-slate-900 text-slate-200"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    value={dailyGoal}
                    onChange={(e) => {
                      const nextValue = Number(e.target.value);
                      if (!confirmSessionReset(moduleId, levelCap, nextValue))
                        return;
                      setDailyGoal(nextValue);
                    }}
                  >
                    {DAILY_GOAL_OPTIONS.map((goal) => (
                      <option key={goal} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    highContrast
                      ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  onClick={() =>
                    setSpeechRate((prev) => (prev === 1 ? 0.8 : 1))
                  }
                >
                  Audio: {speechRate === 1 ? "Normal" : "Lento"}
                </button>
                <span className={subtleText}>
                  Serie: {selectedModule.label}
                </span>
              </div>
            </>
          )}
        </header>

        <section
          className={`rounded-2xl border p-4 shadow-sm backdrop-blur sm:p-5 ${surfaceClass}`}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - touchStart.current.x;
            const deltaY = touch.clientY - touchStart.current.y;
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -SWIPE_THRESHOLD) {
              nextExercise();
            }
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Tu ejercicio de hoy</h2>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`rounded-full border px-2 py-1 ${
                  highContrast
                    ? "border-slate-600 bg-slate-800 text-slate-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                Fallados ayer: {failedYesterdayIds.length}
              </span>
              <span
                className={`rounded-full border px-2 py-1 ${
                  highContrast
                    ? "border-slate-600 bg-slate-800 text-slate-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                Hoy: {remainingToday}
              </span>
            </div>
          </div>

          <div
            className={`mt-4 h-px w-full ${
              highContrast
                ? "bg-gradient-to-r from-transparent via-slate-700 to-transparent"
                : "bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            }`}
          />

          {isLoadingQueue ? (
            <div className="mt-4 space-y-3 animate-pulse">
              <div className="h-4 w-24 rounded bg-slate-200/70" />
              <div className="h-6 w-full rounded bg-slate-200/70" />
              <div className="h-10 w-full rounded bg-slate-200/70" />
              <div className="h-9 w-32 rounded bg-slate-200/70" />
            </div>
          ) : !current ? (
            <p className={`mt-4 text-sm ${subtleText}`}>
              Terminaste por hoy. mañana veras primero lo que fallaste ayer.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {!focusMode && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {["type", "level", "topic"].map((key) => (
                    <span
                      key={key}
                      className={`rounded-full border px-2 py-1 ${
                        highContrast
                          ? "border-slate-600 bg-slate-800 text-slate-100"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {current[key]}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-lg font-medium">{current.prompt}</p>
              {!focusMode &&
                levelCap <= LEVEL_RANK.A2 &&
                TOPIC_TIPS[current.topic] && (
                <p className={`text-xs ${subtleText}`}>
                  {TOPIC_TIPS[current.topic]}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={subtleText}>Confianza</span>
                {[
                  { value: 1, label: "Baja" },
                  { value: 2, label: "Media" },
                  { value: 3, label: "Alta" },
                ].map((item) => (
                  <button
                    key={item.value}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      confidence === item.value
                        ? highContrast
                          ? "border-emerald-400 bg-emerald-900/50 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : highContrast
                          ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    onClick={() => setConfidence(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  className={`w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 ${
                    highContrast
                      ? "border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-400 focus:border-slate-400 focus:ring-slate-600"
                      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-slate-200"
                  }`}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAnswer(false);
                    }
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      nextExercise();
                    }
                  }}
                  placeholder="Escribe la respuesta en ingles"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    highContrast
                      ? "bg-white text-slate-900 hover:bg-slate-200"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                  onClick={() => handleAnswer(false)}
                >
                  Responder
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                    highContrast
                      ? "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  onClick={() => handleAnswer(true)}
                >
                  No me acuerdo
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                    highContrast
                      ? "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  onClick={nextExercise}
                >
                  Siguiente
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                    highContrast
                      ? "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  onClick={speakCurrent}
                >
                  Oir frase
                </button>
              </div>

              {feedback && (
                <div
                  className={`rounded-xl px-3 py-2 text-sm ${
                    feedback.ok
                      ? highContrast
                        ? "bg-emerald-900/50 text-emerald-200"
                        : "bg-emerald-50 text-emerald-700"
                      : highContrast
                        ? "bg-rose-900/50 text-rose-200"
                        : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <p>{feedback.message}</p>
                  {feedback.hint && (
                    <p className={`text-xs ${subtleText}`}>
                      Pista: {feedback.hint}
                    </p>
                  )}
                  {feedback.masteryDelta > 0 && (
                    <p className={`text-xs ${subtleText}`}>
                      Mejoraste +{feedback.masteryDelta}% de dominio.
                    </p>
                  )}
                  {feedback.extraExample && (
                    <p className={`text-xs ${subtleText}`}>
                      Ejemplo extra: {feedback.extraExample.prompt} -{" "}
                      {feedback.extraExample.answer}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {dailyChallenge && (
          <section
            className={`rounded-2xl border p-4 shadow-sm backdrop-blur sm:p-5 ${surfaceClass}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">
                Reto del dia (nivel {dailyChallenge.level})
              </h3>
              <span className={`text-xs ${subtleText}`}>
                No cuenta en los {dailyGoal} de hoy pero puede darte hasta +{challengeBonusPercent}% de dominio en esa frase.
              </span>
            </div>
            <p className="mt-2 text-sm">{dailyChallenge.prompt}</p>
            {dailyChallenge.hint && (
              <p className={`mt-1 text-xs ${subtleText}`}>
                Pista: {dailyChallenge.hint}
              </p>
            )}
            {isChallengeDoneToday ? (
              <p className={`mt-2 text-xs ${subtleText}`}>
                Reto completado hoy.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className={`w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 ${
                    highContrast
                      ? "border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-400 focus:border-slate-400 focus:ring-slate-600"
                      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-slate-200"
                  }`}
                  value={challengeAnswer}
                  onChange={(e) => setChallengeAnswer(e.target.value)}
                  placeholder="Tu respuesta"
                />
                <button
                  className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    highContrast
                      ? "bg-amber-200 text-slate-900 hover:bg-amber-100"
                      : "bg-amber-500 text-white hover:bg-amber-400"
                  }`}
                  onClick={handleChallengeAnswer}
                >
                  Resolver reto
                </button>
              </div>
            )}
            {challengeFeedback && (
              <div
                className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                  challengeFeedback.ok
                    ? highContrast
                      ? "bg-emerald-900/50 text-emerald-200"
                      : "bg-emerald-50 text-emerald-700"
                    : highContrast
                      ? "bg-rose-900/50 text-rose-200"
                      : "bg-rose-50 text-rose-700"
                }`}
              >
                <p>{challengeFeedback.message}</p>
              </div>
            )}
          </section>
        )}

        {!focusMode && (
          <section
            className={`rounded-2xl border p-4 shadow-sm backdrop-blur sm:p-5 ${surfaceClass}`}
          >
            <h3 className="text-lg font-semibold">Para repasar</h3>
            {failedYesterdayIds.length === 0 && unmasteredIds.length === 0 ? (
              <p className={`mt-2 text-sm ${subtleText}`}>
                Todo dominado. mañana se desbloquean nuevos ejercicios.
              </p>
            ) : (
              <ul className={`mt-2 list-disc pl-5 text-sm ${subtleText}`}>
                {failedYesterdayIds.map((id) => {
                  const ex = exercises.find((item) => item.id === id);
                  return <li key={id}>{ex ? ex.prompt : id}</li>;
                })}
                {unmasteredIds
                  .filter((id) => !failedYesterdayIds.includes(id))
                  .map((id) => {
                    const ex = exercises.find((item) => item.id === id);
                    return <li key={id}>{ex ? ex.prompt : id}</li>;
                  })}
              </ul>
            )}
            {topFailures.length > 0 && (
              <div className="mt-3 text-xs">
                <p className="font-semibold">Errores mas comunes</p>
                <ul className={subtleText}>
                  {topFailures.map(([topic, count]) => (
                    <li key={topic}>
                      {topic}: {count}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
