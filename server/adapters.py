import os
import re
import json
from typing import Dict, Any, List, Optional
import requests

BANNED_WORDS = [
    r"\bcourt-ready\b",
    r"\bguaranteed\b",
    r"\badmissible\b",
    r"\bauthentic\b",
    r"\bfake\b",
    r"\bgenuine\b",
    r"\bcertified\b",
]

def sanitize_output(text: str) -> str:
    cleaned = text
    for pattern in BANNED_WORDS:
        cleaned = re.sub(pattern, "[redacted claim]", cleaned, flags=re.IGNORECASE)
    return cleaned

class LLMAdapter:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "groq").lower()
        self.groq_key = os.getenv("GROQ_API_KEY", "").strip()
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    def is_available(self) -> bool:
        if self.provider == "groq":
            return bool(self.groq_key)
        elif self.provider == "anthropic":
            return bool(self.anthropic_key)
        elif self.provider == "openai":
            return bool(self.openai_key)
        elif self.provider == "gemini":
            return bool(self.gemini_key)
        return False

    def complete(
        self,
        system: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 500,
        response_json: bool = False,
    ) -> Dict[str, Any]:
        if not self.is_available():
            raise ValueError(f"Provider {self.provider} is not configured with an API key")

        if self.provider == "groq":
            target_model = model or os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
            headers = {
                "Authorization": f"Bearer {self.groq_key}",
                "Content-Type": "application/json",
            }
            groq_messages = [{"role": "system", "content": system}] + messages
            payload = {
                "model": target_model,
                "messages": groq_messages,
                "max_tokens": max_tokens,
            }
            if response_json:
                payload["response_format"] = {"type": "json_object"}
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            return {"text": sanitize_output(raw_text), "usage": data.get("usage", {})}

        elif self.provider == "anthropic":
            target_model = model or os.getenv("LLM_MODEL_GUIDE", "claude-3-5-haiku-20241022")
            headers = {
                "x-api-key": self.anthropic_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            anthropic_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
            payload = {
                "model": target_model,
                "max_tokens": max_tokens,
                "system": system,
                "messages": anthropic_messages,
            }
            resp = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            raw_text = "".join([b.get("text", "") for b in data.get("content", [])])
            return {"text": sanitize_output(raw_text), "usage": data.get("usage", {})}

        elif self.provider == "openai":
            target_model = model or "gpt-4o-mini"
            headers = {
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json",
            }
            openai_messages = [{"role": "system", "content": system}] + messages
            payload = {
                "model": target_model,
                "messages": openai_messages,
                "max_tokens": max_tokens,
            }
            if response_json:
                payload["response_format"] = {"type": "json_object"}
            resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            return {"text": sanitize_output(raw_text), "usage": data.get("usage", {})}

        elif self.provider == "gemini":
            target_model = model or "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={self.gemini_key}"
            contents = []
            for m in messages:
                role = "user" if m["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": m["content"]}]})
            payload = {
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": contents,
                "generationConfig": {"maxOutputTokens": max_tokens},
            }
            resp = requests.post(url, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"text": sanitize_output(raw_text), "usage": {}}

        raise ValueError(f"Unsupported provider: {self.provider}")

    def vision(
        self,
        system: str,
        image_b64: str,
        media_type: str = "image/png",
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.is_available():
            raise ValueError(f"Provider {self.provider} vision not configured")

        target_model = model or os.getenv("LLM_MODEL_VISION", "openai/gpt-oss-120b")

        if self.provider == "groq":
            headers = {
                "Authorization": f"Bearer {self.groq_key}",
                "Content-Type": "application/json",
            }
            prompt_content = f"Transcribe and format all text from this screenshot verbatim line by line with timestamps and senders:\n{image_b64}"
            if image_b64.startswith("RAW_TEXT:"):
                prompt_content = f"Clean, structure and normalize this raw OCR text verbatim into clear chat messages with timestamps and senders:\n{image_b64[9:]}"

            groq_messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt_content}
            ]
            payload = {
                "model": target_model,
                "messages": groq_messages,
                "max_tokens": 1000,
            }
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            return {"text": sanitize_output(raw_text), "usage": data.get("usage", {})}

        elif self.provider == "anthropic":
            headers = {
                "x-api-key": self.anthropic_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": target_model,
                "max_tokens": 1000,
                "system": system,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_b64,
                                },
                            },
                            {"type": "text", "text": "Extract all readable text with line breaks from this image verbatim."},
                        ],
                    }
                ],
            }
            resp = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=35)
            resp.raise_for_status()
            data = resp.json()
            raw_text = "".join([b.get("text", "") for b in data.get("content", [])])
            return {"text": sanitize_output(raw_text), "usage": data.get("usage", {})}
        else:
            raise NotImplementedError(f"Vision provider {self.provider} not implemented")
