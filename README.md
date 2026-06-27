# Real Estate CRM & Outbound AI WhatsApp Agent

An autonomous, multi-tenant Real Estate CRM platform integrated with a stateful WhatsApp Sales Agent. The system manages customer acquisition, schedules property site visits, hosts marketing knowledge bases, and provides real-time chat dashboards for human takeover.

---

## 🚀 Key Features

*   **Stateful AI Sales Representative**: Powered by `LangGraph` and `Llama-3.3-70b`, the agent acts as an autonomous sales rep ("Pranjal") answering pricing, configuration, and amenity queries.
*   **Outbound Campaigns**: Create marketing drafts, customize languages/tones, and launch outreach to lead rosters.
*   **Dynamic Lead Scoring**: AI detects intent signals (*budget, timeline, decision-maker authority*) to qualify leads (0 to 4 score) and flags hot leads.
*   **Cloudinary CDN Integration**: Upload brochures (PDFs) and project renders. Files are mirrored to Cloudinary and indexed inside `pgvector` for instant retrieval.
*   **Live Chat & SSE Hand-off**: Server-Sent Events (SSE) provide live chat. If a lead qualifies or requests human assistance, the dashboard sounds an audio chime and triggers alerts for human takeover.
*   **Site Calendar Scheduling**: Customers can query slot availability and schedule property site visits autonomously via WhatsApp.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Zustand, Axios, EventSource (SSE client) |
| **Backend API** | Node.js, Express, Prisma ORM, Multer, Twilio SDK |
| **AI Service** | Python 3.11, FastAPI, LangGraph, LangChain, Cloudinary SDK |
| **Database** | PostgreSQL + `pgvector` (Vector database similarity lookup) |

---

## 📚 Technical Documentation

We have compiled detailed guides inside the repository:

1.  👉 **[System Architecture & API Catalog](project.md)**: Explore the database models, API endpoint parameters, lead scoring rules, and SSE stream details.
2.  👉 **[Local Installation & Setup Guide](setup_guide.md)**: Step-by-step instructions to configure your environment (`.env`), run Prisma migrations, spin up the python service, and set up Twilio webhook forwarding.

---

## ⚡ Quick Start (Local Run)

For detailed step-by-step guidance, refer to the [Setup Guide](setup_guide.md). Here is the summary:

### 1. Environment Configurations
Create a `.env` in the root workspace folder with your Twilio, Groq, Cloudinary, and PostgreSQL variables.

### 2. Database & Express Server
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 3. FastAPI AI Service
```bash
cd ../ai_service
python -m venv venv
# Activate virtualenv (On Windows: .\venv\Scripts\activate)
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 4. Vite Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.
