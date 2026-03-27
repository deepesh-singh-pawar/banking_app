# Banking Application (Dockerized with AI Chatbot)

A complete banking application with:
- **Frontend**: React + Vite UI
- **Backend**: Node.js + Express REST API
- **Database**: PostgreSQL
- **AI Chatbot**: Lightweight FastAPI service for transaction Q&A
- **Auth**: Registration + Login with JWT
- **Transactions**: Create and list transactions with credit/debit summaries

## Architecture

1. **Frontend (`frontend`)**
   - Provides login/register screens and transaction dashboard.
   - Calls backend APIs using `VITE_API_BASE_URL`.

2. **Backend (`backend`)**
   - REST API under `/api`.
   - Handles authentication, JWT validation, and transaction logic.
   - Stores users and transactions in PostgreSQL.
   - Forwards chatbot questions to chatbot service with user transaction context.

3. **Database (`database`)**
   - PostgreSQL service with schema initialization from `database/init.sql`.

4. **Chatbot (`chatbot`)**
   - Lightweight FastAPI microservice.
   - Supports optional **LLM mode** with OpenAI or Ollama.
   - Automatically falls back to local lightweight logic if no API key is configured.

## Project Structure

```text
.
├─ docker-compose.yml
├─ README.md
├─ chatbot/
│  ├─ Dockerfile
│  ├─ requirements.txt
│  └─ app.py
├─ database/
│  └─ init.sql
├─ backend/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ src/
│     ├─ index.js
│     ├─ db.js
│     ├─ middleware/
│     │  └─ auth.js
│     └─ routes/
│        ├─ auth.js
│        ├─ chatbot.js
│        └─ transactions.js
└─ frontend/
   ├─ Dockerfile
   ├─ package.json
   ├─ index.html
   ├─ vite.config.js
   └─ src/
      ├─ main.jsx
      ├─ App.jsx
      ├─ api.js
      └─ styles.css
```

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with modern Docker Desktop)

## Run the Application

From the project root:

```bash
docker compose up --build
```

Services will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`
- Database: `localhost:5432`
- Chatbot service: `http://localhost:8000`
- Ollama (optional local LLM): `http://localhost:11434`

## Stop the Application

```bash
docker compose down
```

To also remove database volume:

```bash
docker compose down -v
```

## API Overview

### Health Check
- `GET /health`

### Authentication
- `POST /api/auth/register`
  - Body:
    ```json
    {
      "fullName": "John Doe",
      "email": "john@example.com",
      "password": "secret123"
    }
    ```
- `POST /api/auth/login`
  - Body:
    ```json
    {
      "email": "john@example.com",
      "password": "secret123"
    }
    ```

### Transactions (JWT required)
- `GET /api/transactions`
- `POST /api/transactions`
  - Body:
    ```json
    {
      "amount": 1200.00,
      "type": "credit",
      "description": "Salary"
    }
    ```

### Chatbot (JWT required)
- `POST /api/chatbot/ask`
  - Body:
    ```json
    {
      "question": "What is my current balance?"
    }
    ```
  - Response:
    ```json
    {
      "answer": "Your current balance is $1,000.50."
    }
    ```
  - Additional metadata:
    - `source: "llm"` when LLM provider is used
    - `source: "fallback"` when local lightweight logic is used

## Environment Variables

Defined in `docker-compose.yml` for easy replication:

- Backend:
  - `PORT`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGIN`
  - `CHATBOT_URL`
- Frontend:
  - `VITE_API_BASE_URL`
- Database:
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
- Chatbot:
  - `LLM_PROVIDER` (`none`, `openai`, or `ollama`)
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (default `gpt-4o-mini`)
  - `OPENAI_BASE_URL` (default `https://api.openai.com/v1`)
  - `OLLAMA_MODEL` (default `llama3.2:3b`)
  - `OLLAMA_BASE_URL` (default `http://ollama:11434`)

## Enable Real LLM Mode (OpenAI)

By default chatbot runs in lightweight fallback mode.

To enable OpenAI-backed answers:

1. Open `docker-compose.yml`
2. Under `chatbot.environment` set:
   - `LLM_PROVIDER: openai`
   - `OPENAI_API_KEY: <your_api_key>`
3. (Optional) Change `OPENAI_MODEL`
4. Rebuild and restart:

```bash
docker compose up --build -d
```

If API key is missing/invalid or provider is unreachable, chatbot auto-falls back to local mode so the app continues working.

## Enable Real LLM Mode (Ollama - Fully Local)

This option runs a local LLM in Docker (no cloud API key required).

1. Start app + Ollama profile:

```bash
docker compose --profile llm-local up --build -d
```

2. Pull a model inside Ollama container (one-time setup):

```bash
docker compose exec ollama ollama pull llama3.2:3b
```

3. In `docker-compose.yml` set chatbot provider:
   - `LLM_PROVIDER: ollama`
   - `OLLAMA_MODEL: llama3.2:3b`

4. Restart services:

```bash
docker compose --profile llm-local up -d
```

Notes:
- First model pull can take time and disk space depending on model size.
- If Ollama model is unavailable, chatbot gracefully falls back to local rule-based answers.

## Replication Notes

To replicate on another machine:

1. Copy the full project folder.
2. Ensure Docker Desktop is installed and running.
3. Run `docker compose up --build`.
4. Open `http://localhost:5173`.

No manual DB setup is required because schema is automatically created from `database/init.sql`.
No model download is required for fallback mode; chatbot starts quickly.
Ollama mode requires model download.

## Security Notes (Important for Production)

This project is configured for local development/demo. For production:
- Use a strong `JWT_SECRET`.
- Store secrets in `.env` or secret managers (not plain compose files).
- Add HTTPS and secure reverse proxy.
- Add rate limiting, request validation, and audit logging.
- Add role-based authorization if required.
- Add monitoring/tracing between backend and chatbot services.

## Future Improvements

- Add pagination/filtering for transactions.
- Add unit/integration tests.
- Add account types and transfer features.
- Add password reset and email verification.
- Upgrade chatbot with LLM provider integration and intent confidence scoring.
