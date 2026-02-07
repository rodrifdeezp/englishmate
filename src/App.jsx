import { useEffect, useMemo, useState } from "react";
import { EXERCISES } from "./data/exercises.js";
import { loadState, saveState } from "./utils/storage.js";
import { checkAnswer } from "./utils/checker.js";
import { todayKey, yesterdayKey, isSameDay } from "./utils/time.js";

// Simple rules:
// - Prioritize exercises failed yesterday.
// - Only introduce new exercises when previous ones are mastered.
// - Mastery level moves up/down with answers (spaced repetition, simple version).

const DAILY_LIMIT = 6; // short sessions
const REMOTE_EXERCISES_URL = ""; // Example: "https://raw.githubusercontent.com/user/repo/main/exercises.json"

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

function buildDailyQueue(exercises, progressById) {
  const yesterday = yesterdayKey();
  const failedYesterday = exercises.filter(
    (ex) => progressById[ex.id]?.lastFailedAt === yesterday
  );

  const unmasteredSeen = exercises.filter((ex) => {
    const progress = progressById[ex.id];
    const seen = Boolean(progress);
    return seen && !isMastered(progress) && progress.lastFailedAt !== yesterday;
  });

  const hasUnmastered = failedYesterday.length > 0 || unmasteredSeen.length > 0;
  const newItems = hasUnmastered
    ? []
    : exercises.filter((ex) => !progressById[ex.id]);

  const queue = [...failedYesterday, ...unmasteredSeen, ...newItems];
  return queue.slice(0, DAILY_LIMIT);
}

export default function App() {
  const saved = useMemo(() => loadState(), []);
  const [exercises, setExercises] = useState(EXERCISES);
  const [state, setState] = useState(() => {
    const today = todayKey();
    if (saved && saved.session && isSameDay(saved.lastSessionDate, today)) {
      return saved;
    }

    // New day: build a fresh queue.
    const progressById = saved?.progressById || {};
    const queue = buildDailyQueue(EXERCISES, progressById);

    return {
      progressById,
      lastSessionDate: today,
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

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Daily English Learning</h1>
          <p className="text-sm text-slate-600">
            Practica diaria de 5-10 minutos. Una frase a la vez.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tu ejercicio de hoy</h2>
            <span className="text-xs rounded-full bg-slate-100 px-2 py-1">
              Fallados ayer: {failedYesterdayIds.length}
            </span>
          </div>

          <p className="text-sm text-slate-600">
            Ejercicios de hoy: {remainingToday}
          </p>

          {!current ? (
            <p className="text-sm text-slate-600">
              Terminaste por hoy. Manana veras primero lo que fallaste ayer.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {current.type}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {current.level}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {current.topic}
                </span>
              </div>
              <p className="text-lg">{current.prompt}</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Escribe la respuesta en ingles"
                />
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                  onClick={() => handleAnswer(false)}
                >
                  Responder
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  onClick={() => handleAnswer(true)}
                >
                  No me acuerdo
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  onClick={nextExercise}
                >
                  Siguiente
                </button>
              </div>

              {feedback && (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    feedback.ok
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
              <p>{feedback.message}</p>
              {feedback.hint && (
                <p className="text-xs text-slate-600">
                  Pista: {feedback.hint}
                </p>
              )}
            </div>
          )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <h3 className="font-semibold">Para repasar</h3>
          {failedYesterdayIds.length === 0 && unmasteredIds.length === 0 ? (
            <p className="text-sm text-slate-600">
              Todo dominado. Manana se desbloquean nuevos ejercicios.
            </p>
          ) : (
            <ul className="text-sm text-slate-700 list-disc pl-5">
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
        </section>
      </div>
    </div>
  );
}
