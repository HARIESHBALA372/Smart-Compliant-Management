from fastapi import APIRouter
from app.api import (
    health,
    auth,
    complaints,
    notifications,
    feedback,
    departments,
    dashboard,
    agent,
    analytics,
    admin,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(complaints.router)
api_router.include_router(notifications.router)
api_router.include_router(feedback.router)
api_router.include_router(departments.router)
api_router.include_router(dashboard.router)
api_router.include_router(agent.router)
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
