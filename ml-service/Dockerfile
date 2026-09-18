FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    HOST=0.0.0.0 \
    PORT=8000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY config ./config
COPY data ./data
COPY training ./training
COPY models ./models

# Pre-build the offline duplicate-detection index at image build time so the
# container is fully functional without runtime training.
RUN python training/build_duplicate_index.py --output models/duplicates_index.json --limit 200 || echo "duplicate index build skipped"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["sh", "-c", "uvicorn app.main:app --host ${HOST} --port ${PORT}"]