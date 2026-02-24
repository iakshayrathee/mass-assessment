"""
Educator Assistant Agent — LangGraph implementation with Redis memory + streaming.
4-node graph: understand_intent → fetch_relevant_data → generate_answer → update_memory
"""

import json
import httpx
from typing import AsyncIterator
from langgraph.graph import StateGraph, END
from models.states import EducatorAssistantState
from prompts.educator_assistant import (
    INTENT_CLASSIFICATION_PROMPT,
    ANSWER_GENERATION_PROMPT,
)
from config import get_llm, get_redis_client, BACKEND_URL
from langsmith_utils import get_run_config


CHAT_MEMORY_TTL = 86400  # 24 hours


# ─── Redis Memory Helpers ─────────────────────────────

def _redis_key(educator_id: str, session_id: str) -> str:
    return f"chat:{educator_id}:{session_id}"


def load_history_from_redis(educator_id: str, session_id: str) -> list[dict]:
    """Load conversation history from Redis."""
    try:
        r = get_redis_client()
        data = r.get(_redis_key(educator_id, session_id))
        if data:
            return json.loads(data)
    except Exception:
        pass
    return []


def save_history_to_redis(educator_id: str, session_id: str, history: list[dict]):
    """Save conversation history to Redis with TTL."""
    try:
        r = get_redis_client()
        key = _redis_key(educator_id, session_id)
        r.set(key, json.dumps(history), ex=CHAT_MEMORY_TTL)
    except Exception:
        pass


def clear_history_in_redis(educator_id: str, session_id: str):
    """Delete conversation history from Redis."""
    try:
        r = get_redis_client()
        r.delete(_redis_key(educator_id, session_id))
    except Exception:
        pass


# ─── Node 1: Understand Intent (LLM) ─────────────────

def understand_intent_node(state: EducatorAssistantState) -> dict:
    """Classify the educator's question intent."""
    prompt = INTENT_CLASSIFICATION_PROMPT.format(
        question=state["current_question"]
    )

    llm = get_llm(temperature=0.1)
    config = get_run_config("educator_assistant.intent",
                            session_id=state.get("session_id"))
    response = llm.invoke(prompt, config=config)

    intent = response.content.strip().upper()
    valid_intents = ["STUDENT_QUERY", "DOMAIN_QUERY", "TIER_QUERY", "COMPARISON_QUERY", "GENERAL"]
    if intent not in valid_intents:
        intent = "GENERAL"

    return {"intent": intent}


# ─── Node 2: Fetch Relevant Data (HTTP/DB) ────────────

def fetch_relevant_data_node(state: EducatorAssistantState) -> dict:
    """Fetch session data from the Express backend."""
    session_id = state.get("session_id", "")

    if state.get("session_context"):
        return {"db_context": state["session_context"]}

    db_context = {}
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"{BACKEND_URL}/api/sessions/{session_id}/report")
            if resp.status_code == 200:
                db_context = resp.json()
    except Exception as e:
        db_context = {"error": f"Failed to fetch session data: {str(e)}"}

    return {"db_context": db_context}


# ─── Node 3: Generate Answer (LLM) ───────────────────

def generate_answer_node(state: EducatorAssistantState) -> dict:
    """Generate a natural language answer using session context."""
    history = state.get("conversation_history", [])
    history_text = ""
    if history:
        history_text = "\n".join(
            f"{msg.get('role', 'user').title()}: {msg.get('content', '')}"
            for msg in history[-6:]
        )

    db_context = state.get("db_context", {})
    context_text = _format_context_for_llm(db_context)

    prompt = ANSWER_GENERATION_PROMPT.format(
        session_context=context_text,
        question=state["current_question"],
        conversation_history=history_text or "No previous conversation.",
    )

    llm = get_llm(temperature=0.3)
    config = get_run_config("educator_assistant.answer",
                            session_id=state.get("session_id"))
    response = llm.invoke(prompt, config=config)
    return {"answer": response.content.strip()}


# ─── Node 4: Update Memory (Redis) ────────────────────

def update_memory_node(state: EducatorAssistantState) -> dict:
    """Append Q&A to conversation history and persist to Redis."""
    history = list(state.get("conversation_history", []))
    history.append({"role": "user", "content": state["current_question"]})
    history.append({"role": "assistant", "content": state.get("answer", "")})

    # Keep only last 20 messages to avoid token overflow
    if len(history) > 20:
        history = history[-20:]

    # Persist to Redis
    educator_id = state.get("educator_id", "unknown")
    session_id = state.get("session_id", "unknown")
    save_history_to_redis(educator_id, session_id, history)

    return {"conversation_history": history}


# ─── Streaming Answer Generator ──────────────────────

async def stream_answer(state: EducatorAssistantState) -> AsyncIterator[str]:
    """Stream the answer token-by-token for SSE."""
    history = state.get("conversation_history", [])
    history_text = ""
    if history:
        history_text = "\n".join(
            f"{msg.get('role', 'user').title()}: {msg.get('content', '')}"
            for msg in history[-6:]
        )

    db_context = state.get("db_context", {})
    context_text = _format_context_for_llm(db_context)

    prompt = ANSWER_GENERATION_PROMPT.format(
        session_context=context_text,
        question=state["current_question"],
        conversation_history=history_text or "No previous conversation.",
    )

    llm = get_llm(temperature=0.3)
    full_answer = ""
    async for chunk in llm.astream(prompt):
        token = chunk.content
        if token:
            full_answer += token
            yield token

    # Save to Redis after streaming completes
    new_history = list(history)
    new_history.append({"role": "user", "content": state["current_question"]})
    new_history.append({"role": "assistant", "content": full_answer})
    if len(new_history) > 20:
        new_history = new_history[-20:]

    educator_id = state.get("educator_id", "unknown")
    session_id = state.get("session_id", "unknown")
    save_history_to_redis(educator_id, session_id, new_history)


# ─── Helper ──────────────────────────────────────────

def _format_context_for_llm(context: dict) -> str:
    """Format the session/report context into a readable summary for LLM."""
    if not context or "error" in context:
        return json.dumps(context, indent=2)

    parts = []

    session = context.get("session", {})
    if session:
        parts.append(
            f"Class: Grade {session.get('grade', '?')}, Section {session.get('section', '?')}\n"
            f"School: {session.get('schoolName', '?')}\n"
            f"Date: {session.get('assessmentDate', '?')}\n"
            f"Total Students: {session.get('totalStudents', '?')}\n"
            f"Status: {session.get('status', '?')}"
        )

    tiers = context.get("tierDistribution", {})
    if tiers:
        parts.append(
            f"Tier Distribution: Tier 1: {tiers.get('TIER_1', 0)}, "
            f"Tier 2: {tiers.get('TIER_2', 0)}, "
            f"Tier 3: {tiers.get('TIER_3', 0)}"
        )

    avgs = context.get("domainAverages", {})
    if avgs:
        parts.append(
            f"Domain Averages:\n"
            f"  Reading: {avgs.get('reading', 0)}%\n"
            f"  Reading Comp: {avgs.get('readingComp', 0)}%\n"
            f"  Spelling: {avgs.get('spelling', 0)}%\n"
            f"  Numeracy: {avgs.get('numeracy', 0)}%\n"
            f"  Writing: {avgs.get('writing', 0)}%"
        )

    students = context.get("students", [])
    if students:
        student_lines = []
        for s in students[:30]:
            student_lines.append(
                f"  {s.get('studentName', '?')}: "
                f"R={s.get('readingPct', 0)}% RC={s.get('readingCompPct', 0)}% "
                f"S={s.get('spellingPct', 0)}% N={s.get('numeracyPct', 0)}% "
                f"W={s.get('writingPct', 0)}% | Avg={s.get('weightedAverage', 0)}% | "
                f"Tier: {s.get('tier', 'N/A')}"
            )
        parts.append(f"Student Data:\n" + "\n".join(student_lines))

    return "\n\n".join(parts) if parts else "No session data available."


# ─── Build the Graph ─────────────────────────────────

def build_educator_assistant_graph():
    """Build and compile the Educator Assistant Agent graph."""
    graph = StateGraph(EducatorAssistantState)

    graph.add_node("understand_intent", understand_intent_node)
    graph.add_node("fetch_relevant_data", fetch_relevant_data_node)
    graph.add_node("generate_answer", generate_answer_node)
    graph.add_node("update_memory", update_memory_node)

    graph.set_entry_point("understand_intent")
    graph.add_edge("understand_intent", "fetch_relevant_data")
    graph.add_edge("fetch_relevant_data", "generate_answer")
    graph.add_edge("generate_answer", "update_memory")
    graph.add_edge("update_memory", END)

    return graph.compile()


educator_assistant_agent = build_educator_assistant_graph()
