# CISO Command Center — Complete Project Documentation

**Version:** 2.0  
**Date:** May 21, 2026  
**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Node.js · Python FastAPI

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Frontend — Dashboard (Sprints 1–4)](#4-frontend--dashboard)
5. [Backend Phase 1 — Authentication (AUTH-01)](#5-backend-phase-1--authentication)
6. [Backend Phase 2 — Data Ingestion (INGEST-02)](#6-backend-phase-2--data-ingestion)
7. [Backend Phase 3 — Risk Engine (RISK-03)](#7-backend-phase-3--risk-engine)
8. [Backend Phase 4 — Compliance & Reporting (AI-REP-04)](#8-backend-phase-4--compliance--reporting)
9. [API Reference](#9-api-reference)
10. [Database Schema](#10-database-schema)
11. [Security Design](#11-security-design)
12. [File Structure](#12-file-structure)
13. [Setup & Deployment](#13-setup--deployment)

---

## 1. Project Overview

The **CISO Command Center** is a production-grade security operations dashboard built for Chief Information Security Officers and their teams in financial institutions. It provides real-time visibility into:

- Security posture scoring
- Vulnerability lifecycle management
- FAIR financial risk quantification (Monte Carlo)
- Compliance tracking (NIST CSF 2.0, ISO 27001:2022, PCI-DSS v4.0, SOC 2)
- Threat detection and incident management
- AppSec and software supply chain security
- AI-generated executive briefings

### Target Users

| Role | Access Level | Primary Use |
|---|---|---|
| CISO | Full access | All dashboards, approvals, user management |
| SOC Analyst | Operational | Threat command, vulnerability management |
| Auditor | Read + assess | Compliance, reports, audit workflows |
| Executive | Read-only | Scorecard, AI briefing, risk reports |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Port 5173)                   │
│              React 19 SPA — CISO Dashboard               │
│   8 pages · RBAC · Recharts · Tailwind CSS v4            │
└──────────────────────┬──────────────────────────────────┘
                       │ REST / JSON
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js Express API  (Port 4000)            │
│   Auth · Ingestion · Risk Proxy · Compliance · Audit     │
│   SQLite (dev) · BullMQ · Passport · JWT · argon2        │
└───────────┬─────────────────────────┬───────────────────┘
            │                         │
            ▼                         ▼
┌───────────────────┐     ┌──────────────────────────────┐
│   Redis (6379)    │     │  Python FastAPI  (Port 5001)  │
│  Token blacklist  │     │  FAIR Monte Carlo Engine      │
│  BullMQ queues    │     │  Claude Sonnet 4.6 + Ollama   │
│  MFA challenges   │     │  100k simulation trials       │
└───────────────────┘     └──────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│  External Integrations (webhook / polling)               │
│  Tenable · Qualys · CrowdStrike · QRadar · Sentinel      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.2 |
| Language | TypeScript | 6.0 |
| Build tool | Vite | 8.0 |
| Styling | Tailwind CSS v4 (CSS-first) | 4.3 |
| Charts | Recharts | 3.8 |
| Icons | Lucide React | 1.16 |
| Routing | React Router v7 | 7.15 |

### Backend (Node.js)
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 24 |
| Framework | Express | 5.1 |
| Language | TypeScript | 6.0 |
| Database | SQLite (better-sqlite3) | 11.10 |
| Cache / Queue broker | Redis (ioredis) | 5.6 |
| Job queue | BullMQ | latest |
| Password hashing | argon2 | 0.41 |
| JWT | jsonwebtoken | 9.0 |
| TOTP / MFA | otplib | 12.0 |
| SSO | passport + passport-oauth2 | 0.7 / 1.8 |
| Validation | Zod | 3.25 |
| HTTP polling | axios | latest |
| Scheduler | node-cron | latest |
| Security headers | helmet | 8.1 |

### Risk Engine (Python)
| Layer | Technology | Version |
|---|---|---|
| Runtime | Python | 3.13 |
| Framework | FastAPI | 0.115 |
| Server | Uvicorn | 0.34 |
| Validation | Pydantic v2 | 2.11 |
| Math | NumPy | 2.2 |
| AI (primary) | Anthropic SDK → Claude Sonnet 4.6 | 0.54 |
| AI (fallback) | Ollama HTTP → llama3.2 | — |

---

## 4. Frontend — Dashboard

### Pages (8 total)

| Page | Route | Description |
|---|---|---|
| Login | `/login` | RBAC login with demo credentials |
| CISO Dashboard | `/` | Main dashboard with all 5 sections |
| Threat Intelligence | `/threat-intel` | Threat feeds and IOC analysis |
| Reports | `/reports` | Audit reports with sign-off workflow |
| Integrations | `/integrations` | Tool health and configuration |
| Settings | `/settings` | User preferences and system config |
| Incident Response | `/incidents` | IR playbooks and active incidents |
| Executive View | `/executive` | Board-level summary |

All pages use `React.lazy()` + `Suspense` for code splitting.

---

### Section A — Executive Risk & Compliance Scorecard

**Component:** `src/components/sections/ExecutiveScorecard/index.tsx`

**Panels:**
- **Security Posture Score** — Composite gauge (0–100) combining compliance, SLA adherence, and CVE exposure. Sparklines for open vulnerabilities and SLA breaches.
- **FAIR Financial Risk Exposure** — Annualized Loss Expectancy ($4.2M displayed). Monte Carlo ComposedChart showing 8 loss buckets ($0–$20M+) with P10/P50/P90 reference lines.
- **Compliance Radar Chart** — Multi-framework overlay (NIST CSF / SOC 2 / PCI-DSS / ISO 27001) across 6 domains. Empty state with Shield icon when no data.
- **NIST CSF 2.0 Maturity Heatmap** — 6×5 CSS grid mapping all 6 NIST functions against 5 maturity levels (Initial → Optimizing). Color-coded by score: green ≥70, amber 50–69, red <50. Cells are clickable → drill-down panel.
- **ALE Trend Chart** — 12-month area chart showing ALE declining from $5.8M → $4.2M.

---

### Section B — Threat Command Center

**Component:** `src/components/sections/ThreatCommand/index.tsx`

**Panels:**
- Active threat feed with MITRE ATT&CK tactic tags
- SOC metrics: MTTD (42 min), MTTR, P1 incident count
- Threat actor heatmap
- IOC tracker with source attribution

---

### Section C — Vulnerability & Exposure Management

**Component:** `src/components/sections/VulnManagement/index.tsx`

**Panels:**
- **Top row KPI cards** — Open vulns (11,647), SLA-breached (908), exploitable, critical asset exposure
- **Severity distribution** — Stacked bar + donut
- **Asset tier vs severity matrix** — T0/T1/T2/T3 × Critical/High/Medium/Low stacked bar chart
- **Vulnerability table** — Filterable by severity, sortable, with SLA badge indicators
- **SLA compliance gauge** — RadialBarChart showing % within SLA per severity tier

---

### Section D — AppSec & Supply Chain Security

**Component:** `src/components/sections/AppSecSupplyChain/index.tsx`

**Panels:**
- **SBOM Coverage Gauge** — RadialBarChart semi-circle showing 67% coverage (4 of 6 repos). Lists repos with hasSbom/components/verified counts.
- **Vendor Remediation Tracker** — 6 vendor findings with severity badges, due dates, overdue/in-progress status indicators.
- **Dependency vulnerability donut** — PieChart of open dependency alerts by severity. Empty state with Package icon when clear.
- **Vendor risk table** — Tier/criticality/last assessment columns.
- **Bug bounty panel** — Open reports with severity and payout status.
- **Pipeline security** — SAST/DAST/SCA pass rates.

---

### Section E — AI Executive Briefing

**Component:** `src/components/sections/AIBriefing/index.tsx`

**States:**
1. **Idle** — Empty state with Sparkles icon and "Generate Briefing" button
2. **Generating** — 1.5-second shimmer animation with "Analyzing security posture…" label
3. **Generated** — 4-panel 2×2 briefing grid:

| Panel | Color | Content |
|---|---|---|
| Risk Posture Summary | Indigo | Score, ALE trend, SLA breach count, P90 tail risk |
| Critical Issues | Red | PCI-DSS gap, IR playbook staleness, vendor escalation, SBOM gaps |
| Positive Trends | Green | CVE reduction, MTTD vs benchmark, SBOM progress |
| Board Actions | Amber | Budget request, QSA engagement, insurance review, headcount |

Powered by Claude Sonnet 4.6 label. Regenerate button. Timestamp display. Freshness badge.

---

### Reports Page

**File:** `src/pages/Reports.tsx`

**Tabs:** Executive Summary · Vulnerability Report · Compliance Status · Audit Report · Threat Report

**Features added:**
- **ISO 27001:2022 Framework Crosswalk table** — 13 rows mapping NIST CSF function → ISO 27001:2022 control → PCI-DSS requirement → SOC 2 TSC. Status badges: compliant (green) / partial (amber) / gap (red).
- **Audit Sign-off Workflow** — 4-stage pipeline stepper:
  - `DRAFT` → `UNDER REVIEW` → `CISO APPROVED` → `BOARD APPROVED`
  - Current stage detail card with actor name and timestamp
  - Confirm dialog before advancing
  - Revert button to go back one stage
  - Audit trail log showing all transitions with timestamps
  - Persisted to `localStorage('ciso_audit_workflow')`
- **Print/PDF layout** — `@media print` block with A4 sizing, targeted color overrides (only slate text classes, not chart colors), `thead { display: table-header-group }` for multi-page tables, `tr { page-break-inside: avoid }`, print-only CONFIDENTIAL document header.

---

### Integrations Page

**File:** `src/pages/Integrations.tsx`

**Features added:**
- **Integration Health Log component** — Shows last 3 errors across configured integrations. Each row: integration name + error code badge + retry count + timestamp. Retry button with state machine: idle → retrying (2s spinner) → failed. Injected between Health Summary Banner and Category sections.

---

### Notification Center

**File:** `src/components/ui/NotificationCenter.tsx`

- 380px right slide-out panel with backdrop overlay and CSS `translateX` transition
- 7 pre-seeded notifications: 3 unread (critical CVE, SLA breach, P1 incident)
- Notification types: `critical_cve | sla_breach | incident | compliance_drift | system`
- Features: mark individual read (click row), dismiss (×), mark all read, BellOff empty state
- State lifted to `CISODashboard` so bell badge count stays live across the header

---

### Loading Skeletons

**File:** `src/components/ui/SectionSkeleton.tsx`

All 5 section components show a shimmer skeleton for 500–850ms on first load:

| Section | Delay | Accent Color |
|---|---|---|
| ExecutiveScorecard | 500ms | Indigo (#6366f1) |
| AIBriefing | 550ms | Cyan (#06b6d4) |
| AppSecSupplyChain | 600ms | Emerald (#10b981) |
| ThreatCommand | 700ms | Red (#ef4444) |
| VulnManagement | 850ms | Purple (#8b5cf6) |

Props: `accent` (color), `cols` (grid columns), `hasTopRow` (4-card metrics row).  
Uses inline `style={{ gridTemplateColumns }}` to avoid Tailwind v4 dynamic class detection issues.

---

## 5. Backend Phase 1 — Authentication

**Directory:** `server/src/`  
**Port:** 4000

### What was built

#### JWT Token System (`services/token.service.ts`)
- **Access tokens** — 15-minute TTL, signed with `JWT_ACCESS_SECRET`, carry `{ sub, email, role, jti, mfa_verified }`
- **Refresh tokens** — 7-day TTL, stored as SHA-256 hash in SQLite `refresh_tokens` table, rotated on every use (refresh token rotation)
- **Token blacklisting** — On logout, the access token's `jti` is written to Redis with TTL equal to remaining token lifetime. Every protected request checks the blacklist.
- **Partial tokens** — When MFA is required, a short-lived token with `mfa_verified: false` is issued. The `requireAuth` middleware rejects these with a `403 MFA_REQUIRED` code.

#### TOTP MFA (`services/mfa.service.ts`)
- Secret generation using `otplib.authenticator.generateSecret()`
- QR code PNG (base64) generated via `qrcode` package
- Setup flow: `POST /api/auth/mfa/setup` → returns QR + secret → user scans → `POST /api/auth/mfa/confirm` with TOTP code → secret stored in DB, MFA enabled
- Login flow: password verified → `setMfaPending(userId)` in Redis (5-min window) → partial token issued → `POST /api/auth/mfa/verify` with TOTP code → full tokens issued
- TOTP window: ±1 period (30 seconds tolerance)

#### Password Hashing
- argon2id algorithm via the `argon2` package
- No raw passwords stored anywhere

#### OAuth2 SSO (`config/passport.ts`, `routes/oauth.routes.ts`)
- passport-oauth2 strategy activated when `OAUTH2_CLIENT_ID` + `OAUTH2_CLIENT_SECRET` + URLs are set in `.env`
- Auto-provisions user on first OAuth login
- SAML support documented — install `passport-saml` separately when enterprise SSO cert is available

#### RBAC (`middleware/auth.middleware.ts`)
- `requireAuth` middleware — validates JWT, checks blacklist, enforces `mfa_verified: true`
- `requireRole(...roles)` middleware — checks `req.user.role` against allowed roles
- Four roles: `CISO` · `SOC_ANALYST` · `AUDITOR` · `EXECUTIVE`

#### Rate Limiting (`middleware/rateLimit.middleware.ts`)
- Login: 10 attempts / 15 minutes per IP
- MFA verify: 10 attempts / 5 minutes
- General API: 200 requests / minute

#### Audit Log (`services/audit.service.ts`)
- Every auth event (register, login, MFA enable/disable, logout, failed login) written to `audit_log` table
- Fields: `user_id`, `action`, `resource`, `details` (JSON), `ip`, `user_agent`, `created_at`

### Auth API endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns JWT or MFA challenge |
| POST | `/api/auth/mfa/verify` | Partial token | Complete TOTP verification |
| POST | `/api/auth/mfa/setup` | Bearer | Generate TOTP QR code |
| POST | `/api/auth/mfa/confirm` | Bearer | Enable TOTP with first valid code |
| DELETE | `/api/auth/mfa` | Bearer | Disable TOTP |
| POST | `/api/auth/refresh` | None (refresh token in body) | Rotate token pair |
| POST | `/api/auth/logout` | Bearer | Blacklist access token |
| GET | `/api/auth/me` | Bearer | Current user profile |
| GET | `/api/auth/oauth` | None | Start OAuth2 flow |
| GET | `/api/auth/oauth/callback` | None | OAuth2 callback |

---

## 6. Backend Phase 2 — Data Ingestion

**Directory:** `server/src/routes/ingest/`, `server/src/workers/`, `server/src/jobs/`

### What was built

#### Webhook Endpoints (`routes/ingest/webhook.routes.ts`)
Five webhook receivers, each queuing jobs into BullMQ for async processing:

| Endpoint | Source | Signature Verification |
|---|---|---|
| `POST /api/webhooks/tenable` | Tenable.io | HMAC-SHA256 via `X-Tenable-Signature` |
| `POST /api/webhooks/qualys` | Qualys VMDR | None (IP allowlist recommended) |
| `POST /api/webhooks/crowdstrike` | CrowdStrike Falcon | HMAC-SHA256 via `X-CS-Signature` |
| `POST /api/webhooks/qradar` | IBM QRadar | None |
| `POST /api/webhooks/sentinel` | Microsoft Sentinel | None |

All return `202 Accepted` immediately — processing is async.

#### BullMQ Ingest Worker (`workers/ingest.worker.ts`)
- Concurrency: 5 parallel jobs
- Retry: 3 attempts with exponential backoff (2s base)
- Routes job to correct normalizer based on `source` field
- Normalizers translate vendor-specific schemas to unified `vulnerabilities` / `security_events` tables

#### Data Normalizers (`services/ingest.service.ts`)

| Normalizer | Input | Maps to |
|---|---|---|
| `normalizeTenableVuln` | Tenable plugin JSON | `vulnerabilities` table |
| `normalizeQualysVuln` | Qualys detection JSON | `vulnerabilities` table |
| `normalizeCrowdStrikeAlert` | CS detection summary | `security_events` table |
| `normalizeQRadarEvent` | QRadar offense | `security_events` table |

**Severity mapping:**
- Tenable: plugin severity 4 → critical, 3 → high, 2 → medium, 1 → low
- Qualys: QID severity 5 → critical, 4 → high, 3 → medium, 2 → low
- QRadar: magnitude 8+ → critical, 6–7 → high, 4–5 → medium, <4 → low

#### SLA Engine
Auto-computed due dates per severity on every ingested vulnerability:

| Severity | SLA (days) |
|---|---|
| Critical | 15 |
| High | 30 |
| Medium | 90 |
| Low | 180 |
| Informational | 365 |

#### Pollers (`jobs/poller.ts`)
Cron schedule: every 15 minutes. Polls all enabled integrations:
- **Tenable.io** — `GET /workbenches/vulnerabilities` with API key auth
- **Qualys** — `POST /api/2.0/fo/asset/host/vm/detection/` with basic auth
- **CrowdStrike** — OAuth2 token → detection IDs → enriched summaries

Each poll records `last_sync_at` on success or `last_error` on failure.

---

## 7. Backend Phase 3 — Risk Engine

**Directory:** `risk-engine/`  
**Port:** 5001  
**Language:** Python 3.13

### What was built

#### FAIR Monte Carlo Engine (`app/services/fair_engine.py`)

Implements the **OpenFAIR** methodology using **PERT (Beta-PERT) distributions** for all three-point estimates.

**Model formula:**
```
Annual Loss Expectancy = LEF × Loss Magnitude

Where:
  LEF  = TEF × Vulnerability
  TEF  = Threat Event Frequency  (events/year)
  Vuln = P(compromise | contact)  (0.0–1.0)
  Loss = Primary Loss + Secondary Loss  (USD)

All inputs are PERT-distributed three-point estimates:
  (minimum, most_likely, maximum)
```

**PERT distribution** uses beta distribution parameterised as:
```
α = 1 + λ × (mode − min) / (max − min)
β = 1 + λ × (max − mode) / (max − min)
λ = 4  (standard PERT shape parameter)
```

**Output per simulation:**
- ALE (mean annual loss)
- Standard deviation
- P10, P25, P50, P75, P90, P95, P99 percentiles
- 20-bucket probability histogram
- Min / Max

Default: **100,000 trials** per scenario.

#### AI Analysis Service (`app/services/ai_service.py`)

**Primary: Claude Sonnet 4.6**
- Sends simulation results as structured prompt
- Receives JSON: `headline`, `risk_rating`, `key_findings`, `recommended_actions`, `insurance_note`, `confidence`
- Model: `claude-sonnet-4-6`

**Fallback 1: Ollama (local)**
- Hits `POST /api/generate` on local Ollama instance
- Model: `llama3.2` (configurable)
- Uses `format: "json"` for structured output

**Fallback 2: Deterministic**
- No API calls
- Derives risk rating from ALE thresholds (>$5M = CRITICAL, >$1M = HIGH, etc.)
- Always returns a valid analysis object

#### Risk Presets
5 pre-built banking/fintech risk scenarios:
1. Ransomware Attack on Core Banking
2. Third-Party SaaS Data Breach
3. API Credential Exposure
4. Insider Threat — Privileged Access Abuse
5. DDoS on Payment Processing

#### Node.js Risk Proxy (`server/src/routes/risk.routes.ts`)
The frontend calls the Node.js backend, which proxies to the Python engine. This avoids CORS issues and allows the Node.js layer to apply auth before forwarding.

---

## 8. Backend Phase 4 — Compliance & Reporting

**Directory:** `server/src/services/compliance/`, `server/src/routes/compliance/`

### What was built

#### NIST CSF 2.0 Maturity Engine (`services/compliance/nist.service.ts`)

Full implementation of all **6 functions** and their subcategories from NIST CSF 2.0:

| Function | Subcategories | Focus |
|---|---|---|
| GOVERN (GV) | 30 subcategories | Org context, risk management, roles, policy, oversight, supply chain |
| IDENTIFY (ID) | 21 subcategories | Asset management, risk assessment, improvement |
| PROTECT (PR) | 22 subcategories | Identity/access, training, data security, platform security, IR |
| DETECT (DE) | 11 subcategories | Adverse event analysis, continuous monitoring |
| RESPOND (RS) | 13 subcategories | Incident management, analysis, communication, mitigation |
| RECOVER (RC) | 8 subcategories | Recovery planning, communication |

**Maturity scoring:**
- Each control assessed with status (`compliant / partial / non_compliant / not_applicable`) and score (0–100)
- Function maturity level (1–5) derived as: `round(average_score / 20)`
- Gap report returns all non-compliant controls sorted by score ascending

#### ISO 27001:2022 Annex A (`services/compliance/iso27001.service.ts`)

All **93 controls** across 4 domains:

| Domain | Controls |
|---|---|
| A.5 Organizational | 37 controls |
| A.6 People | 8 controls |
| A.7 Physical | 14 controls |
| A.8 Technological | 34 controls |

Domain-level and overall compliance scores calculated from most-recent assessment per control.

#### NIST ↔ ISO 27001 Crosswalk
13 mapped control pairs covering the key security domains, each entry includes:
- NIST CSF function + subcategory ID
- ISO 27001:2022 control IDs (can be multiple)
- Equivalent PCI-DSS v4.0 requirement
- Equivalent SOC 2 TSC criterion

#### Audit Sign-off Workflow (`services/compliance/auditWorkflow.service.ts`)

4-stage pipeline with role-gated approvals:

```
DRAFT ──► UNDER REVIEW ──► CISO APPROVED ──► BOARD APPROVED
  (any)      (any)            (CISO only)    (CISO or EXECUTIVE)
```

**Features:**
- Every stage transition recorded in `workflow_transitions` table
- Revert to previous stage (CISO only)
- Full audit trail with actor ID, timestamp, optional comment
- Every transition also written to the main `audit_log`

---

## 9. API Reference

### Base URL
```
http://localhost:4000
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Auth Endpoints

```
POST   /api/auth/register          → 201 { user }
POST   /api/auth/login             → 200 { access_token, refresh_token, user }
                                      200 { mfa_required: true, partial_token }
POST   /api/auth/mfa/verify        → 200 { access_token, refresh_token, user }
POST   /api/auth/mfa/setup         → 200 { qr_code, secret }
POST   /api/auth/mfa/confirm       → 200 { message }
DELETE /api/auth/mfa               → 200 { message }
POST   /api/auth/refresh           → 200 { access_token, refresh_token }
POST   /api/auth/logout            → 200 { message }
GET    /api/auth/me                → 200 { id, email, name, role, mfa_enabled }
```

### User Management

```
GET    /api/users                  → 200 [users]          (CISO only)
GET    /api/users/:id              → 200 { user }          (own or CISO)
GET    /api/users/:id/audit        → 200 [entries]         (CISO only)
```

### Audit Log

```
GET    /api/audit?limit=100&offset=0 → 200 { entries, limit, offset }  (CISO/AUDITOR)
```

### Data Ingestion

```
POST   /api/webhooks/tenable       → 202 { queued: true }
POST   /api/webhooks/qualys        → 202 { queued: true }
POST   /api/webhooks/crowdstrike   → 202 { queued: true }
POST   /api/webhooks/qradar        → 202 { queued: true }
POST   /api/webhooks/sentinel      → 202 { queued: true }

GET    /api/data/vulnerabilities   → 200 { data, limit, offset }
GET    /api/data/vulnerabilities/stats → 200 { total, critical, high, medium, low, open, sla_breached }
PATCH  /api/data/vulnerabilities/:id   → 200 { updated: true }

GET    /api/data/events            → 200 { data, limit, offset }
GET    /api/data/integrations      → 200 [configs]         (CISO only)
POST   /api/data/integrations      → 201 { id }            (CISO only)
PATCH  /api/data/integrations/:id  → 200 { updated: true } (CISO only)
```

### Risk Engine (proxied)

```
POST   /api/risk/simulate          → 200 FAIRResult
POST   /api/risk/simulate/batch    → 200 [FAIRResult]      (CISO/AUDITOR)
POST   /api/risk/analyse           → 200 { simulation, analysis }
GET    /api/risk/presets           → 200 [presets]
```

**FAIRInput schema:**
```json
{
  "scenario_name": "string",
  "tef_min": 0.1, "tef_most_likely": 0.5, "tef_max": 2.0,
  "vuln_min": 0.05, "vuln_most_likely": 0.2, "vuln_max": 0.5,
  "plm_min": 500000, "plm_most_likely": 2000000, "plm_max": 8000000,
  "slm_min": 0, "slm_most_likely": 0, "slm_max": 0,
  "simulations": 100000
}
```

### Compliance

```
GET    /api/compliance/nist/functions     → 200 { GOVERN, IDENTIFY, ... }
GET    /api/compliance/nist/maturity      → 200 { GOVERN: { score, level, controls, compliant }, ... }
GET    /api/compliance/nist/gaps          → 200 [{ function, subcategory, status, score, finding }]
POST   /api/compliance/nist/controls      → 201 { updated: true }   (CISO/AUDITOR)
POST   /api/compliance/nist/controls/bulk → 201 { updated: N }       (CISO/AUDITOR)

GET    /api/compliance/iso27001/controls  → 200 { A.5: {...}, A.6: {...}, ... }
GET    /api/compliance/iso27001/crosswalk → 200 [crosswalk entries]
GET    /api/compliance/iso27001/score     → 200 { overall, byDomain }
POST   /api/compliance/iso27001/controls  → 201 { updated: true }

GET    /api/compliance/workflows          → 200 [workflows]
POST   /api/compliance/workflows          → 201 { workflow }
GET    /api/compliance/workflows/:id      → 200 { workflow, history }
POST   /api/compliance/workflows/:id/advance → 200 { workflow }
POST   /api/compliance/workflows/:id/revert  → 200 { workflow }    (CISO only)
```

### Risk Engine Direct (Port 5001)

```
GET    /health
POST   /api/risk/simulate
POST   /api/risk/simulate/batch
POST   /api/risk/analyse
GET    /api/risk/presets
GET    /docs          (Swagger UI)
GET    /redoc         (ReDoc)
```

---

## 10. Database Schema

**Engine:** SQLite (WAL mode, foreign keys enabled)  
**Location:** `server/data/ciso.db`

### Auth tables

```sql
users (
  id, email, name, password_hash, role,
  mfa_secret, mfa_enabled,
  oauth_provider, oauth_id,
  created_at, updated_at
)

refresh_tokens (
  id, user_id → users,
  token_hash,            -- SHA-256 of raw token
  user_agent, ip,
  expires_at, revoked,
  created_at
)

audit_log (
  id, user_id → users,
  action, resource,
  details,               -- JSON blob
  ip, user_agent,
  created_at
)
```

### Ingestion tables

```sql
vulnerabilities (
  id, source, external_id, cve_id,
  title, severity, cvss_score,
  asset_id, asset_name,
  status,                -- open | in_progress | resolved | accepted_risk
  sla_due_at, discovered_at, resolved_at,
  raw_data,              -- JSON blob of original payload
  created_at, updated_at
)

security_events (
  id, source, event_type, severity,
  title, description,
  asset_id, asset_name,
  mitre_tactic, mitre_technique,
  status,
  occurred_at, ingested_at,
  raw_data
)

compliance_findings (
  id, framework,         -- NIST_CSF | PCI_DSS | SOC2 | ISO_27001
  control_id, control_name,
  status, score,
  evidence, finding,
  asset_id, source,
  assessed_at, created_at
)

integration_configs (
  id, name, type,        -- siem | vuln_scanner | edr | ticketing
  enabled,
  config,                -- JSON (API keys, URLs)
  last_sync_at, last_error,
  created_at, updated_at
)
```

### Workflow tables

```sql
audit_workflows (
  id, report_id, report_name,
  stage,                 -- DRAFT | UNDER_REVIEW | CISO_APPROVED | BOARD_APPROVED
  created_by,
  ciso_approved_by, ciso_approved_at,
  board_approved_by, board_approved_at,
  notes,
  created_at, updated_at
)

workflow_transitions (
  id, workflow_id → audit_workflows,
  from_stage, to_stage,
  actor_id, comment,
  created_at
)
```

---

## 11. Security Design

### Authentication flow

```
1. POST /login  →  verify argon2 password
2a. MFA disabled  →  issue full JWT pair immediately
2b. MFA enabled   →  issue partial_token (mfa_verified: false)
                  →  set Redis key mfa_pending:{userId}  TTL=5min
3. POST /mfa/verify  →  verify TOTP against stored secret
                     →  clear Redis mfa_pending key
                     →  issue full JWT pair
4. Each API call  →  verify JWT signature
                  →  check jti not in Redis blacklist
                  →  check mfa_verified == true
                  →  check role against route permission
```

### Token security properties

| Property | Implementation |
|---|---|
| Short-lived access tokens | 15-minute TTL |
| Refresh token rotation | Old token revoked on every use |
| Logout invalidation | JTI blacklisted in Redis until natural expiry |
| No tokens in localStorage | Tokens in memory (frontend) or httpOnly cookies (production) |
| Timing-safe comparison | HMAC webhook verification uses `crypto.timingSafeEqual` |
| Password storage | argon2id — memory-hard, resistant to GPU cracking |

### Input validation
- All request bodies validated with **Zod** schemas before any processing
- Path parameters cast with `String()` to prevent prototype pollution
- SQL queries use **parameterized statements** only (better-sqlite3 named params)

### Rate limiting
Prevents brute-force attacks on login and MFA endpoints at the Express layer (express-rate-limit).

---

## 12. File Structure

```
ciso-dashboard/
│
├── src/                               # React 19 frontend
│   ├── App.tsx                        # Routes + auth guard
│   ├── main.tsx
│   ├── index.css                      # Tailwind v4 + glass-card CSS
│   ├── components/
│   │   ├── atomic/                    # RiskGauge, MetricCard, TrendBadge
│   │   ├── sections/
│   │   │   ├── ExecutiveScorecard/    # Section A
│   │   │   ├── ThreatCommand/         # Section B
│   │   │   ├── VulnManagement/        # Section C
│   │   │   ├── AppSecSupplyChain/     # Section D
│   │   │   └── AIBriefing/           # Section E
│   │   └── ui/
│   │       ├── SectionSkeleton.tsx    # Shimmer loading state
│   │       ├── NotificationCenter.tsx # Slide-out panel
│   │       └── FreshnessBadge.tsx
│   ├── context/
│   │   ├── AuthContext.tsx            # Login state + RBAC
│   │   └── DrillDownContext.tsx       # Panel drill-down state
│   ├── data/
│   │   └── mockData.ts                # Frontend demo data
│   ├── hooks/
│   │   ├── useSecurityMetrics.ts
│   │   ├── useDataFreshness.ts
│   │   └── useFilteredVulnerabilities.ts
│   ├── pages/
│   │   ├── CISODashboard.tsx          # Main dashboard
│   │   ├── Login.tsx
│   │   ├── Reports.tsx                # Audit + ISO crosswalk + workflow
│   │   ├── Integrations.tsx           # Tool health + error log
│   │   ├── Settings.tsx
│   │   ├── ThreatIntelligence.tsx
│   │   ├── IncidentResponse.tsx
│   │   └── ExecutiveView.tsx
│   └── types/
│
├── server/                            # Node.js Express API
│   ├── src/
│   │   ├── index.ts                   # App entry point + boot
│   │   ├── config/
│   │   │   ├── env.ts                 # Zod-validated env vars
│   │   │   ├── db.ts                  # SQLite + migrations
│   │   │   ├── redis.ts               # ioredis client
│   │   │   ├── passport.ts            # OAuth2/SAML strategies
│   │   │   └── queues.ts              # BullMQ queue definitions
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # requireAuth + requireRole
│   │   │   └── rateLimit.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── oauth.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── audit.routes.ts
│   │   │   ├── risk.routes.ts         # Proxy to Python engine
│   │   │   ├── ingest/
│   │   │   │   ├── webhook.routes.ts
│   │   │   │   └── data.routes.ts
│   │   │   └── compliance/
│   │   │       ├── nist.routes.ts
│   │   │       ├── iso27001.routes.ts
│   │   │       └── workflow.routes.ts
│   │   ├── services/
│   │   │   ├── token.service.ts
│   │   │   ├── mfa.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── ingest.service.ts      # Normalizers + DB helpers
│   │   │   └── compliance/
│   │   │       ├── nist.service.ts
│   │   │       ├── iso27001.service.ts
│   │   │       └── auditWorkflow.service.ts
│   │   ├── workers/
│   │   │   └── ingest.worker.ts       # BullMQ consumer
│   │   ├── jobs/
│   │   │   └── poller.ts              # Cron polling jobs
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   └── express.d.ts
│   │   └── scripts/
│   │       └── seed.ts                # Demo users
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── risk-engine/                       # Python FastAPI
│   ├── app/
│   │   ├── main.py                    # FastAPI app + CORS
│   │   ├── config.py                  # pydantic-settings
│   │   ├── routers/
│   │   │   ├── fair.py                # /api/risk/* endpoints
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── fair_engine.py         # Monte Carlo simulation
│   │   │   └── ai_service.py          # Claude + Ollama
│   │   └── models/
│   │       └── fair.py                # Pydantic schemas
│   ├── main.py                        # Uvicorn entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml                 # All services + Redis
├── Dockerfile                         # Frontend nginx container
├── nginx.conf
├── BACKEND.md                         # Quick backend reference
└── DOCUMENTATION.md                   # This file
```

---

## 13. Setup & Deployment

### Development (manual)

**Prerequisites:** Node.js 24+, Python 3.13, Redis 7+

```bash
# 1. Frontend
npm install
npm run dev                    # http://localhost:5173

# 2. Backend
cd server
npm install
copy .env.example .env         # set JWT secrets
npm run db:seed                # create demo users
npm run dev                    # http://localhost:4000

# 3. Risk engine
cd risk-engine
py -3.13 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python main.py                 # http://localhost:5001

# 4. Redis
docker run -d -p 6379:6379 redis:7-alpine
```

### Docker (all services)

```bash
copy .env.example .env   # set JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
docker compose up -d
# Frontend  → http://localhost:8080
# API       → http://localhost:4000
# Risk      → http://localhost:5001
```

### Environment Variables

**`server/.env`**

| Variable | Required | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars, signs access tokens |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars, signs refresh tokens |
| `JWT_ACCESS_TTL` | No | Default: `15m` |
| `JWT_REFRESH_TTL` | No | Default: `7d` |
| `DB_PATH` | No | Default: `./data/ciso.db` |
| `REDIS_URL` | No | Default: `redis://localhost:6379` |
| `CORS_ORIGIN` | No | Default: `http://localhost:5173` |
| `RISK_ENGINE_URL` | No | Default: `http://localhost:5001` |
| `OAUTH2_CLIENT_ID` | No | Enables OAuth2 SSO when set |
| `OAUTH2_CLIENT_SECRET` | No | Required with CLIENT_ID |
| `TOTP_APP_NAME` | No | Default: `CISO Dashboard` |

**`risk-engine/.env`**

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Enables Claude AI analysis |
| `OLLAMA_BASE_URL` | No | Default: `http://localhost:11434` |
| `OLLAMA_MODEL` | No | Default: `llama3.2` |
| `FAIR_SIMULATIONS` | No | Default: `100000` |

### Demo Users

| Email | Password | Role |
|---|---|---|
| ciso@demo.local | CISOdemo@2026! | CISO |
| analyst@demo.local | SOCdemo@2026! | SOC_ANALYST |
| auditor@demo.local | AUDITdemo@2026! | AUDITOR |
| exec@demo.local | EXECdemo@2026! | EXECUTIVE |

---

*Document generated: May 21, 2026*  
*CISO Command Center v2.0 — Confidential*
