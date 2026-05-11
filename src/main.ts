import "./styles/main.css";
import { DATA, LAST_REFRESHED } from "./data/neighborhoods";
import { renderCards } from "./ui/cards";
import { renderChart } from "./ui/chart";
import { renderBudget, renderWeights } from "./ui/controls";
import { readUrlState } from "./ui/urlState";

const state = readUrlState();

// Update data freshness label
const freshness = document.getElementById("data-freshness");
if (freshness) {
  freshness.textContent = `Data: ${LAST_REFRESHED} snapshot · sources in footer`;
}

// Collapsible methodology section
const meth = document.querySelector(".methodology");
const methToggle = document.getElementById("meth-toggle");
const methGrid = document.getElementById("meth-grid");
if (meth && methToggle && methGrid) {
  methToggle.addEventListener("click", () => {
    const opening = !meth.classList.contains("open");
    if (opening) {
      meth.classList.add("open");
      methGrid.style.maxHeight = methGrid.scrollHeight + "px";
    } else {
      meth.classList.remove("open");
      methGrid.style.maxHeight = "0";
    }
  });
}

function rerender(): void {
  renderCards(DATA, state);
}

renderBudget(state, rerender);
renderWeights(state, rerender);
renderCards(DATA, state);
renderChart(DATA);
