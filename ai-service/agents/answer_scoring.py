"""
Answer Scoring Agent — LangGraph implementation.
2-node graph: prepare_batch → score_answers
Evaluates student quiz responses using LLM.
"""

import json
import logging
from langgraph.graph import StateGraph, END
from models.states import AnswerScoringState
from prompts.answer_scoring import ANSWER_SCORING_PROMPT
from config import get_llm

logger = logging.getLogger("ai-service")


# ─── Node 1: Prepare Batch (Pure Python) ─────────────

def prepare_batch_node(state: AnswerScoringState) -> dict:
    """Format questions + responses into a structured batch for the LLM."""
    questions_for_llm = []

    for i, q in enumerate(state["questions"]):
        entry = {
            "questionIdx": i,
            "questionType": q["question_type"],
            "questionText": q["question_text"],
            "studentResponse": q["student_response"],
        }
        # Include passage text for comprehension questions
        if q.get("passage_text"):
            entry["passageText"] = q["passage_text"]
        # Include instructions if available
        if q.get("instructions"):
            entry["instructions"] = q["instructions"]

        questions_for_llm.append(entry)

    return {"prepared_batch": json.dumps(questions_for_llm, indent=2)}


# ─── Node 2: Score Answers (LLM) ─────────────────────

def score_answers_node(state: AnswerScoringState) -> dict:
    """Send batched questions to LLM for scoring."""
    llm = get_llm(temperature=0.1)  # Low temperature for consistent scoring

    prompt = ANSWER_SCORING_PROMPT.format(
        grade=state["grade"],
        questions_json=state["prepared_batch"],
    )

    response = llm.invoke(prompt)
    raw_text = response.content.strip()

    # Parse JSON response — handle markdown code blocks
    if raw_text.startswith("```"):
        # Strip ```json ... ``` wrapper
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])

    try:
        scored_results = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse LLM scoring response: {raw_text[:200]}")
        # Fallback: score everything as 0
        scored_results = [
            {"questionIdx": i, "score": 0, "reasoning": "AI scoring parse error — defaulting to 0"}
            for i in range(len(state["questions"]))
        ]

    # Validate and normalize the results
    normalized = []
    for i in range(len(state["questions"])):
        # Find the matching result (by questionIdx or by position)
        matching = next((r for r in scored_results if r.get("questionIdx") == i), None)
        if matching:
            normalized.append({
                "questionIdx": i,
                "score": 1 if matching.get("score", 0) == 1 else 0,
                "isCorrect": matching.get("score", 0) == 1,
                "reasoning": matching.get("reasoning", ""),
            })
        else:
            # If missing, default to 0
            normalized.append({
                "questionIdx": i,
                "score": 0,
                "isCorrect": False,
                "reasoning": "No AI result for this question",
            })

    return {"scored_results": normalized}


# ─── Build Graph ──────────────────────────────────────

def build_answer_scoring_graph():
    graph = StateGraph(AnswerScoringState)

    graph.add_node("prepare_batch", prepare_batch_node)
    graph.add_node("score_answers", score_answers_node)

    graph.set_entry_point("prepare_batch")
    graph.add_edge("prepare_batch", "score_answers")
    graph.add_edge("score_answers", END)

    return graph.compile()


answer_scoring_agent = build_answer_scoring_graph()
