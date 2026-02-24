"""
Anomaly Detection Agent — LangGraph implementation.
3-node graph: compute_statistics → llm_anomaly_analysis → format_output
"""

import json
import numpy as np
from langgraph.graph import StateGraph, END
from models.states import AnomalyDetectionState
from prompts.anomaly_detection import ANOMALY_ANALYSIS_PROMPT
from config import get_llm


# ─── Node 1: Compute Statistics (Pure Python) ────────

def compute_statistics_node(state: AnomalyDetectionState) -> dict:
    """Calculate class statistics and flag statistical anomalies."""
    students = state["all_student_scores"]
    domains = ["reading", "reading_comp", "spelling", "numeracy", "writing"]

    # Compute class averages and standard deviations
    class_averages = {}
    class_std_devs = {}

    for domain in domains:
        values = [s.get(domain, 0) for s in students]
        if values:
            class_averages[domain] = round(float(np.mean(values)), 1)
            class_std_devs[domain] = round(float(np.std(values)), 1)
        else:
            class_averages[domain] = 0.0
            class_std_devs[domain] = 0.0

    # Detect statistical anomalies
    statistical_anomalies = []

    for student in students:
        name = student.get("student_name", "Unknown")
        sid = student.get("student_id", "")
        scores = {d: student.get(d, 0) for d in domains}

        # Anomaly 1: Score outlier (> 2 std devs from mean in any domain)
        for domain in domains:
            val = scores[domain]
            mean = class_averages[domain]
            std = class_std_devs[domain]
            if std > 0 and abs(val - mean) > 2 * std:
                direction = "above" if val > mean else "below"
                statistical_anomalies.append({
                    "student_name": name,
                    "student_id": sid,
                    "type": "SCORE_OUTLIER",
                    "detail": f"{domain.replace('_', ' ').title()}: {val}% is {round(abs(val - mean) / std, 1)} "
                              f"std devs {direction} class mean ({mean}%)",
                })

        # Anomaly 2: All-zero scores
        if all(scores[d] == 0 for d in domains):
            statistical_anomalies.append({
                "student_name": name,
                "student_id": sid,
                "type": "ALL_ZERO",
                "detail": "All domain scores are 0% — possible missing data or absence",
            })

        # Anomaly 3: Perfect scores across all domains
        if all(scores[d] >= 98 for d in domains):
            statistical_anomalies.append({
                "student_name": name,
                "student_id": sid,
                "type": "ALL_PERFECT",
                "detail": "All domain scores are 98%+ — possible data entry error",
            })

        # Anomaly 4: Extreme variance within a single student
        student_values = list(scores.values())
        if len(student_values) >= 2:
            student_max = max(student_values)
            student_min = min(student_values)
            if student_max - student_min > 50 and student_max > 70:
                low_domains = [d for d in domains if scores[d] < 40]
                high_domains = [d for d in domains if scores[d] > 70]
                if low_domains and high_domains:
                    statistical_anomalies.append({
                        "student_name": name,
                        "student_id": sid,
                        "type": "EXTREME_VARIANCE",
                        "detail": f"Scores range from {student_min}% to {student_max}%: "
                                  f"high in {', '.join(d.replace('_', ' ').title() for d in high_domains)} "
                                  f"but critical in {', '.join(d.replace('_', ' ').title() for d in low_domains)}",
                    })

        # Anomaly 5: Behavioural flag + high scores
        if student.get("behavioural_flag") or student.get("attention_flag"):
            avg = student.get("weighted_average", 0)
            if avg > 85:
                flags = []
                if student.get("attention_flag"):
                    flags.append("attention")
                if student.get("behavioural_flag"):
                    flags.append("behavioural")
                statistical_anomalies.append({
                    "student_name": name,
                    "student_id": sid,
                    "type": "FLAG_SCORE_MISMATCH",
                    "detail": f"Has {'/'.join(flags)} flag(s) but weighted average is {avg}%",
                })

        # Anomaly 6: Tier override without clear justification
        if student.get("is_overridden"):
            statistical_anomalies.append({
                "student_name": name,
                "student_id": sid,
                "type": "TIER_OVERRIDE",
                "detail": "Tier was manually overridden — verify the override is justified",
            })

    return {
        "class_averages": class_averages,
        "class_std_devs": class_std_devs,
        "statistical_anomalies": statistical_anomalies,
    }


# ─── Node 2: LLM Anomaly Analysis ────────────────────

def llm_anomaly_analysis_node(state: AnomalyDetectionState) -> dict:
    """Use LLM to analyse and explain anomalies."""
    statistical_anomalies = state.get("statistical_anomalies", [])

    if not statistical_anomalies:
        return {
            "anomalies": [],
            "summary": "No anomalies detected. Data quality appears good for this class assessment.",
        }

    # Format anomalies for the prompt
    anomaly_text = "\n".join(
        f"- {a['student_name']}: [{a['type']}] {a['detail']}"
        for a in statistical_anomalies
    )

    prompt = ANOMALY_ANALYSIS_PROMPT.format(
        grade=state["grade"],
        statistical_anomalies=anomaly_text,
        class_averages=json.dumps(state.get("class_averages", {})),
        class_std_devs=json.dumps(state.get("class_std_devs", {})),
    )

    llm = get_llm(temperature=0.2)
    response = llm.invoke(prompt)

    # Parse JSON response
    try:
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(text)
        anomalies = result.get("anomalies", [])
        summary = result.get("summary", "")
    except (json.JSONDecodeError, IndexError):
        # Fallback: use statistical anomalies directly
        anomalies = [
            {
                "student_name": a["student_name"],
                "student_id": a["student_id"],
                "issue": a["detail"],
                "severity": "HIGH" if a["type"] in ("ALL_ZERO", "SCORE_OUTLIER") else "MEDIUM",
            }
            for a in statistical_anomalies
        ]
        summary = f"{len(anomalies)} potential data quality issues detected in this assessment."

    return {
        "anomalies": anomalies,
        "summary": summary,
    }


# ─── Node 3: Format Output (Pure Python) ─────────────

def format_output_node(state: AnomalyDetectionState) -> dict:
    """Ensure output structure is consistent."""
    anomalies = state.get("anomalies", [])

    # Ensure each anomaly has required fields
    formatted = []
    for a in anomalies:
        formatted.append({
            "student_name": a.get("student_name", "Unknown"),
            "student_id": a.get("student_id", ""),
            "issue": a.get("issue", ""),
            "severity": a.get("severity", "MEDIUM"),
        })

    return {"anomalies": formatted}


# ─── Build the Graph ─────────────────────────────────

def build_anomaly_detection_graph():
    """Build and compile the Anomaly Detection Agent graph."""
    graph = StateGraph(AnomalyDetectionState)

    graph.add_node("compute_statistics", compute_statistics_node)
    graph.add_node("llm_anomaly_analysis", llm_anomaly_analysis_node)
    graph.add_node("format_output", format_output_node)

    graph.set_entry_point("compute_statistics")
    graph.add_edge("compute_statistics", "llm_anomaly_analysis")
    graph.add_edge("llm_anomaly_analysis", "format_output")
    graph.add_edge("format_output", END)

    return graph.compile()


anomaly_detection_agent = build_anomaly_detection_graph()
