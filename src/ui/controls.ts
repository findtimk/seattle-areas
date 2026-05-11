import type { AppState, DimensionKey } from "../engine/scoring";
import { LEVEL_LABELS, DIM_LABELS } from "../engine/scoring";
import { writeUrlState } from "./urlState";

export function renderBudget(state: AppState, onChange: () => void): void {
  const display = document.getElementById("budget-value");
  const slider = document.getElementById("budget-slider") as HTMLInputElement | null;
  if (!display || !slider) return;

  display.textContent = "$" + state.budget.toLocaleString();
  slider.value = String(state.budget);

  slider.addEventListener("input", (e) => {
    state.budget = +(e.target as HTMLInputElement).value;
    display.textContent = "$" + state.budget.toLocaleString();
    writeUrlState(state);
    onChange();
  });
}

export function renderWeights(state: AppState, onChange: () => void): void {
  const root = document.getElementById("weights");
  if (!root) return;
  root.innerHTML = "";

  (Object.entries(DIM_LABELS) as [DimensionKey, { name: string; desc: string }][]).forEach(([key, info]) => {
    const row = document.createElement("div");
    row.className = "weight-row";
    row.innerHTML = `
      <div class="name">${info.name}<small>${info.desc}</small></div>
      <div class="pill-group" data-key="${key}">
        ${LEVEL_LABELS.map((lbl, i) =>
          `<button class="pill ${state.levels[key] === i ? "active" : ""}" data-level="${i}">${lbl}</button>`
        ).join("")}
      </div>
    `;
    root.appendChild(row);
  });

  root.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const group = (e.target as HTMLElement).closest(".pill-group") as HTMLElement;
      const key = group.dataset.key as DimensionKey;
      const level = +((e.target as HTMLElement).dataset.level ?? 0);
      state.levels[key] = level as AppState["levels"][DimensionKey];
      group.querySelectorAll(".pill").forEach((p) =>
        p.classList.toggle("active", +(p as HTMLElement).dataset.level! === level)
      );
      writeUrlState(state);
      onChange();
    });
  });
}
