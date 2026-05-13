#!/usr/bin/env node
/**
 * refresh-prices.mjs
 *
 * Fetches the latest median sale price and price-per-sqft for Seattle
 * neighborhoods from Redfin's public data export and prints a diff against
 * the current hardcoded values in neighborhoods.ts.
 *
 * Run quarterly or semi-annually to check for meaningful price shifts.
 * The script does NOT modify neighborhoods.ts — review the diff and apply
 * changes manually.
 *
 * Usage:
 *   node scripts/refresh-prices.mjs
 *
 * Output:
 *   - Console diff table
 *   - scripts/price-snapshot.json  (new values for manual review)
 *
 * Data source:
 *   Redfin Public Data S3: zip_code_market_tracker.tsv000.gz
 *   Updated monthly. Includes MEDIAN_SALE_PRICE and MEDIAN_PPSF by ZIP.
 *   Property type filtered to "Single Family Residential".
 *   3-month rolling window (most recent complete quarter).
 */

import https from "https";
import zlib from "zlib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "redfin_zip_tracker.tsv");
const OUTPUT_FILE = path.join(__dirname, "price-snapshot.json");
const NEIGHBORHOODS_FILE = path.join(__dirname, "../src/data/neighborhoods.ts");

const REDFIN_URL =
  "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz";

// Neighborhood → primary ZIP(s) mapping (same as process-parcel-data.py)
// Where multiple ZIPs exist, the first is used for pricing. Neighborhoods with
// shared ZIPs (Wallingford/Fremont/Green Lake → 98103) are noted.
const NEIGHBORHOOD_ZIPS = {
  "Queen Anne":             ["98109", "98119"],
  "Ballard":                ["98107"],
  "Sunset Hill":            ["98177"],
  "Wallingford":            ["98103"],
  "Fremont":                ["98103"],
  "Green Lake":             ["98103"],
  "Phinney / Greenwood":    ["98133"],
  "Roosevelt":              ["98115"],
  "Crown Hill":             ["98117"],
  "Capitol Hill":           ["98102"],
  "Madison Valley":         ["98112"],
  "Magnolia":               ["98199"],
  "Maple Leaf / Ravenna":   ["98125"],
  "West Seattle (Admiral)": ["98116"],
  "Columbia City":          ["98118"],
  "Mount Baker":            ["98144"],
  "Beacon Hill":            ["98108", "98106"],
};

// Current hardcoded values from neighborhoods.ts (for diff display)
const CURRENT = {
  "Queen Anne":             { medianSFH: 1050000, pricePerSqft: 720 },
  "Ballard":                { medianSFH:  920000, pricePerSqft: 605 },
  "Sunset Hill":            { medianSFH: 1080000, pricePerSqft: 580 },
  "Wallingford":            { medianSFH: 1000000, pricePerSqft: 650 },
  "Fremont":                { medianSFH: 1025000, pricePerSqft: 635 },
  "Green Lake":             { medianSFH: 1175000, pricePerSqft: 660 },
  "Phinney / Greenwood":    { medianSFH:  925000, pricePerSqft: 575 },
  "Roosevelt":              { medianSFH:  990000, pricePerSqft: 615 },
  "Crown Hill":             { medianSFH:  880000, pricePerSqft: 560 },
  "Capitol Hill":           { medianSFH: 1300000, pricePerSqft: 660 },
  "Madison Valley":         { medianSFH: 1045000, pricePerSqft: 650 },
  "Magnolia":               { medianSFH: 1100000, pricePerSqft: 580 },
  "Maple Leaf / Ravenna":   { medianSFH: 1100000, pricePerSqft: 590 },
  "West Seattle (Admiral)": { medianSFH:  825000, pricePerSqft: 540 },
  "Columbia City":          { medianSFH:  760000, pricePerSqft: 510 },
  "Mount Baker":            { medianSFH:  950000, pricePerSqft: 555 },
  "Beacon Hill":            { medianSFH:  750000, pricePerSqft: 495 },
};

const CACHE_MAX_DAYS = 30;

function isCacheStale(filePath) {
  if (!fs.existsSync(filePath)) return true;
  const ageMs = Date.now() - fs.statSync(filePath).mtimeMs;
  return ageMs > CACHE_MAX_DAYS * 24 * 60 * 60 * 1000;
}

function downloadAndDecompress(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    const fetch = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetch(res.headers.location);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const total = parseInt(res.headers["content-length"] || "0");
        let done = 0;
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip).pipe(file);
        res.on("data", (c) => {
          done += c.length;
          if (total > 0) process.stdout.write(`\r  ${Math.round(done / total * 100)}% (${(done / 1e6).toFixed(0)} MB compressed)`);
        });
        file.on("finish", () => { process.stdout.write("\n"); resolve(); });
        gunzip.on("error", reject);
        file.on("error", reject);
      }).on("error", reject);
    };
    fetch(url);
  });
}

async function loadRedfin() {
  if (isCacheStale(CACHE_FILE)) {
    console.log("Downloading Redfin zip code market tracker (decompressing ~1.5 GB)...");
    console.log("This takes a few minutes on first run; cached for 30 days after.\n");
    await downloadAndDecompress(REDFIN_URL, CACHE_FILE);
    console.log(`Cached to ${CACHE_FILE}`);
  } else {
    const ageDays = Math.floor((Date.now() - fs.statSync(CACHE_FILE).mtimeMs) / 86400000);
    console.log(`Using cached Redfin data (${ageDays} days old)`);
  }
}

async function parseRedfin(targetZips) {
  // zip → array of { periodEnd, medianSalePrice, medianPPSF }
  const byZip = {};
  const rl = createInterface({ input: fs.createReadStream(CACHE_FILE) });

  let header = null;
  let rows = 0;

  for await (const line of rl) {
    rows++;
    if (rows % 500000 === 0) process.stdout.write(`\r  Scanned ${(rows / 1e6).toFixed(1)}M rows...`);
    const fields = line.split("\t");
    if (!header) { header = fields; continue; }

    const row = {};
    header.forEach((h, i) => { row[h.replace(/"/g, "")] = (fields[i] || "").replace(/"/g, ""); });

    const zip = (row["REGION"] || "").replace("Zip Code: ", "").trim();
    if (!targetZips.has(zip)) continue;
    if (row["PROPERTY_TYPE"] !== "Single Family Residential") continue;
    if (row["PERIOD_DURATION"] !== "90") continue; // 3-month windows only

    const price = parseFloat(row["MEDIAN_SALE_PRICE"]);
    const ppsf  = parseFloat(row["MEDIAN_PPSF"]);
    const end   = row["PERIOD_END"];

    if (!price || !ppsf || !end) continue;
    if (!byZip[zip]) byZip[zip] = [];
    byZip[zip].push({ end, price, ppsf });
  }
  process.stdout.write("\n");

  // For each ZIP, take the most recent period
  const latest = {};
  for (const [zip, records] of Object.entries(byZip)) {
    records.sort((a, b) => b.end.localeCompare(a.end));
    latest[zip] = records[0];
  }
  return latest;
}

function fmtDelta(oldVal, newVal) {
  const delta = newVal - oldVal;
  const pct = ((delta / oldVal) * 100).toFixed(1);
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function fmtMoney(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(v / 1000)}K`;
}

async function main() {
  await loadRedfin();

  const allZips = new Set(Object.values(NEIGHBORHOOD_ZIPS).flat());
  console.log(`\nScanning ${(fs.statSync(CACHE_FILE).size / 1e9).toFixed(1)} GB Redfin file for ${allZips.size} Seattle ZIPs...`);
  const redfin = await parseRedfin(allZips);

  // Aggregate per neighborhood (average across ZIPs if multiple)
  const snapshot = {};
  for (const [name, zips] of Object.entries(NEIGHBORHOOD_ZIPS)) {
    const records = zips.map((z) => redfin[z]).filter(Boolean);
    if (records.length === 0) {
      console.warn(`  WARN: No Redfin data found for ${name} (ZIPs: ${zips.join(", ")})`);
      continue;
    }
    const avgPrice = Math.round(records.reduce((s, r) => s + r.price, 0) / records.length);
    const avgPPSF  = Math.round(records.reduce((s, r) => s + r.ppsf,  0) / records.length);
    const period   = records[0].end;
    snapshot[name] = { medianSFH: avgPrice, pricePerSqft: avgPPSF, period };
  }

  // Print diff
  const COL = { name: 28, old: 10, new: 10, delta: 8, oldP: 7, newP: 7, deltaP: 8 };
  const head = `${"Neighborhood".padEnd(COL.name)} ${"SFH (old)".padStart(COL.old)} ${"SFH (new)".padStart(COL.new)} ${"Δ".padStart(COL.delta)}   ${"PPSF old".padStart(COL.oldP)} ${"PPSF new".padStart(COL.newP)} ${"Δ".padStart(COL.deltaP)}   Period`;
  console.log(`\n${"─".repeat(head.length)}`);
  console.log(head);
  console.log("─".repeat(head.length));

  let anyChange = false;
  for (const [name, data] of Object.entries(snapshot)) {
    const cur = CURRENT[name];
    if (!cur) continue;
    const priceDelta = fmtDelta(cur.medianSFH, data.medianSFH);
    const ppsfDelta  = fmtDelta(cur.pricePerSqft, data.pricePerSqft);
    const changed = Math.abs(data.medianSFH - cur.medianSFH) / cur.medianSFH > 0.03
                 || Math.abs(data.pricePerSqft - cur.pricePerSqft) / cur.pricePerSqft > 0.03;
    if (changed) anyChange = true;
    const marker = changed ? " ◀" : "";
    console.log(
      `${name.padEnd(COL.name)} ${fmtMoney(cur.medianSFH).padStart(COL.old)} ${fmtMoney(data.medianSFH).padStart(COL.new)} ${priceDelta.padStart(COL.delta)}   ${("$" + cur.pricePerSqft).padStart(COL.oldP)} ${("$" + data.pricePerSqft).padStart(COL.newP)} ${ppsfDelta.padStart(COL.deltaP)}   ${data.period}${marker}`
    );
  }
  console.log("─".repeat(head.length));
  if (anyChange) {
    console.log("\n◀ = changed >3% from current hardcoded value — consider updating neighborhoods.ts");
  } else {
    console.log("\nNo neighborhoods changed >3% — data looks current.");
  }

  // Write snapshot
  const out = {
    generatedAt: new Date().toISOString(),
    source: "Redfin zip_code_market_tracker.tsv000.gz (Single Family Residential, 90-day window)",
    note: "Review the diff above. Apply changes manually to src/data/neighborhoods.ts. Update LAST_REFRESHED.",
    neighborhoods: snapshot,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\nSnapshot written to ${OUTPUT_FILE}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
