# **Saathi** - AI-powered companionship and safety for elders

Saathi places warm Hindi voice calls, remembers context, tracks mood and risk, and keeps families informed—all without requiring elders to use an app.

## 🚩 The Problem

Millions of elders in India face loneliness and emotional decline, often unnoticed by busy families. Most solutions are app-based, not elder-friendly, and rarely proactive.

## 💡 Our Solution

Saathi bridges this gap by:
- Calling elders daily via regular phone (no smartphone/app needed)
- Using AI for natural, memory-aware conversations in Hindi
- Extracting mood and summarizing calls for families
- Providing a dashboard for family to monitor, schedule, and get alerts
- Ensuring safety with risk detection and escalation

## 🌐 Live Demo & Video

- **Live:** http://139.84.156.228/
- **Demo Video:** [Google Drive](https://drive.google.com/drive/folders/1NBiiyfrnMxTEvcFzZjEhCYhHztZNGPDd)

## 🛠️ Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/Frontend-Next.js%2014-000000?style=for-the-badge&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/Backend-Express.js-111111?style=for-the-badge&logo=express" />
  <img src="https://img.shields.io/badge/Database-MongoDB-0f172a?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/Voice-Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white" />
  <img src="https://img.shields.io/badge/TTS-ElevenLabs-1f2937?style=for-the-badge" />
  <img src="https://img.shields.io/badge/LLM-Gemini-2563eb?style=for-the-badge&logo=google" />
</p>

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB
- **AI/Voice:** Gemini (LLM), ElevenLabs (TTS), Twilio (Voice), ArmorIQ (Safety)
- **Scheduler:** node-cron

## ✨ Key Features

- **No app needed for elders:** Works via regular phone calls
- **AI voice conversations:** Hindi-first, memory-aware
- **Mood & memory tracking:** Summaries, trends, and timeline
- **Safety guardrails:** Risk detection and alerts
- **Family dashboard:** Manage elders, schedule calls, view updates
- **Voice cloning:** Optional, for personalized experience

## 🏗️ How It Works

1. Family signs up and adds elder details
2. Saathi calls the elder daily, chats in Hindi, and tracks mood
3. Family dashboard shows summaries, trends, and alerts
4. Reminders and follow-ups can be scheduled

## 📁 Repo Structure

```text
.  
├── backend/    # Express API, models, services, scheduler
├── frontend/   # Next.js app, dashboard, UI components
├── scripts/    # Dev and deployment scripts
├── deploy/     # Nginx and deployment configs
```


See [DEVELOPER.md](DEVELOPER.md) for full developer setup, API reference, scripts, and contribution guide.

## 👥 Team
**SillyCoders** — Built at HackByte 4.0
