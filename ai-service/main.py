"""
Mass Assessment AI Service — FastAPI Entry Point
Exposes all 5 LangGraph agents as REST endpoints with SSE streaming.
"""

import json
import logging
from fastapi import FastAPI, HTTPException, Query, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from config import CORS_ORIGIN

from models.schemas import (
    TierRationaleRequest, TierRationaleResponse,
    AnomalyDetectionRequest, AnomalyDetectionResponse,
    ReportGenerationRequest, ReportGenerationResponse,
    EscalationRequest, EscalationResponse,
    EducatorChatRequest, EducatorChatResponse,
    DocumentExtractionResponse,
    AnswerScoringRequest, AnswerScoringResponse,
    ObservationSuggestionsRequest, ObservationSuggestionsResponse,
)

from agents.tier_rationale import tier_rationale_agent
from agents.anomaly_detection import anomaly_detection_agent
from agents.report_generation import report_generation_agent
from agents.escalation import escalation_agent
from agents.answer_scoring import answer_scoring_agent
from agents.educator_assistant import (
    educator_assistant_agent,
    load_history_from_redis,
    clear_history_in_redis,
    stream_answer,
)
from langsmith_utils import trace_sync_agent_run

# ─── Setup ───────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="Mass Assessment AI Service",
    description="LangGraph agents for tier rationale, anomaly detection, report generation, escalation, and educator assistant.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ────────────────────────────────────

@app.get("/ai/health")
async def health_check():
    return {"status": "ok", "service": "mass-assessment-ai", "agents": 6}


# ─── Agent 1: Tier Rationale ────────────────────────

@app.post("/ai/agents/tier-rationale", response_model=TierRationaleResponse)
async def run_tier_rationale(request: TierRationaleRequest):
    """Generate a plain-English rationale for a student's tier placement."""
    try:
        logger.info(f"Tier rationale request for student: {request.student_name}")

        initial_state = {
            "student_name": request.student_name,
            "grade": request.grade,
            "domain_scores": {
                "reading": request.domain_scores.reading,
                "reading_comp": request.domain_scores.reading_comp,
                "spelling": request.domain_scores.spelling,
                "numeracy": request.domain_scores.numeracy,
                "writing": request.domain_scores.writing,
            },
            "weighted_average": request.weighted_average,
            "assigned_tier": request.assigned_tier.value,
            "behavioural_flags": {
                "attention_flag": request.behavioural_flags.attention_flag,
                "behavioural_flag": request.behavioural_flags.behavioural_flag,
            },
            "weak_domains": [],
            "trigger_rules": [],
            "rationale": "",
            "intervention_suggestions": [],
        }

        result = trace_sync_agent_run(
            tier_rationale_agent, "tier_rationale", initial_state,
            student_id=request.student_name,
        )

        return TierRationaleResponse(
            rationale=result["rationale"],
            intervention_suggestions=result["intervention_suggestions"],
        )
    except Exception as e:
        logger.error(f"Tier rationale agent failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


# ─── Agent 2: Anomaly Detection ─────────────────────

@app.post("/ai/agents/anomaly-detection", response_model=AnomalyDetectionResponse)
async def run_anomaly_detection(request: AnomalyDetectionRequest):
    """Detect anomalies in student scores for a session."""
    try:
        logger.info(f"Anomaly detection for session: {request.session_id}")

        students_data = []
        for s in request.students:
            students_data.append({
                "student_id": s.student_id,
                "student_name": s.student_name,
                "reading": s.reading,
                "reading_comp": s.reading_comp,
                "spelling": s.spelling,
                "numeracy": s.numeracy,
                "writing": s.writing,
                "weighted_average": s.weighted_average,
                "tier": s.tier.value,
                "attention_flag": s.attention_flag,
                "behavioural_flag": s.behavioural_flag,
                "is_overridden": s.is_overridden,
            })

        initial_state = {
            "session_id": request.session_id,
            "grade": request.grade,
            "all_student_scores": students_data,
            "class_averages": {},
            "class_std_devs": {},
            "statistical_anomalies": [],
            "anomalies": [],
            "summary": "",
        }

        result = trace_sync_agent_run(
            anomaly_detection_agent, "anomaly_detection", initial_state,
            session_id=request.session_id,
        )

        return AnomalyDetectionResponse(
            anomalies=[
                {
                    "student_name": a.get("student_name", ""),
                    "student_id": a.get("student_id", ""),
                    "issue": a.get("issue", ""),
                    "severity": a.get("severity", "MEDIUM"),
                }
                for a in result.get("anomalies", [])
            ],
            summary=result.get("summary", ""),
        )
    except Exception as e:
        logger.error(f"Anomaly detection agent failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


# ─── Agent 3: Report Generation ─────────────────────

@app.post("/ai/agents/report-generation", response_model=ReportGenerationResponse)
async def run_report_generation(request: ReportGenerationRequest):
    """Generate class narrative report with priority actions."""
    try:
        logger.info(f"Report generation for session: {request.session_id}")

        students_data = [s.model_dump() for s in request.students]

        initial_state = {
            "session_id": request.session_id,
            "school_name": request.school_name,
            "grade": request.grade,
            "section": request.section,
            "assessment_date": request.assessment_date,
            "total_students": request.total_students,
            "tier_distribution": request.tier_distribution,
            "domain_averages": request.domain_averages,
            "weakest_domain": "",
            "strongest_domain": "",
            "anomalies_summary": request.anomalies_summary,
            "students": students_data,
            "class_narrative": "",
            "priority_actions": [],
            "school_summary": "",
        }

        result = trace_sync_agent_run(
            report_generation_agent, "report_generation", initial_state,
            session_id=request.session_id,
        )

        return ReportGenerationResponse(
            class_narrative=result["class_narrative"],
            priority_actions=result["priority_actions"],
            school_summary=result["school_summary"],
        )
    except Exception as e:
        logger.error(f"Report generation agent failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


# ─── Agent 4: Escalation ────────────────────────────

@app.post("/ai/agents/escalation", response_model=EscalationResponse)
async def run_escalation(request: EscalationRequest):
    """Generate a referral note for student escalation."""
    try:
        logger.info(f"Escalation for student: {request.student_profile.student_name}")

        initial_state = {
            "student_profile": request.student_profile.model_dump(),
            "domain_scores": {
                "reading": request.domain_scores.reading,
                "reading_comp": request.domain_scores.reading_comp,
                "spelling": request.domain_scores.spelling,
                "numeracy": request.domain_scores.numeracy,
                "writing": request.domain_scores.writing,
            },
            "weighted_average": request.weighted_average,
            "tier": request.tier.value,
            "tier_rationale": request.tier_rationale,
            "behavioural_flags": {
                "attention_flag": request.behavioural_flags.attention_flag,
                "behavioural_flag": request.behavioural_flags.behavioural_flag,
            },
            "educator_override_reason": request.educator_override_reason,
            "context_summary": "",
            "critical_domains": [],
            "referral_note": "",
            "priority_areas": [],
        }

        result = trace_sync_agent_run(
            escalation_agent, "escalation", initial_state,
            student_id=request.student_profile.student_name,
        )

        return EscalationResponse(
            referral_note=result["referral_note"],
            priority_areas=result["priority_areas"],
        )
    except Exception as e:
        logger.error(f"Escalation agent failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


# ─── Agent 5: Educator Assistant ─────────────────────

@app.post("/ai/chat", response_model=EducatorChatResponse)
async def run_educator_chat(
    request: EducatorChatRequest,
    stream: bool = Query(False, description="Enable SSE streaming"),
):
    """Answer educator's natural language questions about their class data."""
    try:
        logger.info(f"Chat from educator {request.educator_id}: {request.question[:100]}")

        # Load conversation history from Redis (ignores client-sent history)
        redis_history = load_history_from_redis(
            request.educator_id, request.session_id
        )

        initial_state = {
            "session_id": request.session_id,
            "educator_id": request.educator_id,
            "conversation_history": redis_history,
            "current_question": request.question,
            "intent": "",
            "db_context": {},
            "session_context": request.session_context or {},
            "answer": "",
        }

        # ── SSE Streaming Mode ──
        if stream:
            from agents.educator_assistant import (
                understand_intent_node, fetch_relevant_data_node,
            )

            async def sse_generator():
                # Phase 1: Emit thinking status immediately
                yield f"data: {json.dumps({'status': 'thinking'})}\n\n"

                # Phase 2: Run intent classification
                intent_result = understand_intent_node(initial_state)
                initial_state.update(intent_result)
                yield f"data: {json.dumps({'status': 'fetching_data'})}\n\n"

                # Phase 3: Fetch session data
                data_result = fetch_relevant_data_node(initial_state)
                initial_state.update(data_result)
                yield f"data: {json.dumps({'status': 'generating'})}\n\n"

                # Phase 4: Stream tokens
                async for token in stream_answer(initial_state):
                    yield f"data: {json.dumps({'token': token})}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(
                sse_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                    "Content-Type": "text/event-stream",
                },
            )

        # ── Standard (non-streaming) Mode ──
        result = trace_sync_agent_run(
            educator_assistant_agent, "educator_assistant", initial_state,
            session_id=request.session_id,
        )

        return EducatorChatResponse(answer=result["answer"])
    except Exception as e:
        logger.error(f"Educator assistant failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


@app.delete("/ai/chat/{session_id}")
async def clear_chat_history(session_id: str, educator_id: str = Query(...)):
    """Clear the conversation history for a specific session."""
    clear_history_in_redis(educator_id, session_id)
    return {"status": "cleared", "session_id": session_id}


# ─── Agent 6: Document Extraction ──────────────────

@app.post("/ai/extract-assessment", response_model=DocumentExtractionResponse)
async def extract_assessment(
    file: UploadFile = File(...),
    grade_hint: str = Form(default=""),
):
    """Extract assessment structure from an uploaded PDF/DOCX screening booklet."""
    try:
        logger.info(f"Document extraction: {file.filename}, size={file.size}")

        # Validate file type
        filename = (file.filename or "").lower()
        if filename.endswith(".pdf"):
            file_type = "pdf"
        elif filename.endswith(".docx"):
            file_type = "docx"
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Upload a PDF or DOCX file.",
            )

        file_bytes = await file.read()
        if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        from agents.document_extraction import document_extraction_agent

        initial_state = {
            "file_bytes": file_bytes,
            "file_type": file_type,
            "grade_hint": grade_hint or None,
            "raw_text": "",
            "extracted_json": {},
            "validated": False,
            "errors": [],
        }

        result = trace_sync_agent_run(
            document_extraction_agent, "document_extraction", initial_state,
            session_id="doc-upload",
        )

        extracted = result.get("extracted_json", {})

        return DocumentExtractionResponse(
            title=extracted.get("title", ""),
            grade=extracted.get("grade", grade_hint or ""),
            totalMaxScore=extracted.get("totalMaxScore", 0),
            sections=extracted.get("sections", []),
            domainMaxScores=extracted.get("domainMaxScores", {}),
            hasAttentionObservation=extracted.get("hasAttentionObservation", False),
            attentionBehaviours=extracted.get("attentionBehaviours", []),
            riskGuideline=extracted.get("riskGuideline", {}),
            errors=result.get("errors", []),
            validated=result.get("validated", False),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


# ─── Agent 7: Answer Scoring ────────────────────────

@app.post("/ai/agents/score-answers", response_model=AnswerScoringResponse)
async def run_answer_scoring(request: AnswerScoringRequest):
    """Score student quiz responses using AI."""
    try:
        logger.info(f"Answer scoring request: {len(request.questions)} questions, grade {request.grade}")

        initial_state = {
            "grade": request.grade,
            "questions": [
                {
                    "question_text": q.question_text,
                    "question_type": q.question_type,
                    "student_response": q.student_response,
                    "passage_text": q.passage_text,
                    "instructions": q.instructions,
                }
                for q in request.questions
            ],
            "prepared_batch": "",
            "scored_results": [],
        }

        result = trace_sync_agent_run(
            answer_scoring_agent, "answer_scoring", initial_state,
        )

        return AnswerScoringResponse(
            scored_results=result["scored_results"],
        )
    except Exception as e:
        logger.error(f"Answer scoring agent failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


# ─── Agent 8: Observation-Based Suggestions ─────────

@app.post("/ai/agents/observation-suggestions", response_model=ObservationSuggestionsResponse)
async def run_observation_suggestions(request: ObservationSuggestionsRequest):
    """Generate suggestions based on educator's observations of a student."""
    try:
        logger.info(f"Observation suggestions for student: {request.student_name}")

        from prompts.tier_rationale import OBSERVATION_SUGGESTIONS_PROMPT
        from config import get_llm

        prompt = OBSERVATION_SUGGESTIONS_PROMPT.format(
            student_name=request.student_name,
            grade=request.grade,
            tier=request.tier.value.replace("_", " "),
            reading=request.domain_scores.reading,
            reading_comp=request.domain_scores.reading_comp,
            spelling=request.domain_scores.spelling,
            numeracy=request.domain_scores.numeracy,
            writing=request.domain_scores.writing,
            weighted_avg=request.weighted_average,
            observations=request.observations,
        )

        llm = get_llm(temperature=0.4)
        response = llm.invoke(prompt)

        # Parse JSON array from response
        try:
            text = response.content.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            suggestions = json.loads(text)
            if not isinstance(suggestions, list):
                suggestions = [str(suggestions)]
        except (json.JSONDecodeError, IndexError):
            suggestions = [
                line.strip().lstrip("- ").lstrip("0123456789.)")
                for line in response.content.strip().split("\n")
                if line.strip() and not line.strip().startswith("```")
            ]

        return ObservationSuggestionsResponse(suggestions=suggestions[:5])
    except Exception as e:
        logger.error(f"Observation suggestions failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


# ─── Run ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
