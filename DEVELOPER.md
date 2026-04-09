# Saathi Developer Guide

Welcome to the Saathi developer documentation! This guide is for contributors and maintainers who want to understand, extend, or deploy the Saathi platform.

## Repository Structure

- **backend**: Node.js Express API, business logic, database models, schedulers, and integrations.
- **frontend**: Next.js 14 app, React components, dashboard, and onboarding flows.
- **scripts**: Utility scripts for development and deployment.
- **deploy**: Nginx and deployment configs.

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **AI/Voice**: Gemini (LLM), ElevenLabs (TTS), Twilio (Voice/SMS), ArmorIQ (Safety)
- **Scheduler**: node-cron

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)

### Setup Steps
1. Clone the repo and install dependencies:
   ```bash
   npm run install:all
   ```
2. Configure environment variables:
   - Backend: `.env` at root or `backend/.env`
   - Frontend: `frontend/.env.local` (see main README for keys)
3. (Optional) Seed the database:
   ```bash
   npm run seed
   ```
4. Start all services:
   ```bash
   npm run dev
   ```

### Core Scripts
- `npm run dev` — Start backend, frontend, and scheduler
- `npm run dev:clean` — Clean and start fresh
- `npm run seed` — Seed database with sample data
- `npm run scheduler` — Run scheduler only

## Backend Details
- **API**: RESTful endpoints under `/api/`
- **Models**: Mongoose schemas for Elder, FamilyUser, Call, Memory, etc.
- **Services**: Integrations for Twilio, ElevenLabs, Gemini, ArmorIQ
- **Scheduler**: Handles daily calls, reminders, retries, and summaries
- **Prompts**: System prompts for AI conversations

## Frontend Details
- **App Router**: Next.js 14, TypeScript
- **Auth**: JWT-based, protected routes via `AuthGuard`
- **Dashboard**: Mood, memory, alerts, call history, and elder management
- **UI Components**: Modular, reusable, Tailwind-styled

## Testing & Linting
- Add your tests in `backend/tests/` or `frontend/__tests__/`
- Use `npm run lint` for code quality

## Deployment
- Backend must be publicly accessible for Twilio webhooks
- Use HTTPS in production
- Nginx config in `deploy/nginx/`

## Contribution Guidelines
- Fork and branch from `main`
- Write clear commit messages
- Open PRs with context and screenshots if UI
- Follow code style and linting rules

## Contact
For questions or support, open an issue or contact Team Silly Coders.
