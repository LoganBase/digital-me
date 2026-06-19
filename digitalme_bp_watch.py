"""
DigitalMe — Hilo PDF Watcher
=============================
Run this on a schedule (cron, launchd, etc.) to automatically detect
new Hilo PDFs in Google Drive and append them to the BP store.

Cron example (daily at 7am):
  0 7 * * * cd /path/to/digitalme && python digitalme_bp_watch.py

It tracks which files have already been processed in a local state file
(processed_files.json) so it only extracts genuinely new PDFs.
"""

import os
import json
import logging
from pathlib import Path
from datetime import datetime

import anthropic
import pandas as pd

from digitalme_bp_ingest import (
    get_google_services,
    list_hilo_pdfs,
    download_file,
    extract_hilo_pdf,
    CLAUDE_MODEL,
    OUTPUT_DIR,
)

STATE_FILE   = Path("processed_files.json")
READINGS_OUT = OUTPUT_DIR / "bp_readings.parquet"

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"processed": {}}   # {file_id: {"name": ..., "processed_at": ...}}


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))


def main():
    drive, _ = get_google_services()
    client   = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    state    = load_state()

    all_pdfs = list_hilo_pdfs(drive)
    new_pdfs = [p for p in all_pdfs if p["id"] not in state["processed"]]

    if not new_pdfs:
        log.info("No new Hilo PDFs found.")
        return

    log.info(f"Found {len(new_pdfs)} new PDF(s) to process:")
    for p in new_pdfs:
        log.info(f"  {p['name']}")

    new_rows = []
    for pdf in new_pdfs:
        try:
            pdf_bytes = download_file(drive, pdf["id"])
            data      = extract_hilo_pdf(client, pdf_bytes, pdf["name"])

            month_label = data.get("month_label", pdf["name"])
            for r in data.get("readings", []):
                time_str = r.get("time") or "00:00"
                try:
                    ts = datetime.strptime(f"{r['date']} {time_str}", "%Y-%m-%d %H:%M")
                except (ValueError, KeyError):
                    ts = None

                systolic  = r.get("systolic")
                diastolic = r.get("diastolic")

                new_rows.append({
                    "timestamp":        ts,
                    "date":             r.get("date"),
                    "time":             time_str,
                    "systolic":         systolic,
                    "diastolic":        diastolic,
                    "pulse_pressure":   (systolic - diastolic) if (systolic and diastolic) else None,
                    "heart_rate":       r.get("heart_rate"),
                    "measurement_type": r.get("measurement_type", "wearable"),
                    "device":           "hilo",
                    "source_file":      pdf["name"],
                    "month_label":      month_label,
                    "time_missing":     time_str == "00:00",
                })

            state["processed"][pdf["id"]] = {
                "name":         pdf["name"],
                "processed_at": datetime.utcnow().isoformat(),
                "readings":     len(data.get("readings", [])),
            }
            log.info(f"  ✓ {pdf['name']}: {len(data.get('readings', []))} readings")

        except Exception as e:
            log.error(f"  ✗ {pdf['name']}: {e}")

    if not new_rows:
        log.info("No new readings extracted.")
        save_state(state)
        return

    new_df = pd.DataFrame(new_rows)
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Append to existing store (or create fresh)
    if READINGS_OUT.exists():
        existing = pd.read_parquet(READINGS_OUT)
        combined = pd.concat([existing, new_df], ignore_index=True)
        # Deduplicate carry-overs
        combined = combined.drop_duplicates(subset=["timestamp", "device"], keep="first")
        combined = combined.sort_values("timestamp").reset_index(drop=True)
    else:
        combined = new_df.sort_values("timestamp").reset_index(drop=True)

    combined.to_parquet(READINGS_OUT, index=False)
    combined.to_csv(OUTPUT_DIR / "bp_readings.csv", index=False)

    save_state(state)
    log.info(f"Store updated: {len(combined):,} total readings saved.")
    log.info(f"New readings added this run: {len(new_rows)}")


if __name__ == "__main__":
    main()
