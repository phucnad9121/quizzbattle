# QuizzBattle Platform

QuizzBattle là một nền tảng trực tuyến hỗ trợ tổ chức các trò chơi đố vui thời gian thực. Hệ thống được thiết kế theo mô hình Client-Server, tối ưu hóa cho trải nghiệm tương tác trực tiếp giữa người quản trò và người chơi thông qua giao thức kết nối ổn định và giao diện phản hồi nhanh.

## Tính năng chính

- **Quản lý Nội dung Thông minh**: Hỗ trợ tạo bộ câu hỏi thủ công hoặc **nhập liệu tự động từ file Excel và Word (.docx)**, tối ưu hóa 99% thời gian soạn bài.
- **Trải nghiệm Gameshow Sống động**: Tích hợp hệ thống nhạc nền (Background Music) và hiệu ứng âm thanh (Sound Effects) tương tác theo diễn biến trận đấu.
- **Cơ chế Reconnect Nâng cao**: Sử dụng thuật toán Exponential Backoff để tự động khôi phục kết nối WebSocket, đảm bảo người chơi không bị gián đoạn khi gặp sự cố mạng.
- **Công cụ Điều phối Trận đấu**: Hệ thống phòng chờ (Lobby) thời gian thực, tự động hóa quy trình chuyển câu hỏi và tính điểm dựa trên tốc độ phản hồi.
- **Bảng xếp hạng & Phân tích**: Cập nhật thứ hạng người chơi tức thời và cung cấp báo cáo kết quả chi tiết sau mỗi trận đấu.
- **Xác thực & Bảo mật**: Hệ thống JWT Auth, Rate Limiting (SlowAPI) và Error Handling chuẩn hóa giúp bảo vệ hệ thống khỏi các cuộc tấn công Brute-force.
- **Giao diện Đa nền tảng**: Thiết kế Responsive tối ưu cho Mobile và Tablet, đảm bảo tính thẩm mỹ và khả năng tương tác trên mọi kích thước màn hình.

## Công nghệ sử dụng

### Hệ thống Backend
- **Ngôn ngữ**: Python 3.11+
- **Quản lý môi trường**: Conda / Virtualenv
- **Framework**: FastAPI (Asynchronous)
- **Cơ sở dữ liệu**: PostgreSQL & Redis
- **ORM**: SQLAlchemy (Alembic cho migration)
- **Containerization**: Docker & Docker Compose
- **Bảo mật**: SlowAPI (Rate Limiting), JWT Authentication

### Hệ thống Frontend
- **Framework**: Next.js 16 (React 19)
- **Ngôn ngữ**: TypeScript
- **Runtime**: Node.js 18+
- **Quản lý trạng thái**: Zustand & TanStack Query
- **Xử lý giao diện**: Tailwind CSS, Framer Motion
- **Client API**: Axios với cơ chế Interceptors

## Hướng dẫn triển khai

Hệ thống hỗ trợ hai phương thức triển khai chính tùy theo mục đích sử dụng:

### 1. Triển khai toàn diện với Docker (Khuyên dùng)
Phương thức này tự động khởi tạo và kết nối toàn bộ các thành phần: **Backend, Frontend, PostgreSQL và Redis**.

**Yêu cầu**: Đã cài đặt Docker và Docker Compose.

```bash
# Bước 1: Khởi tạo mã nguồn
git clone https://github.com/phucnad9121/quizzbattle.git
cd quizzbattle

# Bước 2: Cấu hình môi trường
# Tạo file .env và .env.local từ các file example tương ứng

# Bước 3: Khởi chạy hệ thống
docker-compose up --build
```
Hệ thống sẽ sẵn sàng tại:
- Frontend: `http://localhost:3000`
- API Docs: `http://localhost:8000/docs`

---

### 2. Phát triển và Kiểm thử cục bộ (Conda)
Phương thức này phù hợp khi cần can thiệp vào mã nguồn hoặc kiểm thử riêng biệt từng thành phần Backend/Frontend.

**Yêu cầu**: Đã cài đặt Miniconda hoặc Anaconda.

#### Kiểm thử Backend:
```bash
cd backend
conda env create -f ../environment.yml
conda activate quizzbattle
uvicorn app.main:app --reload
```

#### Kiểm thử Frontend:
Yêu cầu Node.js 18+.
```bash
cd frontend
npm install
npm run dev
```

---

## Tài liệu API

Tài liệu API được cung cấp thông qua giao diện Swagger UI, bao gồm chi tiết về các Schema, yêu cầu đầu vào và định dạng phản hồi:
- **Auth Service**: Xử lý quy trình cấp phát token và xác thực người dùng.
- **Quiz Management**: Các thao tác CRUD dữ liệu bộ câu hỏi.
- **Room Engine**: Logic khởi tạo và quản lý trạng thái phiên chơi.
- **Real-time Gateway**: Các sự kiện truyền tải qua WebSocket.

---
© 2024 QuizzBattle Team. All rights reserved.
