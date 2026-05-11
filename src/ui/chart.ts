import type { Neighborhood } from "../data/neighborhoods";

export function renderChart(data: Neighborhood[]): void {
  const root = document.getElementById("chart");
  if (!root) return;

  const sorted = [...data].sort((a, b) => b.pricePerSqft - a.pricePerSqft);
  const max = sorted[0].pricePerSqft;
  root.innerHTML = "";

  sorted.forEach((n) => {
    const row = document.createElement("div");
    row.className = "chart-row";
    row.innerHTML = `
      <div class="name">${n.name}</div>
      <div class="chart-track">
        <div class="chart-fill" style="width:${(n.pricePerSqft / max) * 100}%"></div>
      </div>
      <div class="val">$${n.pricePerSqft}</div>
    `;
    root.appendChild(row);
  });
}
