#!/usr/bin/env python3
"""
process-parcel-data.py

Computes housing characteristics for 17 Seattle neighborhoods from King County
Assessor parcel data. Run once to generate housing-characteristics.json, which
is then hardcoded into neighborhoods.ts.

Data sources (downloaded from https://aqua.kingcounty.gov/extranet/assessor/):
  - Residential Building.zip  → EXTR_ResBldg.csv   (year built, garage sqft, ZIP)
  - Parcel.zip                → EXTR_Parcel.csv    (lot size, present use code)

Usage:
  python3 scripts/process-parcel-data.py

Looks for the ZIP files in scripts/.cache/ or /tmp/. Downloads them if missing.
"""

import csv
import json
import os
import sys
import urllib.request
import zipfile
from statistics import median as stat_median
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CACHE_DIR = SCRIPT_DIR / ".cache"
OUTPUT = SCRIPT_DIR / "housing-characteristics.json"

RESBLDG_URL = "https://aqua.kingcounty.gov/extranet/assessor/Residential%20Building.zip"
PARCEL_URL  = "https://aqua.kingcounty.gov/extranet/assessor/Parcel.zip"
RESBLDG_ZIP = CACHE_DIR / "EXTR_ResBldg.zip"
PARCEL_ZIP  = CACHE_DIR / "EXTR_Parcel.zip"

# King County Parcel PresentUse codes (LUType 102 in LookUp table)
USE_SINGLE_FAMILY = {"2", "6", "9"}   # Single Family (various zones)
USE_TOWNHOUSE     = {"29"}            # Townhouse Plat
USE_CONDO         = {"20", "25"}      # Condo Residential, Condo Mixed Use

# ZIP → neighborhood. Where a ZIP spans multiple neighborhoods, all are listed.
# Source: Seattle neighborhood maps + ZIP code boundary overlays.
ZIP_MAP: dict[str, list[str]] = {
    "98109": ["Queen Anne"],
    "98119": ["Queen Anne"],
    "98107": ["Ballard"],
    "98177": ["Sunset Hill"],          # NW Seattle; Magnolia is 98199
    "98103": ["Wallingford", "Fremont", "Green Lake"],  # shared ZIP
    "98115": ["Roosevelt"],
    "98125": ["Maple Leaf / Ravenna"],
    "98117": ["Crown Hill"],           # Also NW; 98117 is primarily Crown Hill / north Ballard
    "98133": ["Phinney / Greenwood"],
    "98199": ["Magnolia"],
    "98112": ["Madison Valley"],
    "98102": ["Capitol Hill"],
    "98116": ["West Seattle (Admiral)"],
    "98118": ["Columbia City"],
    "98144": ["Mount Baker"],
    "98108": ["Beacon Hill"],
    "98106": ["Beacon Hill"],
}

ALL_NEIGHBORHOODS = sorted({n for names in ZIP_MAP.values() for n in names})


def download(url: str, dest: Path):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url.split('/')[-1].replace('%20', ' ')} ...", flush=True)
    urllib.request.urlretrieve(url, dest)
    print(f"  → {dest} ({dest.stat().st_size / 1e6:.1f} MB)")


def ensure_cached():
    if not RESBLDG_ZIP.exists():
        # Check /tmp first (from previous download)
        tmp_resbldg = Path("/tmp/kc_resbldg.zip")
        if tmp_resbldg.exists():
            print(f"Using {tmp_resbldg}")
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy(tmp_resbldg, RESBLDG_ZIP)
        else:
            download(RESBLDG_URL, RESBLDG_ZIP)

    if not PARCEL_ZIP.exists():
        tmp_parcel = Path("/tmp/kc_parcel.zip")
        if tmp_parcel.exists():
            print(f"Using {tmp_parcel}")
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy(tmp_parcel, PARCEL_ZIP)
        else:
            download(PARCEL_URL, PARCEL_ZIP)


def stream_csv_from_zip(zip_path: Path, filename_hint: str = None):
    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()
        csv_name = names[0] if not filename_hint else next(n for n in names if filename_hint in n)
        with zf.open(csv_name) as f:
            import io
            reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8", errors="replace"))
            for i, row in enumerate(reader):
                if i % 200_000 == 0 and i > 0:
                    print(f"  {i:,} rows...", flush=True)
                yield row


def main():
    ensure_cached()

    # Step 1: Read ResBldg — collect zip, yrBuilt, hasGarage per parcel (Major key)
    print("\nReading Residential Building table...")
    resbldg: dict[str, dict] = {}
    for row in stream_csv_from_zip(RESBLDG_ZIP):
        major = row.get("Major", "").strip()
        if not major:
            continue
        yr = int(row.get("YrBuilt", "0") or 0)
        gar_att  = int(row.get("SqFtGarageAttached",  "0") or 0)
        gar_bsmt = int(row.get("SqFtGarageBasement",  "0") or 0)
        zip_code = (row.get("ZipCode", "") or "").strip().strip('"')
        if yr > 1800:
            resbldg[major] = {
                "zip":      zip_code,
                "yr":       yr,
                "garage":   (gar_att + gar_bsmt) > 0,
            }
    print(f"  Loaded {len(resbldg):,} residential building records")

    # Step 2: Read Parcel — collect sqFtLot, presentUse per Major
    print("\nReading Parcel table...")
    parcels: dict[str, dict] = {}
    for row in stream_csv_from_zip(PARCEL_ZIP):
        major = row.get("Major", "").strip()
        if not major:
            continue
        lot = int(row.get("SqFtLot", "0") or 0)
        use = (row.get("PresentUse", "") or "").strip()
        parcels[major] = {"lot": lot, "use": use}
    print(f"  Loaded {len(parcels):,} parcel records")

    # Step 3: Aggregate per neighborhood
    agg: dict[str, dict] = {
        n: {"yrs": [], "lots": [], "garage": 0, "sfh": 0, "th": 0, "condo": 0, "total": 0}
        for n in ALL_NEIGHBORHOODS
    }

    skipped_zip = 0
    skipped_use = 0

    for major, bldg in resbldg.items():
        zip_code = bldg["zip"]
        neighborhoods = ZIP_MAP.get(zip_code)
        if not neighborhoods:
            skipped_zip += 1
            continue

        parcel = parcels.get(major, {"lot": 0, "use": ""})
        use = parcel["use"]

        is_sfh     = use in USE_SINGLE_FAMILY
        is_th      = use in USE_TOWNHOUSE
        is_condo   = use in USE_CONDO

        if not (is_sfh or is_th or is_condo):
            skipped_use += 1
            continue

        for name in neighborhoods:
            d = agg[name]
            d["total"] += 1
            d["yrs"].append(bldg["yr"])
            lot = parcel["lot"]
            if 100 < lot < 100_000:  # filter out zero/implausible values
                d["lots"].append(lot)
            if bldg["garage"]:
                d["garage"] += 1
            if is_sfh:   d["sfh"]   += 1
            if is_th:    d["th"]    += 1
            if is_condo: d["condo"] += 1

    print(f"\n  Skipped {skipped_zip:,} records (ZIP not in Seattle neighborhoods)")
    print(f"  Skipped {skipped_use:,} records (non-residential use code)")

    # Step 4: Compute stats
    result = {}
    for name in ALL_NEIGHBORHOODS:
        d = agg[name]
        n = d["total"]
        if n == 0:
            print(f"  WARN: no data for {name}")
            continue

        med_yr  = int(stat_median(d["yrs"])) if d["yrs"] else None
        med_lot = int(stat_median(d["lots"])) if d["lots"] else None

        def pct(k: int) -> int:
            return round(k / n * 100)

        result[name] = {
            "medianYearBuilt":  med_yr,
            "medianLotSqft":    med_lot,
            "pctWithGarage":    pct(d["garage"]),
            "housingMix": {
                "pctSingleFamily": pct(d["sfh"]),
                "pctTownhome":     pct(d["th"]),
                "pctCondo":        pct(d["condo"]),
            },
            "_sampleSize": n,
            "_note": "King County Assessor EXTR_ResBldg.csv + EXTR_Parcel.csv (May 2026)",
        }

    # Step 5: Print + write
    print("\n── Results ──────────────────────────────────────────────────────────")
    print(f"{'Neighborhood':<28} {'Built':>6} {'Lot':>7} {'Gar%':>5} {'SFH%':>5} {'TH%':>4} {'Condo%':>7} {'n':>6}")
    print("─" * 80)
    for name, d in sorted(result.items()):
        mix = d["housingMix"]
        print(
            f"{name:<28} {str(d['medianYearBuilt']):>6} {str(d['medianLotSqft']):>7} "
            f"{d['pctWithGarage']:>4}% {mix['pctSingleFamily']:>4}% {mix['pctTownhome']:>3}% "
            f"{mix['pctCondo']:>6}%  {d['_sampleSize']:>6,}"
        )

    with open(OUTPUT, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nWrote {OUTPUT}")


if __name__ == "__main__":
    main()
