export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
  },
  set<T>(key: string, val: T) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(val));
  }
};
