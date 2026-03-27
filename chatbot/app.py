import json
import os
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Banking Chatbot", version="1.0.0")


class ChatRequest(BaseModel):
    question: str
    user: dict[str, Any] | None = None
    transactions: list[dict[str, Any]] = []
    stats: dict[str, Any] = {}


LLM_PROVIDER = os.getenv("LLM_PROVIDER", "none").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")


def to_float(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def format_money(value: float) -> str:
    return f"${value:,.2f}"


def parse_date(date_string: str) -> datetime:
    try:
        return datetime.fromisoformat(date_string.replace("Z", "+00:00"))
    except Exception:
        return datetime.min


def summarize_recent(transactions: list[dict[str, Any]], limit: int = 3) -> str:
    if not transactions:
        return "You do not have any transactions yet."

    ordered = sorted(transactions, key=lambda tx: parse_date(str(tx.get("created_at", ""))), reverse=True)
    lines = []
    for tx in ordered[:limit]:
        tx_type = str(tx.get("type", "unknown")).lower()
        amount = format_money(to_float(tx.get("amount", 0)))
        desc = str(tx.get("description", "No description"))
        lines.append(f"- {tx_type.capitalize()} {amount} for '{desc}'")
    return "Here are your recent transactions:\n" + "\n".join(lines)


def fallback_answer(question: str, stats: dict[str, Any], txs: list[dict[str, Any]]) -> str:
    total_credit = to_float(stats.get("totalCredit", 0))
    total_debit = to_float(stats.get("totalDebit", 0))
    balance = to_float(stats.get("balance", 0))

    if not question:
        return "Please type a question about your transactions or balance."

    if any(word in question for word in ["hello", "hi", "hey"]):
        return (
            "Hello! I can help with your banking transactions. "
            "Try asking: 'What is my balance?', 'How much did I spend?', or 'Show recent transactions'."
        )

    if "balance" in question:
        return f"Your current balance is {format_money(balance)}."

    if any(word in question for word in ["spend", "spent", "debit", "expense"]):
        return f"Your total debits (spending) are {format_money(total_debit)}."

    if any(word in question for word in ["income", "credit", "earned", "deposit"]):
        return f"Your total credits (income) are {format_money(total_credit)}."

    if any(word in question for word in ["recent", "latest", "last transaction"]):
        return summarize_recent(txs)

    if any(word in question for word in ["largest", "highest", "biggest"]):
        if not txs:
            return "You do not have any transactions yet."
        biggest = max(txs, key=lambda tx: to_float(tx.get("amount", 0)))
        amount = format_money(to_float(biggest.get("amount", 0)))
        tx_type = str(biggest.get("type", "unknown")).capitalize()
        desc = str(biggest.get("description", "No description"))
        return f"Your largest transaction is a {tx_type} of {amount} for '{desc}'."

    return (
        "I can answer transaction questions like balance, credits, debits, largest transaction, "
        "and recent activity. Please ask one of these."
    )


def openai_answer(data: ChatRequest) -> str | None:
    if LLM_PROVIDER != "openai" or not OPENAI_API_KEY:
        return None

    transactions_preview = data.transactions[:25]
    prompt = (
        "You are a banking transaction assistant. "
        "Answer only using provided transaction/stat data. "
        "If data is not enough, say so. Keep response short (max 4 lines).\n\n"
        f"User question: {data.question}\n\n"
        f"Stats: {json.dumps(data.stats)}\n"
        f"Recent transactions: {json.dumps(transactions_preview)}"
    )

    payload = json.dumps(
        {
            "model": OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": "You are a concise banking transaction assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{OPENAI_BASE_URL}/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            body = response.read().decode("utf-8")
            parsed = json.loads(body)
            message = parsed["choices"][0]["message"]["content"].strip()
            return message
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError):
        return None


def ollama_answer(data: ChatRequest) -> str | None:
    if LLM_PROVIDER != "ollama":
        return None

    transactions_preview = data.transactions[:25]
    prompt = (
        "You are a banking transaction assistant. "
        "Answer only from the provided transaction/stat data. "
        "If missing information, clearly say so. Keep response short (max 4 lines).\n\n"
        f"User question: {data.question}\n\n"
        f"Stats: {json.dumps(data.stats)}\n"
        f"Recent transactions: {json.dumps(transactions_preview)}"
    )

    payload = json.dumps(
        {
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": "You are a concise banking transaction assistant."},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "options": {"temperature": 0.2},
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            parsed = json.loads(body)
            return parsed["message"]["content"].strip()
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError):
        return None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "banking-chatbot"}


@app.post("/ask")
def ask(data: ChatRequest) -> dict[str, Any]:
    question = data.question.strip().lower()
    stats = data.stats or {}
    txs = data.transactions or []
    llm_result = openai_answer(data)
    if not llm_result:
        llm_result = ollama_answer(data)
    if llm_result:
        return {"answer": llm_result, "source": "llm"}
    return {"answer": fallback_answer(question, stats, txs), "source": "fallback"}
