from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_mistralai import ChatMistralAI
from pydantic import BaseModel
from typing import List
from agents.state import AgentState
from agents.tools import TOOLS
from utils.prompts import build_system_prompt
from utils.memory import prepare_conversation_context
from config.settings import settings
import time

# Initialize LLMs
llm_primary = ChatMistralAI(
    model="mistral-small-latest",
    api_key=settings.mistral_api_key,
    temperature=0.0,
    max_tokens=900
)

llm_fallback = ChatMistralAI(
    model="mistral-medium-3-5",
    api_key=settings.mistral_api_key,
    temperature=0.0,
    max_tokens=900
)

# Bind tools
llm_primary_with_tools = llm_primary.bind_tools(TOOLS)
llm_fallback_with_tools = llm_fallback.bind_tools(TOOLS)


def conversation_node(state: AgentState) -> dict:
    # Prepare conversation window (last 8 messages + cached summary)
    recent_messages, summary = prepare_conversation_context(
        messages=state["messages"],
        window_size=8,
        summary=state.get("conversation_summary", "")
    )

    # Build system prompt
    system_prompt = build_system_prompt(
        agent_name=state.get("agent_name", "Pranjal"),
        agent_tone=state.get("agent_tone", "friendly"),
        language=state.get("language", "en"),
        conversation_summary=summary,
        qualification_score=state.get("qualification_score", 0),
        stage=state.get("stage", "opener"),
        sentiment=state.get("sentiment", "neutral"),
        intent_signals=state.get("intent_signals", []),
        kb_id=state.get("kb_id") or "main-kb",
        lead_name=state.get("lead_name", "")
    )

    # Build message list
    lc_messages = [SystemMessage(content=system_prompt)]
    for msg in recent_messages:
        if msg["role"] == "lead":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] in ["agent", "human"]:
            lc_messages.append(AIMessage(content=msg["content"]))

    max_retries = 3
    used_fallback = False
    images_found = []
    brochure_found = None
    final_reply = ""
    loop_start = time.time()

    # ReAct-style internal loop (max 5 cycles, 25s wall-clock limit)
    current_messages = list(lc_messages)
    for cycle in range(5):
        if time.time() - loop_start > 25:
            print("[Agent] ReAct loop timeout — using partial response")
            break
        response = None
        for attempt in range(max_retries):
            try:
                if not used_fallback:
                    response = llm_primary_with_tools.invoke(current_messages)
                else:
                    response = llm_fallback_with_tools.invoke(current_messages)
                break
            except Exception as e:
                print(f"LLM call failed (cycle {cycle+1}, attempt {attempt+1}/3) model: {'llama-3.1-8b' if used_fallback else 'llama-3.3-70b'}, error: {e}")
                used_fallback = True  # switch to fallback on any exception
                if attempt < max_retries - 1:
                    time.sleep(1)
                else:
                    try:
                        response = llm_fallback_with_tools.invoke(current_messages)
                    except Exception as final_err:
                        print(f"LLM fallback also failed: {final_err}")
                        raise final_err

        if not response:
            break

        # If the model didn't call any tools, this is our final response!
        if not (hasattr(response, "tool_calls") and response.tool_calls):
            final_reply = response.content
            break

        # Monospaced tool execution logic is appended to current_messages
        current_messages.append(response)

        has_handoff = False
        handoff_reason = ""
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]

            # Execute tool
            result = execute_tool(tool_name, tool_args, state)
            current_messages.append(ToolMessage(content=result, tool_call_id=tool_call["id"]))

            # Parse special results
            if tool_name == "search_knowledge_base":
                import re
                # Find all lines in result containing Image or Brochure
                for line in result.split("\n"):
                    if "Image:" in line:
                        match_url = re.search(r'Image:\s*(https?://[^\s|#|\|]+)', line)
                        if match_url:
                            img_url = match_url.group(1).strip(".,[]()")
                            # Extract description/caption
                            caption = "Project Photo"
                            match_desc = re.search(r'Description:\s*(.+)$', line)
                            if match_desc:
                                caption = match_desc.group(1).strip()
                            
                            # Check if already added
                            exists = any(isinstance(item, dict) and item.get("url") == img_url for item in images_found) or (img_url in images_found)
                            if not exists:
                                images_found.append({"url": img_url, "caption": caption})
                                
                    if "Brochure:" in line:
                        match_url = re.search(r'Brochure:\s*(https?://[^\s|#|\|]+)', line)
                        if match_url and not brochure_found:
                            brochure_found = match_url.group(1).strip(".,[]()")
            elif tool_name == "flag_human_handoff":
                has_handoff = True
                handoff_reason = tool_args.get("reason", "Lead requested human")

        if has_handoff:
            return {
                "human_handoff": True,
                "handoff_reason": handoff_reason,
                "last_agent_message": "Let me connect you with one of our senior consultants right away. They'll be in touch shortly! 🙏",
                "messages": [{"role": "agent", "content": "Let me connect you with one of our senior consultants right away. They'll be in touch shortly! 🙏"}],
                "stage": "handoff",
                "qualification_score": state.get("qualification_score", 0),
                "intent_signals": state.get("intent_signals", []),
                "task_complete": True
            }

    if not final_reply and response and response.content:
        final_reply = response.content

    if not final_reply:
        final_reply = "I'm looking into that for you. Could you give me just a moment? 🙏"

    # Qualification scoring
    signal_map = {
        "asked_price": 1, "mentioned_budget": 1, "mentioned_timeline": 1,
        "is_decision_maker": 1, "specific_project_interest": 1
    }

    last_msg = state["messages"][-1]["content"].lower() if state["messages"] else ""
    new_signals = list(state.get("intent_signals", []))

    signal_keywords = {
        "asked_price":             ["price", "cost", "rate", "budget", "how much", "kitna", "pricing", "lakh", "crore"],
        "mentioned_timeline":      ["when", "possession", "ready", "move in", "kab", "december", "january", "by end", "within", "months", "year"],
        "is_decision_maker":       ["i will buy", "we will buy", "my decision", "i decide", "i'm the decision", "decision maker", "family is on board", "we decide", "final call"],
        "specific_project_interest": ["interested in", "tell me about", "this project", "this flat", "reneev", "life in blue", "dear life", "eden", "levvel", "cornerstone", "forever young"],
        "mentioned_budget":        ["budget is", "can spend", "have budget", "afford", "my budget", "budget flexible", "budget of", "between", "upto", "up to"]
    }

    for signal, keywords in signal_keywords.items():
        if signal not in new_signals:
            if any(kw in last_msg for kw in keywords):
                new_signals.append(signal)

    score = sum(1 for s in new_signals if s in signal_map and signal_map[s] > 0)
    score = min(score, 4)

    # Format reply for WhatsApp
    from utils.formatters import format_for_whatsapp
    
    # Filter images and brochures based on conversation context (latest user message + agent response)
    user_msg = state["messages"][-1]["content"] if state["messages"] else ""
    context_text = f"{user_msg} {final_reply}"
    
    formatted_reply = format_for_whatsapp(
        reply=final_reply,
        brochure_url=brochure_found,
        has_images=len(images_found) > 0
    )

    return {
        "messages": [{"role": "agent", "content": formatted_reply}],
        "last_agent_message": formatted_reply,
        "qualification_score": score,
        "intent_signals": new_signals,
        "stage": determine_stage(score, state.get("stage", "opener")),
        "human_handoff": False,
        "images_to_send": images_found,
        "brochure_url": brochure_found,
        "task_complete": False
    }

def execute_tool(tool_name: str, tool_args: dict, state: AgentState) -> str:
    """Execute a tool by name with given arguments."""
    from agents.tools import (
        search_knowledge_base, flag_human_handoff,
        get_available_slots, book_site_visit
    )
    tool_map = {
        "search_knowledge_base": search_knowledge_base,
        "flag_human_handoff": flag_human_handoff,
        "get_available_slots": get_available_slots,
        "book_site_visit": book_site_visit
    }
    tool_fn = tool_map.get(tool_name)
    if not tool_fn:
        return f"Unknown tool: {tool_name}"
    
    # Inject lead_id/kb_id/etc. if needed by tool parameters but not generated by LLM
    if tool_name == "search_knowledge_base":
        if not tool_args.get("kb_id") or tool_args["kb_id"] == "null" or tool_args["kb_id"] == "None":
            tool_args["kb_id"] = state.get("kb_id") or "main-kb"
    if tool_name == "flag_human_handoff" and "lead_id" not in tool_args:
        tool_args["lead_id"] = state.get("lead_id", "test_lead")
    if tool_name == "get_available_slots" and "business_id" not in tool_args:
        tool_args["business_id"] = state.get("business_id", "default")
    if tool_name == "book_site_visit":
        if "business_id" not in tool_args:
            tool_args["business_id"] = state.get("business_id", "default")
        if "phone" not in tool_args:
            tool_args["phone"] = state.get("lead_phone") or state.get("lead_id") or ""
    
    try:
        return tool_fn.invoke(tool_args)
    except Exception as e:
        return f"Tool error: {str(e)}"

def determine_stage(score: int, current_stage: str) -> str:
    if score >= 3:
        return "qualified"
    if score >= 1:
        return "nurturing"
    if current_stage == "opener":
        return "nurturing"
    return current_stage

def escalation_node(state: AgentState) -> dict:
    """Fires when lead qualifies or requests human."""
    farewell = (
        f"Thank you {state.get('lead_name', 'for your interest')}! 🙏\n"
        f"Our senior consultant will reach out to you shortly "
        f"to discuss further. Have a great day!"
    )
    return {
        "messages": [{"role": "agent", "content": farewell}],
        "last_agent_message": farewell,
        "stage": "handoff",
        "qualification_score": state.get("qualification_score", 0),
        "intent_signals": state.get("intent_signals", []),
        "human_handoff": True,
        "task_complete": True
    }
