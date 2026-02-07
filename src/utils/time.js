export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return a === b;
}
