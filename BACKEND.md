# CISO Dashboard — Backend V2.0

## Architecture

```
ciso-dashboard/
├── src/                   # React 19 frontend
├── server/                # Node.js Express API  (PORT 4000)
│   └── src/
│       ├── config/        # DB, Redis, env, passport, queues
│       ├── middleware/    # Auth (JWT + RBAC), rate limiting
│       ├── models/        # TypeScript interfaces
│       ├── routes/        # REST endpoints
│       │   ├── auth.routes.ts       # Login, register, MFA, refresh
│       │   ├── oauth.routes.ts      # OAuth2 / SAML SSO
│       │   ├── users.routes.ts      # User management
│       │   ├── audit.routes.ts      # Audit log
│       │   ├── risk.routes.ts       # Proxy → risk engine
│       │   ├── ingest/
│       │   │   ├── webhook.routes.ts  # Tenable/Qualys/CS/QRadar/Sentinel
│       │   │   └── data.routes.ts     # Vulns, events, integrations
│       │   └── compliance/
│       │       ├── nist.routes.ts     # NIST CSF 2.0 maturity
│       │       ├── iso27001.routes.ts # ISO 27001:2022 assessments
│       │       └── workflow.routes.ts # Audit sign-off pipeline
│       ├── services/      # Business logic
│       ├── workers/       # BullMQ workers (ingest)
│       └── jobs/          # Cron pollers (Tenable, Qualys, CrowdStrike)
└── risk-engine/           # Python FastAPI FAIR engine  (PORT 5001)
    └── app/
        ├── routers/fair.py     # /api/risk/simulate, /analyse, /presets
        ├── services/
        │   ├── fair_engine.py  # PERT Monte Carlo (100k simulations)
        │   └── ai_service.py   # Claude Sonnet 4.6 + Ollama fallback
        └── models/fair.py      # Pydantic schemas
```

## Phase Summary

| Phase | ID | Scope | Status |
|---|---|---|---|
| 1 | AUTH-01 | JWT auth, TOTP MFA, OAuth2, RBAC, audit log | ✅ |
| 2 | INGEST-02 | Webhooks (5 sources), polling (Tenable/Qualys/CS), BullMQ | ✅ |
| 3 | RISK-03 | FAIR Monte Carlo FastAPI, Claude API, Ollama fallback | ✅ |
| 4 | AI-REP-04 | NIST CSF 2.0 maturity, ISO 27001:2022 crosswalk, audit workflow | ✅ |

## Quick Start (development)

### Node.js backend
```bash
cd server
cp .env.example .env      # fill in JWT secrets
npm install
npm run db:seed           # creates 4 demo users
npm run dev               # http://localhost:4000
```

Demo credentials:
| Email | Password | Role |
|---|---|---|
| ciso@demo.local | CISOdemo@2026! | CISO |
| analyst@demo.local | SOCdemo@2026! | SOC_ANALYST |
| auditor@demo.local | AUDITdemo@2026! | AUDITOR |
| exec@demo.local | EXECdemo@2026! | EXECUTIVE |

### Python risk engine
```bash
cd risk-engine
py -3.13 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # optionally add ANTHROPIC_API_KEY
python main.py            # http://localhost:5001/docs
```

### Docker (all services)
```bash
cp .env.example .env      # fill JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
docker compose up -d
```

## Key API Endpoints

### Auth (Phase 1)
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login → JWT |
| POST | /api/auth/mfa/verify | Complete TOTP challenge |
| POST | /api/auth/mfa/setup | Initiate TOTP setup |
| POST | /api/auth/mfa/confirm | Confirm + enable TOTP |
| POST | /api/auth/refresh | Rotate refresh token |
| POST | /api/auth/logout | Blacklist access token |
| GET  | /api/auth/me | Current user |

### Data Ingestion (Phase 2)
| Method | Path | Description |
|---|---|---|
| POST | /api/webhooks/tenable | Tenable webhook |
| POST | /api/webhooks/qualys | Qualys webhook |
| POST | /api/webhooks/crowdstrike | CrowdStrike webhook |
| POST | /api/webhooks/qradar | QRadar webhook |
| POST | /api/webhooks/sentinel | Azure Sentinel webhook |
| GET  | /api/data/vulnerabilities | List vulnerabilities |
| GET  | /api/data/vulnerabilities/stats | Vuln KPI summary |
| PATCH| /api/data/vulnerabilities/:id | Update vuln status |
| GET  | /api/data/events | Security events |
| GET  | /api/data/integrations | Integration configs |

### Risk Engine (Phase 3)
| Method | Path | Description |
|---|---|---|
| POST | /api/risk/simulate | FAIR Monte Carlo |
| POST | /api/risk/simulate/batch | Batch simulations (max 20) |
| POST | /api/risk/analyse | Simulate + Claude AI analysis |
| GET  | /api/risk/presets | 5 banking risk presets |

### Compliance (Phase 4)
| Method | Path | Description |
|---|---|---|
| GET  | /api/compliance/nist/maturity | NIST CSF 2.0 scores by function |
| GET  | /api/compliance/nist/gaps | Non-compliant controls |
| POST | /api/compliance/nist/controls | Upsert assessment |
| GET  | /api/compliance/iso27001/crosswalk | NIST ↔ ISO 27001 map |
| GET  | /api/compliance/iso27001/score | ISO compliance score |
| POST | /api/compliance/iso27001/controls | Upsert assessment |
| GET  | /api/compliance/workflows | List audit workflows |
| POST | /api/compliance/workflows | Create workflow |
| POST | /api/compliance/workflows/:id/advance | Advance stage |
| POST | /api/compliance/workflows/:id/revert | Revert stage (CISO only) |

## FAIR Risk Model

The Monte Carlo engine uses **PERT (Beta-PERT) distributions** for all three-point estimates, matching the OpenFAIR methodology:

```
Annual Loss = LEF × Loss_Magnitude
LEF (Loss Event Frequency) = TEF × Vulnerability

Where:
  TEF = Threat Event Frequency  (events/year, PERT)
  Vulnerability = P(threat succeeds | contact)  (0–1, PERT)
  Loss_Magnitude = PLM + SLM  (USD, PERT each)
```

Default: 100,000 simulation trials. Output: P10/P50/P90/P99 percentiles + histogram.
