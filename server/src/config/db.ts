import Database, { type Database as DB } from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { env } from './env.js'

const dbDir = path.dirname(path.resolve(env.DB_PATH))
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

export const db: DB = new Database(path.resolve(env.DB_PATH))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')

export function applyMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      password_hash TEXT,
      role        TEXT NOT NULL DEFAULT 'EXECUTIVE',
      mfa_secret  TEXT,
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      oauth_provider TEXT,
      oauth_id    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      user_agent  TEXT,
      ip          TEXT,
      expires_at  TEXT NOT NULL,
      revoked     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id),
      action      TEXT NOT NULL,
      resource    TEXT,
      details     TEXT,
      ip          TEXT,
      user_agent  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

    -- ── INGEST-02: Data ingestion tables ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS vulnerabilities (
      id            TEXT PRIMARY KEY,
      source        TEXT NOT NULL,           -- tenable | qualys | crowdstrike | manual
      external_id   TEXT,
      cve_id        TEXT,
      title         TEXT NOT NULL,
      severity      TEXT NOT NULL,           -- critical | high | medium | low | informational
      cvss_score    REAL,
      asset_id      TEXT,
      asset_name    TEXT,
      status        TEXT NOT NULL DEFAULT 'open',   -- open | in_progress | resolved | accepted_risk
      sla_due_at    TEXT,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at   TEXT,
      raw_data      TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id            TEXT PRIMARY KEY,
      source        TEXT NOT NULL,           -- splunk | qradar | sentinel | crowdstrike
      event_type    TEXT NOT NULL,
      severity      TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT,
      asset_id      TEXT,
      asset_name    TEXT,
      mitre_tactic  TEXT,
      mitre_technique TEXT,
      status        TEXT NOT NULL DEFAULT 'new',
      occurred_at   TEXT NOT NULL,
      ingested_at   TEXT NOT NULL DEFAULT (datetime('now')),
      raw_data      TEXT
    );

    CREATE TABLE IF NOT EXISTS compliance_findings (
      id            TEXT PRIMARY KEY,
      framework     TEXT NOT NULL,           -- NIST_CSF | PCI_DSS | SOC2 | ISO_27001
      control_id    TEXT NOT NULL,
      control_name  TEXT NOT NULL,
      status        TEXT NOT NULL,           -- compliant | partial | non_compliant | not_applicable
      score         REAL,
      evidence      TEXT,
      finding       TEXT,
      asset_id      TEXT,
      source        TEXT,
      assessed_at   TEXT NOT NULL DEFAULT (datetime('now')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS integration_configs (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL UNIQUE,
      type          TEXT NOT NULL,           -- siem | vuln_scanner | edr | ticketing
      enabled       INTEGER NOT NULL DEFAULT 1,
      config        TEXT NOT NULL DEFAULT '{}',
      last_sync_at  TEXT,
      last_error    TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_vulns_severity ON vulnerabilities(severity);
    CREATE INDEX IF NOT EXISTS idx_vulns_status ON vulnerabilities(status);
    CREATE INDEX IF NOT EXISTS idx_vulns_source ON vulnerabilities(source);
    CREATE INDEX IF NOT EXISTS idx_events_source ON security_events(source);
    CREATE INDEX IF NOT EXISTS idx_events_occurred ON security_events(occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_compliance_framework ON compliance_findings(framework);
  `)

  // Add source column if it doesn't exist yet (safe to run multiple times)
  try { db.exec(`ALTER TABLE integration_configs ADD COLUMN source TEXT`) } catch {}

  console.log('✅ DB migrations applied')
}
