import asyncio
import json
from fastapi.responses import StreamingResponse
from agents.graph import build_agent_graph
from agents.state import AgentState

async def stream_agent_response(
    payload: dict,
    agent_graph
) -> StreamingResponse:
    """
    Streams agent response token by token via SSE.
    Frontend receives: thinking → tokens → images → done events.
    """

    async def generate():
        config = {"configurable": {"thread_id": payload["thread_id"]}}

        # Initial thinking event
        yield f"data: {json.dumps({'type': 'thinking', 'text': 'Agent is responding...'})}\n\n"
        await asyncio.sleep(0.05)

        try:
            # Run agent graph
            input_state = build_input_state(payload)
            result = agent_graph.invoke(input_state, config=config)

            reply = result.get("last_agent_message", "")

            # Stream reply word by word (simulate streaming for non-streaming models)
            words = reply.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
                await asyncio.sleep(0.03)  # ~30ms per word feels natural

            # Send image URLs
            images = result.get("images_to_send", [])
            if images:
                yield f"data: {json.dumps({'type': 'images', 'urls': images})}\n\n"

            # Send brochure URL
            brochure = result.get("brochure_url")
            if brochure:
                yield f"data: {json.dumps({'type': 'brochure', 'url': brochure})}\n\n"

            # Done event with metadata
            yield f"data: {json.dumps({'type': 'done', 'qualification_score': result.get('qualification_score', 0), 'stage': result.get('stage', ''), 'needs_human': result.get('human_handoff', False)})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )

def build_input_state(payload: dict) -> dict:
    config = payload.get("campaign_config", {}) or {}
    agent_tone = config.get("agentTone", config.get("agent_tone", "friendly"))
    language = config.get("language", "en")

    kb_id = payload.get("kb_id", "")
    if not kb_id or kb_id == "null" or kb_id == "None":
        kb_id = "main-kb"

    # Only pass fields that change per-message.
    # qualification_score, intent_signals, stage, sentiment are intentionally
    # OMITTED so LangGraph checkpointer restores them from the saved thread state.
    # Passing them as 0/[] would reset the conversation progress every call.
    return {
        "lead_id":              payload.get("lead_id", ""),
        "lead_name":            payload.get("lead_name", ""),
        "lead_phone":           payload.get("thread_id", ""),
        "business_id":          payload.get("business_id", ""),
        "kb_id":                kb_id,
        "agent_name":           config.get("agent_name", config.get("agentName", "Pranjal")),
        "agent_tone":           agent_tone,
        "language":             language,
        "messages":             [{"role": "lead", "content": payload["message"]}],
        "conversation_summary": "",
        "last_summary_at":      0,
        "last_agent_message":   "",
        "images_to_send":       [],
        "brochure_url":         None,
        "human_handoff":        False,
        "handoff_reason":       "",
        "task_complete":        False,
        # First-call defaults — checkpointer overrides these on resume
        "qualification_score":  payload.get("qualification_score", 0),
        "intent_signals":       payload.get("intent_signals", []),
        "stage":                payload.get("stage", "opener"),
        "sentiment":            payload.get("sentiment", "neutral"),
        "confidence":           1.0,
        "out_of_scope_count":   0,
    }
