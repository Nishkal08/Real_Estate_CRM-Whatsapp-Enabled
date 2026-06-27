# Project Setup & Local Installation Guide

Follow these step-by-step instructions to set up the Real Estate CRM and AI Agent platform on your local machine.

---

## Prerequisite Software
Ensure you have the following installed:
1.  **Node.js** (v18 or higher)
2.  **Python** (v3.10 or v3.11)
3.  **PostgreSQL** (with the `pgvector` extension enabled) or a hosted Supabase database.
4.  **Git**

---

## 1. Environment Configurations (`.env`)

Create a `.env` file in the **root directory** (`c:\AI_Operations\.env`). Add the following keys:

```ini
# ─── TWILIO API SETTINGS (WhatsApp Gateway) ───
TWILIO_SSID = your_twilio_account_sid
TWILIO_AUTH = your_twilio_auth_token
TWILIO_NUMBER = +14155238886

# ─── LLM API CONFIGURATIONS ───
GROQ_API_KEY = your_groq_api_key_here
MISTRAL_API_KEY = your_mistral_api_key_here
OPENAI_API_KEY = your_openai_api_key_here
GEMINI_API_KEY = your_gemini_api_key_here

# ─── CDN STORAGE CONFIGURATIONS (Cloudinary) ───
CLOUDINARY_CLOUD_NAME = your_cloudinary_cloud_name
CLOUDINARY_KEY = your_cloudinary_api_key
CLOUDINARY_SECRET_KEY = your_cloudinary_api_secret

# ─── DATABASE CONFIGURATION ───
# Must support pgvector. Add pg_bouncer parameters if using connection pooling.
DATABASE_URL = "postgresql://user:password@host:port/database?pgbouncer=true&connection_limit=3"

# ─── DEVELOPMENT REDIRECTS ───
# Redirects all outbound messages to these verified numbers when sandbox mode is active.
SANDBOX_REDIRECT_NUMBERS = "YOUR_CONTACT_NUMBERS"

# ─── JWT CRYPTO SECRETS ───
JWT_SECRET = generate_secure_hex_string
JWT_REFRESH_SECRET = generate_secure_hex_string_2

# ─── SYSTEM NETWORKING CORES ───
ALLOWED_ORIGINS = http://localhost:3000,http://127.0.0.1:3000
AI_SERVICE_URL = http://localhost:8000
BACKEND_URL = http://localhost:5000
```

---

## 2. Backend Installation & Database Setup

1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run Prisma migrations to seed and construct the PostgreSQL relational tables:
    ```bash
    npx prisma migrate dev
    ```
4.  Start the Express server:
    ```bash
    npm run dev
    ```
    *The API will start listening on [http://localhost:5000](http://localhost:5000).*

---

## 3. AI Service Installation

1.  Navigate to the `ai_service/` directory:
    ```bash
    cd ../ai_service
    ```
2.  Set up a Python virtual environment:
    ```bash
    python -m venv venv
    # Activate virtual environment
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the FastAPI internal agent service using Uvicorn:
    ```bash
    python -m uvicorn main:app --host 127.0.0.1 --port 8000
    ```
    *The agent engine will start on [http://127.0.0.1:8000](http://127.0.0.1:8000).*

---

## 4. Frontend Installation

1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Start the Vite developer environment:
    ```bash
    npm run dev
    ```
    *Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 5. Twilio Sandbox Config (First-Time Outreach Only)

To let local webhooks receive message receipts:
1.  Launch a tunneling service (like `ngrok`) pointing to your local Node server:
    ```bash
    ngrok http 5000
    ```
2.  Copy your secure HTTPS address (e.g. `https://abcd-12-34.ngrok-free.app`).
3.  Go to **Twilio Console** $\rightarrow$ Develop $\rightarrow$ Messaging $\rightarrow$ Try it out $\rightarrow$ WhatsApp.
4.  Paste your webhook URL in the sandbox configure settings:
    *   *Incoming Messages*: `https://<ngrok-url>/webhook/whatsapp/incoming`
    *   *Status Callback*: `https://<ngrok-url>/webhook/whatsapp/status`
5.  Send the sandbox phrase (e.g. `join iron-river`) from your personal WhatsApp to the Twilio gateway number (`+1 415 523 8886`).
