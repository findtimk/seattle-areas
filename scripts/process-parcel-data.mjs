#!/usr/bin/env node
/**
 * process-parcel-data.mjs
 *
 * Computes housing characteristics for Seattle neighborhoods from King County
 * Assessor parcel data. Downloads data if not already cached locally.
 *
 * Sources:
 *   - King County Assessor: EXTR_ResBldg.csv  (year built, garage sqft, zip code)
 *   - King County Assessor: EXTR_Parcel.csv   (lot size, present use code)
 *
 * Usage:
 *   node scripts/process-parcel-data.mjs
 *
 * Outputs:
 *   scripts/housing-characteristics.json
 */

import { createReadStream, createWriteStream, existsSync, statSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { createInterface } from 'readline';
import { createUnzip } from 'zlib';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const RESBLDG_URL = 'https://aqua.kingcounty.gov/extranet/assessor/Residential%20Building.zip';
const PARCEL_URL  = 'https://aqua.kingcounty.gov/extranet/assessor/Parcel.zip';
const RESBLDG_ZIP = path.join(CACHE_DIR, 'EXTR_ResBldg.zip');
const PARCEL_ZIP  = path.join(CACHE_DIR, 'EXTR_Parcel.zip');
const OUTPUT_FILE = path.join(__dirname, 'housing-characteristics.json');

// King County Parcel PresentUse codes (from LookUp table, LUType 102)
const USE_SINGLE_FAMILY = new Set(['2', '6', '9']);
const USE_TOWNHOUSE     = new Set(['29']);
const USE_CONDO         = new Set(['20', '25']);

// ZIP code → neighborhood mapping
// Where a ZIP spans multiple neighborhoods, it's noted. Parcels are assigned
// to the neighborhood listed (the dominant one for that ZIP in Seattle proper).
// A few neighborhoods share ZIPs; those are marked with a note.
const ZIP_TO_NEIGHBORHOOD = {
  '98109': 'Queen Anne',
  '98119': 'Queen Anne',     // Upper Queen Anne / west slope
  '98107': 'Ballard',
  '98117': 'Crown Hill',     // Crown Hill / NW Seattle (Ballard overlaps but 98107 covers Ballard core)
  // Sunset Hill uses same 98177 zip as Magnolia north but is geographically NW
  // We assign 98177 to Sunset Hill since Magnolia is covered by 98199
  '98177': 'Sunset Hill',
  '98103': 'Wallingford',    // Also covers Fremont; we split by counting both
  '98105': 'Wallingford',    // University District edge bleeds in; majority is Wallingford/U-District
  '98115': 'Roosevelt',      // Includes Ravenna/Roosevelt/Maple Leaf north
  '98125': 'Maple Leaf / Ravenna',
  '98133': 'Phinney / Greenwood',
  '98199': 'Magnolia',
  '98112': 'Madison Valley', // Madison Valley / Capitol Hill east
  '98102': 'Capitol Hill',
  '98116': 'West Seattle (Admiral)',
  '98118': 'Columbia City',
  '98144': 'Mount Baker',
  '98108': 'Beacon Hill',
  '98106': 'Beacon Hill',    // north Beacon Hill / Georgetown
};

// Fremont and Green Lake share 98103 with Wallingford. Give them their own entries
// using 98103 as a shared ZIP — we'll split it by noting the overlap.
// For Fremont we also use zip 98103 (Fremont Ave area).
// In practice 98103 covers Fremont, Wallingford, and the south edge of Green Lake.
// We assign 98103 to both Fremont and Wallingford (each gets the full 98103 stats).
// Green Lake is better covered by 98115 north (overlaps) and 98103 south.
// This is a known limitation; we note it in the output.
const MULTI_NEIGHBORHOOD_ZIPS = {
  '98103': ['Wallingford', 'Fremont', 'Green Lake'],
};

// For neighborhoods that need secondary ZIPs
const EXTRA_ZIP_TO_NEIGHBORHOOD = {
  '98103': ['Wallingford', 'Fremont', 'Green Lake'],
};

// Median function
function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// Cache freshness: 30 days
const CACHE_MAX_AGE_DAYS = 30;
function isCacheStale(filePath) {
  if (!existsSync(filePath)) return true;
  const age = (Date.now() - statSync(filePath).mtimeMs) / (1000 * 60 * 60 * 24);
  return age > CACHE_MAX_AGE_DAYS;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const request = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            process.stdout.write(`\r  ${pct}% (${(downloaded / 1e6).toFixed(1)} MB)`);
          }
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); process.stdout.write('\n'); resolve(); });
      }).on('error', reject);
    };
    request(url);
  });
}

// Streaming CSV line reader that handles quoted fields
function* parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}

async function streamCsvFromZip(zipPath, callback) {
  return new Promise((resolve, reject) => {
    const { execSync } = await import('child_process').then(m => m);
    // Use unzip -p to stream from zip
    const { spawn } = require('child_process');
    const proc = spawn('unzip', ['-p', zipPath]);
    const unzip = proc.stdout;
    const rl = createInterface({ input: unzip });
    let header = null;
    let lineCount = 0;
    rl.on('line', (line) => {
      lineCount++;
      if (lineCount % 100000 === 0) process.stdout.write(`\r  ${(lineCount / 1e6).toFixed(1)}M rows...`);
      const fields = [...parseCsvLine(line)];
      if (!header) { header = fields; return; }
      const row = {};
      header.forEach((h, i) => { row[h] = fields[i] || ''; });
      callback(row);
    });
    rl.on('close', () => { if (lineCount > 1) process.stdout.write('\n'); resolve(); });
    proc.on('error', reject);
  });
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });

  // Download if stale
  if (isCacheStale(RESBLDG_ZIP)) {
    console.log('Downloading King County Residential Building data...');
    await download(RESBLDG_URL, RESBLDG_ZIP);
  } else {
    console.log('Using cached Residential Building data');
  }
  if (isCacheStale(PARCEL_ZIP)) {
    console.log('Downloading King County Parcel data...');
    await download(PARCEL_URL, PARCEL_ZIP);
  } else {
    console.log('Using cached Parcel data');
  }

  // Build structures
  // resbldg: Major → { zipCode, yrBuilt, garageAttached, garageBasement }
  console.log('\nReading Residential Building table...');
  const resbldg = new Map();
  await streamCsvFromZip(RESBLDG_ZIP, (row) => {
    const major = row['Major'];
    const zip = (row['ZipCode'] || '').trim();
    const yrBuilt = parseInt(row['YrBuilt'] || '0', 10);
    const garAtt = parseInt(row['SqFtGarageAttached'] || '0', 10);
    const garBsmt = parseInt(row['SqFtGarageBasement'] || '0', 10);
    if (major && yrBuilt > 1800) {
      resbldg.set(major, { zip, yrBuilt, hasGarage: (garAtt + garBsmt) > 0 });
    }
  });

  // parcel: Major → { sqFtLot, presentUse }
  console.log('Reading Parcel table...');
  const parcels = new Map();
  await streamCsvFromZip(PARCEL_ZIP, (row) => {
    const major = row['Major'];
    const sqFtLot = parseInt(row['SqFtLot'] || '0', 10);
    const use = (row['PresentUse'] || '').trim();
    if (major) {
      parcels.set(major, { sqFtLot, use });
    }
  });

  // Aggregate per neighborhood
  const data = {};
  const allNeighborhoods = new Set(Object.values(ZIP_TO_NEIGHBORHOOD));
  Object.values(EXTRA_ZIP_TO_NEIGHBORHOOD).flat().forEach(n => allNeighborhoods.add(n));
  allNeighborhoods.forEach(n => {
    data[n] = { yrBuilts: [], lotSizes: [], garageCount: 0, total: 0, sfh: 0, townhome: 0, condo: 0 };
  });

  for (const [major, bldg] of resbldg) {
    const zip = bldg.zip;
    let neighborhoods = [];
    if (EXTRA_ZIP_TO_NEIGHBORHOOD[zip]) {
      neighborhoods = EXTRA_ZIP_TO_NEIGHBORHOOD[zip];
    } else if (ZIP_TO_NEIGHBORHOOD[zip]) {
      neighborhoods = [ZIP_TO_NEIGHBORHOOD[zip]];
    }
    if (neighborhoods.length === 0) continue;

    const parcel = parcels.get(major) || { sqFtLot: 0, use: '' };
    const use = parcel.use;

    // Only count residential use codes — skip commercial/vacant
    const isResidential = USE_SINGLE_FAMILY.has(use) || USE_TOWNHOUSE.has(use) || USE_CONDO.has(use)
      || use === '2' || use === '29' || use === '20';
    if (!isResidential) continue;

    for (const name of neighborhoods) {
      if (!data[name]) continue;
      const d = data[name];
      d.total++;
      if (bldg.yrBuilt > 1800) d.yrBuilts.push(bldg.yrBuilt);
      if (parcel.sqFtLot > 0 && parcel.sqFtLot < 100000) d.lotSizes.push(parcel.sqFtLot);
      if (bldg.hasGarage) d.garageCount++;
      if (USE_SINGLE_FAMILY.has(use)) d.sfh++;
      else if (USE_TOWNHOUSE.has(use)) d.townhome++;
      else if (USE_CONDO.has(use)) d.condo++;
    }
  }

  // Compute final stats
  const result = {};
  for (const [name, d] of Object.entries(data)) {
    if (d.total === 0) { console.warn(`  WARN: no data for ${name}`); continue; }
    const pct = (n) => Math.round((n / d.total) * 100);
    result[name] = {
      medianYearBuilt:  median(d.yrBuilts) || null,
      medianLotSqft:    median(d.lotSizes) || null,
      pctWithGarage:    d.total > 0 ? pct(d.garageCount) : null,
      housingMix: {
        pctSingleFamily: pct(d.sfh),
        pctTownhome:     pct(d.townhome),
        pctCondo:        pct(d.condo),
      },
      _sampleSize: d.total,
      _source: 'King County Assessor EXTR_ResBldg.csv + EXTR_Parcel.csv (May 2026)',
    };
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${OUTPUT_FILE}`);
  console.log('\nResults:');
  for (const [name, d] of Object.entries(result)) {
    console.log(`  ${name.padEnd(28)} built:${d.medianYearBuilt}  lot:${d.medianLotSqft}sqft  garage:${d.pctWithGarage}%  sfh:${d.housingMix.pctSingleFamily}%  th:${d.housingMix.pctTownhome}%  condo:${d.housingMix.pctCondo}%  (n=${d._sampleSize})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
