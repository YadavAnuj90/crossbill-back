# Crossbill — Backend

Cross-border billing & compliance for Indian service exporters.
Correct USD export invoicing + GST/FEMA compliance trail.

This repository implements the backend described in the Crossbill Product & Engineering
Design Document (v1.0). It is a **modular monolith** (NestJS) plus a separate **Python
PDF/report service** (FastAPI), backed by Postgres (money), Redis/BullMQ (queue + cache)
and MongoDB (audit logs + document metadata).

> **Compliance disclaimer.** Crossbill assists with documentation and calculation. It is
> not a substitute for professional tax advice. All compliance templates, the exchange-rate
> basis, and the GSTR-1 6A export format **must be reviewed and signed off by a practising
> Chartered Accountant before production release** (design §12, §22).

## Scope of this build (Phase 1 — core loop)

The end-to-end loop **add client → create export invoice → render PDF** is implemented:

- Auth: email/password (Argon2id) + Google OAuth2, JWT access + rotating refresh tokens.
- Profile: GSTIN, legal name, address, LUT (number/FY/ARN), default SAC, bank details.
- Organizations: org-scoped multi-tenancy with `OWNER/ADMIN/MEMBER/ACCOUNTANT` roles.
- Clients: foreign-client CRUD.
- Invoices: auto-filled compliance fields (export declaration, place of supply, SAC,
  INR equivalent), **sequential gapless per-FY numbering enforced at the DB level**, and
  exchange-rate capture (rate + source + date) cached in Redis.
- PDF: BullMQ `generate-pdf` job → Python service (WeasyPrint) → stored → invoice updated.
- Audit: security-relevant events written to MongoDB.
- Health: `/health/live` and `/health/ready` probes (Postgres, Redis, Mongo, pdf-service).

Deferred to later phases (folders/contracts present where useful): remittances/FEMA aging,
Razorpay billing, GSTR-1 6A export endpoint, full notification cron jobs, RBAC team invite.

## Architecture

```
Browser (Next.js)  ──REST/HTTPS──►  NestJS API  ──►  Postgres (invoices, clients, money)
                                        │   ├──────►  MongoDB (logs, document metadata)
                                        │   └──────►  Redis (BullMQ queue, FX cache)
                                        │                 │
                                        │                 ▼
                                        │            Python service (WeasyPrint PDF, GSTR-1 6A)
                                        ├── Razorpay (subscriptions, webhooks)  [phase 4]
                                        └── Resend (reminder + transactional email)
```

## Quick start

```bash
cp .env.example .env          # fill in secrets (Google OAuth, Resend, etc.)
docker compose up --build     # postgres, redis, mongo, pdf-service, api
# API:         http://localhost:3000/api/v1
# pdf-service: http://localhost:8000  (internal token required)
```

Run migrations (first boot):

```bash
docker compose exec api npm run migration:run
```

### Running services individually (without Docker)

```bash
# API
cd api && npm install && npm run start:dev

# PDF service
cd pdf-service && python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload
```

## Layout

```
backend/
├── api/            # NestJS application (see api/ tree in design §15)
├── pdf-service/    # Python FastAPI PDF + GSTR-1 6A report service
├── docker/         # postgres/init.sql, nginx/nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## API (v1, representative)

`/api/v1/auth/{register,login,google,google/callback,refresh,logout}`,
`/api/v1/profile`, `/api/v1/clients`, `/api/v1/invoices`, `/api/v1/invoices/:id/pdf`,
`/api/v1/health/{live,ready}`. See the controllers for DTOs and full surface.

## Testing

```bash
cd api && npm test            # unit (compliance engine gets highest coverage)
cd pdf-service && pytest
```

The compliance engine (declaration text, FX capture, FEMA date math, sequential numbering)
is the highest-liability code and carries the most coverage; generated PDFs and the GSTR-1
6A export are validated with golden-file tests against CA-approved references.
