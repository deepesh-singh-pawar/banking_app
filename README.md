# Banking Application (3-Tier, Dockerized)

A complete 3-tier banking application with:
- **Frontend**: React + Vite UI
- **Backend**: Node.js + Express REST API
- **Database**: PostgreSQL
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

3. **Database (`database`)**
   - PostgreSQL service with schema initialization from `database/init.sql`.

## Project Structure

```text
.
├─ docker-compose.yml
├─ README.md
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

## Environment Variables

Defined in `docker-compose.yml` for easy replication:

- Backend:
  - `PORT`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGIN`
- Frontend:
  - `VITE_API_BASE_URL`
- Database:
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`

## Replication Notes

To replicate on another machine:

1. Copy the full project folder.
2. Ensure Docker Desktop is installed and running.
3. Run `docker compose up --build`.
4. Open `http://localhost:5173`.

No manual DB setup is required because schema is automatically created from `database/init.sql`.

## Security Notes (Important for Production)

This project is configured for local development/demo. For production:
- Use a strong `JWT_SECRET`.
- Store secrets in `.env` or secret managers (not plain compose files).
- Add HTTPS and secure reverse proxy.
- Add rate limiting, request validation, and audit logging.
- Add role-based authorization if required.

## Future Improvements

- Add pagination/filtering for transactions.
- Add unit/integration tests.
- Add account types and transfer features.
- Add password reset and email verification.
