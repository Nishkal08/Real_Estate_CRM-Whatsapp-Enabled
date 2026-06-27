from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import tempfile, os

from agents.graph import build_agent_graph
from kb.ingestion.pdf_ingestor import ingest_pdf
from kb.ingestion.web_ingestor import ingest_url
from whatsapp.webhook_handler import parse_twilio_webhook
from whatsapp.sender import send_full_agent_response
from streaming.sse_handler import stream_agent_response, build_input_state
from schemas.agent import AgentMessageRequest
from checkpointer import get_checkpointer
from config.settings import settings

app = FastAPI(title="AI Real Estate Agent — Dobariya & Reneev", version="3.0")

# CORS — read from ALLOWED_ORIGINS env var (comma-separated)
# Default allows localhost dev. In production set ALLOWED_ORIGINS to your frontend domain.
_raw_origins = settings.allowed_origins.strip()
if _raw_origins == "*":
    _cors_origins = ["*"]
else:
    _cors_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static uploads
from fastapi.staticfiles import StaticFiles
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Build agent once at startup
agent_graph = build_agent_graph()

# ── AGENT ENDPOINTS ───────────────────────────────────────────────────────────

@app.post("/agent/message")
async def handle_message(payload: AgentMessageRequest):
    """Standard (non-streaming) agent response. Used by backend."""
    config = {"configurable": {"thread_id": payload.thread_id}}
    payload_dict = payload.dict()
    if not payload_dict.get("kb_id") or payload_dict["kb_id"] == "null" or payload_dict["kb_id"] == "None":
        payload_dict["kb_id"] = "main-kb"
    input_state = build_input_state(payload_dict)
    result = agent_graph.invoke(input_state, config=config)
    return {
        "reply":               result.get("last_agent_message", ""),
        "stage":               result.get("stage", ""),
        "qualification_score": result.get("qualification_score", 0),
        "needs_human":         result.get("human_handoff", False),
        "intent_signals":      result.get("intent_signals", []),
        "images_to_send":      result.get("images_to_send", []),
        "brochure_url":        result.get("brochure_url")
    }

@app.get("/agent/state/{thread_id}")
async def get_agent_state(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    state = agent_graph.get_state(config)
    return {"state": state.values}

@app.post("/agent/message/stream")
async def handle_message_stream(payload: AgentMessageRequest):
    """SSE streaming endpoint — token by token response."""
    return await stream_agent_response(payload.dict(), agent_graph)

# ── WHATSAPP WEBHOOK ──────────────────────────────────────────────────────────

@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Twilio fires this when lead sends a WhatsApp message.
    Processes message → runs agent → sends reply back via WhatsApp.
    """
    from fastapi.responses import Response

    # Twilio needs 200 immediately
    parsed = await parse_twilio_webhook(request)
    phone = parsed["from_phone"]
    message = parsed["message_body"]

    if not phone or not message:
        return Response(content="<Response/>", media_type="application/xml")

    payload = {
        "thread_id":       phone,
        "lead_id":         phone,
        "lead_name":       "Lead",
        "message":         message,
        "business_id":     "default",
        "kb_id":           "main-kb", # Changed default_kb to match frontend
        "campaign_id":     "default",
        "campaign_config": {"agent_name": "Pranjal", "agent_tone": "friendly", "language": "en"}
    }

    config = {"configurable": {"thread_id": phone}}
    input_state = build_input_state(payload)
    result = agent_graph.invoke(input_state, config=config)

    # Send full response back via WhatsApp
    send_full_agent_response(
        to_phone=phone,
        text_reply=result.get("last_agent_message", ""),
        images=result.get("images_to_send", []),
        brochure_url=result.get("brochure_url")
    )

    return Response(content="<Response/>", media_type="application/xml")

# ── KB ENDPOINTS ──────────────────────────────────────────────────────────────

@app.post("/kb/ingest/pdf")
async def ingest_file_endpoint(
    request: Request,
    file: UploadFile = File(...),
    kb_id: str = Form(...),
    source_label: str = Form("brochure"),
    description: str = Form(None)
):
    """Upload and ingest PDF or Image into knowledge base with custom description."""
    filename = file.filename
    # Clean filename
    clean_filename = "".join([c if c.isalnum() or c in "._-" else "_" for c in filename])
    static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
    uploads_dir = os.path.join(static_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_path = os.path.join(uploads_dir, clean_filename)
    
    # Save the file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    # Build dynamic file URL
    file_url = f"{request.base_url}static/uploads/{clean_filename}"
    print(f"File uploaded to: {file_url}")
    
    # Check if the file is PDF or Image
    is_pdf = clean_filename.lower().endswith(".pdf")
    is_image = any(clean_filename.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"])
    
    result = {"collection_name": f"kb_{kb_id.replace('-', '_')}", "chunk_count": 0}
    
    try:
        from kb.ingestion.pdf_ingestor import get_chroma_db
        from kb.vector_store import get_vector_store
        from langchain_core.documents import Document
        
        if is_pdf:
            try:
                result = ingest_pdf(file_path, kb_id, source_label, description)
            except Exception as pdf_err:
                print(f"[KB] PDF ingest error (using fallback): {pdf_err}")
                clean_name = os.path.splitext(clean_filename)[0].replace("_", " ").replace("-", " ")
                fallback_text = f"Brochure: {clean_name}\nDescription: {description or clean_name}"
                vectorstore = get_chroma_db(kb_id)
                vectorstore.add_documents([Document(page_content=fallback_text, metadata={"source": source_label})])
                result = {"collection_name": f"kb_{kb_id.replace('-', '_')}", "chunk_count": 1}
            # If description is provided, insert an additional structured chunk
            if description and description.strip():
                vectorstore = get_chroma_db(kb_id)
                meta = {"source": file_url}
                doc_text = f"Brochure: {file_url} | Description: {description.strip()}"
                vectorstore.add_documents([Document(page_content=doc_text, metadata=meta)])
                result["chunk_count"] = result.get("chunk_count", 0) + 1
        elif is_image:
            # For images, we only store the structured Image fact chunk
            if description and description.strip():
                vectorstore = get_chroma_db(kb_id)
                meta = {"source": file_url}
                doc_text = f"Image: {file_url} | Description: {description.strip()}"
                vectorstore.add_documents([Document(page_content=doc_text, metadata=meta)])
                result["chunk_count"] = 1
            else:
                # If no description is provided, just store a default one
                vectorstore = get_chroma_db(kb_id)
                meta = {"source": file_url}
                doc_text = f"Image: {file_url} | Description: Project photo"
                vectorstore.add_documents([Document(page_content=doc_text, metadata=meta)])
                result["chunk_count"] = 1
        else:
            # For any other file types, ingest them as plain text if possible
            if clean_filename.lower().endswith(".txt"):
                try:
                    text_content = content.decode("utf-8")
                    from kb.ingestion.chunker import chunk_text
                    chunks = chunk_text(text_content, file_url)
                    if chunks:
                        vectorstore = get_chroma_db(kb_id)
                        vectorstore.add_documents(chunks)
                        result["chunk_count"] = len(chunks)
                except Exception as e:
                    print(f"Txt ingest error: {e}")
                    
        return {"success": True, **result}
    except Exception as e:
        print(f"File ingest error: {e}")
        return {"success": True, "collection_name": f"kb_{kb_id.replace('-', '_')}", "chunk_count": 0}

from schemas.kb import UrlEmbedRequest

@app.post("/kb/ingest/url")
async def ingest_url_endpoint(payload: UrlEmbedRequest):
    """Scrape URL and ingest into knowledge base."""
    result = ingest_url(payload.url, payload.kb_id)
    return {"success": True, **result}

@app.delete("/kb/{kb_id}")
async def delete_kb(kb_id: str):
    """Delete a knowledge base collection."""
    from kb.manager import delete_collection
    delete_collection(kb_id)
    return {"success": True}
    
@app.get("/kb")
@app.get("/kb/")
async def list_kbs():
    """Returns the main KB details for frontend compatibility."""
    return {"success": True, "data": [{"id": "main-kb", "name": "Main Knowledge Base"}]}

@app.get("/kb/{kb_id}/documents")
async def list_documents(kb_id: str):
    """Lists documents in the KB for frontend compatibility."""
    from kb.ingestion.pdf_ingestor import get_chroma_db
    try:
        vectorstore = get_chroma_db(kb_id)
        collection = vectorstore._collection
        data = collection.get(include=["metadatas"])
        
        docs = {}
        for meta in data["metadatas"]:
            if not meta: continue
            src = meta.get("source", "Unknown")
            if src not in docs:
                name = src.split("/")[-1].split("\\")[-1] if ("/" in src or "\\" in src) else src
                docs[src] = {
                    "id": src, 
                    "name": name, 
                    "chunks": 0, 
                    "type": "url" if src.startswith("http") else "pdf",
                    "size": 0,
                    "uploadedAt": ""
                }
            docs[src]["chunks"] += 1
            
        return {"success": True, "data": list(docs.values())}
    except Exception as e:
        print(f"list_documents error: {e}")
        return {"success": True, "data": []}

@app.delete("/kb/{kb_id}/document")
async def delete_document(kb_id: str, source: str):
    from kb.ingestion.pdf_ingestor import get_chroma_db
    try:
        vectorstore = get_chroma_db(kb_id)
        collection = vectorstore._collection
        collection.delete(where={"source": source})
        return {"success": True}
    except Exception as e:
        print(f"delete_document error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to delete document: {e}")

# ── CONTENT STUDIO ENDPOINT ───────────────────────────────────────────────────
from pydantic import BaseModel
from typing import List, Optional

class ContentGenerateRequest(BaseModel):
    type: str
    brief: str
    tone: str
    platforms: Optional[List[str]] = None

@app.post("/content/generate")
async def generate_content_endpoint(payload: ContentGenerateRequest):
    """Generate platform-specific real estate copywriting copy using Mistral LLM."""
    from langchain_core.messages import SystemMessage, HumanMessage
    from langchain_mistralai import ChatMistralAI
    from config.settings import settings
    import json
    import re
    
    llm = ChatMistralAI(
        model="mistral-small-latest",
        api_key=settings.mistral_api_key,
        temperature=0.7,
        max_tokens=1500
    ).bind(response_format={"type": "json_object"})
    
    system_prompt = (
        "You are an expert real estate digital marketer and copywriter.\n\n"
        "Analyze the provided Brief/Topic, Tone, and Type to determine the user's intent. "
        "The user might be asking for specific copywriting (e.g., writing a post/email) OR requesting creative marketing content ideas/hooks/strategies for a project (e.g., 'give me content ideas for...').\n\n"
        "YOUR TASK:\n"
        "Generate customized, highly engaging, and platform-specific digital marketing content for the following 5 platforms: WhatsApp, Instagram, LinkedIn, SMS, and Email.\n"
        "- If the brief is a property/campaign description, generate high-converting promotional copy tailored to it.\n"
        "- If the brief is an instruction/question requesting content ideas, hooks, concepts, or themes (e.g., 'give me content ideas for...', 'how to market...'), you MUST generate actual creative, platform-specific content ideas, visual layouts, hook concepts, and post themes tailored to the project and target audience. Do NOT generate copy promoting the instruction itself.\n\n"
        "CRITICAL RULES:\n"
        "1. DO NOT use static, hardcoded, or irrelevant templates (e.g., do NOT start or wrap messages with generic templates like 'Beat the summer heat with Horizon Group!' or 'We are running a custom campaign for...'). Every response must be uniquely tailored to the specific project name, configurations (e.g., 3 BHK), and target audience (e.g., homeowners) provided in the brief.\n"
        "2. For each platform, provide highly relevant ideas and copy tailored specifically to that platform's character limits, audience, and format:\n"
        "   - WhatsApp: Warm, readable, structured using double-newlines between paragraphs, bold headers (*text*), and bullet points with emojis (🔹). Do NOT use markdown double-asterisk bold (**text**).\n"
        "   - Instagram: Creative caption hooks, list of relevant hashtags (e.g., #LifeInBlue #LuxuryLiving), and a detailed description of the visual layout/concept.\n"
        "   - LinkedIn: Thought-leadership concept, professional/business angle, industry hashtags, and value proposition.\n"
        "   - SMS: Extremely concise and direct call to action/idea under 160 characters.\n"
        "   - Email: Compelling subject line and a structured email strategy/copy with a greeting, benefits, and call to action.\n"
        "3. FORMATTING REQUIREMENT:\n"
        "   - Your response MUST be a valid JSON object containing exactly the keys: 'whatsapp', 'instagram', 'linkedin', 'sms', 'email'.\n"
        "   - Each of these 5 keys MUST map strictly to a single, flat string value. Do NOT use nested JSON objects or lists for any key's value. For platforms like Instagram, LinkedIn, or Email, combine all fields (such as caption/visual description or subject/body) into a single formatted string using newlines ('\\n') within the string value.\n"
        "   - Do NOT wrap the JSON output in markdown code blocks like ```json. Output ONLY the raw JSON string.\n"
        "   - Ensure all quotes inside string values are properly escaped. Never output literal carriage returns or unescaped newlines inside the JSON string values (use '\\n' characters instead)."
    )
    
    user_prompt = f"Brief / Topic: {payload.brief}\nTone: {payload.tone}\nType: {payload.type}"
    
    try:
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        text = response.content.strip()
        
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            text = match.group(1).strip()
            
        # State machine to safely escape literal newlines/carriage returns inside JSON double quotes
        chars = list(text)
        in_quote = False
        escaped = False
        for i in range(len(chars)):
            char = chars[i]
            if char == '"' and not escaped:
                in_quote = not in_quote
            if char == '\\' and not escaped:
                escaped = True
            else:
                escaped = False
                
            if in_quote and char == '\n':
                chars[i] = '\\n'
            elif in_quote and char == '\r':
                chars[i] = ''
                
        cleaned_text = "".join(chars)
        data = json.loads(cleaned_text)
        
        # Post-process to ensure all keys return flat strings if LLM outputted nested structures
        for key in ['whatsapp', 'instagram', 'linkedin', 'sms', 'email']:
            if key in data and isinstance(data[key], dict):
                # Flatten the dictionary to a string
                flat_str = []
                for sub_key, sub_val in data[key].items():
                    title = sub_key.replace('_', ' ').title()
                    flat_str.append(f"[{title}]\n{sub_val}")
                data[key] = "\n\n".join(flat_str)
            elif key not in data:
                data[key] = ""
                
        return data
    except Exception as e:
        print(f"Content generation LLM error: {e}")
        topic_summary = payload.brief.strip()
        if len(topic_summary) > 60:
            topic_summary = topic_summary[:60] + "..."
            
        return {
            "whatsapp": f"✨ Dynamic Campaign Concept: {topic_summary}\n\n- Idea: Run an interactive poll or quiz about premium living preferences.\n- Visuals: Short 10-second walkthrough highlighting key highlights.\n- CTA: Reply INTERESTED to request customized details directly!",
            "instagram": f"📸 Content Hook for {topic_summary}\n\nVisual: High-quality rendering showing structural elements.\nCaption: Reimagining modern design standards. What does your dream space look like?\n\n#HorizonGroup #ModernLiving #DesignInspiration",
            "linkedin": f"💼 Thought Leadership Concept: {topic_summary}\n\nOutline the current market trends, architectural shifts, and sustainable design standards defining modern real estate developments. Highlight how this project addresses these requirements.",
            "sms": f"Horizon Group Idea: Alert leads about {topic_summary[:40]} pre-launch slots. Reply INTERESTED to reserve.",
            "email": f"Subject: Marketing Outline: {topic_summary}\n\nDear Team,\n\nHere is a campaign strategy to promote: {payload.brief}\n\n1. Target Segment: Profile matching the modern homeowner.\n2. Key Messaging: Quality design, smart layout, and convenient location.\n3. Content Plan: Weekly email series and visual project updates.\n\nBest,\nHorizon Group Team"
        }

# ── HEALTH & TEST ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.0", "agent": "Horizon Group RE Agent"}

@app.post("/test/agent")
async def test_agent(message: str, kb_id: str = "main-kb", lead_name: str = "Tester"):
    """Quick test endpoint — no WhatsApp needed."""
    payload = {
        "thread_id":       f"test_{lead_name.lower().replace(' ', '_')}",
        "lead_id":         "test",
        "lead_name":       lead_name,
        "message":         message,
        "business_id":     "test",
        "kb_id":           kb_id,
        "campaign_id":     "test",
        "campaign_config": {"agent_name": "Pranjal", "agent_tone": "friendly", "language": "en"}
    }
    config = {"configurable": {"thread_id": payload["thread_id"]}}
    input_state = build_input_state(payload)
    result = agent_graph.invoke(input_state, config=config)
    return {
        "reply":          result.get("last_agent_message", ""),
        "score":          result.get("qualification_score", 0),
        "stage":          result.get("stage", ""),
        "images":         result.get("images_to_send", []),
        "brochure":       result.get("brochure_url"),
        "needs_human":    result.get("human_handoff", False)
    }
