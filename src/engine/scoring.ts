import type { Neighborhood } from "../data/neighborhoods";

export type WeightLevel = 0 | 1 | 2 | 3;
export type DimensionKey = "affordability" | "walkability" | "schools" | "transit" | "quietness" | "commute" | "safety";

export interface AppState {
  budget: number;
  levels: Record<DimensionKey, WeightLevel>;
}

export interface DimInfo {
  name: string;
  desc: string;
}

export const LEVEL_TO_WEIGHT: Record<WeightLevel, number> = { 0: 0, 1: 1, 2: 3, 3: 7 };
export const LEVEL_LABELS: string[] = ["Skip", "Nice", "Important", "Critical"];

export const DIM_LABELS: Record<DimensionKey, DimInfo> = {
  affordability: { name: "Budget headroom", desc: "Does your budget clear the typical 3BR?" },
  walkability:   { name: "Walkability",     desc: "Errands & cafes on foot" },
  schools:       { name: "Schools",         desc: "Long-term resale + future kids" },
  transit:       { name: "Transit",         desc: "Bus + light rail access" },
  quietness:     { name: "Quietness",       desc: "Residential vs urban-busy" },
  commute:       { name: "Commute",         desc: "Drive time to South Lake Union" },
  safety:        { name: "Safety",          desc: "Crime + livability (relative within this list)" },
};

export const DEFAULT_STATE: AppState = {
  budget: 1250000,
  levels: {
    affordability: 2,
    walkability:   2,
    schools:       1,
    transit:       2,
    quietness:     1,
    commute:       3,
    safety:        1,
  },
};

export function affordabilityScore(n: Neighborhood, budget: number): number {
  const ratio = budget / n.typical3BR;
  const t = (ratio - 0.7) / (1.2 - 0.7);
  return Math.max(0, Math.min(100, t * 100));
}

export function dimensionScores(n: Neighborhood, budget: number): Record<DimensionKey, number> {
  return {
    affordability: affordabilityScore(n, budget),
    walkability:   n.walk,
    schools:       n.schools * 10,
    transit:       n.transit,
    quietness:     n.quiet,
    commute:       n.commute,
    safety:        n.safety,
  };
}

export function fitScore(n: Neighborhood, state: AppState): number {
  const dims = dimensionScores(n, state.budget);
  let total = 0, weighted = 0;
  for (const k of Object.keys(dims) as DimensionKey[]) {
    const wt = LEVEL_TO_WEIGHT[state.levels[k]] ?? 0;
    weighted += dims[k] * wt;
    total += wt;
  }
  if (total === 0) {
    const vals = Object.values(dims);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return Math.round(weighted / total);
}

export interface WhyTag { k: DimensionKey; v: number; label: string }
export interface WhyTags { ups: WhyTag[]; downs: WhyTag[] }

export function whyTags(n: Neighborhood, state: AppState): WhyTags {
  const dims = dimensionScores(n, state.budget);
  const entries: WhyTag[] = (Object.entries(dims) as [DimensionKey, number][])
    .filter(([k]) => state.levels[k] > 0)
    .map(([k, v]) => ({ k, v, label: DIM_LABELS[k].name }));
  if (entries.length === 0) return { ups: [], downs: [] };
  const sorted = [...entries].sort((a, b) => b.v - a.v);
  const ups = sorted.filter(e => e.v >= 70).slice(0, 2);
  const downs = sorted.filter(e => e.v <= 45).slice(-1);
  return { ups, downs };
}

export function fmtMoney(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  return "$" + Math.round(n / 1000) + "K";
}

export function fmtIncome(n: number): string {
  return "$" + Math.round(n / 1000) + "K";
}

export function fmtBudgetLabel(budget: number): string {
  return (budget / 1_000_000).toFixed(2).replace(/\.?0+$/, "");
}

export function fmtRedfin(budget: number): string {
  if (budget >= 1_000_000) {
    const m = budget / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(2).replace(/0+$/, "")}M`;
  }
  return `${Math.round(budget / 1000)}k`;
}
