import "./styles/main.css";
import { DATA, LAST_REFRESHED } from "./data/neighborhoods";
import { renderCards } from "./ui/cards";
import { renderChart } from "./ui/chart";
import { renderBudget, renderWeights } from "./ui/controls";
import { readUrlState } from "./ui/urlState";

const state = readUrlState();

// Update the profile strip budget display
const profileBudget = document.getElementById("profile-budget");
if (profileBudget) {
  profileBudget.textContent = "$" + state.budget.toLocaleString();
}

// Update data freshness label
const freshness = document.getElementById("data-freshness");
if (freshness) {
  freshness.textContent = `Data: ${LAST_REFRESHED} snapshot · sources in footer`;
}

function rerender(): void {
  renderCards(DATA, state);
  // Update profile strip on budget change
  const pb = document.getElementById("profile-budget");
  if (pb) pb.textContent = "$" + state.budget.toLocaleString();
}

renderBudget(state, rerender);
renderWeights(state, rerender);
renderCards(DATA, state);
renderChart(DATA);
