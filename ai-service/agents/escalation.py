"""
Escalation Agent — LangGraph implementation.
3-node graph: compile_context → generate_referral_note → validate_output
"""

import json
from langgraph.graph import StateGraph, END
from models.states import EscalationState
from prompts.escalation import REFERRAL_NOTE_PROMPT, PRIORITY_AREAS_PROMPT
from config import get_llm


# ─── Node 1: Compile Context (Pure Python) ───────────

def compile_context_node(state: EscalationState) -> dict:
    """Gather all student data and identify critical domains."""
    scores = state.get("domain_scores", {})
    profile = state.get("student_profile", {})

    # Identify critical domains (below 40%)
    critical_domains = []
    domain_labels = {
        "reading": "Reading",
        "reading_comp": "Reading Comprehension",
        "spelling": "Spelling",
        "numeracy": "Numeracy",
        "writing": "Writing",
    }

    for domain, pct in scores.items():
        if pct < 40:
            label = domain_labels.get(domain, domain)
            critical_domains.append(f"{label} ({pct}%)")
        elif pct < 50:
            label = domain_labels.get(domain, domain)
            critical_domains.append(f"{label} ({pct}% — at risk)")

    # Build context summary
    context_parts = [
        f"Student: {profile.get('student_name', 'Unknown')}, "
        f"Grade {profile.get('grade', '')}{profile.get('section', '')}",
        f"Tier: {state.get('tier', 'Unknown')}",
        f"Weighted Average: {state.get('weighted_average', 0)}%",
    ]

    flags = state.get("behavioural_flags", {})
    if flags.get("attention_flag"):
        context_parts.append("⚠️ Attention flag raised during screening")
    if flags.get("behavioural_flag"):
        context_parts.append("⚠️ Behavioural flag raised during screening")

    override = state.get("educator_override_reason")
    if override:
        context_parts.append(f"Educator override: {override}")

    return {
        "critical_domains": critical_domains,
        "context_summary": "\n".join(context_parts),
    }


# ─── Node 2: Generate Referral Note (LLM) ────────────

def generate_referral_note_node(state: EscalationState) -> dict:
    """Use LLM to generate a structured referral note."""
    profile = state.get("student_profile", {})
    scores = state.get("domain_scores", {})
    flags = state.get("behavioural_flags", {})
    override = state.get("educator_override_reason")

    override_section = ""
    if override:
        override_section = f"EDUCATOR OVERRIDE: Tier was manually adjusted. Reason: {override}"

    prompt = REFERRAL_NOTE_PROMPT.format(
        student_name=profile.get("student_name", "Unknown"),
        grade=profile.get("grade", ""),
        section=profile.get("section", ""),
        dob=profile.get("date_of_birth", ""),
        school_name=profile.get("school_name", ""),
        student_ref=profile.get("student_ref", ""),
        gender=profile.get("gender", ""),
        parent_name=profile.get("parent_name", ""),
        contact_number=profile.get("contact_number", ""),
        reading=scores.get("reading", 0),
        reading_comp=scores.get("reading_comp", 0),
        spelling=scores.get("spelling", 0),
        numeracy=scores.get("numeracy", 0),
        writing=scores.get("writing", 0),
        weighted_avg=state.get("weighted_average", 0),
        tier=state.get("tier", "").replace("_", " "),
        tier_rationale=state.get("tier_rationale", "No rationale available"),
        attention_flag="Yes" if flags.get("attention_flag") else "No",
        behavioural_flag="Yes" if flags.get("behavioural_flag") else "No",
        override_section=override_section,
        critical_domains=", ".join(state.get("critical_domains", [])) or "None identified",
    )

    llm = get_llm(temperature=0.3)
    response = llm.invoke(prompt)
    return {"referral_note": response.content.strip()}


# ─── Node 3: Validate Output (Pure Python) ────────────

def validate_output_node(state: EscalationState) -> dict:
    """Validate and parse priority areas, ensure referral note is present."""
    scores = state.get("domain_scores", {})
    priority_areas = state.get("priority_areas", [])

    # If priority areas weren't set by a separate LLM call, generate them
    if not priority_areas:
        prompt = PRIORITY_AREAS_PROMPT.format(
            reading=scores.get("reading", 0),
            reading_comp=scores.get("reading_comp", 0),
            spelling=scores.get("spelling", 0),
            numeracy=scores.get("numeracy", 0),
            writing=scores.get("writing", 0),
            weighted_avg=state.get("weighted_average", 0),
        )

        llm = get_llm(temperature=0.2)
        response = llm.invoke(prompt)

        try:
            text = response.content.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            priority_areas = json.loads(text)
            if not isinstance(priority_areas, list):
                priority_areas = [str(priority_areas)]
        except (json.JSONDecodeError, IndexError):
            # Fallback from critical domains
            priority_areas = state.get("critical_domains", [])

    # Ensure referral note is present
    referral_note = state.get("referral_note", "")
    if not referral_note:
        referral_note = "ERROR: Referral note generation failed. Please review student data manually."

    return {
        "referral_note": referral_note,
        "priority_areas": priority_areas[:4],
    }


# ─── Build the Graph ─────────────────────────────────

def build_escalation_graph():
    """Build and compile the Escalation Agent graph."""
    graph = StateGraph(EscalationState)

    graph.add_node("compile_context", compile_context_node)
    graph.add_node("generate_referral_note", generate_referral_note_node)
    graph.add_node("validate_output", validate_output_node)

    graph.set_entry_point("compile_context")
    graph.add_edge("compile_context", "generate_referral_note")
    graph.add_edge("generate_referral_note", "validate_output")
    graph.add_edge("validate_output", END)

    return graph.compile()


escalation_agent = build_escalation_graph()
