"""
DigitalMe — Blood Pressure Ingestion Pipeline
==============================================
Sources:
  1. Hilo monthly PDFs  → Google Drive folder (authoritative, extracted via Claude API)
  2. Omron spreadsheet  → Google Sheet (BloodPresure_Results_Omron)

Output:
  bp_readings.parquet   — every individual reading, unified schema
  bp_monthly_summary.parquet — Hilo monthly summary stats (daytime/nighttime/all)

Usage:
  python digitalme_bp_ingest.py

Requirements:
  pip install anthropic google-auth google-auth-httplib2 google-api-python-client pandas pyarrow

Authentication:
  Set ANTHROPIC_API_KEY in environment.
  Place Google OAuth credentials in credentials.json (Drive + Sheets scopes).
  On first run you will be prompted to authorise via browser; token saved to token.json.
"""

import os
import re
import json
import pickle
import base64
import logging
from datetime import datetime
from pathlib import Path

import anthropic
import pandas as pd
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.http import MediaIoBaseDownload
import io

# ── Config ────────────────────────────────────────────────────────────────────

HILO_FOLDER_ID   = "1vnYnJAxCpn6Bzk4UXk1LwzJXoQuMF8i9"
OMRON_SHEET_ID   = "1_P2EC4D6vMgZYWRKBbUYuTvf_CNKvzUWDNu59kBjlxM"
OUTPUT_DIR       = Path("./digitalme_data")
SCOPES           = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
]
CLAUDE_MODEL     = "claude-sonnet-4-20250514"

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ── Google Auth ───────────────────────────────────────────────────────────────

def get_google_services():
    """Return authenticated Drive and Sheets service clients."""
    creds = None
    token_path = Path("token.json")
    creds_path = Path("credentials.json")

    if token_path.exists():
        with open(token_path, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not creds_path.exists():
                raise FileNotFoundError(
                    "credentials.json not found. Download OAuth 2.0 credentials from "
                    "Google Cloud Console (Drive API + Sheets API enabled)."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "wb") as f:
            pickle.dump(creds, f)

    drive   = build("drive",   "v3", credentials=creds)
    sheets  = build("sheets",  "v4", credentials=creds)
    return drive, sheets

# ── Hilo PDF extraction ───────────────────────────────────────────────────────

HILO_EXTRACTION_PROMPT = """
You are extracting blood pressure data from a Hilo/Aktiia monthly report PDF.

Return ONLY a JSON object with exactly this structure — no preamble, no markdown:
{
  "month_label": "March 2026",
  "summary": {
    "daytime":   {"systolic_mean": 151, "diastolic_mean": 100, "hr_mean": 73,
                  "systolic_sd": 3, "diastolic_sd": 2, "hr_sd": 3,
                  "systolic_max": 193, "diastolic_max": 124, "hr_max": 105,
                  "systolic_min": 124, "diastolic_min": 80,  "hr_min": 55,
                  "readings": 873},
    "nighttime": {"systolic_mean": 140, "diastolic_mean": 92, "hr_mean": 66,
                  "systolic_sd": 5, "diastolic_sd": 3, "hr_sd": 4,
                  "systolic_max": 168, "diastolic_max": 109, "hr_max": 91,
                  "systolic_min": 117, "diastolic_min": 75,  "hr_min": 51,
                  "readings": 285},
    "all":       {"systolic_mean": 148, "diastolic_mean": 98, "hr_mean": 71,
                  "systolic_sd": 3, "diastolic_sd": 2, "hr_sd": 3,
                  "systolic_max": 193, "diastolic_max": 124, "hr_max": 105,
                  "systolic_min": 117, "diastolic_min": 75,  "hr_min": 51,
                  "readings": 1158}
  },
  "readings": [
    {
      "date": "2026-03-01",
      "time": "00:16",
      "systolic": 151,
      "diastolic": 101,
      "heart_rate": 82,
      "measurement_type": "wearable"
    }
  ]
}

measurement_type values:
- "wearable"      → standard Hilo wrist readings (the majority)
- "calibration"   → rows under "Calibration with cuff" header
- "cuff"          → rows under "Cuff measurement" header
- "on_demand"     → rows under "On demand phone measurement" header

Rules:
- Include ALL readings from the report, including the one or two carry-over readings
  from the prior month shown at the top (they belong to their actual date).
- Date format: YYYY-MM-DD. The year may be abbreviated (e.g. "26" = 2026, "25" = 2025).
- Do NOT include the summary table rows — only individual timestamped readings.
- If a field is missing or unclear, use null.
"""


def extract_hilo_pdf(client: anthropic.Anthropic, pdf_bytes: bytes, filename: str) -> dict:
    """Send PDF to Claude and return parsed JSON."""
    log.info(f"  Extracting: {filename}")
    b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=8192,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": b64,
                    },
                },
                {
                    "type": "text",
                    "text": HILO_EXTRACTION_PROMPT,
                },
            ],
        }],
    )

    raw = response.content[0].text.strip()
    # Strip any accidental markdown fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def list_hilo_pdfs(drive) -> list[dict]:
    """Return all PDFs in the Hilo folder, sorted by name."""
    results = drive.files().list(
        q=f"'{HILO_FOLDER_ID}' in parents and mimeType='application/pdf'",
        fields="files(id, name, modifiedTime)",
        orderBy="name",
    ).execute()
    return results.get("files", [])


def download_file(drive, file_id: str) -> bytes:
    """Download a Drive file as bytes."""
    request = drive.files().get_media(fileId=file_id)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue()


def ingest_hilo_pdfs(drive, client: anthropic.Anthropic) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Extract all Hilo PDFs and return (readings_df, summaries_df)."""
    pdfs = list_hilo_pdfs(drive)
    log.info(f"Found {len(pdfs)} Hilo PDFs")

    all_readings  = []
    all_summaries = []

    for pdf in pdfs:
        filename = pdf["name"]
        try:
            pdf_bytes = download_file(drive, pdf["id"])
            data = extract_hilo_pdf(client, pdf_bytes, filename)

            month_label = data.get("month_label", filename)

            # ── Readings ──────────────────────────────────────────────────────
            for r in data.get("readings", []):
                time_str = r.get("time") or "00:00"
                if time_str == "00:00":
                    log.warning(f"    ⚠  Missing time in {filename} for date {r.get('date')}")

                try:
                    ts = datetime.strptime(f"{r['date']} {time_str}", "%Y-%m-%d %H:%M")
                except (ValueError, KeyError):
                    ts = None

                systolic   = r.get("systolic")
                diastolic  = r.get("diastolic")
                pulse_pressure = (systolic - diastolic) if (systolic and diastolic) else None

                all_readings.append({
                    "timestamp":        ts,
                    "date":             r.get("date"),
                    "time":             time_str,
                    "systolic":         systolic,
                    "diastolic":        diastolic,
                    "pulse_pressure":   pulse_pressure,
                    "heart_rate":       r.get("heart_rate"),
                    "measurement_type": r.get("measurement_type", "wearable"),
                    "device":           "hilo",
                    "source_file":      filename,
                    "month_label":      month_label,
                    "time_missing":     time_str == "00:00",
                })

            # ── Monthly summary ───────────────────────────────────────────────
            summary = data.get("summary", {})
            for period, stats in summary.items():
                if stats:
                    row = {"month_label": month_label, "period": period, "source_file": filename}
                    row.update(stats)
                    all_summaries.append(row)

            log.info(f"  ✓ {filename}: {len(data.get('readings', []))} readings")

        except Exception as e:
            log.error(f"  ✗ {filename}: {e}")

    readings_df  = pd.DataFrame(all_readings)
    summaries_df = pd.DataFrame(all_summaries)

    # Deduplicate on (timestamp, device) — carry-over readings appear in two PDFs
    if not readings_df.empty:
        before = len(readings_df)
        readings_df = readings_df.drop_duplicates(subset=["timestamp", "device"], keep="first")
        dupes = before - len(readings_df)
        if dupes:
            log.info(f"  Removed {dupes} duplicate carry-over readings")

    return readings_df, summaries_df


# ── Omron Google Sheet ingestion ──────────────────────────────────────────────

def ingest_omron_sheet(sheets) -> pd.DataFrame:
    """Read BloodPresure_Results_Omron and return normalised DataFrame."""
    log.info("Reading Omron spreadsheet...")

    # Get all sheet names
    meta = sheets.spreadsheets().get(spreadsheetId=OMRON_SHEET_ID).execute()
    sheet_names = [s["properties"]["title"] for s in meta["sheets"]]
    log.info(f"  Sheets found: {sheet_names}")

    all_rows = []

    for sheet_name in sheet_names:
        result = sheets.spreadsheets().values().get(
            spreadsheetId=OMRON_SHEET_ID,
            range=f"'{sheet_name}'!A:F",
        ).execute()
        values = result.get("values", [])
        if not values:
            continue

        # Find header row (contains "Systolic")
        header_idx = None
        for i, row in enumerate(values):
            if any("systolic" in str(c).lower() for c in row):
                header_idx = i
                break

        if header_idx is None:
            log.warning(f"  No header found in sheet '{sheet_name}', skipping")
            continue

        headers = [str(h).strip().lower() for h in values[header_idx]]
        data_rows = values[header_idx + 1:]

        for row in data_rows:
            if not row or len(row) < 3:
                continue

            # Pad short rows
            while len(row) < len(headers):
                row.append("")

            record = dict(zip(headers, row))

            # Skip summary/average rows
            date_val = str(record.get("date time", record.get("date time", ""))).strip()
            if date_val.lower() in ("average", "date time", ""):
                continue
            if "average" in date_val.lower():
                continue

            # Parse date — format: "December 31, 2016" or similar
            date_str = date_val
            time_val = str(record.get("time", "")).strip()

            # Handle 12h → 24h time conversion
            ts = None
            for fmt in [
                "%B %d, %Y %I:%M %p",   # "December 31, 2016 11:08 am"
                "%B %d, %Y %H:%M",       # "December 31, 2016 23:08"
            ]:
                try:
                    ts = datetime.strptime(f"{date_str} {time_val}", fmt)
                    break
                except ValueError:
                    continue

            if ts is None:
                log.warning(f"  Could not parse date/time: '{date_str}' '{time_val}'")

            try:
                systolic  = int(record.get("systolic", 0)) or None
                diastolic = int(record.get("diastolic", 0)) or None
                delta     = int(record.get("delta", 0)) or None
                heart_rate = int(record.get("pulse", 0)) or None
            except (ValueError, TypeError):
                continue

            # Validate delta if both values present
            if systolic and diastolic and delta:
                expected_delta = systolic - diastolic
                if abs(expected_delta - delta) > 1:
                    log.warning(
                        f"  Delta mismatch on {date_str}: "
                        f"SBP={systolic} DBP={diastolic} "
                        f"recorded_delta={delta} expected={expected_delta}"
                    )

            pulse_pressure = (systolic - diastolic) if (systolic and diastolic) else delta

            all_rows.append({
                "timestamp":        ts,
                "date":             date_str,
                "time":             time_val,
                "systolic":         systolic,
                "diastolic":        diastolic,
                "pulse_pressure":   pulse_pressure,
                "heart_rate":       heart_rate,
                "measurement_type": "manual",
                "device":           "omron",
                "source_file":      f"BloodPresure_Results_Omron ({sheet_name})",
                "month_label":      None,
                "time_missing":     False,
            })

    df = pd.DataFrame(all_rows)
    log.info(f"  ✓ Omron: {len(df)} readings across {len(sheet_names)} sheets")
    return df


# ── Merge & output ────────────────────────────────────────────────────────────

def validate_and_report(df: pd.DataFrame):
    """Print a quick quality summary."""
    print("\n" + "═" * 60)
    print("  DigitalMe BP — Ingestion Summary")
    print("═" * 60)
    print(f"  Total readings     : {len(df):,}")
    print(f"  Date range         : {df['timestamp'].min()} → {df['timestamp'].max()}")
    print()

    by_device = df.groupby("device").size()
    print("  By device:")
    for device, count in by_device.items():
        print(f"    {device:<10} {count:>6,} readings")

    by_type = df.groupby("measurement_type").size()
    print("\n  By measurement type:")
    for mtype, count in by_type.items():
        print(f"    {mtype:<15} {count:>6,} readings")

    missing_time = df["time_missing"].sum()
    if missing_time:
        print(f"\n  ⚠  Readings with missing time (00:00): {missing_time}")
        print("     Cross-check these against source PDFs.")

    dupes = df.duplicated(subset=["timestamp", "device"]).sum()
    if dupes:
        print(f"\n  ⚠  Duplicate (timestamp, device) pairs: {dupes}")

    # Basic range checks
    suspicious = df[
        (df["systolic"] < 70)  | (df["systolic"] > 250) |
        (df["diastolic"] < 40) | (df["diastolic"] > 160)
    ]
    if not suspicious.empty:
        print(f"\n  ⚠  Suspicious readings (out of physiological range): {len(suspicious)}")
        print(suspicious[["timestamp", "device", "systolic", "diastolic"]].to_string(index=False))

    print("═" * 60 + "\n")


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Auth
    drive, sheets = get_google_services()
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Ingest
    hilo_readings, hilo_summaries = ingest_hilo_pdfs(drive, client)
    omron_readings = ingest_omron_sheet(sheets)

    # Merge all readings
    all_readings = pd.concat([hilo_readings, omron_readings], ignore_index=True)
    all_readings = all_readings.sort_values("timestamp").reset_index(drop=True)

    # Output
    readings_path  = OUTPUT_DIR / "bp_readings.parquet"
    summaries_path = OUTPUT_DIR / "bp_monthly_summary.parquet"

    all_readings.to_parquet(readings_path, index=False)
    log.info(f"Saved {len(all_readings):,} readings → {readings_path}")

    if not hilo_summaries.empty:
        hilo_summaries.to_parquet(summaries_path, index=False)
        log.info(f"Saved {len(hilo_summaries)} monthly summaries → {summaries_path}")

    validate_and_report(all_readings)

    # Also write a CSV for quick inspection
    csv_path = OUTPUT_DIR / "bp_readings.csv"
    all_readings.to_csv(csv_path, index=False)
    log.info(f"CSV copy → {csv_path}")


if __name__ == "__main__":
    main()
