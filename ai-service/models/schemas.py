"""Pydantic models for API request/response schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class TierLevel(str, Enum):
    TIER_1 = "TIER_1"
    TIER_2 = "TIER_2"
    TIER_3 = "TIER_3"


class AnomalySeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


# ─── Tier Rationale Agent ────────────────────────────

class DomainScores(BaseModel):
    reading: float
    reading_comp: float
    spelling: float
    numeracy: float
    writing: float


class BehaviouralFlags(BaseModel):
    attention_flag: bool = False
    behavioural_flag: bool = False


class TierRationaleRequest(BaseModel):
    student_name: str
    grade: str
    domain_scores: DomainScores
    weighted_average: float
    assigned_tier: TierLevel
    behavioural_flags: BehaviouralFlags = BehaviouralFlags()


class TierRationaleResponse(BaseModel):
    rationale: str
    intervention_suggestions: list[str]


# ─── Anomaly Detection Agent ────────────────────────

class StudentScoreData(BaseModel):
    student_id: str
    student_name: str
    reading: float
    reading_comp: float
    spelling: float
    numeracy: float
    writing: float
    weighted_average: float
    tier: TierLevel
    attention_flag: bool = False
    behavioural_flag: bool = False
    is_overridden: bool = False


class AnomalyDetectionRequest(BaseModel):
    session_id: str
    grade: str
    students: list[StudentScoreData]


class AnomalyItem(BaseModel):
    student_name: str
    student_id: str
    issue: str
    severity: AnomalySeverity


class AnomalyDetectionResponse(BaseModel):
    anomalies: list[AnomalyItem]
    summary: str


# ─── Report Generation Agent ────────────────────────

class ReportGenerationRequest(BaseModel):
    session_id: str
    school_name: str
    grade: str
    section: str
    assessment_date: str
    total_students: int
    tier_distribution: dict[str, int]
    domain_averages: dict[str, float]
    anomalies_summary: str = ""
    students: list[StudentScoreData]


class ReportGenerationResponse(BaseModel):
    class_narrative: str
    priority_actions: list[str]
    school_summary: str


# ─── Escalation Agent ───────────────────────────────

class StudentProfile(BaseModel):
    student_name: str
    date_of_birth: str
    grade: str
    section: str
    school_name: str
    student_ref: str
    gender: str
    parent_name: str
    contact_number: str


class EscalationRequest(BaseModel):
    student_profile: StudentProfile
    domain_scores: DomainScores
    weighted_average: float
    tier: TierLevel
    tier_rationale: str = ""
    behavioural_flags: BehaviouralFlags = BehaviouralFlags()
    educator_override_reason: Optional[str] = None


class EscalationResponse(BaseModel):
    referral_note: str
    priority_areas: list[str]


# ─── Educator Assistant ─────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class EducatorChatRequest(BaseModel):
    session_id: str
    educator_id: str
    question: str
    conversation_history: list[ChatMessage] = []
    session_context: Optional[dict] = None


class EducatorChatResponse(BaseModel):
    answer: str


# ─── Document Extraction ────────────────────────────

class AssessmentSection(BaseModel):
    sectionNumber: int
    sectionTitle: str
    domain: str
    parts: list[dict]

class DocumentExtractionResponse(BaseModel):
    title: str = ""
    grade: str = ""
    totalMaxScore: int = 0
    sections: list[AssessmentSection] = []
    domainMaxScores: dict[str, int] = {}
    hasAttentionObservation: bool = False
    attentionBehaviours: list[str] = []
    riskGuideline: dict[str, str] = {}
    errors: list[str] = []
    validated: bool = False


# ─── Answer Scoring Agent ───────────────────────────

class QuestionToScore(BaseModel):
    question_text: str
    question_type: str          # word_read, spelling, math, comprehension, writing
    student_response: str
    passage_text: Optional[str] = None
    instructions: Optional[str] = None

class AnswerScoringRequest(BaseModel):
    grade: str
    questions: list[QuestionToScore]

class ScoredAnswer(BaseModel):
    questionIdx: int
    score: int                  # 1 = correct, 0 = incorrect
    isCorrect: bool
    reasoning: str = ""

class AnswerScoringResponse(BaseModel):
    scored_results: list[ScoredAnswer]


# ─── Observation Suggestions Agent ──────────────────

class ObservationSuggestionsRequest(BaseModel):
    student_name: str
    grade: str
    tier: TierLevel
    domain_scores: DomainScores
    weighted_average: float
    observations: str

class ObservationSuggestionsResponse(BaseModel):
    suggestions: list[str]
