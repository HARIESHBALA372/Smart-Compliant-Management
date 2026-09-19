FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=4000 \
    HOST=0.0.0.0 \
    ENVIRONMENT=production \
    DATABASE_URL=sqlite:////app/data/complaints.db \
    UPLOAD_DIR=/app/uploads \
    ML_SERVICE_URL=http://ml-service:8000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Create persistent storage directories for SQLite and attachments
RUN mkdir -p /app/data /app/uploads

COPY app ./app
COPY run.py pytest.ini ./

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4000/api/health', timeout=5)" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host ${HOST} --port ${PORT} --workers 2"]