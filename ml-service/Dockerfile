FROM python:3.10-slim

WORKDIR /usr/src/app

# Install compilation tools needed for psycopg2 (if binary fallback is not fully isolated)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "seed.py"]
