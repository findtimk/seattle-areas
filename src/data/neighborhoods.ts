export const LAST_REFRESHED = "May 2026";

export interface Neighborhood {
  name: string;
  medianSFH: number;
  pricePerSqft: number;
  typical3BR: number;
  walk: number;
  schools: number;
  transit: number;
  quiet: number;
  commute: number;
  driveMin: number;
  medianIncome: number;
  medianAge: number;
  pctBach: number;
  pctOwn: number;
  pctKids: number;
  vibe: string;
  pros: string[];
  cons: string[];
  lastUpdated?: string;
}

/* ================================================================
   NEIGHBORHOOD DATA — Q1/Q2 2026
   Last verified: May 2026

   SOURCE LEGEND:
     [W]   Walk Score / Transit Score: walkscore.com/WA/Seattle (April 2026)
     [P24] Point2Homes Census ACS 2019–2023 5-year estimates, 2024 annual
     [P23] Same source, 2023 annual figure
     [RF]  Redfin neighborhood pages, Jan–Mar 2026
     [BR]  Brokerage reports (Maggie Sun RE, Sammamish Mortgage, etc.)
     [GS]  GreatSchools-style estimate — NOT verified per address
     [EST] Educated estimate — Point2Homes not surfaced or boundary differs
     [SUBJ] Subjective — derived from walkability inverse + noise factors
   ================================================================ */
export const DATA: Neighborhood[] = [

  /* [P24] Income $128,607 / Age 33 | [BR] Median SFH $1,050,000 | [W] Walk 84 / Transit 64 */
  {
    name: "Queen Anne",
    medianSFH: 1050000, pricePerSqft: 720, typical3BR: 1300000,
    walk: 84, schools: 8, transit: 64, quiet: 50, commute: 95, driveMin: 8,
    medianIncome: 128607, medianAge: 33, pctBach: 76, pctOwn: 50, pctKids: 22,
    vibe: "View-rich hilltop with grand old houses and hill-climbing streets.",
    pros: ["Iconic city / Sound views", "Top-rated public schools", "Walk to Seattle Center, downtown"],
    cons: ["Premium pricing — your budget stretches thin", "Steep hills, parking is hard", "Less family yard space than the north end"],
  },

  /* [P24] Income $147,875 | [RF] Median $975K (Mar 2026) | [W] Walk 89 / Transit 67 */
  {
    name: "Ballard",
    medianSFH: 920000, pricePerSqft: 605, typical3BR: 1150000,
    walk: 89, schools: 7, transit: 67, quiet: 45, commute: 60, driveMin: 20,
    medianIncome: 147875, medianAge: 35, pctBach: 75, pctOwn: 48, pctKids: 20,
    vibe: "Maritime past, brewery-and-bistro present. Craftsman bungalows.",
    pros: ["Strong food / nightlife / market culture", "Close to Golden Gardens, Discovery Park", "Mix of bungalows and newer townhomes"],
    cons: ["Heavy traffic on Market St., bridge bottleneck", "Light rail not arriving until ~2039", "Can feel densely built-out in newer pockets"],
  },

  /* [W] Walk 53 / Transit 37 — significantly lower than neighborhood reputation | [EST] Income ~$135K */
  {
    name: "Sunset Hill",
    medianSFH: 1080000, pricePerSqft: 580, typical3BR: 1200000,
    walk: 53, schools: 7, transit: 37, quiet: 80, commute: 55, driveMin: 22,
    medianIncome: 135000, medianAge: 41, pctBach: 65, pctOwn: 70, pctKids: 30,
    vibe: "North Ballard's quieter cousin — water-view streets, mid-century homes.",
    pros: ["Sound + Olympic views from many blocks", "Quieter than Ballard proper, walking distance to it", "Larger lots than central Ballard"],
    cons: ["Lower walk + transit than expected — you'll drive most days", "Limited light rail in foreseeable future", "Inventory is thin"],
  },

  /* [P24] Income $102,752 (overall median, not age-filtered) / Age 30 / Own 42.6% | [RF] Median $1.0M | [W] Walk 85 / Transit 64 */
  {
    name: "Wallingford",
    medianSFH: 1000000, pricePerSqft: 650, typical3BR: 1225000,
    walk: 85, schools: 8, transit: 64, quiet: 60, commute: 82, driveMin: 13,
    medianIncome: 102752, medianAge: 30, pctBach: 73, pctOwn: 43, pctKids: 25,
    vibe: "Tree-lined Craftsmans, university-adjacent, family-shaped streets.",
    pros: ["Walkable + family-friendly is rare", "Strong elementary feeders (McDonald, Hamilton)", "Close to Green Lake, Gas Works, U-District"],
    cons: ["Inventory is thin — limited 3BR turnover", "Older housing stock means renovation risk", "UW proximity means student renters in the mix"],
  },

  /* [P23] Income $132,560 / Age 34 / Own 43.4% | [W] Walk 90 / Transit 61 */
  {
    name: "Fremont",
    medianSFH: 1025000, pricePerSqft: 635, typical3BR: 1200000,
    walk: 90, schools: 7, transit: 61, quiet: 45, commute: 85, driveMin: 12,
    medianIncome: 132560, medianAge: 34, pctBach: 73, pctOwn: 43, pctKids: 18,
    vibe: "Quirky-arty self-styled 'Center of the Universe' on the ship canal.",
    pros: ["Strong walkable commercial spine, food/drink dense", "Bridge access to SLU, U-District, Ballard", "Distinctive character — not generic"],
    cons: ["Family-friendliness varies block by block", "Bridge openings interrupt commutes", "Some streets see rowdy weekend nightlife"],
  },

  /* [P23] Income $137,781 / Age 36 / Own 47.1% | [W] Walk 84 / Transit 60
     Note: lakefront tracts run $200K–$250K income per Seattle Times; neighborhood median is $137,781 */
  {
    name: "Green Lake",
    medianSFH: 1175000, pricePerSqft: 660, typical3BR: 1300000,
    walk: 84, schools: 8, transit: 60, quiet: 60, commute: 78, driveMin: 14,
    medianIncome: 137781, medianAge: 36, pctBach: 76, pctOwn: 47, pctKids: 19,
    vibe: "Loop-around-the-lake walking mecca. Active, family-leaning, premium.",
    pros: ["The 2.8-mi loop is an everyday amenity", "Strong schools and family infrastructure", "Highly walkable to cafes, fitness, dining"],
    cons: ["Premium pricing — lakefront tracts run $200K+ income", "Park-adjacent traffic on summer weekends", "Smaller homes per dollar than non-lake neighbors"],
  },

  /* [P24] Phinney $142,662 / Greenwood $131,154 (population-weighted avg ~$137K) | [W] Walk 85 / Transit 52
     [BR] Phinney Ridge median $1,241,500 (12-month, Mar 2026 Homes.com) */
  {
    name: "Phinney / Greenwood",
    medianSFH: 925000, pricePerSqft: 575, typical3BR: 1075000,
    walk: 85, schools: 8, transit: 52, quiet: 70, commute: 68, driveMin: 18,
    medianIncome: 137000, medianAge: 37, pctBach: 73, pctOwn: 60, pctKids: 26,
    vibe: "Quiet residential greenbelt with a low-key village commercial spine.",
    pros: ["Best value-to-quality ratio in north Seattle", "Strong schools, quiet streets", "Close to Green Lake and Woodland Park"],
    cons: ["Transit is bus-only — no rail in plan", "Commute south can be slow at peak", "Gets sleepy at night"],
  },

  /* [W] Walk 84 / Transit 61 (light rail station opened 2021) | [EST] Income ~$120K */
  {
    name: "Roosevelt",
    medianSFH: 990000, pricePerSqft: 615, typical3BR: 1150000,
    walk: 84, schools: 8, transit: 61, quiet: 60, commute: 80, driveMin: 14,
    medianIncome: 120000, medianAge: 33, pctBach: 76, pctOwn: 50, pctKids: 22,
    vibe: "Light-rail-anchored north-end neighborhood, family + student mix.",
    pros: ["Light rail station opened 2021 — direct to downtown / U-District", "Strong schools, parks", "Steady appreciation post-rail-opening"],
    cons: ["Some recent overdevelopment near the station", "Mix of vintages — uneven quality", "Roosevelt Way traffic can be loud"],
  },

  /* [P23] Income $172,554 (was $115K — major correction up) / Age 43 / Own 72% | [W] Walk 76 / Transit 52 */
  {
    name: "Crown Hill",
    medianSFH: 880000, pricePerSqft: 560, typical3BR: 1000000,
    walk: 76, schools: 7, transit: 52, quiet: 75, commute: 55, driveMin: 22,
    medianIncome: 172554, medianAge: 43, pctBach: 70, pctOwn: 72, pctKids: 25,
    vibe: "Quiet bungalow grid north of Ballard — older, established, surprisingly affluent.",
    pros: ["Established homeownership (72% owner-occupied)", "More house per dollar than Ballard core", "More walkable than its reputation suggests"],
    cons: ["Less commercial life of its own", "Bus-heavy transit, no rail soon", "Commute pushes 22 min to SLU"],
  },

  /* [P24] Income $143,248 / Age 37 / Own 32% (rental-dominant) | [RF] Median $950K (condo-weighted; SFH $1.1M–$1.5M) | [W] Walk 93 / Transit 76 */
  {
    name: "Capitol Hill",
    medianSFH: 1300000, pricePerSqft: 660, typical3BR: 1500000,
    walk: 93, schools: 6, transit: 76, quiet: 25, commute: 95, driveMin: 8,
    medianIncome: 143248, medianAge: 37, pctBach: 80, pctOwn: 32, pctKids: 13,
    vibe: "Densest urban Seattle. Arts, nightlife, light rail spine.",
    pros: ["Most walkable + transit-rich neighborhood in the city", "Streetcar one stop to SLU; light rail to downtown / U-District", "Vibrant cultural scene, density of options"],
    cons: ["Loud, busy — not a typical 'family' setup", "SFHs run $1.1M–$1.5M+; condos dominate", "Schools weaker than north-end peers"],
  },

  /* [Areavibes] Income $121,864 / Age 35.3 | [BR] Median $1,045,000 (12-month, Mar 2026) | [W] Walk 85 / Transit 54 */
  {
    name: "Madison Valley",
    medianSFH: 1045000, pricePerSqft: 650, typical3BR: 1300000,
    walk: 85, schools: 7, transit: 54, quiet: 70, commute: 78, driveMin: 14,
    medianIncome: 121864, medianAge: 35, pctBach: 77, pctOwn: 60, pctKids: 25,
    vibe: "Tucked east-central pocket — Arboretum-adjacent, restaurant-row charm.",
    pros: ["Lush, near Washington Park Arboretum", "Quiet residential w/ destination dining", "Established feel without the hilltop premium of Madrona"],
    cons: ["Bus-only transit", "Older housing stock varies", "Smaller neighborhood — limited inventory"],
  },

  /* [P24] Income $176,729 / Age 39 / Own 80% | [W] Walk 58 / Transit 42 */
  {
    name: "Magnolia",
    medianSFH: 1100000, pricePerSqft: 580, typical3BR: 1200000,
    walk: 58, schools: 8, transit: 42, quiet: 85, commute: 70, driveMin: 18,
    medianIncome: 176729, medianAge: 39, pctBach: 76, pctOwn: 80, pctKids: 35,
    vibe: "Suburban-feeling peninsula. Big lots, water views, polite streets.",
    pros: ["Quiet, leafy, family-oriented", "Discovery Park is the city's largest", "Strong schools, low crime, high homeownership"],
    cons: ["Geographically isolated — one-bridge access", "Walk Score is low; you'll drive", "Less dynamic than other north-end picks"],
  },

  /* [P24] Ravenna Income $115,246 / Own 50.7% | [EST] Maple Leaf ~$130K
     [W] Avg Walk 76 / Transit 63 | [RF] Northeast Seattle median $1.1M (Jan 2026) */
  {
    name: "Maple Leaf / Ravenna",
    medianSFH: 1100000, pricePerSqft: 590, typical3BR: 1175000,
    walk: 76, schools: 8, transit: 63, quiet: 72, commute: 70, driveMin: 18,
    medianIncome: 120000, medianAge: 38, pctBach: 70, pctOwn: 60, pctKids: 28,
    vibe: "North-end family belt. Bungalows, parks, schoolyards.",
    pros: ["Strong schools (Olympic Hills, View Ridge area)", "Light rail (Roosevelt / Northgate) brings transit", "Quieter than Ballard, similar pricing"],
    cons: ["Less commercial walkability", "Aging housing stock varies in quality", "Less 'urban energy' if that matters"],
  },

  /* [P24] West Seattle Income $114,780 | [W] Walk 71 / Transit 42 | [RF] Median $849K (Feb 2026) */
  {
    name: "West Seattle (Admiral)",
    medianSFH: 825000, pricePerSqft: 540, typical3BR: 950000,
    walk: 71, schools: 7, transit: 42, quiet: 78, commute: 35, driveMin: 28,
    medianIncome: 125000, medianAge: 38, pctBach: 65, pctOwn: 65, pctKids: 28,
    vibe: "Across the bridge — beach access, mid-century homes, growing food scene.",
    pros: ["More house for the money — solid value play", "Alki Beach, Lincoln Park nearby", "Light rail extension expected mid-2030s"],
    cons: ["Bridge is a real commute risk if it closes", "Transit is weakest in this list (42)", "Feels separate from the rest of Seattle"],
  },

  /* [P24] Income $104,771 / Age 38 | Race: 38.6% White / 25.9% Asian / 18.4% Black | [W] Walk 85 / Transit 62 */
  {
    name: "Columbia City",
    medianSFH: 760000, pricePerSqft: 510, typical3BR: 875000,
    walk: 85, schools: 6, transit: 62, quiet: 55, commute: 65, driveMin: 22,
    medianIncome: 104771, medianAge: 38, pctBach: 50, pctOwn: 50, pctKids: 30,
    vibe: "Diverse, transit-rich, fast-changing south-end main street.",
    pros: ["High walk score (85) for a value neighborhood", "Most diverse neighborhood in this list", "Light rail station + strong appreciation trajectory"],
    cons: ["Schools rated lower (verify zone carefully)", "Block-by-block variation in feel", "Some streets see crime / traffic noise"],
  },

  /* [P23] Income $101,568 / Age 38 | Race: 45.9% White / 20.2% Asian / 13.7% Black | [W] Walk 76 / Transit 62 */
  {
    name: "Mount Baker",
    medianSFH: 950000, pricePerSqft: 555, typical3BR: 1050000,
    walk: 76, schools: 7, transit: 62, quiet: 70, commute: 70, driveMin: 18,
    medianIncome: 101568, medianAge: 38, pctBach: 60, pctOwn: 65, pctKids: 30,
    vibe: "Lakefront south-end with grand homes and a quiet residential feel.",
    pros: ["Lake Washington access, parks, boulevards", "Light rail at Mt Baker Station", "Larger lots than most of Seattle"],
    cons: ["Walkability is uneven outside the boulevard", "School zones vary — verify per address", "I-90 corridor noise in some pockets"],
  },

  /* [washington-demographics.com] Income $86,806 | [W] Walk 62 / Transit 57
     Note: Walk Score penalizes hilly geography despite light rail presence */
  {
    name: "Beacon Hill",
    medianSFH: 750000, pricePerSqft: 495, typical3BR: 850000,
    walk: 62, schools: 6, transit: 57, quiet: 50, commute: 72, driveMin: 18,
    medianIncome: 86806, medianAge: 39, pctBach: 50, pctOwn: 60, pctKids: 32,
    vibe: "Hilltop south-end with light rail and Jefferson Park views.",
    pros: ["Strong value — your budget goes furthest here", "Light rail station 8 min to downtown", "Diverse, growing food scene"],
    cons: ["Flight path noise (Boeing Field) is real", "Walk Score (62) lower than reputation suggests", "Schools rated lower than north-end peers"],
  },
];
