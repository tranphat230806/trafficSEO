# Hướng Dẫn Cài Đặt Và Chạy Hệ Thống Điểm Danh Bằng Khuôn Mặt (FaceID)

Hệ thống được xây dựng bằng **FastAPI** cho backend, giao diện **Jinja2** (HTML/JS), và sử dụng thư viện **face_recognition** & **mediapipe** để nhận diện khuôn mặt và kiểm tra liveness (chớp mắt).

## 1. Yêu cầu hệ thống (Prerequisites)

- **Python 3.8+** trở lên (khuyến nghị 3.9 - 3.11).
- **CMake** và **Visual Studio C++ Build Tools** (Bắt buộc trên Windows để cài đặt thư viện `dlib` - core của `face_recognition`).
- **MySQL Server** (Tùy chọn. Nếu không có hoặc lỗi kết nối, hệ thống sẽ tự động dùng fallback là **SQLite**).

## 2. Cài đặt môi trường

### Bước 2.1: Tạo và kích hoạt môi trường ảo (Virtual Environment)
Mở Terminal/Command Prompt hoặc PowerShell tại thư mục dự án và chạy:

**Trên Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Trên macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Bước 2.2: Cài đặt các thư viện phụ thuộc
Sau khi đã kích hoạt môi trường ảo (bạn sẽ thấy chữ `(venv)` ở đầu dòng lệnh), hãy chạy:

```bash
pip install -r requirements.txt
```
*(Lưu ý: Quá trình cài đặt `face_recognition` có thể mất vài phút vì cần build `dlib` từ source code trên Windows)*

## 3. Cấu hình Cơ sở dữ liệu (Database)

Hệ thống hỗ trợ 2 loại cơ sở dữ liệu:

### Cách 1: Sử dụng MySQL (Khuyên dùng)
1. Cài đặt MySQL và khởi động dịch vụ.
2. Tạo một database mới tên là `attendance` (`CREATE DATABASE attendance;`).
3. Chuỗi kết nối mặc định được set cứng trong `app/db.py` là: 
   `mysql+pymysql://root:phat2026%40@localhost/attendance`
   - User: `root`
   - Password: `phat2026@` (dấu `@` được encode thành `%40`)
   - Host: `localhost`
   - DB name: `attendance`
   
*(Bạn cũng có thể thay đổi bằng cách set biến môi trường `DATABASE_URL`)*

### Cách 2: Sử dụng SQLite (Tự động)
Nếu bạn không cài MySQL, hoặc kết nối tới MySQL thất bại, hệ thống đã cấu hình **tự động fallback sang SQLite**. Nó sẽ tự tạo một file `attendance.db` nằm ở thư mục hiện tại để bạn dùng thử luôn mà không cần cài đặt gì thêm.

*(Hệ thống sử dụng SQLAlchemy để tự động khởi tạo các Table trong DB ở lần khởi động đầu tiên).*

## 4. Chạy Ứng dụng

Chạy lệnh sau để khởi động server FastAPI bằng Uvicorn:

```bash
uvicorn app.main:app --reload
```

## 5. Truy cập hệ thống

1. Mở trình duyệt web và vào địa chỉ: **[http://127.0.0.1:8000](http://127.0.0.1:8000)** hoặc **[http://localhost:8000](http://localhost:8000)**
2. Trên màn hình sẽ hiển thị luồng Camera với các chức năng chính:
   - **Điểm danh (Attendance):** Trích xuất khuôn mặt, yêu cầu chớp mắt để chống giả mạo, so khớp khuôn mặt và tự động lưu giờ Check-in / Check-out.
   - **Đăng ký (Register):** Đăng ký người mới với Tên và Chức vụ kèm theo vector khuôn mặt.

## 6. Xử lý sự cố thường gặp (Troubleshooting)

- **Lỗi `ERROR: Could not build wheels for dlib, which is required to install pyproject.toml-based projects` trên Windows:**
  Bạn cần tải và cài đặt [CMake](https://cmake.org/download/) (nhớ tick chọn "Add CMake to the system PATH for all users"). Cài đặt tiếp [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), trong lúc cài tích chọn mục **Desktop development with C++**.
- **Lỗi Camera không hoạt động trên trình duyệt:**
  Hãy đảm bảo bạn nhấn nút "Cho phép" (Allow) khi trình duyệt yêu cầu quyền truy cập Camera (Video).
- **Cổng 8000 bị chiếm dụng:**
  Đổi port khác bằng lệnh: `uvicorn app.main:app --reload --port 8080`.
