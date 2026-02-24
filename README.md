# 🎓 Mass Assessment System

A full-stack platform for large-scale student screening and assessment with **AI-powered analysis**, automated tier placement, and comprehensive reporting — built for educators, school administrators, and center-level coordinators.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-5+-DC382D?logo=redis&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [AI Agents](#ai-agents)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

The Mass Assessment System enables **special educators** to conduct large-scale student screenings across multiple domains (Reading, Reading Comprehension, Spelling, Numeracy, Writing). Students are automatically placed into risk tiers (Tier 1 / Tier 2 / Tier 3) based on weighted scores. AI agents then generate rationales, detect anomalies, create reports, and provide an interactive chat assistant for educators.

### User Roles

| Role | Description |
|------|-------------|
| **Educator** | Conducts assessments, enters scores, views AI-generated insights, administers quizzes |
| **School Admin** | Views aggregate school-level data, downloads school reports |
| **Center Admin** | Oversees multiple schools, views center-wide analytics and reports |

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│    Frontend      │────▶│    Backend       │────▶│   AI Service     │
│    (Next.js)     │     │  (Express + TS)  │     │   (FastAPI)      │
│    Port 3000     │     │    Port 5000     │     │   Port 8000      │
│                  │     │                  │     │                  │
└──────────────────┘     └────────┬─────────┘     └────────┬─────────┘
                                 │                         │
                          ┌──────┴──────┐           ┌──────┴──────┐
                          │ PostgreSQL  │           │    Redis    │
                          │   (Neon)    │           │  (Queues +  │
                          │             │           │   Memory)   │
                          └─────────────┘           └─────────────┘
```

---

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **Job Queues**: Bull (Redis-backed)
- **PDF Generation**: PDFKit
- **Validation**: Zod

### AI Service
- **Framework**: FastAPI (Python)
- **AI Orchestration**: LangGraph + LangChain
- **LLM Provider**: OpenAI GPT-4o-mini
- **Chat Memory**: Redis
- **Document Parsing**: PyMuPDF, python-docx
- **Observability**: LangSmith (optional)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Infrastructure
- **Database**: PostgreSQL (Neon serverless)
- **Cache / Queues**: Redis
- **Deployment**: Render (backend + AI) + Vercel (frontend)

---

## Features

### 🏫 Assessment & Screening
- Create mass assessment sessions with grade, section, and school selection
- Enter student scores across 5 domains with weighted average calculation
- Automatic tier assignment based on configurable thresholds
- Educator can override AI-assigned tiers with justification

### 🤖 AI-Powered Analysis (8 Agents)
- **Tier Rationale** — Plain-English explanation for each student's tier
- **Anomaly Detection** — Statistical outlier detection in session scores
- **Report Generation** — Class narratives with priority actions
- **Escalation** — AI-generated referral notes for at-risk students
- **Educator Assistant** — Conversational AI with streaming responses and memory
- **Document Extraction** — Parse PDF/DOCX screening booklets into structured data
- **Answer Scoring** — AI-powered grading of quiz responses
- **Observation Suggestions** — Recommendations from educator observations

### 📊 Reporting & Analytics
- PDF reports at educator, school, and center levels
- Tier distribution charts and domain performance breakdowns
- Grade-wise risk analysis with domain weakness identification
- AI-generated school summaries and priority action items

### 📝 Quiz System
- Create and manage online quizzes
- Student-facing quiz pages with timed sessions
- AI-powered answer scoring and validation

### 👥 Role-Based Dashboards
- Educator: class management, score entry, AI insights
- School Admin: aggregate school data, reports
- Center Admin: multi-school oversight, educator activity tracking

---

## Project Structure

```
mass-assessment/
├── backend/                 # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   ├── src/
│   │   ├── config/          # Environment config
│   │   ├── middleware/       # Auth, error handling
│   │   ├── routes/          # API route handlers
│   │   ├── repositories/    # Prisma data access layer
│   │   ├── services/        # Business logic + PDF generation
│   │   ├── queues/          # Bull queue setup + AI processors
│   │   ├── utils/           # JWT, helpers
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # App entry point
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/              # FastAPI + LangGraph AI
│   ├── agents/              # 8 LangGraph agent implementations
│   ├── models/              # Pydantic request/response schemas
│   ├── prompts/             # LLM prompt templates
│   ├── config.py            # LLM + Redis + LangSmith config
│   ├── main.py              # FastAPI entry point
│   └── requirements.txt
│
├── frontend/                # Next.js 14 App Router
│   ├── app/                 # Pages and layouts
│   ├── components/          # Reusable UI components
│   ├── lib/                 # API client, utilities
│   ├── next.config.js       # API rewrites
│   ├── tailwind.config.ts
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Redis** (local or hosted)
- **PostgreSQL** (or Neon account)

### 1. Clone the Repository

```bash
git clone https://github.com/iakshayrathee/mass-assessment.git
cd mass-assessment
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env     # Configure your env vars (see below)
npx prisma generate
npx prisma migrate dev
npm run dev               # Starts on http://localhost:5000
```

### 3. AI Service Setup

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env      # Configure your env vars
python main.py            # Starts on http://localhost:8000
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev               # Starts on http://localhost:3000
```

### 5. Seed Database (Optional)

```bash
cd backend
npx ts-node prisma/seed.ts
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret key for JWT signing | `change-me` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `PORT` | Server port | `5000` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `AI_SERVICE_URL` | AI service base URL | `http://localhost:8000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |

### AI Service (`ai-service/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | — |
| `GOOGLE_API_KEY` | Google AI API key (optional) | — |
| `BACKEND_URL` | Backend API base URL | `http://localhost:5000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `AI_SERVICE_PORT` | Service port | `8000` |
| `LANGSMITH_TRACING` | Enable LangSmith tracing | `false` |
| `LANGSMITH_API_KEY` | LangSmith API key (optional) | — |

---

## API Endpoints

### Backend API (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/register` | User registration |
| `GET` | `/api/sessions` | List assessment sessions |
| `POST` | `/api/sessions` | Create assessment session |
| `GET` | `/api/sessions/:id` | Get session details |
| `POST` | `/api/sessions/:id/submit` | Submit session scores |
| `GET` | `/api/school/*` | School-level data & reports |
| `GET/POST` | `/api/quiz/*` | Quiz CRUD & submission |

### AI Service (`/ai`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/ai/health` | AI service health check |
| `POST` | `/ai/agents/tier-rationale` | Generate tier rationale |
| `POST` | `/ai/agents/anomaly-detection` | Detect score anomalies |
| `POST` | `/ai/agents/report-generation` | Generate class report |
| `POST` | `/ai/agents/escalation` | Generate referral note |
| `POST` | `/ai/chat` | Educator AI assistant |
| `DELETE` | `/ai/chat/:sessionId` | Clear chat history |
| `POST` | `/ai/extract-assessment` | Extract assessment from PDF/DOCX |
| `POST` | `/ai/agents/score-answers` | AI-powered answer scoring |
| `POST` | `/ai/agents/observation-suggestions` | Observation-based suggestions |

---

## AI Agents

All agents are built as **LangGraph state machines** with typed state dictionaries.

| # | Agent | Input | Output |
|---|-------|-------|--------|
| 1 | **Tier Rationale** | Domain scores, tier, behavioral flags | Plain-English rationale + intervention suggestions |
| 2 | **Anomaly Detection** | All student scores in a session | Flagged anomalies with severity levels |
| 3 | **Report Generation** | Session summary + student data | Class narrative + priority actions |
| 4 | **Escalation** | Student profile + scores + tier | Referral note + priority areas |
| 5 | **Educator Assistant** | Natural language question | Contextual answer with streaming |
| 6 | **Document Extraction** | PDF/DOCX file | Structured assessment JSON |
| 7 | **Answer Scoring** | Questions + student responses | Scored results with feedback |
| 8 | **Observation Suggestions** | Student data + educator notes | Actionable suggestions |

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| **Backend** | Render (Web Service) | Build: `npm install && npx prisma generate && npm run build` • Start: `node dist/index.js` |
| **AI Service** | Render (Web Service) | Build: `pip install -r requirements.txt` • Start: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Frontend** | Vercel | Auto-detected as Next.js. Set root directory to `frontend`. |
| **Database** | Neon | Serverless PostgreSQL. Run `npx prisma migrate deploy` after first deploy. |
| **Redis** | Upstash / Render Redis | Set `REDIS_URL` on both backend and AI service. |

> **Note**: Update `CORS_ORIGIN` on backend and AI service to your Vercel frontend URL. Update `next.config.js` rewrites to point to your Render service URLs.

---

## Scripts

### Backend

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed the database
npm run db:studio    # Open Prisma Studio
```

### AI Service

```bash
python main.py       # Start with hot reload (uvicorn)
```

### Frontend

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

---
