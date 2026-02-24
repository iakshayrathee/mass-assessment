"""LangSmith tracing utilities for all LangGraph agents."""

import os
import time
import logging
from typing import Any, Optional
from functools import wraps

logger = logging.getLogger(__name__)

# ─── Tracing Setup ──────────────────────────────────

def is_tracing_enabled() -> bool:
    """Check if LangSmith tracing is enabled."""
    return os.getenv("LANGSMITH_TRACING", "false").lower() == "true"


def get_langsmith_callbacks() -> list:
    """Return LangSmith callback handlers if tracing is enabled."""
    if not is_tracing_enabled():
        return []

    try:
        from langsmith import Client
        from langchain_core.tracers import LangChainTracer

        tracer = LangChainTracer(
            project_name=os.getenv("LANGSMITH_PROJECT", "mass-assessment"),
        )
        return [tracer]
    except ImportError:
        logger.warning("langsmith not installed; tracing disabled")
        return []
    except Exception as e:
        logger.warning(f"Failed to init LangSmith tracer: {e}")
        return []


def get_run_config(
    agent_name: str,
    session_id: Optional[str] = None,
    student_id: Optional[str] = None,
    extra_metadata: Optional[dict] = None,
) -> dict:
    """Build a RunnableConfig dict with LangSmith callbacks and metadata."""
    callbacks = get_langsmith_callbacks()
    metadata = {
        "agent_name": agent_name,
        "app": "mass-assessment",
    }
    if session_id:
        metadata["session_id"] = session_id
    if student_id:
        metadata["student_id"] = student_id
    if extra_metadata:
        metadata.update(extra_metadata)

    config: dict[str, Any] = {
        "run_name": agent_name,
        "metadata": metadata,
        "tags": ["mass-assessment", agent_name],
    }
    if callbacks:
        config["callbacks"] = callbacks
    return config


# ─── Agent Runner ────────────────────────────────────

async def trace_agent_run(
    graph: Any,
    agent_name: str,
    inputs: dict,
    session_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> dict:
    """
    Run a LangGraph agent with full LangSmith tracing.

    Returns the final state dict from the graph.
    """
    config = get_run_config(agent_name, session_id, student_id)

    start = time.time()
    logger.info(f"[LangSmith] Starting {agent_name} run (session={session_id})")

    try:
        result = await graph.ainvoke(inputs, config=config)
        elapsed = time.time() - start
        logger.info(f"[LangSmith] {agent_name} completed in {elapsed:.2f}s")
        return result
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"[LangSmith] {agent_name} failed after {elapsed:.2f}s: {e}")
        raise


def trace_sync_agent_run(
    graph: Any,
    agent_name: str,
    inputs: dict,
    session_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> dict:
    """Synchronous version of trace_agent_run."""
    config = get_run_config(agent_name, session_id, student_id)

    start = time.time()
    logger.info(f"[LangSmith] Starting {agent_name} sync run")

    try:
        result = graph.invoke(inputs, config=config)
        elapsed = time.time() - start
        logger.info(f"[LangSmith] {agent_name} completed in {elapsed:.2f}s")
        return result
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"[LangSmith] {agent_name} failed after {elapsed:.2f}s: {e}")
        raise


# ─── Token Usage Tracking ───────────────────────────

class TokenTracker:
    """Simple token usage tracker for cost monitoring."""

    def __init__(self):
        self.runs: list[dict] = []

    def log_run(self, agent_name: str, prompt_tokens: int, completion_tokens: int,
                model: str = "gemini-2.0-flash"):
        self.runs.append({
            "agent": agent_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "model": model,
            "timestamp": time.time(),
        })

    def get_session_cost_estimate(self) -> dict:
        """Estimate cost based on Gemini Flash pricing."""
        # Gemini 2.0 Flash: $0.10/1M input, $0.40/1M output
        total_input = sum(r["prompt_tokens"] for r in self.runs)
        total_output = sum(r["completion_tokens"] for r in self.runs)
        estimated_cost = (total_input * 0.10 / 1_000_000) + (total_output * 0.40 / 1_000_000)
        return {
            "total_runs": len(self.runs),
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "estimated_cost_usd": round(estimated_cost, 6),
        }


# Global token tracker instance
token_tracker = TokenTracker()
