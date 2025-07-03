FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libffi-dev \
    gcc \
    build-essential \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt

CMD ["python", "main.py"]
