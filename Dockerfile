# Root Dockerfile for Render: builds and serves the Python FastAPI backend
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && pip install --no-cache-dir -r backend/requirements.txt \
    && apt-get purge -y --auto-remove gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend sources
COPY backend/ ./backend/
WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Default command to run the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
