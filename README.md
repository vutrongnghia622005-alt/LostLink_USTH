# LostLink USTH — Backend LostLink + Frontend USTH Lost & Found

Bản này lấy `LostLink_USTH` làm project gốc, nhưng giao diện người dùng được đồng bộ theo `USTH_Lost_Found_Frontend_Complete`.

## Chức năng được giữ

- Trang chủ, tin thất lạc, tin nhặt được
- Đăng tin và upload ảnh
- Trang chi tiết bài đăng
- Tìm kiếm/lọc bài đăng
- Tin của tôi bằng mã quản lý
- Yêu cầu nhận lại đồ và tra cứu mã CLM
- Liên hệ/phản hồi và tra cứu trạng thái phản hồi
- Admin: đăng nhập, dashboard, quản lý bài đăng, phản hồi, yêu cầu nhận đồ

## Chức năng đã loại bỏ

- Báo cáo an ninh
- Theo dõi sự việc an ninh
- Trang Admin Security
- API `/api/security-reports` và bảng `security_reports`
- Bản đồ campus không có trang tương ứng trong frontend mẫu
- Toàn bộ bảng điều chỉnh **LIQUID GLASS**: nút tùy chỉnh, theme, độ trong, wallpaper, dimming, blur, blobs và preference JavaScript/CSS liên quan

> `liquid-ui.css` vẫn được giữ như một phần style tĩnh của giao diện mẫu. Người dùng không còn bảng điều chỉnh Liquid Glass.

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

## UI readability update
- Home section headings, sorting text, links, category cards, and empty states were adjusted for stronger contrast over the campus background.
