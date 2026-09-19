from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
import app.models  # Ensure all models are imported
from app.models.enums import (
    Role,
    ComplaintStatus,
    Priority,
    Category,
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    EscalationLevel,
)
from app.models.department import Department, ComplaintCategory
from app.models.sla import SlaRule
from app.models.user import User, NotificationPreferences
from app.models.complaint import (
    Complaint,
    ComplaintAttachment,
    ComplaintUpdate,
    ComplaintAssignment,
    ComplaintEscalation,
)
from app.models.notification import Notification
from app.models.feedback import Feedback
from app.utils.security import hash_password
from app.utils.id_generator import generate_complaint_number

def seed_database():
    print("[*] Seeding SQLite database...")
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("  - Database already contains data. Skipping re-seed.")
            return

        hashed_password = hash_password("Password123!")

        # 1. Departments (7)
        dept_data = [
            {"name": "Water Supply", "description": "Water distribution, pipelines and leak repairs", "contactEmail": "water@city.gov.in", "contactPhone": "1800-100-100"},
            {"name": "Electricity", "description": "Street lighting, power lines and electrical faults", "contactEmail": "electricity@city.gov.in", "contactPhone": "1800-100-101"},
            {"name": "Roads", "description": "Road maintenance, potholes and infrastructure", "contactEmail": "roads@city.gov.in", "contactPhone": "1800-100-102"},
            {"name": "Sanitation", "description": "Garbage collection, waste management and sewage", "contactEmail": "sanitation@city.gov.in", "contactPhone": "1800-100-103"},
            {"name": "Public Safety", "description": "Security, lighting and public area safety", "contactEmail": "safety@city.gov.in", "contactPhone": "1800-100-104"},
            {"name": "Transportation", "description": "Public transport and traffic management", "contactEmail": "transport@city.gov.in", "contactPhone": "1800-100-105"},
            {"name": "General", "description": "Uncategorized or other complaints", "contactEmail": None, "contactPhone": None},
        ]

        departments = {}
        for d in dept_data:
            dept = Department(**d)
            db.add(dept)
            db.flush()
            departments[dept.name] = dept
        print(f"  - Created {len(departments)} departments")

        # 2. Categories (12)
        category_data = [
            {"name": "Water Leakage", "description": "Leaking pipelines, valves and meter boxes", "department": "Water Supply", "defaultPriority": Priority.HIGH},
            {"name": "Water Supply Disruption", "description": "No water / irregular supply in an area", "department": "Water Supply", "defaultPriority": Priority.CRITICAL},
            {"name": "Power Failure", "description": "Unplanned outages and transformer faults", "department": "Electricity", "defaultPriority": Priority.HIGH},
            {"name": "Street Light Fault", "description": "Street lights not working or damaged", "department": "Electricity", "defaultPriority": Priority.MEDIUM},
            {"name": "Voltage Fluctuation", "description": "Unstable voltage damaging appliances", "department": "Electricity", "defaultPriority": Priority.MEDIUM},
            {"name": "Road Damage", "description": "Potholes, cracks and damaged surface", "department": "Roads", "defaultPriority": Priority.HIGH},
            {"name": "Missing Road Signs", "description": "Damaged or missing signage and signals", "department": "Roads", "defaultPriority": Priority.LOW},
            {"name": "Garbage Collection", "description": "Scheduled garbage collection issues", "department": "Sanitation", "defaultPriority": Priority.MEDIUM},
            {"name": "Drainage / Sewage Blockage", "description": "Blocked drains and sewage overflow", "department": "Sanitation", "defaultPriority": Priority.HIGH},
            {"name": "Public Transport Issue", "description": "Buses, metro and commute problems", "department": "Transportation", "defaultPriority": Priority.LOW},
            {"name": "Street Safety Hazard", "description": "Unsafe structures, dark zones, hazards", "department": "Public Safety", "defaultPriority": Priority.CRITICAL},
            {"name": "General Complaint", "description": "Anything not covered by the above", "department": "General", "defaultPriority": Priority.LOW},
        ]

        for c in category_data:
            cat = ComplaintCategory(
                name=c["name"],
                description=c["description"],
                departmentId=departments[c["department"]].id,
                defaultPriority=c["defaultPriority"],
            )
            db.add(cat)
        print(f"  - Created {len(category_data)} categories")

        # 3. SLA Rules (4)
        sla_data = [
            {"priority": Priority.LOW, "responseHours": 24, "resolutionHours": 168},
            {"priority": Priority.MEDIUM, "responseHours": 12, "resolutionHours": 120},
            {"priority": Priority.HIGH, "responseHours": 4, "resolutionHours": 48},
            {"priority": Priority.CRITICAL, "responseHours": 1, "resolutionHours": 24},
        ]
        for rule in sla_data:
            sla = SlaRule(**rule)
            db.add(sla)
        print(f"  - Created {len(sla_data)} SLA rules")

        # 4. Users
        # Admin
        admin = User(
            name="System Administrator",
            email="admin@test.com",
            phone="9000000001",
            password=hashed_password,
            role=Role.ADMIN,
        )
        db.add(admin)
        db.flush()
        db.add(NotificationPreferences(userId=admin.id))

        # Staff per department
        staff_specs = [
            {"name": "Priya Sharma", "email": "staff@test.com", "phone": "9000000002", "dept": "Water Supply"},
            {"name": "Rahul Verma", "email": "staff2@test.com", "phone": "9000000003", "dept": "Electricity"},
            {"name": "Arjun Reddy", "email": "staff.roads@test.com", "phone": "9000000004", "dept": "Roads"},
            {"name": "Kavya Nair", "email": "staff.sanitation@test.com", "phone": "9000000005", "dept": "Sanitation"},
            {"name": "Farhan Ali", "email": "staff.safety@test.com", "phone": "9000000006", "dept": "Public Safety"},
            {"name": "Divya Menon", "email": "staff.transport@test.com", "phone": "9000000007", "dept": "Transportation"},
            {"name": "Suresh Kumar", "email": "staff.general@test.com", "phone": "9000000008", "dept": "General"},
        ]
        staff_by_dept = {}
        for s in staff_specs:
            user = User(
                name=s["name"],
                email=s["email"],
                phone=s["phone"],
                password=hashed_password,
                role=Role.STAFF,
                departmentId=departments[s["dept"]].id,
            )
            db.add(user)
            db.flush()
            db.add(NotificationPreferences(userId=user.id))
            staff_by_dept[s["dept"]] = user

        # Citizens
        user_specs = [
            {"name": "Aarav Patel", "email": "user@test.com", "phone": "9000000010"},
            {"name": "Sneha Iyer", "email": "user2@test.com", "phone": "9000000011"},
            {"name": "Vikram Singh", "email": "user3@test.com", "phone": "9000000012"},
            {"name": "Meera Nair", "email": "user4@test.com", "phone": "9000000013"},
        ]
        citizens = []
        for u in user_specs:
            user = User(
                name=u["name"],
                email=u["email"],
                phone=u["phone"],
                password=hashed_password,
                role=Role.USER,
            )
            db.add(user)
            db.flush()
            db.add(NotificationPreferences(userId=user.id))
            citizens.append(user)
        print(f"  - Created users: 1 Admin, {len(staff_specs)} Staff, {len(citizens)} Citizens")

        # 5. Complaints with history, comments and feedback
        now = datetime.utcnow()
        sample_complaints = [
            {
                "title": "No water supply in Krishna Nagar for 3 days",
                "description": "Residents of Krishna Nagar have not received water for the past three days. This is a major outage affecting the whole block.",
                "category": Category.WATER,
                "priority": Priority.HIGH,
                "status": ComplaintStatus.IN_PROGRESS,
                "userId": citizens[0].id,
                "assignedToId": staff_by_dept["Water Supply"].id,
                "departmentId": departments["Water Supply"].id,
                "location": "Krishna Nagar, Sector 12",
                "createdAt": now - timedelta(days=4),
            },
            {
                "title": "Street light not working near Main Market",
                "description": "The street light facing the Main Market entrance has not worked for a week. The area is completely dark after sunset.",
                "category": Category.ELECTRICITY,
                "priority": Priority.MEDIUM,
                "status": ComplaintStatus.ASSIGNED,
                "userId": citizens[1].id,
                "assignedToId": staff_by_dept["Electricity"].id,
                "departmentId": departments["Electricity"].id,
                "location": "Main Market Road, Block B",
                "createdAt": now - timedelta(days=2),
            },
            {
                "title": "Massive pothole causing traffic jam",
                "description": "A deep pothole has formed in the middle of MG Road causing minor accidents and heavy traffic congestion during peak hours.",
                "category": Category.ROADS,
                "priority": Priority.CRITICAL,
                "status": ComplaintStatus.RESOLVED,
                "userId": citizens[2].id,
                "assignedToId": staff_by_dept["Roads"].id,
                "departmentId": departments["Roads"].id,
                "location": "MG Road, near Metro Pillar 45",
                "createdAt": now - timedelta(days=6),
                "resolvedAt": now - timedelta(days=4),
            },
            {
                "title": "Garbage not cleared for over a week",
                "description": "The community waste bin near Park View Apartments is overflowing and emitting severe foul odor. Stray dogs are scattering waste.",
                "category": Category.SANITATION,
                "priority": Priority.HIGH,
                "status": ComplaintStatus.SUBMITTED,
                "userId": citizens[3].id,
                "assignedToId": None,
                "departmentId": departments["Sanitation"].id,
                "location": "Park View Apartments, 5th Cross",
                "createdAt": now - timedelta(hours=8),
            },
            {
                "title": "Exposed high voltage wire on pedestrian walkway",
                "description": "A severed electrical cable is dangling close to the footpath near St. Mary's School. Extreme electrocution danger for school children.",
                "category": Category.SAFETY,
                "priority": Priority.CRITICAL,
                "status": ComplaintStatus.IN_PROGRESS,
                "userId": citizens[0].id,
                "assignedToId": staff_by_dept["Public Safety"].id,
                "departmentId": departments["Public Safety"].id,
                "location": "Opposite St. Mary School",
                "createdAt": now - timedelta(hours=14),
            },
        ]

        for sc in sample_complaints:
            resolved_at = sc.get("resolvedAt")
            c = Complaint(
                complaintNumber=generate_complaint_number(),
                title=sc["title"],
                description=sc["description"],
                category=sc["category"],
                priority=sc["priority"],
                status=sc["status"],
                userId=sc["userId"],
                assignedToId=sc["assignedToId"],
                departmentId=sc["departmentId"],
                location=sc["location"],
                createdAt=sc["createdAt"],
                updatedAt=resolved_at or sc["createdAt"],
                resolvedAt=resolved_at,
            )
            db.add(c)
            db.flush()

            # Status update
            db.add(ComplaintUpdate(
                complaintId=c.id,
                userId=c.userId,
                oldStatus=None,
                newStatus=ComplaintStatus.SUBMITTED,
                comment="Complaint submitted by citizen",
                createdAt=c.createdAt,
            ))

            if c.assignedToId:
                db.add(ComplaintAssignment(
                    complaintId=c.id,
                    assignedTo=c.assignedToId,
                    assignedBy=admin.id,
                    departmentId=c.departmentId,
                    reason="Assigned to department specialist",
                    assignedAt=c.createdAt + timedelta(hours=1),
                ))
                db.add(ComplaintUpdate(
                    complaintId=c.id,
                    userId=admin.id,
                    oldStatus=ComplaintStatus.SUBMITTED,
                    newStatus=ComplaintStatus.ASSIGNED,
                    comment="Assigned to department specialist",
                    createdAt=c.createdAt + timedelta(hours=1),
                ))

            if resolved_at:
                db.add(ComplaintUpdate(
                    complaintId=c.id,
                    userId=c.assignedToId,
                    oldStatus=ComplaintStatus.IN_PROGRESS,
                    newStatus=ComplaintStatus.RESOLVED,
                    comment="Road patch work completed and verified by inspector.",
                    createdAt=resolved_at,
                ))
                db.add(Feedback(
                    complaintId=c.id,
                    userId=c.userId,
                    rating=5,
                    comment="Prompt resolution! The pothole was repaired quickly.",
                    createdAt=resolved_at + timedelta(hours=2),
                ))

            # Sample notification
            db.add(Notification(
                userId=c.userId,
                complaintId=c.id,
                title="Complaint Status: " + c.status.value,
                message=f"Update regarding #{c.complaintNumber}: {c.title}",
                createdAt=c.updatedAt or now,
            ))

        db.commit()
        print(f"  - Created {len(sample_complaints)} sample complaints with full history")
        print("[OK] Seeding complete!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
