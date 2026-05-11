import type { AppState, DimensionKey, WeightLevel } from "../engine/scoring";
import { DEFAULT_STATE } from "../engine/scoring";

const DIM_ORDER: DimensionKey[] = ["affordability", "walkability", "schools", "transit", "quietness", "commute"];

export function readUrlState(): AppState {
  const params = new URLSearchParams(window.location.search);
  const state: AppState = {
    budget: DEFAULT_STATE.budget,
    levels: { ...DEFAULT_STATE.levels },
  };

  const b = params.get("b");
  if (b) {
    const parsed = parseInt(b, 10);
    if (!isNaN(parsed) && parsed >= 700000 && parsed <= 1700000) {
      state.budget = parsed;
    }
  }

  const w = params.get("w");
  if (w) {
    const parts = w.split(",").map(Number);
    if (parts.length === DIM_ORDER.length) {
      DIM_ORDER.forEach((key, i) => {
        const v = parts[i];
        if (v === 0 || v === 1 || v === 2 || v === 3) {
          state.levels[key] = v as WeightLevel;
        }
      });
    }
  }

  return state;
}

export function writeUrlState(state: AppState): void {
  const weights = DIM_ORDER.map(k => state.levels[k]).join(",");
  const params = new URLSearchParams({ b: String(state.budget), w: weights });
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", url);
}
