import type { Neighborhood } from "../data/neighborhoods";
import type { AppState, DimensionKey } from "../engine/scoring";
import { dimensionScores, fitScore, whyTags, fmtMoney, fmtIncome, fmtBudgetLabel, fmtRedfin } from "../engine/scoring";

const TOP_N = 5;
let showAll = false;

export function renderCards(data: Neighborhood[], state: AppState): void {
  const ranked = [...data]
    .map((n) => ({ ...n, fit: fitScore(n, state) }))
    .sort((a, b) => b.fit - a.fit);

  const root = document.getElementById("cards");
  if (!root) return;
  root.innerHTML = "";

  ranked.forEach((n, i) => {
    const dims = dimensionScores(n, state.budget);
    const why = whyTags(n, state);
    const sqftBuys = state.budget / n.pricePerSqft;
    const clears3BR = state.budget >= n.typical3BR;
    const budgetLabel = fmtBudgetLabel(state.budget);

    const buysHTML = clears3BR
      ? `<em>~${Math.round(sqftBuys).toLocaleString()} sqft</em> · clears the typical 3BR`
      : `<em>~${Math.round(sqftBuys).toLocaleString()} sqft</em> · short of typical 3BR (${fmtMoney(n.typical3BR)})`;

    const driveClass = n.driveMin <= 12 ? "good" : n.driveMin >= 22 ? "warn" : "";

    const whyCollapsed =
      why.ups.length || why.downs.length
        ? [
            ...why.ups.map((u) => `<div class="nb-wt up"><span class="arr">↑</span><span class="lbl">${u.label}</span></div>`),
            ...why.downs.map((d) => `<div class="nb-wt down"><span class="arr">↓</span><span class="lbl">${d.label}</span></div>`),
          ].join("")
        : `<div class="nb-why-empty">Set weights above to see ranking reasons.</div>`;

    const dimRow = (key: DimensionKey, label: string, value: number, scaleNote?: string): string => {
      const muted = state.levels[key] === 0;
      return `<div class="score-row${muted ? " muted" : ""}">
        <span>${label}</span>
        <div class="bar-track"><div class="bar-fill${muted ? " dim" : ""}" style="width:${value}%"></div></div>
        <span class="v">${scaleNote ?? Math.round(value)}</span>
      </div>`;
    };

    const decadeLabel = (yr: number): string => {
      const decade = Math.floor(yr / 10) * 10;
      return `Mostly ${decade}s–${(decade + 10).toString().slice(-2)}s`;
    };

    const housingCharHTML = `
      <div class="housing-char">
        <div class="heading">
          <span>Housing Character</span>
          <span class="src">KC Assessor · SFH+townhomes</span>
        </div>
        <div class="hc-rows">
          <div class="hc-row">
            <span class="hck">Built</span>
            <span class="hcv">${decadeLabel(n.medianYearBuilt)}</span>
          </div>
          <div class="hc-row">
            <span class="hck">Lot size</span>
            <span class="hcv">~${n.medianLotSqft.toLocaleString()} sqft typical</span>
          </div>
          <div class="hc-row">
            <span class="hck">Garage</span>
            <span class="hcv">${n.pctWithGarage}% of homes have one</span>
          </div>
          <div class="hc-row">
            <span class="hck">Home type</span>
            <span class="hcv">${n.pctSingleFamily}% SFH · ${100 - n.pctSingleFamily}% townhome</span>
          </div>
        </div>
      </div>
    `;

    const redfinUrl = (() => {
      const rf = n.redfin;
      const price = fmtRedfin(state.budget);
      const filters = `property-type=house,property-type=townhouse,min-beds=3,max-price=${price}`;
      if (rf.id && rf.slug) {
        return `https://www.redfin.com/neighborhood/${rf.id}/WA/Seattle/${rf.slug}/filter/${filters}`;
      }
      if (rf.zip) {
        return `https://www.redfin.com/zipcode/${rf.zip}/filter/${filters}`;
      }
      return null;
    })();

    const hidden = !showAll && i >= TOP_N;

    const row = document.createElement("div");
    row.className = "nb-row" + (hidden ? " row-hidden" : "");
    row.id = `nb-row-${i}`;
    row.innerHTML = `
      <div class="nb-header" data-row-index="${i}">
        <div class="nb-rank">
          <div class="rn">#${String(i + 1).padStart(2, "0")}</div>
          <div class="rl">rank</div>
        </div>
        <div class="nb-main">
          <div class="nb-name">${n.name}</div>
          <div class="nb-vibe">${n.vibe}</div>
        </div>
        <div class="nb-stats">
          <div class="ns">
            <span class="nsk">Typical 3BR</span>
            <span class="nsv ${clears3BR ? "good" : "warn"}">${fmtMoney(n.typical3BR)}</span>
          </div>
          <div class="ns">
            <span class="nsk">Drive → SLU</span>
            <span class="nsv ${driveClass}">~${n.driveMin} min</span>
          </div>
          <div class="ns">
            <span class="nsk">$/sqft</span>
            <span class="nsv">$${n.pricePerSqft}</span>
          </div>
          ${redfinUrl ? `<a class="redfin-link" href="${redfinUrl}" target="_blank" rel="noopener" title="View 3BR listings up to ${fmtMoney(state.budget)} on Redfin">3BR listings ↗</a>` : ""}
        </div>
        <div class="nb-why">${whyCollapsed}</div>
        <div class="nb-fit">
          <div class="nf-score">${n.fit}</div>
          <div class="nf-label">fit</div>
          <div class="nf-chevron">▾</div>
        </div>
      </div>
      <div class="nb-detail" id="nb-det-${i}">
        <div class="nb-detail-inner">
          <div>
            <div class="det-col-head">Dimension scores</div>
            <div class="score-bars">
              ${dimRow("affordability", "Headroom", dims.affordability)}
              ${dimRow("walkability",   "Walk",     dims.walkability)}
              ${dimRow("schools",       "Schools",  dims.schools, `${n.schools}/10`)}
              ${dimRow("transit",       "Transit",  dims.transit)}
              ${dimRow("quietness",     "Quiet",    dims.quietness)}
              ${dimRow("commute",       "Commute",  dims.commute)}
              ${dimRow("safety",        "Safety",   dims.safety)}
            </div>
            <div class="safety-context">
              All 17 neighborhoods score above Seattle's city avg · <a href="https://crimegrade.org/safest-places-in-seattle-wa/" target="_blank" rel="noopener">Seattle overall: D- nationally</a>
              ${n.safetyNote ? `<div class="safety-note">⚠ ${n.safetyNote}</div>` : ""}
            </div>
          </div>
          <div>
            <div class="det-col-head">Budget & Community</div>
            <div class="buys">
              <span class="label">Your $${budgetLabel}M buys</span>
              <span class="value">${buysHTML}</span>
            </div>
            <div class="community">
              <div class="heading">
                <span>Community</span>
                <span class="src">Census ACS · approx.</span>
              </div>
              <div class="demo-grid">
                <div class="demo-cell"><div class="v">${fmtIncome(n.medianIncome)}</div><div class="k">Income</div></div>
                <div class="demo-cell"><div class="v">${n.medianAge}</div><div class="k">Med. age</div></div>
                <div class="demo-cell"><div class="v">${n.pctBach}%</div><div class="k">College+</div></div>
                <div class="demo-cell"><div class="v">${n.pctOwn}%</div><div class="k">Own</div></div>
                <div class="demo-cell"><div class="v">${n.pctKids}%</div><div class="k">Kids</div></div>
              </div>
            </div>
            ${housingCharHTML}
          </div>
          <div>
            <div class="det-col-head">Why it works / Tradeoffs</div>
            <div class="pc">
              <div class="pros">
                <h4>Works</h4>
                <ul>${n.pros.map((p) => `<li>${p}</li>`).join("")}</ul>
              </div>
              <div class="cons">
                <h4>Tradeoffs</h4>
                <ul>${n.cons.map((c) => `<li>${c}</li>`).join("")}</ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    root.appendChild(row);
  });

  // Attach click handlers to headers (Redfin links stop propagation so they don't toggle the card)
  root.querySelectorAll<HTMLAnchorElement>(".redfin-link").forEach((link) => {
    link.addEventListener("click", (e) => e.stopPropagation());
  });

  root.querySelectorAll<HTMLElement>(".nb-header[data-row-index]").forEach((header) => {
    header.addEventListener("click", () => {
      const idx = Number(header.dataset.rowIndex);
      toggleRow(idx);
    });
  });

  // Show-more button
  if (ranked.length > TOP_N) {
    const moreCount = ranked.length - TOP_N;
    const wrap = document.createElement("div");
    wrap.className = "show-more-wrap";
    wrap.innerHTML = `<button class="show-more-btn" id="show-more-btn">
      <span id="show-more-label">${showAll ? "↑ Show top 5 only" : `↓ See ${moreCount} more neighborhoods`}</span>
      <span id="show-more-sub" style="font-weight:400;opacity:0.6">${showAll ? "" : `${ranked.length} areas total`}</span>
    </button>`;
    root.appendChild(wrap);

    document.getElementById("show-more-btn")?.addEventListener("click", () => {
      toggleShowAll(ranked.length);
    });
  }

  const rankNote = document.getElementById("rank-note");
  if (rankNote) {
    rankNote.textContent = `${data.length} areas · top 5 shown${showAll ? " (all visible)" : ""}`;
  }
}

function toggleRow(i: number): void {
  const row = document.getElementById(`nb-row-${i}`);
  const det = document.getElementById(`nb-det-${i}`);
  if (!row || !det) return;
  const opening = !row.classList.contains("expanded");
  if (opening) {
    row.classList.add("expanded");
    det.style.maxHeight = det.scrollHeight + "px";
  } else {
    row.classList.remove("expanded");
    det.style.maxHeight = "0";
  }
}

function toggleShowAll(total: number): void {
  showAll = !showAll;
  document.querySelectorAll(".nb-row").forEach((row, i) => {
    if (i >= TOP_N) row.classList.toggle("row-hidden", !showAll);
  });
  const label = document.getElementById("show-more-label");
  const sub = document.getElementById("show-more-sub");
  const moreCount = total - TOP_N;
  if (label) label.textContent = showAll ? "↑ Show top 5 only" : `↓ See ${moreCount} more neighborhoods`;
  if (sub) sub.textContent = showAll ? "" : `${total} areas total`;
  const rankNote = document.getElementById("rank-note");
  if (rankNote) {
    rankNote.textContent = `${total} areas · top 5 shown${showAll ? " (all visible)" : ""}`;
  }
}
