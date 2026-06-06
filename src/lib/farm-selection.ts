const FARM_SELECTION_STORAGE_KEY = "active_farm_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeFarmSelection(value: string | null | undefined) {
  if (!value || value === "all") return "all";
  return UUID_RE.test(value) ? value : "all";
}

export function readFarmSelection() {
  if (typeof window === "undefined") return "all";
  const value = normalizeFarmSelection(window.localStorage.getItem(FARM_SELECTION_STORAGE_KEY));
  window.localStorage.setItem(FARM_SELECTION_STORAGE_KEY, value);
  return value;
}

export function writeFarmSelection(value: string) {
  if (typeof window === "undefined") return normalizeFarmSelection(value);
  const normalized = normalizeFarmSelection(value);
  window.localStorage.setItem(FARM_SELECTION_STORAGE_KEY, normalized);
  return normalized;
}
