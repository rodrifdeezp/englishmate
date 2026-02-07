import { useEffect, useMemo, useState } from "react";
import { EXERCISES } from "./data/exercises.js";
import { loadState, saveState } from "./utils/storage.js";
import { checkAnswer } from "./utils/checker.js";
import { todayKey, yesterdayKey, isSameDay } from "./utils/time.js";

// Simple rules:
// - Prioritize exercises failed yesterday.
// - Only introduce new exercises when previous ones are mastered.
// - Mastery level moves up/down with answers (spaced repetition, simple version).

const DAILY_LIMIT = 12; // around 10 minutes
const REMOTE_EXERCISES_URL = ""; // Example: "https://raw.githubusercontent.com/user/repo/main/exercises.json"
const UI_PREFS_KEY = "daily_english_ui_prefs_v1";
const SERIES_LENGTH = 10;

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
  { id: "questions", label: "Preguntas" },
  { id: "irregular-verbs", label: "Irregulares" },
];

const LEVELS = ["A1", "A2", "B1", "B2"];
const LEVEL_RANK = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
};

function defaultProgress() {
  return {
    attempts: 0,
    failures: 0,
    lastFailedAt: null,
    masteryLevel: 0,
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

  if (level === "B2") {
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

function alternateByType(items) {
  const remaining = [...items];
  const output = [];
  let lastType = null;

  while (remaining.length > 0) {
    let index = remaining.findIndex((item) => item.type !== lastType);
    if (index === -1) index = 0;
    const [next] = remaining.splice(index, 1);
    output.push(next);
    lastType = next.type;
  }

  return output;
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

function buildDailyQueue(exercises, progressById, moduleId, levelCap) {
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

  const baseQueue = [...failedYesterday, ...unmasteredSeen, ...newItems];
  const merged = [
    ...focusItems.slice(0, 3),
    ...baseQueue.filter((ex) => !focusItems.some((fi) => fi.id === ex.id)),
  ];
  const alternated = alternateByType(merged);
  const limit = moduleId && moduleId !== "all" ? SERIES_LENGTH : DAILY_LIMIT;
  return alternated.slice(0, limit);
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
  const [fontScale] = useState(16);
  const [state, setState] = useState(() => {
    const today = todayKey();
    if (saved && saved.session && isSameDay(saved.lastSessionDate, today)) {
      return saved;
    }

    // New day: build a fresh queue.
    const progressById = saved?.progressById || {};
    const queue = buildDailyQueue(EXERCISES, progressById, moduleId, levelCap);
    const completedYesterday =
      saved?.session?.completed > 0 && saved?.lastSessionDate === yesterdayKey();
    const streakDays = completedYesterday ? (saved?.streakDays || 0) + 1 : 0;

    return {
      progressById,
      lastSessionDate: today,
      streakDays,
      session: {
        date: today,
        queueIds: queue.map((ex) => ex.id),
        index: 0,
        completed: 0,
      },
    };
  });

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);

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
    };
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(nextPrefs));
  }, [focusMode, highContrast, moduleId, levelCap]);

  useEffect(() => {
    const queue = buildDailyQueue(
      exercises,
      state.progressById,
      moduleId,
      levelCap
    );
    const nextState = {
      ...state,
      lastSessionDate: todayKey(),
      session: {
        date: todayKey(),
        queueIds: queue.map((ex) => ex.id),
        index: 0,
        completed: 0,
      },
    };
    persist(nextState);
  }, [moduleId, exercises, levelCap]);

  function resetUIPreferences() {
    setFocusMode(false);
    setHighContrast(false);
    setModuleId("all");
    setLevelCap(LEVEL_RANK.A1);
    localStorage.removeItem(UI_PREFS_KEY);
  }

  const queue = state.session.queueIds
    .map((id) => exercises.find((ex) => ex.id === id))
    .filter(Boolean);
  const current = queue[state.session.index];

  function persist(next) {
    setState(next);
    saveState(next);
  }

  function updateProgress(exercise, isCorrect) {
    const currentProgress = state.progressById[exercise.id] || defaultProgress();
    const nextProgress = { ...currentProgress };
    nextProgress.attempts += 1;

    if (isCorrect) {
      nextProgress.masteryLevel = Math.min(
        1,
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

    const nextProgress = {
      ...state.progressById,
      [current.id]: updateProgress(current, isCorrect),
    };

    const nextSession = {
      ...state.session,
      completed: Math.min(state.session.completed + 1, queue.length),
    };

    const nextState = {
      ...state,
      progressById: nextProgress,
      lastSessionDate: todayKey(),
      session: nextSession,
    };

    persist(nextState);

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
    });
  }

  function nextExercise() {
    if (!current) return;
    setFeedback(null);
    setAnswer("");

    const nextSession = {
      ...state.session,
      index: Math.min(state.session.index + 1, queue.length),
    };

    persist({
      ...state,
      session: nextSession,
    });
  }

  const remainingToday = Math.max(queue.length - state.session.completed, 0);
  const masteryPercent = Math.round(
    (queue.reduce(
      (sum, ex) => sum + (state.progressById[ex.id]?.masteryLevel || 0),
      0
    ) /
      Math.max(queue.length, 1)) *
      100
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
            </div>
          </div>

          {!focusMode && (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">
                Daily English Learning
              </h1>
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
                  <p className="text-lg font-semibold">
                    {state.streakDays || 0} dias
                  </p>
                </div>
                <div
                  className={`rounded-2xl border px-3 py-2 text-sm shadow-sm ${surfaceClass}`}
                >
                  <p className="text-xs uppercase tracking-wide opacity-70">
                    Dominio hoy
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full rounded-full bg-slate-200/60">
                      <div
                        className={`h-2 rounded-full ${
                          highContrast ? "bg-emerald-400" : "bg-emerald-600"
                        }`}
                        style={{ width: `${masteryPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold">
                      {masteryPercent}%
                    </span>
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
                    onChange={(e) => setModuleId(e.target.value)}
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
                    onChange={(e) => setLevelCap(Number(e.target.value))}
                  >
                    {LEVELS.map((level) => (
                      <option key={level} value={LEVEL_RANK[level]}>
                        Hasta {level}
                      </option>
                    ))}
                  </select>
                </label>
                <span className={subtleText}>
                  Serie: {selectedModule.label}
                </span>
              </div>
            </>
          )}
        </header>

        <section
          className={`rounded-2xl border p-4 shadow-sm backdrop-blur sm:p-5 ${surfaceClass}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Tu ejercicio de hoy</h2>
            <div className={`flex items-center gap-2 text-xs ${subtleText}`}>
              <span
                className={`rounded-full border bg-white/80 px-2 py-1 ${
                  highContrast ? "border-slate-700 bg-slate-900/70" : borderMuted
                }`}
              >
                Fallados ayer: {failedYesterdayIds.length}
              </span>
              <span
                className={`rounded-full border bg-white/80 px-2 py-1 ${
                  highContrast ? "border-slate-700 bg-slate-900/70" : borderMuted
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

          {!current ? (
            <p className={`mt-4 text-sm ${subtleText}`}>
              Terminaste por hoy. Manana veras primero lo que fallaste ayer.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {!focusMode && (
                <div className={`flex flex-wrap gap-2 text-xs ${subtleText}`}>
                  <span
                    className={`rounded-full border bg-white/80 px-2 py-1 ${
                      highContrast
                        ? "border-slate-700 bg-slate-900/70"
                        : borderMuted
                    }`}
                  >
                    {current.type}
                  </span>
                  <span
                    className={`rounded-full border bg-white/80 px-2 py-1 ${
                      highContrast
                        ? "border-slate-700 bg-slate-900/70"
                        : borderMuted
                    }`}
                  >
                    {current.level}
                  </span>
                  <span
                    className={`rounded-full border bg-white/80 px-2 py-1 ${
                      highContrast
                        ? "border-slate-700 bg-slate-900/70"
                        : borderMuted
                    }`}
                  >
                    {current.topic}
                  </span>
                </div>
              )}
              <p className="text-lg font-medium">{current.prompt}</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 ${
                    highContrast
                      ? "border-slate-700 bg-slate-900/60 text-slate-100 focus:border-slate-500 focus:ring-slate-700"
                      : "border-slate-200 focus:border-slate-400 focus:ring-slate-200"
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
              </div>

              <div className="flex flex-wrap gap-2">
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

        {!focusMode && (
          <section
            className={`rounded-2xl border p-4 shadow-sm backdrop-blur sm:p-5 ${surfaceClass}`}
          >
            <h3 className="text-lg font-semibold">Para repasar</h3>
            {failedYesterdayIds.length === 0 && unmasteredIds.length === 0 ? (
              <p className={`mt-2 text-sm ${subtleText}`}>
                Todo dominado. Manana se desbloquean nuevos ejercicios.
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
