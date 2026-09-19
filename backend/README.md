# Smart Complaint Management — Python Backend API

Production-ready REST API & WebSocket server for the Smart Complaint Management App built with **Python**, **FastAPI**, and **SQLite (SQLAlchemy 2.0)**.

**Stack:** Python 3.11+ · FastAPI · Uvicorn · SQLite · SQLAlchemy 2.0 · JWT (PyJWT) · bcrypt · Pydantic v2 · WebSockets · Starlette · Pytest

---

## Quick Start

### 1. Prerequisites
- Python **>= 3.11**
- `pip` package manager

### 2. Set Up Virtual Environment & Dependencies

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # On Windows
# source .venv/bin/activate # On Linux/macOS

pip install -r requirements.txt
```

### 3. Initialize & Seed Database (SQLite)

The SQLite database (`complaints.db`) automatically initializes and seeds on first startup, or you can run the seed script explicitly:

```bash
python run.py --seed
```

This populates:
- **7 Departments** (Water Supply, Electricity, Roads, Sanitation, Public Safety, Transportation, General)
- **12 Complaint Categories**
- **4 SLA Priority Rules** (Low, Medium, High, Critical)
- **Default Accounts** (Password: `Password123!`):
  - Admin: `admin@test.com`
  - Staff (Water): `staff@test.com`
  - Staff (Electricity): `staff2@test.com`
  - Staff (Roads): `staff.roads@test.com`
  - Staff (Sanitation): `staff.sanitation@test.com`
  - Citizen: `user@test.com`
  - Citizen: `user2@test.com`
- **Sample Complaints** with full update timelines, feedback, and notifications.

### 4. Run the API Server

```bash
python run.py
```

The server will be available at:
- **API root:** `http://localhost:4000/api`
- **Interactive Swagger Docs:** `http://localhost:4000/api/docs`
- **Alternative ReDoc:** `http://localhost:4000/api/redoc`
- **Health check:** `http://localhost:4000/api/health`
- **WebSocket URL:** `ws://localhost:4000/ws?token=<ACCESS_TOKEN>`

---

## Running Automated Tests

```bash
.venv\Scripts\pytest tests/test_api.py -v
```

---

## Project Structure

```
backend/
├── app/
│   ├── api/                    # API Route controllers & dependencies
│   │   ├── admin.py            # /api/admin endpoints
│   │   ├── agent.py            # /api/agent dashboard
│   │   ├── analytics.py        # /api/analytics endpoints & CSV export
│   │   ├── auth.py             # /api/auth endpoints (JWT, registration, login)
│   │   ├── complaints.py       # /api/complaints CRUD, file upload, transitions
│   │   ├── dashboard.py        # /api/dashboard summary & overdue
│   │   ├── departments.py      # /api/departments listing & stats
│   │   ├── deps.py             # Auth & role dependencies
│   │   ├── feedback.py         # /api/feedback submission
│   │   ├── health.py           # /api/health and database probe
│   │   └── notifications.py    # /api/notifications management
│   ├── models/                 # SQLAlchemy 2.0 ORM models
│   │   ├── audit.py            # AuditLog
│   │   ├── complaint.py        # Complaint, Attachment, Update, Escalation
│   │   ├── department.py       # Department, ComplaintCategory
│   │   ├── enums.py            # Role, Status, Priority, Category enums
│   │   ├── feedback.py         # Feedback
│   │   ├── notification.py     # Notification
│   │   ├── sla.py              # SlaRule
│   │   └── user.py             # User, NotificationPreferences
│   ├── schemas/                # Pydantic v2 validation models
│   ├── services/               # Core business services
│   │   ├── analytics_service.py # KPI calculations, trends, export
│   │   ├── audit_service.py    # Audit trail logger
│   │   ├── complaint_service.py# Complaint lifecycle & auto-routing
│   │   ├── ml_client.py        # ML microservice client + fallback rules
│   │   ├── notification_service.py # In-app notifications & alerts
│   │   └── websocket_manager.py# Real-time WebSockets connection pool
│   ├── utils/                  # Security (bcrypt, JWT), response formatters, IDs
│   ├── config.py               # Pydantic BaseSettings (.env loader)
│   ├── database.py             # SQLite engine & sessionmaker (PRAGMA foreign_keys)
│   ├── main.py                 # FastAPI application factory & middleware
│   └── seed.py                 # SQLite database seeder
├── tests/                      # Pytest test suite
├── uploads/                    # Local storage for complaint attachments
├── complaints.db               # SQLite database file
├── requirements.txt            # Python dependencies
├── pytest.ini                  # Pytest configuration
├── run.py                      # Main entrypoint script
└── .env                        # Environment configuration
```

---

## Frontend Integration

The existing React frontend connects seamlessly without any modification:
- Frontend `VITE_API_URL` -> `http://localhost:4000/api`
- Frontend `VITE_WS_URL` -> `ws://localhost:4000/ws`