"""
Tier Rationale Agent — LangGraph implementation.
3-node graph: analyse_scores → generate_rationale → generate_interventions
"""

import json
from langgraph.graph import StateGraph, END
from models.states import TierRationaleState
from prompts.tier_rationale import RATIONALE_PROMPT, INTERVENTIONS_PROMPT
from config import get_llm


# ─── Node 1: Analyse Scores (Pure Python) ───────────

def analyse_scores_node(state: TierRationaleState) -> dict:
    """Identify weak domains and which tier rules triggered."""
    scores = state["domain_scores"]
    tier = state["assigned_tier"]

    # Identify weak domains (below 60%)
    weak_domains = []
    for domain, pct in scores.items():
        if pct < 60:
            label = domain.replace("_", " ").title()
            if pct < 40:
                weak_domains.append(f"{label} ({pct}% — critical)")
            else:
                weak_domains.append(f"{label} ({pct}% — below grade level)")

    # Identify which tier rules triggered
    trigger_rules = []
    weighted_avg = state["weighted_average"]

    if tier == "TIER_3":
        if weighted_avg < 50:
            trigger_rules.append(f"Weighted average ({weighted_avg}%) is below 50% Tier 3 threshold")
        critical_domains = [d for d, p in scores.items() if p < 40]
        if len(critical_domains) >= 2:
            trigger_rules.append(f"{len(critical_domains)} domains below critical 40% threshold")
        elif len(critical_domains) == 1:
            trigger_rules.append(f"1 domain below critical 40% threshold")
        flags = state.get("behavioural_flags", {})
        if flags.get("attention_flag") or flags.get("behavioural_flag"):
            trigger_rules.append("Behavioural/attention flags raised during assessment")
    elif tier == "TIER_2":
        if 50 <= weighted_avg < 70:
            trigger_rules.append(f"Weighted average ({weighted_avg}%) is in the 50-70% Tier 2 range")
        at_risk = [d for d, p in scores.items() if 40 <= p < 60]
        if at_risk:
            trigger_rules.append(f"{len(at_risk)} domains in the at-risk range (40-60%)")
    else:  # TIER_1
        trigger_rules.append(f"Weighted average ({weighted_avg}%) is at or above 70%")

    return {
        "weak_domains": weak_domains,
        "trigger_rules": trigger_rules,
    }


# ─── Node 2: Generate Rationale (LLM) ───────────────

def generate_rationale_node(state: TierRationaleState) -> dict:
    """Use LLM to generate a plain-English rationale."""
    scores = state["domain_scores"]
    flags = state.get("behavioural_flags", {})

    flag_text = []
    if flags.get("attention_flag"):
        flag_text.append("Attention flag raised")
    if flags.get("behavioural_flag"):
        flag_text.append("Behavioural flag raised")

    prompt = RATIONALE_PROMPT.format(
        tier=state["assigned_tier"].replace("_", " "),
        student_name=state["student_name"],
        grade=state["grade"],
        reading=scores.get("reading", 0),
        reading_comp=scores.get("reading_comp", 0),
        spelling=scores.get("spelling", 0),
        numeracy=scores.get("numeracy", 0),
        writing=scores.get("writing", 0),
        weighted_avg=state["weighted_average"],
        flags=", ".join(flag_text) if flag_text else "None",
        weak_domains=", ".join(state.get("weak_domains", [])) or "None",
        trigger_rules="; ".join(state.get("trigger_rules", [])) or "None",
    )

    llm = get_llm(temperature=0.3)
    response = llm.invoke(prompt)
    return {"rationale": response.content.strip()}


# ─── Node 3: Generate Interventions (LLM) ────────────

def generate_interventions_node(state: TierRationaleState) -> dict:
    """Use LLM to generate 3-5 intervention suggestions."""
    scores = state["domain_scores"]

    prompt = INTERVENTIONS_PROMPT.format(
        student_name=state["student_name"],
        grade=state["grade"],
        tier=state["assigned_tier"].replace("_", " "),
        weak_domains=", ".join(state.get("weak_domains", [])) or "None",
        reading=scores.get("reading", 0),
        reading_comp=scores.get("reading_comp", 0),
        spelling=scores.get("spelling", 0),
        numeracy=scores.get("numeracy", 0),
        writing=scores.get("writing", 0),
    )

    llm = get_llm(temperature=0.4)
    response = llm.invoke(prompt)

    # Parse JSON array from response
    try:
        text = response.content.strip()
        # Handle markdown code blocks
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        interventions = json.loads(text)
        if not isinstance(interventions, list):
            interventions = [str(interventions)]
    except (json.JSONDecodeError, IndexError):
        # Fallback: split by newlines
        interventions = [
            line.strip().lstrip("- ").lstrip("0123456789.)")
            for line in response.content.strip().split("\n")
            if line.strip() and not line.strip().startswith("```")
        ]

    return {"intervention_suggestions": interventions[:5]}


# ─── Build the Graph ─────────────────────────────────

def build_tier_rationale_graph():
    """Build and compile the Tier Rationale Agent graph."""
    graph = StateGraph(TierRationaleState)

    graph.add_node("analyse_scores", analyse_scores_node)
    graph.add_node("generate_rationale", generate_rationale_node)
    graph.add_node("generate_interventions", generate_interventions_node)

    graph.set_entry_point("analyse_scores")
    graph.add_edge("analyse_scores", "generate_rationale")
    graph.add_edge("generate_rationale", "generate_interventions")
    graph.add_edge("generate_interventions", END)

    return graph.compile()


# Pre-compiled graph instance
tier_rationale_agent = build_tier_rationale_graph()
