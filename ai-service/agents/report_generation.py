"""
Report Generation Agent — LangGraph implementation.
4-node graph: aggregate_data → generate_class_narrative → generate_priority_actions → generate_school_summary
"""

import json
from langgraph.graph import StateGraph, END
from models.states import ReportGenerationState
from prompts.report_generation import (
    CLASS_NARRATIVE_PROMPT,
    PRIORITY_ACTIONS_PROMPT,
    SCHOOL_SUMMARY_PROMPT,
)
from config import get_llm


# ─── Node 1: Aggregate Data (Pure Python) ────────────

def aggregate_data_node(state: ReportGenerationState) -> dict:
    """Compute weakest/strongest domains from averages."""
    averages = state.get("domain_averages", {})

    if not averages:
        return {
            "weakest_domain": "N/A",
            "strongest_domain": "N/A",
        }

    domain_labels = {
        "reading": "Reading",
        "readingComp": "Reading Comprehension",
        "reading_comp": "Reading Comprehension",
        "spelling": "Spelling",
        "numeracy": "Numeracy",
        "writing": "Writing",
    }

    # Normalize keys
    normalized = {}
    for key, val in averages.items():
        normalized[key] = val

    if normalized:
        weakest_key = min(normalized, key=lambda k: normalized[k])
        strongest_key = max(normalized, key=lambda k: normalized[k])
        weakest_domain = domain_labels.get(weakest_key, weakest_key)
        strongest_domain = domain_labels.get(strongest_key, strongest_key)
    else:
        weakest_domain = "N/A"
        strongest_domain = "N/A"

    return {
        "weakest_domain": weakest_domain,
        "strongest_domain": strongest_domain,
    }


# ─── Node 2: Generate Class Narrative (LLM) ──────────

def generate_class_narrative_node(state: ReportGenerationState) -> dict:
    """Generate 3-4 paragraph class assessment narrative."""
    td = state.get("tier_distribution", {})
    total = state.get("total_students", 1) or 1
    da = state.get("domain_averages", {})

    tier_1 = td.get("TIER_1", 0)
    tier_2 = td.get("TIER_2", 0)
    tier_3 = td.get("TIER_3", 0)

    prompt = CLASS_NARRATIVE_PROMPT.format(
        school_name=state.get("school_name", ""),
        grade=state.get("grade", ""),
        section=state.get("section", ""),
        assessment_date=state.get("assessment_date", ""),
        total_students=total,
        tier_1=tier_1,
        tier_1_pct=round(tier_1 / total * 100),
        tier_2=tier_2,
        tier_2_pct=round(tier_2 / total * 100),
        tier_3=tier_3,
        tier_3_pct=round(tier_3 / total * 100),
        reading_avg=da.get("reading", da.get("readingPct", 0)),
        reading_comp_avg=da.get("readingComp", da.get("reading_comp", da.get("readingCompPct", 0))),
        spelling_avg=da.get("spelling", da.get("spellingPct", 0)),
        numeracy_avg=da.get("numeracy", da.get("numeracyPct", 0)),
        writing_avg=da.get("writing", da.get("writingPct", 0)),
        strongest_domain=state.get("strongest_domain", "N/A"),
        weakest_domain=state.get("weakest_domain", "N/A"),
        anomalies_summary=state.get("anomalies_summary", "None detected."),
    )

    llm = get_llm(temperature=0.4)
    response = llm.invoke(prompt)
    return {"class_narrative": response.content.strip()}


# ─── Node 3: Generate Priority Actions (LLM) ─────────

def generate_priority_actions_node(state: ReportGenerationState) -> dict:
    """Generate top 3 priority actions."""
    td = state.get("tier_distribution", {})
    da = state.get("domain_averages", {})

    weakest_domain = state.get("weakest_domain", "N/A")
    weakest_avg = 0
    for key, val in da.items():
        label = key.replace("_", " ").replace("Pct", "").title()
        if label.lower().replace(" ", "") == weakest_domain.lower().replace(" ", ""):
            weakest_avg = val
            break
    if weakest_avg == 0 and da:
        weakest_avg = min(da.values())

    prompt = PRIORITY_ACTIONS_PROMPT.format(
        tier_1=td.get("TIER_1", 0),
        tier_2=td.get("TIER_2", 0),
        tier_3=td.get("TIER_3", 0),
        weakest_domain=weakest_domain,
        weakest_avg=round(weakest_avg, 1),
    )

    llm = get_llm(temperature=0.3)
    response = llm.invoke(prompt)

    try:
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        actions = json.loads(text)
        if not isinstance(actions, list):
            actions = [str(actions)]
    except (json.JSONDecodeError, IndexError):
        actions = [
            line.strip().lstrip("- ").lstrip("0123456789.)")
            for line in response.content.strip().split("\n")
            if line.strip() and not line.strip().startswith("```")
        ]

    return {"priority_actions": actions[:3]}


# ─── Node 4: Generate School Summary (LLM) ───────────

def generate_school_summary_node(state: ReportGenerationState) -> dict:
    """Generate privacy-safe 1-paragraph school summary."""
    td = state.get("tier_distribution", {})
    total = state.get("total_students", 1) or 1

    tier_1 = td.get("TIER_1", 0)
    tier_2 = td.get("TIER_2", 0)
    tier_3 = td.get("TIER_3", 0)

    prompt = SCHOOL_SUMMARY_PROMPT.format(
        school_name=state.get("school_name", ""),
        grade=state.get("grade", ""),
        section=state.get("section", ""),
        total_students=total,
        tier_1=tier_1,
        tier_1_pct=round(tier_1 / total * 100),
        tier_2=tier_2,
        tier_2_pct=round(tier_2 / total * 100),
        tier_3=tier_3,
        tier_3_pct=round(tier_3 / total * 100),
        weakest_domain=state.get("weakest_domain", "N/A"),
    )

    llm = get_llm(temperature=0.3)
    response = llm.invoke(prompt)
    return {"school_summary": response.content.strip()}


# ─── Build the Graph ─────────────────────────────────

def build_report_generation_graph():
    """Build and compile the Report Generation Agent graph."""
    graph = StateGraph(ReportGenerationState)

    graph.add_node("aggregate_data", aggregate_data_node)
    graph.add_node("generate_class_narrative", generate_class_narrative_node)
    graph.add_node("generate_priority_actions", generate_priority_actions_node)
    graph.add_node("generate_school_summary", generate_school_summary_node)

    graph.set_entry_point("aggregate_data")
    graph.add_edge("aggregate_data", "generate_class_narrative")
    graph.add_edge("generate_class_narrative", "generate_priority_actions")
    graph.add_edge("generate_priority_actions", "generate_school_summary")
    graph.add_edge("generate_school_summary", END)

    return graph.compile()


report_generation_agent = build_report_generation_graph()
