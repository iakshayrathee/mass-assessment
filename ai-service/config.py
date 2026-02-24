import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

load_dotenv()

# ─── LLM Configuration ──────────────────────────────

def get_primary_llm(temperature: float = 0.3):
    """Get the primary LLM (Gemini 2.0 Flash)."""
    return ChatGoogleGenerativeAI(
        model=os.getenv("PRIMARY_MODEL", "gemini-2.0-flash"),
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=temperature,
        max_output_tokens=2048,
    )


def get_fallback_llm(temperature: float = 0.3):
    """Get the fallback LLM (GPT-4o-mini)."""
    return ChatOpenAI(
        model=os.getenv("FALLBACK_MODEL", "gpt-4o-mini"),
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=temperature,
        max_tokens=2048,
    )


def get_llm(temperature: float = 0.3):
    """Get LLM — uses OpenAI GPT-4o-mini."""
    return get_fallback_llm(temperature)


# ─── LangSmith Configuration ────────────────────────

def setup_langsmith():
    """Configure LangSmith tracing if enabled."""
    if os.getenv("LANGSMITH_TRACING", "false").lower() == "true":
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGSMITH_API_KEY", "")
        os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGSMITH_PROJECT", "mass-assessment")


# ─── Redis Client ────────────────────────────────────

_redis_client = None

def get_redis_client():
    """Get a Redis client instance (lazy singleton)."""
    global _redis_client
    if _redis_client is None:
        import redis
        _redis_client = redis.Redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            decode_responses=True,
        )
    return _redis_client


# ─── Other Config ────────────────────────────────────

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")

# Auto-initialize LangSmith on import
setup_langsmith()
