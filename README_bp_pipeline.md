# DigitalMe — BP Ingestion Pipeline

## Files

| File | Purpose |
|------|---------|
| `digitalme_bp_ingest.py` | Full backfill — extracts all Hilo PDFs + Omron sheet |
| `digitalme_bp_watch.py` | Incremental watcher — run on schedule, picks up new PDFs only |

## Setup

### 1. Install dependencies
```bash
pip install anthropic google-auth google-auth-httplib2 \
            google-api-python-client pandas pyarrow
```

### 2. Anthropic API key
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Google OAuth credentials
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create a project → Enable **Google Drive API** and **Google Sheets API**
- Create OAuth 2.0 credentials (Desktop app type)
- Download as `credentials.json` and place in same directory as the scripts
- First run will open a browser for authorisation; token saved to `token.json`

## Running

### One-time full backfill
```bash
python digitalme_bp_ingest.py
```

Outputs to `./digitalme_data/`:
- `bp_readings.parquet` — all individual readings, unified schema
- `bp_monthly_summary.parquet` — Hilo monthly stats (daytime/nighttime/all)
- `bp_readings.csv` — CSV copy for quick inspection

### Ongoing automation (daily)
```bash
python digitalme_bp_watch.py
```

Add to cron for daily automation:
```
0 7 * * * cd /path/to/digitalme && python digitalme_bp_watch.py >> watch.log 2>&1
```

The watcher maintains `processed_files.json` to track which PDFs have already
been extracted — it will never re-process a file.

## Output schema

| Column | Type | Notes |
|--------|------|-------|
| `timestamp` | datetime | Combined date + time, UTC assumed |
| `date` | str | ISO 8601 date string |
| `time` | str | HH:MM (24h) |
| `systolic` | int | mmHg |
| `diastolic` | int | mmHg |
| `pulse_pressure` | int | systolic − diastolic |
| `heart_rate` | int | bpm |
| `measurement_type` | str | `wearable` / `manual` / `calibration` / `cuff` / `on_demand` |
| `device` | str | `hilo` / `omron` |
| `source_file` | str | Originating file name |
| `month_label` | str | e.g. "March 2026" (Hilo only) |
| `time_missing` | bool | True if time defaulted to 00:00 — needs manual review |

## Quality flags

The ingestion script validates:
- **Missing times** — flags any Hilo reading where time defaulted to `00:00`
- **Delta consistency** — warns if Omron spreadsheet delta ≠ systolic − diastolic
- **Physiological range** — flags readings outside 70–250 systolic / 40–160 diastolic
- **Duplicates** — carry-over readings appearing in two consecutive PDFs are deduplicated
