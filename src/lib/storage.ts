const KEY = "flowforge_v1";

export function saveState(data: unknown) {
  localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data }));
}
export function loadState<T>(): T | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw).data as T; } catch { return null; }
}
