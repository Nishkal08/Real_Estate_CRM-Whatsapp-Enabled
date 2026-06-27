# Real Estate CRM & AI Agent System Specification

This document provides a comprehensive overview of the technology stack, database schemas, API catalog, and operational workflows of the platform.

---

## 1. Tech Stack Overview

The project is structured as a decoupled, multi-tenant system:

```
   ┌──────────────────────────────────────────────────────────┐
   │                  React SPA Frontend                      │
   │           (Vite, Tailwind, Zustand, Axios)               │
   └───────────────────────────┬──────────────────────────────┘
                               │ HTTP API / SSE Events
                               ▼
   ┌──────────────────────────────────────────────────────────┐
   │                 Node.js CRM Backend                      │
   │      (Express, Prisma ORM, Multer, Twilio SDK)           │
   └───────────────────────────┬──────────────────────────────┘
                               │ HTTP Internal API Calls
                               ▼
   ┌──────────────────────────────────────────────────────────┐
   │                  FastAPI AI Service                      │
   │     (LangGraph, LangChain, pgvector, Cloudinary SDK)      │
   └───────────────────────────┬──────────────────────────────┘
                               │ SQL Queries & Embeddings
                               ▼
   ┌──────────────────────────────────────────────────────────┐
   │                 PostgreSQL Database                      │
   │      (Relational Tables + pgvector Embedding Data)       │
   └──────────────────────────────────────────────────────────┘
```

*   **Frontend**: React (Vite), Tailwind CSS, Lucide icons, Zustand (state management), Axios (HTTP calls), and EventSource (SSE handler).
*   **Backend CRM**: Node.js, Express, Prisma ORM (PostgreSQL client), Multer (file parsing), and Twilio SDK (WhatsApp gateway).
*   **AI Service**: Python 3.11, FastAPI (web frame), LangGraph (stateful workflows), LangChain, pgvector (vector search client), and Cloudinary SDK (CDN media mirroring).
*   **Database**: PostgreSQL with `pgvector` extension for transactional entities and semantic embeddings.

---

## 2. Database Schema

The system uses a multi-tenant PostgreSQL structure modeled via Prisma:

### Core Entities

*   **Business**: Represents the company/tenant. Configures hours (`availability`), plans, and company profiles.
*   **TeamMember**: Staff profiles associated with a Business.
*   **KnowledgeBase & KbDocument**: Document storage registers. Stores original document details. Chunks are embedded and stored in the database under `langchain_pg_embedding`.
*   **Campaign**: Setup parameters for message templates, agent tones, schedules, and active state.
*   **Lead**: Customer registry. Tracks properties interest, scores (`qualificationScore`), and identified `intentSignals`.
*   **Conversation & Message**: Log repository of chats between users and the CRM. Handles human takeover state (`isHumanActive`).
*   **Appointment**: Gathers scheduling calendars booked by customers or the AI agent.
*   **CampaignAnalytics**: Daily counters measuring sent, delivered, read, replies, and qualified leads.

---

## 3. Comprehensive API Endpoints Catalog

### A. CRM Backend Routes (`/api`)

All routes (excluding Twilio Webhooks) require a Bearer Token via the `auth` middleware.

#### 1. Authentication (`auth.js`)
*   `POST /api/auth/register`: Create a new business account.
*   `POST /api/auth/login`: Authenticate and fetch JWT access token.
*   `POST /api/auth/refresh`: Rotate expired JWT access tokens using refresh token.
*   `GET /api/auth/me`: Fetch account profile.
*   `PUT /api/auth/me`: Update account profile properties.

#### 2. Leads Management (`leads.js`)
*   `POST /api/leads/upload`: Parse and import a CSV/Excel leads database.
*   `GET /api/leads`: Fetch paginated leads list with sorting and filters.
*   `GET /api/leads/:id`: Fetch detailed lead profile.
*   `PUT /api/leads/:id/status`: Update lead stage status.

#### 3. Campaigns Orchestration (`campaigns.js`)
*   `POST /api/campaigns`: Create an outreach campaign draft.
*   `GET /api/campaigns`: List campaigns for the business.
*   `GET /api/campaigns/:id`: Retrieve campaign settings.
*   `PUT /api/campaigns/:id`: Update campaign configuration.
*   `POST /api/campaigns/:id/launch`: Launch campaign, dispatching openers.
*   `POST /api/campaigns/:id/pause`: Pause active campaign.
*   `DELETE /api/campaigns/:id`: Remove campaign.

#### 4. Knowledge Base Manager (`kb.js`)
*   `POST /api/kb/create`: Create a new collection.
*   `GET /api/kb`: List business collections.
*   `POST /api/kb/:id/upload`: Process file upload to CDN + pgvector embedding.
*   `POST /api/kb/:id/url`: Scrape website content, parse, and embed.
*   `GET /api/kb/:id/documents`: Fetch documents attached to this KB.
*   `DELETE /api/kb/:id/document/:docId`: Delete document chunks from pgvector.

#### 5. Booking & Site Calendar (`booking.js`)
*   `GET /api/booking/slots`: Fetch available booking slots for a target date.
*   `POST /api/booking/book`: Book an appointment (manual or agent-driven).
*   `GET /api/booking/appointments`: Retrieve all scheduled appointments.
*   `GET /api/booking/availability`: Fetch business hours.
*   `PUT /api/booking/availability`: Save business hours configuration.
*   `PUT /api/booking/appointments/:id/status`: Update appointment status.

#### 6. Conversations & Human Takeover (`conversations.js`)
*   `GET /api/conversations`: List active chat rooms (paginated).
*   `GET /api/conversations/:id/messages`: Retrieve chat logs for a room.
*   `POST /api/conversations/:id/takeover`: Flag room as human-controlled (blocks AI agent).
*   `POST /api/conversations/:id/release`: Return room to AI agent control.
*   `POST /api/conversations/:id/human-message`: Send manual message from agent on WhatsApp.

#### 7. Analytics Engine (`analytics.js`)
*   `GET /api/analytics/overview`: Fetch CRM metrics overview (sent, replied, conversion rates) over a custom time range.
*   `GET /api/analytics/campaign/:id`: Fetch analytics counters for a specific campaign.
*   `GET /api/analytics/activity`: Fetch recent activity feed.

#### 8. Content Studio (`content.js`)
*   `POST /api/content/generate`: Call AI service to generate marketing copy (SMS, Email, Instagram, LinkedIn).

#### 9. Live Events & Webhooks (`events.js`, `webhooks/whatsapp.js`)
*   `GET /api/events`: SSE stream endpoint feeding real-time updates to UI.
*   `POST /webhook/whatsapp/incoming`: Twilio webhook routing replies to the AI loop.
*   `POST /webhook/whatsapp/status`: Twilio delivery receipts callback.

---

### B. AI Engine Service (`ai_service/main.py`)

All calls are routed internally from the backend Node service.

*   `POST /agent/message`: Processes a chat message. Accepts `{thread_id, message, kb_id, campaign_config}` and returns `{reply, qualification_score, stage, needs_human, brochure_url}`.
*   `POST /kb/{kb_id}/file`: Ingests and uploads files (PDF/Image) to Cloudinary and embeds content.
*   `POST /kb/{kb_id}/url`: Scrapes a URL, segments text, and embeds.
*   `GET /kb/{kb_id}/documents`: Lists all ingested sources.
*   `DELETE /kb/{kb_id}/documents/{source}`: Purges document chunks from database.
*   `POST /content/generate`: Generates multi-platform marketing copies.
*   `GET /health`: Simple ping route returning `{status: "ok"}`.

---

## 4. System Operations

### A. Lead Scoring & Intent Signals
The AI parses customer messages for 5 distinct signals:
1.  **Asked Price**: Inquiries about pricing/cost.
2.  **Timeline**: Moving readiness/timeline.
3.  **Is Decision Maker**: Explicit purchase control.
4.  **Specific Project Interest**: Asking about a specific project (e.g. Life in Blue).
5.  **Budget**: Disclosing budget details.

*Score* is the sum of these signals (0-4). A score of $\ge 3$ coupled with site visit interest triggers a human handoff event (`needs_human: true`).

### B. Server-Sent Events (SSE)
Real-time dashboard updates are powered by SSE.
*   **Establishment**: React establishes a persistent tunnel via `/api/events`.
*   **Broker Mapping**: Backend `sseService` holds connections in a memory Map. When an event fires, it writes to the stream.
*   **Actionable Chime**: When a `handoff` or `hot_lead` event is pushed down, the frontend calls the Web Audio API to synthetically build a double chime and trigger a persistent warning banner on the broker's screen.
