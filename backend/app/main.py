import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.database import engine, Base
from app.api import api_router
from app.services.websocket_manager import ws_manager
from app.utils.security import decode_access_token
from app.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Ensure SQLite tables exist
    Base.metadata.create_all(bind=engine)
    # Seed database if empty
    seed_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include all /api routes
app.include_router(api_router)

# Also mount sub-routers directly without /api prefix as aliases
# so that requests to /auth/*, /complaints/*, etc. succeed whether or not the client includes /api
from app.api import (
    health as health_api,
    auth as auth_api,
    complaints as complaints_api,
    notifications as notif_api,
    feedback as feedback_api,
    departments as dept_api,
    dashboard as dash_api,
    agent as agent_api,
    analytics as analytics_api,
    admin as admin_api,
)
app.include_router(health_api.router)
app.include_router(auth_api.router)
app.include_router(complaints_api.router)
app.include_router(notif_api.router)
app.include_router(feedback_api.router)
app.include_router(dept_api.router)
app.include_router(dash_api.router)
app.include_router(agent_api.router)
app.include_router(analytics_api.router)
app.include_router(admin_api.router)


# Root endpoint
@app.get("/")
def root():
    return {
        "success": True,
        "message": "Smart Complaint Management API (Python / SQLite)",
        "docs": "/api/docs",
        "health": "/api/health",
    }

# Real-time WebSocket endpoint: ws://localhost:4000/ws?token=<jwt>
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("userId"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload["userId"]
    await ws_manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # Client can send ping or custom messages
    except WebSocketDisconnect:
        await ws_manager.disconnect(user_id, websocket)
    except Exception:
        await ws_manager.disconnect(user_id, websocket)

# Consistent Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error": exc.detail,
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append({"field": field, "message": err["msg"]})

    first_msg = errors[0]["message"] if errors else "Validation failed"
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": first_msg,
            "error": errors,
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred",
            "error": str(exc),
        },
    )
