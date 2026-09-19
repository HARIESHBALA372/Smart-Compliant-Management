from typing import Optional
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import require_role
from app.models.enums import Role
from app.services.analytics_service import (
    get_overview,
    get_complaint_stats,
    get_trends,
    get_category_analytics,
    get_status_analytics,
    get_priority_analytics,
    get_sla_analytics,
    get_agent_analytics,
    get_department_analytics,
    get_location_analytics,
    get_user_analytics,
    get_ml_analytics,
    get_insights,
    export_report_csv,
)
from app.utils.response import success_response

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/sections")
def list_export_sections(
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Export sections fetched", [
        {"id": "complaints", "name": "Complaint Report", "description": "All ticket details, timestamps, and status"},
        {"id": "agents", "name": "Agent Performance Report", "description": "Agent workload and resolution metrics"},
        {"id": "departments", "name": "Department Performance Report", "description": "Department breakdown and SLA stats"},
        {"id": "sla", "name": "SLA Compliance Report", "description": "Breached vs on-time resolution rates"},
    ])

@router.get("/export")
def export_report(
    section: str = "complaints",
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    csv_data = export_report_csv(db, section)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={section}_report.csv",
        },
    )

@router.get("/overview")
def analytics_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Analytics overview fetched", get_overview(db))

@router.get("/complaints")
def analytics_complaints(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Complaint analytics fetched", get_complaint_stats(db))

@router.get("/trends")
def analytics_trends(
    days: int = 14,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Analytics trends fetched", get_trends(db, days))

@router.get("/categories")
def analytics_categories(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Category analytics fetched", get_category_analytics(db))

@router.get("/status")
def analytics_status(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Status analytics fetched", get_status_analytics(db))

@router.get("/priority")
def analytics_priority(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Priority analytics fetched", get_priority_analytics(db))

@router.get("/resolution")
def analytics_resolution(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    overview = get_overview(db)
    return success_response("Resolution analytics fetched", {
        "averageHours": overview["averageResolutionHours"],
        "resolutionRate": overview["resolutionRate"],
        "slaCompliance": overview["slaCompliance"],
    })

@router.get("/sla")
def analytics_sla(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("SLA analytics fetched", get_sla_analytics(db))

@router.get("/agents")
def analytics_agents(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Agent performance analytics fetched", get_agent_analytics(db))

@router.get("/departments")
def analytics_departments(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Department analytics fetched", get_department_analytics(db))

@router.get("/locations")
def analytics_locations(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Location analytics fetched", get_location_analytics(db))

@router.get("/users")
def analytics_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("User analytics fetched", get_user_analytics(db))

@router.get("/ml")
def analytics_ml(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("ML model analytics fetched", get_ml_analytics(db))

@router.get("/insights")
def analytics_insights(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.STAFF, Role.ADMIN)),
):
    return success_response("Automated insights fetched", get_insights(db))
