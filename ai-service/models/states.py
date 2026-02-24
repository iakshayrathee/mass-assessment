"""LangGraph TypedDict states for all agents."""

from typing import TypedDict, Optional


class TierRationaleState(TypedDict):
    student_name: str
    grade: str
    domain_scores: dict       # {"reading": 70, "numeracy": 30, ...}
    weighted_average: float
    assigned_tier: str        # "TIER_1" | "TIER_2" | "TIER_3"
    behavioural_flags: dict
    # Analysis output (pure Python)
    weak_domains: list[str]
    trigger_rules: list[str]
    # LLM outputs
    rationale: str
    intervention_suggestions: list[str]


class AnomalyDetectionState(TypedDict):
    session_id: str
    grade: str
    all_student_scores: list[dict]
    # Computed by pure Python
    class_averages: dict
    class_std_devs: dict
    statistical_anomalies: list[dict]
    # LLM outputs
    anomalies: list[dict]
    summary: str


class ReportGenerationState(TypedDict):
    session_id: str
    school_name: str
    grade: str
    section: str
    assessment_date: str
    total_students: int
    tier_distribution: dict
    domain_averages: dict
    weakest_domain: str
    strongest_domain: str
    anomalies_summary: str
    students: list[dict]
    # LLM outputs
    class_narrative: str
    priority_actions: list[str]
    school_summary: str


class EscalationState(TypedDict):
    student_profile: dict
    domain_scores: dict
    weighted_average: float
    tier: str
    tier_rationale: str
    behavioural_flags: dict
    educator_override_reason: Optional[str]
    # Compiled context (pure Python)
    context_summary: str
    critical_domains: list[str]
    # LLM outputs
    referral_note: str
    priority_areas: list[str]


class EducatorAssistantState(TypedDict):
    session_id: str
    educator_id: str
    conversation_history: list[dict]
    current_question: str
    # LLM classification
    intent: str
    # Data from backend
    db_context: dict
    session_context: dict
    # LLM output
    answer: str


class AnswerScoringState(TypedDict):
    grade: str
    questions: list[dict]       # [{question_text, question_type, student_response, passage_text?, instructions?}]
    # Prepared by pure Python
    prepared_batch: str         # JSON string for LLM prompt
    # LLM output
    scored_results: list[dict]  # [{questionIdx, score, isCorrect, reasoning}]
