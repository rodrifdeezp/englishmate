import { useMemo, useState } from "react";
import { EXERCISES } from "./data/exercises.js";
import { loadState, saveState } from "./utils/storage.js";
import { todayKey, isSameDay } from "./utils/time.js";

// Simple rules:
// - If user fails or clicks "No me acuerdo", the exercise goes to Pending.
// - Next day, we show Pending first, then new items.
// - An exercise becomes "mastered" after 2 correct answers in a row.

const DAILY_LIMIT = 6; // short sessions

function normalize(text) {
  return (text || "").trim().toLowerCase();
}

function defaultProgress() {
  return {
    attempts: 0,
    failures: 0,
    lastFailedAt: null,
    mastered: false,
    streak: 0,
  };
}

function buildDailyQueue(exercises, pendingIds, progressById) {
  // Pending first
  const pending = pendingIds
    .map((id) => exercises.find((ex) => ex.id === id))
    .filter(Boolean);

  // New items = not mastered and not already in pending list
  const newItems = exercises.filter((ex) => {
    const progress = progressById[ex.id];
    const isMastered = progress?.mastered;
    const isPending = pendingIds.includes(ex.id);
    return !isMastered && !isPending;
  });

  const queue = [...pending, ...newItems];
  return queue.slice(0, DAILY_LIMIT);
}

export default function App() {
  const saved = useMemo(() => loadState(), []);
  const [state, setState] = useState(() => {
    const today = todayKey();
    if (saved && saved.session && isSameDay(saved.lastSessionDate, today)) {
      return saved;
    }

    // New day: build a fresh queue.
    const pendingIds = saved?.pendingIds || [];
    const progressById = saved?.progressById || {};
    const queue = buildDailyQueue(EXERCISES, pendingIds, progressById);

    return {
      progressById,
      pendingIds,
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

  const queue = state.session.queueIds
    .map((id) => EXERCISES.find((ex) => ex.id === id))
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
      nextProgress.streak += 1;
      nextProgress.mastered = nextProgress.streak >= 2;
    } else {
      nextProgress.failures += 1;
      nextProgress.lastFailedAt = todayKey();
      nextProgress.streak = 0;
      nextProgress.mastered = false;
    }

    return nextProgress;
  }

  function addToPending(exerciseId, pendingIds) {
    if (pendingIds.includes(exerciseId)) return pendingIds;
    return [...pendingIds, exerciseId];
  }

  function removeFromPending(exerciseId, pendingIds) {
    return pendingIds.filter((id) => id !== exerciseId);
  }

  function handleAnswer(isForgotten = false) {
    if (!current) return;

    const isCorrect =
      !isForgotten && normalize(answer) === normalize(current.en);

    const nextProgress = {
      ...state.progressById,
      [current.id]: updateProgress(current, isCorrect),
    };

    let nextPending = state.pendingIds;
    if (!isCorrect) {
      nextPending = addToPending(current.id, nextPending);
    } else if (nextProgress[current.id].mastered) {
      nextPending = removeFromPending(current.id, nextPending);
    }

    const nextSession = {
      ...state.session,
      completed: Math.min(state.session.completed + 1, queue.length),
    };

    const nextState = {
      ...state,
      progressById: nextProgress,
      pendingIds: nextPending,
      lastSessionDate: todayKey(),
      session: nextSession,
    };

    persist(nextState);

    setFeedback({
      ok: isCorrect,
      message: isCorrect
        ? "Correcto. Buen trabajo."
        : `Respuesta esperada: ${current.en}`,
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

  const pendingCount = state.pendingIds.length;
  const remainingToday = Math.max(queue.length - state.session.completed, 0);

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
              Pendientes: {pendingCount}
            </span>
          </div>

          <p className="text-sm text-slate-600">
            Ejercicios pendientes hoy: {remainingToday}
          </p>

          {!current ? (
            <p className="text-sm text-slate-600">
              Terminaste por hoy. Manana veras primero tus pendientes.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-lg">{current.es}</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Escribe la frase en ingles"
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
                  {feedback.message}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <h3 className="font-semibold">Pendientes guardados</h3>
          {pendingCount === 0 ? (
            <p className="text-sm text-slate-600">No tienes pendientes.</p>
          ) : (
            <ul className="text-sm text-slate-700 list-disc pl-5">
              {state.pendingIds.map((id) => {
                const ex = EXERCISES.find((item) => item.id === id);
                return <li key={id}>{ex ? ex.es : id}</li>;
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
