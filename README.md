# Saathi

[![Built with Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Built with Express](https://img.shields.io/badge/Backend-Express.js-111111?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Database MongoDB](https://img.shields.io/badge/Database-MongoDB-0f172a?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Twilio Voice](https://img.shields.io/badge/Voice-Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)](https://www.twilio.com/)
[![ElevenLabs](https://img.shields.io/badge/TTS-ElevenLabs-1f2937?style=for-the-badge)](https://elevenlabs.io/)
[![Gemini AI](https://img.shields.io/badge/LLM-Gemini-2563eb?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Hackathon Project](https://img.shields.io/badge/Hackathon-Ready-7c3aed?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/License-Add%20License%20Here-f59e0b?style=for-the-badge)](#license)

Saathi is an AI-powered companionship and safety platform for elderly people in India.
It places warm Hindi voice calls, remembers context from past conversations, tracks mood and risk signals, and keeps family members informed through actionable updates.

## Live Deployment

- Frontend (Vultr Bare Metal): http://139.84.156.228/
- Backend API Status: Frontend is deployed, but backend has deployment issues right now (local backend is working).


## Demo Video

- Google Drive Demo: https://drive.google.com/drive/folders/1NBiiyfrnMxTEvcFzZjEhCYhHztZNGPDd

## Elevator Pitch
Saathi creates daily emotional check-ins through phone calls, then turns those conversations into meaningful family visibility: mood trends, memory timelines, and safety alerts.

## Problem

- Elder loneliness and emotional decline often go unnoticed.
- Families cannot call frequently due to work/time-zone constraints.
- Existing tools are app-heavy, not elder-friendly, and rarely proactive.

## Solution

Saathi works on a regular phone call flow (no app needed for elders) and provides a family dashboard with:

- Daily AI voice conversations (Hindi-first)
- Memory-aware context for natural continuity
- Mood extraction and call summaries
- Safety guardrails and escalation signals
- Reminder and follow-up call scheduling
- Optional custom elder voice cloning

## High-Level Design (HLD)

Paste your architecture image here.

![HLD Diagram Placeholder](hld%20image/hld.jpeg)

## Key Features

### 1) Auth + Family Profile
- JWT auth (`signup`, `login`, `me`)
- First-time 2-stage family setup
- Editable profile from Settings

### 2) Elder Management
- Add and manage elder profiles
- Daily call schedule (with active/inactive controls)
- Relation context and notes from family

### 3) AI Calling Experience
- Outbound Twilio calls
- Multi-turn speech interaction using Twilio gather/status webhooks
- AI-generated conversational responses (Gemini; optional Groq path)
- TTS with ElevenLabs preferred and Twilio fallback

### 4) Reminders and Follow-Ups
- Family can schedule one-time reminder/follow-up calls
- Scheduler triggers due calls
- Call context is injected into system prompt

### 5) Mood, Memory, and Timeline
- Post-call summary and mood score generation
- Memory timeline for each elder
- Weekly and trend views on dashboard

### 6) Safety and Alerts
- ArmorIQ rule checks for risky responses
- Distress and missed-call alerting pipeline
- Alert logs and intervention visibility

### 7) Voice Cloning
- Record/upload voice sample
- Clone elder-specific voice
- Safe default voice fallback if clone unavailable

## Architecture Overview

### Frontend
- Next.js 14 (App Router)
- React + Tailwind CSS + Framer Motion
- Protected dashboard and settings flows

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Twilio (voice and messaging), ElevenLabs, Gemini

### Scheduler
- `node-cron` jobs in IST timezone
- Daily call scheduling, retry handling, reminder triggers, weekly summaries, stats updates

## Repository Structure

```text
.
|- backend/
|  |- config/
|  |- models/
|  |- prompts/
|  |- routes/
|  |- services/
|  |- scheduler.js
|  |- server.js
|- frontend/
|  |- app/
|  |- components/
|  |- lib/
|- scripts/
|- README.md
```

## Local Setup

### 1) Install dependencies

```bash
npm run install:all
```

### 2) Configure environment

- Create and fill backend env (`.env` at repo root or `backend/.env`).
- Create frontend env at `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3) Optional seed

```bash
npm run seed
```

### 4) Start development

```bash
npm run dev
```

This runs:
- Backend API
- Frontend app
- Scheduler

## Core Scripts

From repo root:

```bash
npm run dev
npm run dev:clean
npm run seed
npm run scheduler
```

## Environment Variables (Important)

### Backend essentials
- `PORT`
- `MONGODB_URI`
- `FRONTEND_URL`
- `JWT_SECRET`
- `TWILIO_SID`
- `TWILIO_TOKEN`
- `TWILIO_VOICE_FROM`
- `PUBLIC_BASE_URL` (or `BACKEND_PUBLIC_URL`)
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)

### Optional but recommended
- `LLM_PROVIDER`
- `GROQ_ENABLED`
- `GEMINI_ENABLED`
- `ELEVENLABS_ENABLED`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `MAX_CALL_TURNS`
- `AI_REPLY_TIMEOUT_MS`
- `TTS_GENERATION_TIMEOUT_MS`
- `JSON_BODY_LIMIT`

## API Surface (Quick View)

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`

### Elders
- `GET /api/elders`
- `GET /api/elders/:id`
- `POST /api/elders`
- `PUT /api/elders/:id`
- `PATCH /api/elders/:id/active`
- `PATCH /api/elders/:id/schedule`
- `POST /api/elders/:id/voice-clone`
- `DELETE /api/elders/:id/voice-clone`

### Calls + Reminders
- `GET /api/calls`
- `GET /api/calls/elder/:elderId`
- `POST /api/calls/trigger/:elderId`
- `GET /api/calls/reminders/:elderId`
- `POST /api/calls/reminders/:elderId`
- `PATCH /api/calls/reminders/:reminderId/cancel`

### Dashboard
- `GET /api/dashboard/health`
- `GET /api/dashboard/elder/:id`
- `GET /api/dashboard/mood-trend/:id`
- `GET /api/dashboard/armoriq-log/:id`
- `GET /api/dashboard/weekly-stats/:id`

### Twilio Webhooks
- `POST /webhook/twilio/voice`
- `POST /webhook/twilio/gather`
- `POST /webhook/twilio/status`
- `GET /webhook/twilio/tts`

## Demo Flow (Hackathon Friendly)

1. Family signs up and completes profile.
2. Family adds elder and daily schedule.
3. Trigger a test call from dashboard.
4. Elder call transcript generates memory + mood.
5. Dashboard shows timeline, trends, and safety logs.
6. Schedule a reminder/follow-up and show auto-trigger.

## What Makes This Hackathon-Ready

- Real-world problem with measurable social impact
- Full-stack working prototype with production-like integrations
- Voice AI + memory + safety + family coordination in one workflow
- Strong extensibility for regional language and healthcare-adjacent scenarios

## Roadmap

- Multi-language support beyond Hindi
- Family mobile notifications (push + email)
- Better long-term memory retrieval and personalization
- Care-provider mode and shared family workspaces
- Analytics for engagement and intervention outcomes

## Deployment Notes

- Ensure backend has a publicly reachable URL for Twilio webhooks.
- Use HTTPS in production for callback reliability and security.
- Configure CORS (`FRONTEND_URL`) correctly.
- Keep secrets out of source control.

## Team
- Name - Team Silly Coders


