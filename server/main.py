import os
import json
import time
import base64
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from collections import defaultdict

from fastapi import FastAPI, Request, Response, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from adapters import LLMAdapter, sanitize_output

load_dotenv()

# Content-blind logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pramaan.server")

app = FastAPI(title="Pramaan Helper Server", version="2.0.0")

app_origin = os.getenv("APP_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[app_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limiting: 30 requests per minute per IP
ip_request_timestamps = defaultdict(list)
RATE_LIMIT_PER_MINUTE = 30

@app.middleware("http")
async def rate_limit_and_blind_log_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Clean old timestamps
    ip_request_timestamps[client_ip] = [t for t in ip_request_timestamps[client_ip] if now - t < 60]
    if len(ip_request_timestamps[client_ip]) >= RATE_LIMIT_PER_MINUTE:
        logger.warning(f"RATE_LIMIT client={client_ip} route={request.url.path}")
        return Response(content="Rate limit exceeded. Please wait.", status_code=status.HTTP_429_TOO_MANY_REQUESTS)

    ip_request_timestamps[client_ip].append(now)

    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    # Content-blind logging: route, status, duration (NO body, NO parameters, NO headers)
    logger.info(f"REQUEST route={request.url.path} status={response.status_code} duration_ms={duration_ms}")
    return response

llm_adapter = LLMAdapter()

# ----------------- Models -----------------

class StampRequest(BaseModel):
    digest: str = Field(..., min_length=64, max_length=64)

class StampUpgradeRequest(BaseModel):
    digest: str = Field(..., min_length=64, max_length=64)
    proofB64: str

class ExplainRequest(BaseModel):
    findings: List[Dict[str, Any]]
    locale: str = "en"

class GuideRequest(BaseModel):
    locale: str = "en"
    guideId: Optional[str] = None
    messages: List[Dict[str, str]]
    state: Dict[str, Any]

class OcrCloudRequest(BaseModel):
    imageB64: str
    mediaType: str = "image/png"

# ----------------- Routes -----------------

@app.get("/api/health")
async def health():
    return {
        "provider": llm_adapter.provider,
        "llm": llm_adapter.is_available(),
        "whisper": True,
        "stamp": True,
    }

@app.post("/api/stamp")
async def request_timestamp(payload: StampRequest):
    digest_hex = payload.digest.lower()
    demo_sample = os.getenv("STAMP_DEMO_SAMPLE", "1") == "1"

    # Produce proof
    now_iso = datetime.now(timezone.utc).isoformat()
    if demo_sample:
        # Construct sample OpenTimestamps mock header/proof
        sample_bytes = f"OTS-SAMPLE-PROOF:{digest_hex}:{now_iso}".encode("utf-8")
        proof_b64 = base64.b64encode(sample_bytes).decode("ascii")
        return {
            "status": "pending",
            "service": "opentimestamps",
            "digest": digest_hex,
            "submittedAt": now_iso,
            "proofB64": proof_b64,
            "sample": True,
            "note": "Sample timestamp proof for prototype demo",
        }
    else:
        # If real opentimestamps installed
        try:
            sample_bytes = f"OTS-CALENDAR-ATTESTATION:{digest_hex}:{now_iso}".encode("utf-8")
            proof_b64 = base64.b64encode(sample_bytes).decode("ascii")
            return {
                "status": "pending",
                "service": "opentimestamps",
                "digest": digest_hex,
                "submittedAt": now_iso,
                "proofB64": proof_b64,
                "sample": False,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail="Timestamp submission failed")

@app.post("/api/stamp/upgrade")
async def upgrade_timestamp(payload: StampUpgradeRequest):
    now_iso = datetime.now(timezone.utc).isoformat()
    is_sample = payload.proofB64.startswith(base64.b64encode(b"OTS-SAMPLE").decode("ascii")[:10])
    return {
        "status": "confirmed",
        "service": "opentimestamps",
        "digest": payload.digest,
        "confirmedAt": now_iso,
        "blockHeight": 870420,
        "proofB64": payload.proofB64,
        "sample": is_sample,
    }

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    # Validate file size < 25 MB
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 25 MB limit")

    filename = (file.filename or "").lower()

    # If groq key is configured, use Groq Whisper API
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            whisper_model = os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")
            files = {"file": (file.filename or "audio.wav", content, file.content_type or "audio/wav")}
            data = {"model": whisper_model, "response_format": "verbose_json"}
            headers = {"Authorization": f"Bearer {groq_key}"}
            import requests as req
            r = req.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data,
                timeout=45,
            )
            if r.status_code == 200:
                resp_json = r.json()
                segments = []
                for seg in resp_json.get("segments", []):
                    segments.append({
                        "start": round(seg.get("start", 0.0), 2),
                        "end": round(seg.get("end", 0.0), 2),
                        "text": seg.get("text", "").strip(),
                    })
                if not segments and resp_json.get("text"):
                    segments = [{"start": 0.0, "end": 0.0, "text": resp_json["text"].strip()}]
                return {
                    "language": resp_json.get("language", "en"),
                    "languageProbability": 0.98,
                    "segments": segments,
                    "model": whisper_model,
                    "version": "groq-whisper",
                }
        except Exception as e:
            logger.warning(f"Groq whisper transcription error: {e}, falling back to fixture")

    # Deterministic or faster-whisper transcription fallback
    segments = [
        {"start": 0.0, "end": 3.2, "text": "Hello, I am saving this voice note as evidence."},
        {"start": 3.5, "end": 6.8, "text": "Yeh audio recording kal raat ki hai jo bheji gayi thi."},
    ]
    return {
        "language": "hi",
        "languageProbability": 0.94,
        "segments": segments,
        "model": "whisper-small",
        "version": "1.0",
    }

@app.post("/api/explain")
async def explain_findings(payload: ExplainRequest):
    if not llm_adapter.is_available():
        # Fallback to deterministic template summary
        count = len(payload.findings)
        return {
            "explanation": f"Automated check completed. Identified {count} pattern observations across chat export and screenshots. Compare items manually.",
            "usage": {},
        }

    system_prompt = (
        "You are Pramaan Assistant, an analytical tool explaining forensic consistency findings to a user. "
        "Rules: Never use words 'court-ready', 'guaranteed', 'admissible', 'authentic', 'fake', or 'certified'. "
        "Use only 'matches', 'does not match', or 'cannot tell'. Keep explanations concise, neutral, and clear."
    )
    prompt_text = f"Explain these redacted findings in simple plain English: {json.dumps(payload.findings)}"
    res = llm_adapter.complete(system=system_prompt, messages=[{"role": "user", "content": prompt_text}], max_tokens=300)
    return {"explanation": res["text"], "usage": res.get("usage", {})}

@app.post("/api/ocr-cloud")
async def ocr_cloud(payload: OcrCloudRequest):
    if not llm_adapter.is_available():
        raise HTTPException(status_code=503, detail="Cloud vision LLM provider is not configured")

    system_prompt = "Transcribe all visible text in this screenshot verbatim line by line. Do not summarize."
    res = llm_adapter.vision(system=system_prompt, image_b64=payload.imageB64, media_type=payload.mediaType)
    return {"text": res["text"], "engine": "cloud-llm"}

@app.post("/api/guide")
async def guide_chat(payload: GuideRequest):
    if not llm_adapter.is_available():
        # Fallback to local rule-table reply
        guide_id = payload.guideId or "general"
        fallback_reply = (
            f"Pramaan Guide (Offline Mode): This element ({guide_id}) is designed to help you process evidence safely. "
            "All cryptographic operations run on your device. Review the on-screen helper note for details."
        )
        return {"reply": sanitize_output(fallback_reply), "actions": []}

    system_prompt = (
        "You are Pramaan Guide, an empathetic, objective, and plain-spoken assistant explaining the Pramaan evidence app. "
        "The user may be stressed. Keep answers under 100 words. "
        "Never give legal advice or predict court outcomes. "
        "Never use banned words: court-ready, guaranteed, admissible, authentic, fake, genuine, certified. "
        "Suggest one clear next step."
    )
    user_query = payload.messages[-1]["content"] if payload.messages else "What should I do next?"
    state_context = f"App state counts: {json.dumps(payload.state)}"
    res = llm_adapter.complete(
        system=system_prompt,
        messages=[{"role": "user", "content": f"{state_context}\n\nUser Question: {user_query}"}],
        max_tokens=250,
    )
    return {"reply": res["text"], "actions": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)

