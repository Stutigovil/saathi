# Saathi

Saathi is a full-stack elderly companion platform that:
- Calls elders daily in Hindi using Twilio Voice
- Generates empathetic AI conversation replies
- Stores call summaries and mood trends
- Tracks safety interventions with ArmorIQ logs
- Notifies family over WhatsApp when needed
- Supports elder-specific voice cloning (with fallback default voice)

## Tech Stack

- Backend: Node.js, Express, MongoDB (Mongoose), Twilio, ElevenLabs, Gemini (with optional Groq path)
- Frontend: Next.js 14 (App Router), React, Tailwind CSS, Framer Motion
- Scheduler: node-cron (IST timezone jobs)

## Monorepo Structure

- package.json: root workspace scripts
- backend: API, scheduler, models, webhooks, services
- frontend: dashboard and onboarding UI
- scripts: utility scripts for development
- old backend: legacy folder (not used by active app)

### Backend Highlights

- server.js: bootstraps API server, env loading, DB connection retries
- scheduler.js: automated call scheduling, retry logic, weekly summaries, stats updater
- routes:
  - auth.routes.js
  - elder.routes.js
  - call.routes.js
  - dashboard.routes.js
  - webhook.routes.js
- services:
  - gemini.service.js
  - elevenlabs.service.js
  - twilio-voice.service.js
  - distress.service.js
  - armoriq.service.js
  - memory.service.js
  - prompt-manager.js

### Frontend Highlights

- app/page.tsx: landing page
- app/signup/page.tsx: registration
- app/signin/page.tsx: login
- app/onboard/page.tsx: elder onboarding + optional voice clone
- app/dashboard/page.tsx: family dashboard and quick actions
- app/dashboard/[elderId]/page.tsx: elder detail (profile edit, voice cloning, timeline, safety log)
- components/ui/VoiceCloneInput.tsx: recorder/upload UI for voice cloning

## Core Features

### 1) Family Auth

- Sign up and sign in with JWT
- Protected dashboard routes with AuthGuard

### 2) Elder Management

- Create, update, list elders
- Schedule daily call time (HH:MM)
- Enable/disable elder activity

### 3) AI Voice Calling

- Outbound Twilio call to elder
- Multi-turn Hindi conversation via Twilio gather webhooks
- AI-generated responses
- TTS playback (ElevenLabs preferred, Twilio voice fallback)

### 4) Memory + Mood

- Per-call summary and mood extraction
- Mood trend timeline in dashboard
- Weekly stats and call history

### 5) Safety and Alerts

- ArmorIQ pattern-based safety checks
- Intervention logs shown in dashboard
- Distress and missed-call WhatsApp alerts to family

### 6) Voice Cloning

- Optional elder-specific voice cloning from recorded/uploaded sample
- If no clone exists, default voice from ELEVENLABS_VOICE_ID is used

## API Overview

Base URL: http://localhost:5000

### Auth

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me

### Elders

- GET /api/elders
- GET /api/elders/:id
- POST /api/elders
- PUT /api/elders/:id
- PATCH /api/elders/:id/active
- PATCH /api/elders/:id/schedule
- POST /api/elders/:id/voice-clone
- DELETE /api/elders/:id/voice-clone

### Calls

- GET /api/calls
- GET /api/calls/elder/:elderId
- POST /api/calls/trigger/:elderId

### Dashboard

- GET /api/dashboard/health
- GET /api/dashboard/elder/:id
- GET /api/dashboard/mood-trend/:id
- GET /api/dashboard/armoriq-log/:id
- GET /api/dashboard/weekly-stats/:id

### Twilio Webhooks

- POST /webhook/twilio/voice
- POST /webhook/twilio/gather
- POST /webhook/twilio/status
- GET /webhook/twilio/tts

## Scheduler Jobs (IST)

Configured in backend/scheduler.js:

- Every minute: due daily calls + retry calls + double no-pickup handling
- Sundays at 19:00: weekly summary send
- Every hour: missed-call streak checker
- Daily at 00:00: elder stats updater

Retry behavior:
- Primary scheduled call at schedule_time
- Retry after 10 minutes if no answer
- If both are no-answer, no-pickup memory + alert can be generated

## Environment Variables

Use backend/.env.example as baseline. Place active env in root .env (as used by current server boot flow) or backend/.env.

### Required (minimum)

- PORT
- MONGODB_URI
- FRONTEND_URL
- JWT_SECRET
- TWILIO_SID
- TWILIO_TOKEN
- TWILIO_VOICE_FROM
- PUBLIC_BASE_URL (or BACKEND_PUBLIC_URL)
- GEMINI_API_KEY (or GOOGLE_API_KEY when Gemini enabled)

### Important Optional

- LLM_PROVIDER
- GROQ_ENABLED / GEMINI_ENABLED
- ELEVENLABS_ENABLED
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID
- AI_REPLY_TIMEOUT_MS
- TTS_GENERATION_TIMEOUT_MS
- MAX_CALL_TURNS
- MIN_CLONE_AUDIO_BYTES
- MAX_CLONE_AUDIO_BYTES
- JSON_BODY_LIMIT

### Frontend

Create frontend/.env.local:

NEXT_PUBLIC_API_URL=http://localhost:5000

## Local Setup

### 1) Install

From repo root:

npm run install:all

### 2) Configure env

- Copy backend/.env.example values into root .env (or backend/.env)
- Add real provider credentials (Twilio, Gemini, ElevenLabs)

### 3) Seed (optional)

npm run seed

### 4) Run development

npm run dev

This starts:
- Backend on 5000
- Frontend on 3000
- Scheduler process

### 5) Open app

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health

## Production Notes

- Ensure PUBLIC_BASE_URL points to publicly reachable backend URL for Twilio callbacks
- Use HTTPS endpoint for webhooks
- Restrict CORS FRONTEND_URL
- Store secrets in secure runtime config (not committed files)

## Production Deploy (Single VPS, No Domain)

This project can run on one Ubuntu VPS and be accessed with the server public IP.

Assumptions:
- Backend runs on internal port 5000
- Frontend runs on internal port 3000
- Nginx listens on port 80 and routes `/api` and `/webhook` to backend

### 1) Install runtime dependencies

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
```

### 2) Clone and install

```bash
git clone <YOUR_GITHUB_REPO_URL> /var/www/saathi
cd /var/www/saathi
npm run install:all
```

### 3) Create production env files

Backend (`/var/www/saathi/.env` or `/var/www/saathi/backend/.env`):
- `PORT=5000`
- `FRONTEND_URL=http://<VPS_PUBLIC_IP>`
- `PUBLIC_BASE_URL=http://<VPS_PUBLIC_IP>`
- plus MongoDB/Twilio/LLM credentials

Frontend (`/var/www/saathi/frontend/.env.local`):
- `NEXT_PUBLIC_API_URL=http://<VPS_PUBLIC_IP>`

### 4) Build frontend

```bash
cd /var/www/saathi
npm run prod:frontend:build
```

### 5) Start all apps with PM2

```bash
cd /var/www/saathi
npm run prod:pm2:start
npm run prod:pm2:save
pm2 startup
```

PM2 app config is in `ecosystem.config.cjs` and starts:
- `saathi-backend`
- `saathi-scheduler`
- `saathi-frontend`

### 6) Configure Nginx reverse proxy

Use the template in `deploy/nginx/saathi-ip.conf`:

```bash
cp /var/www/saathi/deploy/nginx/saathi-ip.conf /etc/nginx/sites-available/default
nginx -t
systemctl restart nginx
```

### 7) Verify

```bash
pm2 status
curl http://127.0.0.1:5000/health
curl http://<VPS_PUBLIC_IP>/health
```

Twilio webhook base URL should be:
- `http://<VPS_PUBLIC_IP>/webhook/twilio/voice`

## Redeploy After Code Changes

Run all commands from your project root (`/root/saathi` in current setup).

### A) Backend-only changes

Use this when you edit files under `backend/` and there are no dependency changes:

```bash
cd /root/saathi
pm2 restart saathi-backend saathi-scheduler
pm2 save
```

If backend dependencies changed (`backend/package.json`):

```bash
cd /root/saathi
npm --prefix backend install
pm2 restart saathi-backend saathi-scheduler
pm2 save
```

### B) Frontend-only changes

Use this when you edit files under `frontend/`:

```bash
cd /root/saathi
npm run prod:frontend:build
pm2 restart saathi-frontend
pm2 save
```

If frontend dependencies changed (`frontend/package.json`):

```bash
cd /root/saathi
npm --prefix frontend install
npm run prod:frontend:build
pm2 restart saathi-frontend
pm2 save
```

### C) Both frontend and backend changed

```bash
cd /root/saathi
npm run install:all
npm run prod:frontend:build
pm2 restart ecosystem.config.cjs
pm2 save
```

### D) Nginx config changed

Use this only if you edited Nginx files such as `deploy/nginx/saathi-ip.conf`:

```bash
cp /root/saathi/deploy/nginx/saathi-ip.conf /etc/nginx/sites-available/default
nginx -t
systemctl restart nginx
```

### E) Quick health check after redeploy

```bash
pm2 status
curl -sS http://127.0.0.1:5000/health
curl -I -sS http://127.0.0.1/ | head -n 1
```

### F) Logs for troubleshooting

```bash
pm2 logs saathi-backend --lines 100
pm2 logs saathi-scheduler --lines 100
pm2 logs saathi-frontend --lines 100
```

## Voice Cloning Guide

Where in UI:
- Onboarding page: optional voice cloning step
- Elder detail page: Voice Cloning section (record/upload + clone/reset)

Recording recommendations:
- 10 to 30 seconds
- Quiet room
- Single speaker
- Clear speech
- Supported formats: mp3, wav, m4a, webm, ogg

Common errors:
- Too short: record longer and clearer sample
- 400 from ElevenLabs: often invalid/very short audio or unsupported format
- Missing API key / disabled ElevenLabs: verify ELEVENLABS_ENABLED and ELEVENLABS_API_KEY

## Safety Model

- ArmorIQ rules enforce safety checks and redirections
- Safety events are logged in armoriq_blocks and shown in dashboard safety log
- Conversation prompt intentionally avoids exposing internal safety system names

## Known Issues / Notes

- Next.js lint may prompt for ESLint setup depending on local state
- Build can fail on sign-in page in strict prerender mode if useSearchParams suspense wrapping is not configured
- scripts/dev-clean.js port cleanup is Windows-specific; on macOS/Linux it only clears frontend cache and starts dev

## Useful Commands

Root:

- npm run dev
- npm run dev:clean
- npm run seed
- npm run scheduler

Backend:

- npm --prefix backend run dev
- npm --prefix backend run scheduler

Frontend:

- npm --prefix frontend run dev
- npm --prefix frontend run build

## Data Models

MongoDB collections:

- family_users: auth users
- elders: elder profile, schedule, family, stats, voice config
- calls: call lifecycle, transcript, status, memory linkage
- memories: summary, mood, topics, follow-ups
- alerts: WhatsApp alerts and delivery records
- armoriq_blocks: safety intervention logs

## Security Recommendations

- Rotate exposed API keys immediately if leaked
- Keep .env out of git
- Enforce strong JWT secret in production
- Limit Twilio webhook exposure and validate signatures if added
- Add rate limiting and audit logging on auth and webhook routes

## Contribution Checklist

When adding changes:
- Update docs for new env vars and endpoints
- Keep webhook behavior idempotent
- Verify no synthetic/fake memory creation on cut/no-answer calls
- Validate voice clone flow with both upload and recorder paths
- Ensure dashboard reflects new backend events
