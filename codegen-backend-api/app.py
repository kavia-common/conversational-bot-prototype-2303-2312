import os
from typing import Any, AsyncGenerator, Dict, Optional

from fastapi import FastAPI, Header, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx

load_dotenv()

APP_TITLE = "CodeGen Backend API"
APP_DESC = "Proxy generation to local Ollama or OpenAI Chat Completions with simple SSE."
APP_VERSION = "0.1.0"

app = FastAPI(
    title=APP_TITLE,
    description=APP_DESC,
    version=APP_VERSION,
    openapi_tags=[
        {"name": "generation", "description": "Code/HTML generation endpoints"},
    ],
)


class GenerateBody(BaseModel):
    prompt: str = Field(..., description="User prompt for page generation")
    provider: Optional[str] = Field(None, description="'ollama' | 'openai'")
    model: Optional[str] = Field(None, description="Model name for chosen provider")


def env(name: str, default: Optional[str] = None) -> Optional[str]:
    v = os.getenv(name, default)
    return v


def redact(msg: str) -> str:
    return msg.replace(os.getenv("OPENAI_API_KEY", "") or "", "***")


async def ollama_adapter(
    prompt: str, model: Optional[str], base_url: Optional[str]
) -> Dict[str, Any]:
    """
    PUBLIC_INTERFACE
    Call Ollama HTTP API to generate a simple HTML from a prompt.
    """
    # Compose a prompt for HTML generation, simple template
    sys_prompt = (
        "You are a UI generator. Produce a complete minimal HTML page without scripts or iframes. "
        "Return raw HTML only."
    )
    payload = {
        "model": model or env("OLLAMA_MODEL", "llama3"),
        "prompt": f"{sys_prompt}\nUser: {prompt}\nAssistant:",
        "stream": False,
    }
    url = (base_url or env("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/") + "/api/generate"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=payload)
    if r.status_code != 200:
        raise RuntimeError(f"Ollama error: {r.text[:200]}")
    data = r.json()
    text = data.get("response", "")
    html = text if "<html" in text.lower() else f"<!doctype html><html><body><pre>{text}</pre></body></html>"
    return {"html": html, "content": "Preview updated.", "messages": None}


async def openai_adapter(prompt: str, model: Optional[str], api_key: Optional[str]) -> Dict[str, Any]:
    """
    PUBLIC_INTERFACE
    Call OpenAI chat.completions REST API and return a generated HTML.
    """
    key = api_key or env("OPENAI_API_KEY", None)
    if not key:
        raise RuntimeError("Missing OpenAI API key")

    m = model or env("OPENAI_MODEL", "gpt-4o-mini")
    url = "https://api.openai.com/v1/chat/completions"
    sys_prompt = (
        "You are a UI generator. Produce a complete minimal HTML page without scripts or iframes. "
        "Return raw HTML only."
    )
    body = {
        "model": m,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "stream": False,
    }
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=headers, json=body)
    if r.status_code != 200:
        raise RuntimeError(f"OpenAI error: {r.text[:200]}")
    data = r.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
    html = content if "<html" in content.lower() else f"<!doctype html><html><body><pre>{content}</pre></body></html>"
    return {"html": html, "content": "Preview updated.", "messages": None}


def pick_provider(req_provider: Optional[str]) -> str:
    pv = (req_provider or env("PROVIDER", "ollama")).lower().strip()
    return "openai" if pv == "openai" else "ollama"


def want_sse(request: Request) -> bool:
    accept = request.headers.get("accept", "")
    return "text/event-stream" in (accept or "").lower()


def sse_event(event: str, data: str) -> bytes:
    return f"event: {event}\ndata: {data}\n\n".encode("utf-8")


@app.post(
    "/api/generate",
    tags=["generation"],
    summary="Generate HTML",
    description="Generate HTML using configured provider (Ollama/OpenAI). Request-time overrides are supported.",
    responses={
        200: {"description": "Generation result (JSON or SSE depending on Accept header)"},
        400: {"description": "Bad request"},
        500: {"description": "Server error"},
    },
)
async def generate(
    request: Request,
    body: GenerateBody,
    x_ollama_base: Optional[str] = Header(None, alias="X-Ollama-Base"),
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key"),
):
    """
    PUBLIC_INTERFACE
    Generate endpoint:
    - Body: prompt (required), provider ('ollama'|'openai'), model
    - Headers: X-Ollama-Base (Ollama base URL override), X-OpenAI-Key (OpenAI key override)
    - Accept:
        * application/json => returns JSON { html, content, messages? }
        * text/event-stream => streams 'chunk' and 'done' events (SSE)
    """
    prompt = (body.prompt or "").strip()
    if not prompt:
        return JSONResponse({"error": "Missing prompt"}, status_code=400)

    provider = pick_provider(body.provider)
    model = (body.model or "").strip() or None

    async def _do_call() -> Dict[str, Any]:
        try:
            if provider == "openai":
                return await openai_adapter(prompt, model, x_openai_key)
            return await ollama_adapter(prompt, model, x_ollama_base)
        except Exception as e:
            # redact sensitive errors
            msg = redact(str(e))[:200]
            raise RuntimeError(msg)

    if want_sse(request):
        async def sse_stream() -> AsyncGenerator[bytes, None]:
            # Simple: send a status chunk, then final done with payload
            yield sse_event("chunk", '{"type":"status","payload":"Generating…"}')
            try:
                result = await _do_call()
                # send code/meta chunks if needed (minimal: final only)
                final = {
                    "done": True,
                    "html": result.get("html") or "",
                    "content": result.get("content") or "Preview updated.",
                }
                import json as _json
                yield sse_event("done", _json.dumps(final))
            except Exception as e:
                import json as _json
                err = {"message": str(e)}
                yield sse_event("error", _json.dumps(err))

        return StreamingResponse(sse_stream(), media_type="text/event-stream")

    try:
        result = await _do_call()
        return JSONResponse(result, status_code=200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
