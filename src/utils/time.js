export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return a === b;
}
