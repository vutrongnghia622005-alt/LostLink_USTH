# LostLink USTH — Backend LostLink + Frontend USTH Lost & Found

## Chức năng

- Trang chủ, tin thất lạc, tin nhặt được
- Đăng tin và upload ảnh
- Trang chi tiết bài đăng
- Tìm kiếm/lọc bài đăng
- Tin của tôi bằng mã quản lý
- Yêu cầu nhận lại đồ và tra cứu mã CLM
- Liên hệ/phản hồi và tra cứu trạng thái phản hồi
- Admin: đăng nhập, dashboard, quản lý bài đăng, phản hồi, yêu cầu nhận đồ

## Chạy backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Khởi tạo database bằng `backend/database/schema.sql`.

## Chạy frontend local

```bash
cd frontend
python3 -m http.server 5173
```

Mở `http://localhost:5173`. Backend mặc định là `http://localhost:3000`; có thể chỉnh trong `frontend/asset/js/config.js`.

## Cấu trúc chính

```text
frontend/
  index.html
  lost.html
  found.html
  detail.html
  post.html
  search.html
  my-posts.html
  claims.html
  claim-status.html
  contact.html
  feedback-status.html
  success.html
  admin/
  asset/
backend/
  controllers/
  routes/
  database/
  middleware/
  scripts/
  server.js
```

