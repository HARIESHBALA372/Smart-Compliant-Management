import sys

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn
from app.config import settings

if __name__ == "__main__":
    if "--seed" in sys.argv:
        from app.seed import seed_database
        seed_database()
        sys.exit(0)

    print(f"[*] Starting Smart Complaint Management API on http://localhost:{settings.PORT}")
    print(f"[*] Interactive Swagger docs at http://localhost:{settings.PORT}/api/docs")
    print(f"[*] Database: SQLite ({settings.DATABASE_URL})")

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
