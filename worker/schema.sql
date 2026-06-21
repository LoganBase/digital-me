-- SQL Schema for DigitalMe D1 Database

-- Garmin Telemetry (Unified date primary key)
CREATE TABLE IF NOT EXISTS garmin_telemetry (
    date TEXT PRIMARY KEY,                 -- YYYY-MM-DD
    weekly_hrv_avg REAL,
    last_night_hrv_avg REAL,
    hrv_baseline_low REAL,
    hrv_baseline_high REAL,
    sleep_score INTEGER,
    deep_sleep_seconds INTEGER,
    light_sleep_seconds INTEGER,
    rem_sleep_seconds INTEGER,
    awake_seconds INTEGER
);

-- Withings Body Composition (Unified date primary key)
CREATE TABLE IF NOT EXISTS withings_telemetry (
    date TEXT PRIMARY KEY,                 -- YYYY-MM-DD
    weight_kg REAL,
    visceral_fat_rating REAL,
    muscle_mass_pct REAL,
    extracellular_water_liters REAL,
    vascular_age REAL,
    eda_nerve_score REAL
);

-- Hilo Blood Pressure readings (1-to-many relationship linked by date)
CREATE TABLE IF NOT EXISTS hilo_bp (
    id TEXT PRIMARY KEY,                   -- Unique UUID for each reading
    date TEXT NOT NULL,                    -- YYYY-MM-DD link to biometrics
    timestamp TEXT NOT NULL,               -- ISO 8601 full timestamp
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    pulse INTEGER NOT NULL
);

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_hilo_bp_date ON hilo_bp(date);
CREATE INDEX IF NOT EXISTS idx_hilo_bp_timestamp ON hilo_bp(timestamp);
