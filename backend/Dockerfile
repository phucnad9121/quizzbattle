# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Cài đặt công cụ build hệ thống
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy file định nghĩa dependencies
COPY pyproject.toml .

# Cài đặt dependencies vào thư mục prefix để dễ dàng copy sang stage sau
# Lưu ý: Chỉ cài core dependencies, không cài [dev] cho production
RUN pip install --no-cache-dir --prefix=/install .

# Stage 2: Runner
FROM python:3.11-slim AS runner

WORKDIR /app

# Cài đặt runtime dependencies cần thiết (chỉ libpq để chạy postgres)
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies từ stage builder
COPY --from=builder /install /usr/local

# Tạo non-root user để tăng tính bảo mật
RUN addgroup --system appgroup && adduser --system --group appuser

# Copy source code và phân quyền cho appuser
COPY . .
RUN chown -R appuser:appgroup /app

# Chuyển sang dùng non-root user
USER appuser

# Biến môi trường
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:$PATH"

EXPOSE 8000

# Chạy ứng dụng
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]