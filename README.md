# HireX (DevClash_HireX)

HireX is a full-stack professional networking and hiring platform that combines:

- classic product features (feed, chat, profiles, events, opportunities),
- trust + anti-fraud layers (OTP, OAuth, company verification, face liveness), and
- incentive mechanics (referrals, promo credits, boosts, leaderboards).

The repository is organized as a multi-service application with a React frontend, an Express API backend, and a Python FastAPI ML service. It also relies on MongoDB, Redis, and Qdrant.

---

## Table of Contents

1. [What this repository does (high-level)](#1-what-this-repository-does-high-level)
2. [Core product capabilities](#2-core-product-capabilities)
3. [Architecture and service map](#3-architecture-and-service-map)
4. [Repository structure](#4-repository-structure)
5. [Prerequisites (exact tools you need)](#5-prerequisites-exact-tools-you-need)
6. [Environment variables (complete setup)](#6-environment-variables-complete-setup)
7. [Step-by-step run guide (recommended: Docker)](#7-step-by-step-run-guide-recommended-docker)
8. [Step-by-step run guide (manual local development)](#8-step-by-step-run-guide-manual-local-development)
9. [How to use the app after startup (functional walkthrough)](#9-how-to-use-the-app-after-startup-functional-walkthrough)
10. [API route map by module](#10-api-route-map-by-module)
11. [Data, infra, and persistence details](#11-data-infra-and-persistence-details)
12. [Troubleshooting and diagnostics](#12-troubleshooting-and-diagnostics)
13. [Security and production hardening notes](#13-security-and-production-hardening-notes)
14. [Developer workflow tips](#14-developer-workflow-tips)

---

## 1. What this repository does (high-level)

HireX is designed to be a **verified-professional network** rather than a generic social app.

From a user perspective, this system allows people to:

- sign up/login (email-password + OAuth),
- verify identity with OTP and optional DigiLocker-like flow,
- complete face liveness checks and anti-duplicate checks,
- maintain profile and network connections,
- post on a social feed,
- chat in real-time,
- register/check in for events using QR,
- discover opportunities,
- earn and spend promo credits (referrals, boosts, rewards).

From a system perspective, this repository orchestrates:

- **Frontend** (React Router v7 app) for all UI/UX and client-side liveness interaction,
- **Backend** (Express + TypeScript) for business logic, auth, API, scheduler, and WebSockets,
- **ML service** (FastAPI + Python) for biometric verification and vector matching,
- **Datastores** (MongoDB + Redis + Qdrant) for persistent app data, cache/invalidation, and face vector search.

---

## 2. Core product capabilities

### 2.1 Authentication and account trust

- Email/password auth with bcrypt + JWT.
- OAuth strategies via Google and GitHub.
- OTP verification for account creation confirmation.
- Company verification using CIN lookup against a known dataset.
- Optional DigiLocker-style user verification.

### 2.2 Biometric and anti-abuse controls

- Browser-side liveness challenge with MediaPipe-based interaction.
- Python-side anti-spoofing flow.
- ArcFace facial embedding extraction.
- Qdrant cosine-similarity duplicate detection to reduce multi-account fraud.

### 2.3 Social + network graph features

- Social feed with posting, likes, comments, and boost ranking behavior.
- Connection requests (pending/accepted/rejected/withdraw).
- Public and self profile views.

### 2.4 Real-time communication

- Chat with WebSockets mounted on the backend HTTP server.
- Conversation view, message history, unread counts, typing indicators.

### 2.5 Events and attendance

- Event creation/discovery.
- QR generation and scanning for attendance check-in.
- Escrow-style credit logic with scheduled settlement.

### 2.6 Opportunities and rewards economy

- Opportunity listings (company-side posting + user-side discovery/apply path).
- Referral engine with milestone incentives and badges.
- Promo credits wallet + transaction tracking.
- Boost mechanisms for content/profile/event visibility.

---

## 3. Architecture and service map

```text
┌──────────────────────────────────────────────────────┐
│ Frontend (React Router v7)                          │
│ Port: 5173                                           │
│ Role: UI routes, forms, feed/chat/profile views,    │
│       face capture/liveness UX                       │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP / JSON + JWT
┌──────────────────────▼───────────────────────────────┐
│ Backend API (Express + TypeScript)                  │
│ Port: 5000                                           │
│ Role: auth, profile, feed, chat APIs, rewards,      │
│       events, opportunities, scheduler, websockets   │
└───────────────┬───────────────────────┬──────────────┘
                │                       │
         MongoDB:27017            Redis:6379
        (app records)          (cache invalidation)
                │
                │ calls
┌───────────────▼──────────────────────────────────────┐
│ Python ML Service (FastAPI)                         │
│ Port: 8000                                           │
│ Role: liveness checks, embedding extraction,         │
│       duplicate identity checks                      │
└──────────────────────┬───────────────────────────────┘
                       │ vector DB
                 Qdrant:6333/6334
```

### Datastore responsibilities

- **MongoDB**: users, pending users, posts, messages, events, registrations, opportunities, transactions, and related entities.
- **Redis**: cache/flush behavior around mutation requests.
- **Qdrant**: vector storage/search for face embeddings.

---

## 4. Repository structure

```text
DevClash_HireX/
├── backend/                 # Express + TypeScript API + WebSocket server
│   ├── src/
│   │   ├── routes/          # API modules (auth, feed, chat, events, etc.)
│   │   ├── models/          # Mongoose schemas
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── ws/              # chat websocket bootstrapping
│   │   ├── services/        # fraud / verification / domain logic
│   │   └── utils/           # email, redis, scheduler, qr, oauth helpers
│   ├── package.json
│   └── env.example
├── frontend/                # React Router v7 app
│   ├── app/
│   │   ├── routes/          # page routes (/feed, /chat, /profile, etc.)
│   │   ├── components/      # reusable UI building blocks
│   │   ├── app.css          # global styling
│   │   └── root.tsx
│   ├── package.json
│   └── README.md
├── python/                  # FastAPI + face utilities
│   ├── main.py
│   ├── face_utils/
│   ├── requirements.txt
│   └── env.example
├── docker-compose.yml       # infra + backend + python service orchestration
├── PROGRESS.md              # deep project implementation status narrative
└── verification.readme      # architecture + verification deep dive
```

---

## 5. Prerequisites (exact tools you need)

You can run this project in two ways:

1. **Docker-first (recommended for consistency)**
2. **Manual local dev (recommended when actively coding frontend/backend)**

### Common prerequisites

- Git
- Docker + Docker Compose plugin (`docker compose`)
- Node.js (v18+ recommended)
- npm (bundled with Node)
- Python (3.10+ recommended)
- pip

### Optional but useful

- MongoDB Compass (for DB inspection)
- Redis CLI (`redis-cli`)
- Postman or Insomnia (API exploration)

---

## 6. Environment variables (complete setup)

You need two `.env` files:

- `backend/.env`
- `python/.env`

### 6.1 Create backend env file

From repo root:

```bash
cp backend/env.example backend/.env
```

Then edit `backend/.env` and set at minimum:

- `PORT=5000`
- `MONGODB_URI=mongodb://localhost:27017/hirex` (if running Mongo locally)
- `JWT_SECRET=<strong-random-secret>`
- `FASTAPI_URL=http://localhost:8000`
- `FRONTEND_URL=http://localhost:5173`
- SMTP values (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) for OTP emails
- OAuth credentials (`GOOGLE_CLIENT_ID`, etc.) if you want social login

### 6.2 Create python env file

From repo root:

```bash
cp python/env.example python/.env
```

Then edit `python/.env` and set:

- `QDRANT_URL=<your-qdrant-url>`
- `QDRANT_API_KEY=<your-qdrant-api-key>`
- `QDRANT_COLLECTION_NAME=hirex_faces`
- `COSINE_THRESHOLD=0.60` (adjust if needed)
- `SPOOF_MODEL_DIR=./models/silent_face`

### 6.3 Secret and credentials guidance

- Never commit real `.env` files.
- Use strong random secrets for JWT/session values.
- In production, rotate keys and use a secrets manager.

---

## 7. Step-by-step run guide (recommended: Docker)

This path is easiest when you want a near full-stack environment quickly.

> Note: the current compose file starts **qdrant, redis, mongodb, backend, python**. Frontend runs separately unless you add it as a service.

### Step 1 — Clone and move into repo

```bash
git clone <your-fork-or-repo-url>
cd DevClash_HireX
```

### Step 2 — Create env files

```bash
cp backend/env.example backend/.env
cp python/env.example python/.env
```

Then populate both files as described in section 6.

### Step 3 — Build and start services

```bash
docker compose up --build -d
```

### Step 4 — Confirm containers are healthy

```bash
docker compose ps
```

You should see containers for:

- `hirex_qdrant`
- `hirex_redis`
- `hirex_mongodb`
- `hirex_python`
- `hirex_backend`

### Step 5 — Start frontend locally

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

### Step 6 — Validate service availability

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`
- Python docs (if exposed): `http://localhost:8000/docs`
- Qdrant API: `http://localhost:6333`

### Step 7 — Stop the stack when done

```bash
docker compose down
```

To also remove volumes:

```bash
docker compose down -v
```

---

## 8. Step-by-step run guide (manual local development)

Use this when iterating quickly on code and debugging per-service logs.

### Step 0 — Open 5 terminals

You will typically run:

1. MongoDB (or Docker Mongo)
2. Redis (or Docker Redis)
3. Python service
4. Backend service
5. Frontend service

### Step 1 — Start infrastructure dependencies

#### Option A: Start only data services in Docker

```bash
docker compose up -d mongodb redis qdrant
```

#### Option B: Run infra natively

Use local installations of MongoDB and Redis, and ensure they match `.env` values.

### Step 2 — Install and run Python ML service

```bash
cd python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env   # if not already done
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3 — Install and run backend

In a fresh terminal:

```bash
cd backend
npm install
cp env.example .env   # if not already done
npm run dev
```

Backend runs with nodemon and TypeScript entrypoint at port 5000.

### Step 4 — Install and run frontend

In a fresh terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on port 5173 via React Router dev server.

### Step 5 — Sanity checks (important)

Run these checks once all services are up:

```bash
curl http://localhost:5000/api/health
curl http://localhost:8000/docs
```

Open app:

- `http://localhost:5173`

### Step 6 — First functional smoke test

1. Create a user via signup.
2. Verify OTP flow (ensure SMTP creds are valid).
3. Complete face/liveness steps.
4. Login and open feed.
5. Create a post.
6. Open chat and send a message to another test account.

---

## 9. How to use the app after startup (functional walkthrough)

### 9.1 Account creation path

1. Go to `/signup`.
2. Enter identity details.
3. Verify email OTP.
4. Complete face scan/liveness.
5. Optionally complete DigiLocker-style verification.
6. Land in authenticated area (feed/dashboard depending flow).

### 9.2 Network + content path

1. Open `/network` to discover users.
2. Send and accept connection requests.
3. Open `/feed` to create posts and engage.
4. View profiles (`/profile`, `/profile/:userId`).

### 9.3 Messaging path

1. Open `/chat`.
2. Select a conversation or start one.
3. Exchange messages in real time.

### 9.4 Events path

1. Browse `/events`.
2. Open event details.
3. Register (escrow logic applies).
4. Use scan flow (`/events/scan`) for attendance validation where authorized.

### 9.5 Opportunities + rewards path

1. Browse opportunities at `/opportunities`.
2. Use referral code flow during onboarding of new users.
3. Check wallet/reward metrics and leaderboard pages.
4. Spend credits on boost actions where supported.

---

## 10. API route map by module

Base URL for backend: `http://localhost:5000`

### Core route groups

- `/api/auth` — signup/login/oauth/otp/verification operations.
- `/api/feed` — post, like, comment functionality.
- `/api/chat` — conversation/message/unread APIs.
- `/api/profile` and `/api/users` — profile management + search.
- `/api/connections` — network graph actions.
- `/api/events` and `/api/registrations` — event and attendance flow.
- `/api/opportunities` — opportunities board.
- `/api/rewards` — promo credits, leaderboards, admin rewards flow.
- `/api/investment` and `/api/admin` — investment/admin modules.
- `/api/ai` and `/api/dashboard` — AI and dashboard APIs.

---

## 11. Data, infra, and persistence details

### MongoDB

Stores durable app entities (users, posts, connections, events, messages, transactions, etc.).

### Redis

Used for cache orchestration and invalidation trigger pattern on successful mutations.

### Qdrant

Stores face embeddings for duplicate identity detection with cosine metric threshold logic.

### Docker volumes

The compose file persists data using named volumes:

- `qdrant_storage`
- `mongodb_data`
- `redis_data`

This means your data survives container restarts unless you run `docker compose down -v`.

---

## 12. Troubleshooting and diagnostics

### 12.1 Backend fails to start

- Check missing env vars in `backend/.env`.
- Ensure MongoDB is reachable at configured URI.
- Ensure Python service is running if auth flow needs ML checks.
- If port 5000 is busy, kill old process or change `PORT`.

### 12.2 OTP emails not sending

- Verify SMTP host/port/user/password.
- For Gmail, use app password (not account password).
- Check spam folder for OTP messages.

### 12.3 Face verification issues

- Ensure browser camera permissions are granted.
- Confirm Python service is running and dependencies installed.
- Validate Qdrant URL/API key in `python/.env`.

### 12.4 WebSocket chat not updating live

- Confirm backend is started (WebSocket shares backend server).
- Check browser console for socket disconnects.
- Verify user auth token is valid and present.

### 12.5 CORS/auth cookie issues

- Confirm `FRONTEND_URL` in backend env exactly matches frontend origin.
- If proxying or changing ports, update CORS settings accordingly.

---

## 13. Security and production hardening notes

Before production deployment:

- replace all sample secrets and rotate keys,
- enforce HTTPS for all public endpoints,
- secure cookie/session options,
- tighten CORS to exact domains,
- use managed MongoDB/Redis/Qdrant with private networking,
- add request-rate limiting and abuse detection,
- add robust audit logs for admin/reward operations,
- separate development and production env configs,
- configure monitoring/alerts for each service.

---

## 14. Developer workflow tips

### Recommended daily workflow

1. Start infra (`mongodb`, `redis`, `qdrant`) via Docker.
2. Run Python + Backend + Frontend locally in watch mode.
3. Use seed/test users for repeatable QA.
4. Keep an eye on backend logs for route-level issues.
5. Validate both REST behavior and websocket behavior in parallel.

### Useful commands cheat sheet

From repository root:

```bash
# infra only
docker compose up -d mongodb redis qdrant

# full compose stack
docker compose up --build

# stop stack
docker compose down
```

Per service:

```bash
# frontend
cd frontend && npm install && npm run dev

# backend
cd backend && npm install && npm run dev

# python
cd python && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

---

If you want, the next improvement can be a **"one-command local bootstrap" script** (`scripts/dev-up.sh`) that validates env files, starts dependencies, and runs all three app services concurrently.
