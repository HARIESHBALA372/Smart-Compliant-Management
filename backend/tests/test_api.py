import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"

def test_health_database():
    response = client.get("/api/health/database")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"

def test_login_admin():
    response = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Password123!",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "token" in data["data"]
    assert data["data"]["user"]["role"] == "ADMIN"

def test_login_user():
    response = client.post("/api/auth/login", json={
        "email": "user@test.com",
        "password": "Password123!",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "token" in data["data"]
    assert data["data"]["user"]["role"] == "USER"

def test_login_invalid_password():
    response = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "WrongPassword!",
    })
    assert response.status_code == 401

def test_user_profile():
    # Login as user
    login_res = client.post("/api/auth/login", json={
        "email": "user@test.com",
        "password": "Password123!",
    })
    token = login_res.json()["data"]["token"]

    # Get profile
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["data"]["email"] == "user@test.com"

def test_list_complaints():
    # Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Password123!",
    })
    token = login_res.json()["data"]["token"]

    res = client.get("/api/complaints", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    assert "pagination" in data

def test_create_and_update_complaint():
    # Login as citizen
    login_res = client.post("/api/auth/login", json={
        "email": "user@test.com",
        "password": "Password123!",
    })
    user_token = login_res.json()["data"]["token"]

    # Create complaint
    create_res = client.post(
        "/api/complaints",
        data={
            "title": "Low water pressure in building 4",
            "description": "The water pressure has dropped significantly and taps are dry during the afternoon.",
            "category": "WATER",
            "priority": "HIGH",
            "location": "Sector 4, Building 4",
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert create_res.status_code == 201
    complaint_data = create_res.json()["data"]
    complaint_id = complaint_data["id"]
    assert complaint_data["title"] == "Low water pressure in building 4"
    assert complaint_data["category"] == "WATER"

    # Admin comments on complaint
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Password123!",
    })
    admin_token = admin_login.json()["data"]["token"]

    comment_res = client.post(
        f"/api/complaints/{complaint_id}/comments",
        json={"content": "Inspection scheduled for tomorrow morning."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert comment_res.status_code == 200
    assert comment_res.json()["success"] is True

    # Staff updates status
    staff_login = client.post("/api/auth/login", json={
        "email": "staff@test.com",
        "password": "Password123!",
    })
    staff_token = staff_login.json()["data"]["token"]

    status_res = client.post(
        f"/api/complaints/{complaint_id}/status",
        json={"status": "IN_PROGRESS", "comment": "Technician dispatched to check the pipeline."},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert status_res.status_code == 200
    assert status_res.json()["data"]["status"] == "IN_PROGRESS"

    # Recommend agents
    rec_res = client.get(
        f"/api/complaints/{complaint_id}/recommend-agents",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert rec_res.status_code == 200
    assert len(rec_res.json()["data"]) > 0

def test_analytics_and_export():
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Password123!",
    })
    token = admin_login.json()["data"]["token"]

    overview_res = client.get("/api/analytics/overview", headers={"Authorization": f"Bearer {token}"})
    assert overview_res.status_code == 200
    assert "totalComplaints" in overview_res.json()["data"]

    export_res = client.get("/api/analytics/export?section=complaints&format=csv", headers={"Authorization": f"Bearer {token}"})
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]

def test_role_authorization_forbidden():
    # Normal user trying to access admin endpoint
    user_login = client.post("/api/auth/login", json={
        "email": "user@test.com",
        "password": "Password123!",
    })
    token = user_login.json()["data"]["token"]

    res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403

def test_staff_access_to_management_endpoints():
    staff_login = client.post("/api/auth/login", json={
        "email": "staff@test.com",
        "password": "Password123!",
    })
    token = staff_login.json()["data"]["token"]

    # Staff/Manager can list users
    users_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert users_res.status_code == 200
    assert "pagination" in users_res.json()

    # Staff/Manager can access SLA
    sla_res = client.get("/api/admin/sla", headers={"Authorization": f"Bearer {token}"})
    assert sla_res.status_code == 200

    # Staff/Manager can access Agents workload
    agents_res = client.get("/api/admin/agents", headers={"Authorization": f"Bearer {token}"})
    assert agents_res.status_code == 200
    data = agents_res.json()["data"]
    assert "pagination" in agents_res.json()
    if len(data) > 0:
        agent0 = data[0]
        assert "id" in agent0
        assert "assigned" in agent0
        assert "open" in agent0
        assert "resolved" in agent0
        assert "critical" in agent0
        assert "overdue" in agent0
        assert "avgResolutionHours" in agent0
        assert "slaCompliance" in agent0

def test_admin_access_to_agent_dashboard():
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Password123!",
    })
    token = admin_login.json()["data"]["token"]

    res = client.get("/api/agent/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "stats" in res.json()["data"]

