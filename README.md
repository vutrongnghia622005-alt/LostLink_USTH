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

## Cập nhật sửa lỗi 27/09/2026

- Database đang sử dụng: chạy `backend/database/upgrade-2026-09-27.sql` để thêm chỉ mục tìm kiếm, phân trang và cột `image_urls` lưu tối đa 5 ảnh (giữ ảnh cũ). Database mới đã có các chỉ mục trong `schema.sql`.
- API danh sách `/api/posts` và `/api/admin/posts` trả `{ posts, total, page, pageSize, totalPages }`; mặc định 20 bài, tối đa 100 bài/trang. Cần triển khai backend và frontend cùng phiên bản.
- Tìm kiếm toàn văn dùng cấu hình PostgreSQL `simple`, khớp các từ trong tên, mô tả, danh mục và địa điểm; không còn khớp một đoạn bất kỳ bên trong từ. Admin vẫn tìm được mã quản lý chính xác.
- Ô ảnh cho chọn tối đa 5 ảnh JPG/PNG/WEBP, mỗi ảnh tối đa 5 MB; ảnh đầu là ảnh bìa. Khi sửa, chọn ảnh mới sẽ thay thế toàn bộ ảnh cũ.
- Sau khi đăng, bấm **Tải mã quản lý (.txt)** và lưu tệp. Trên máy khác, mở trang **Tin của tôi** rồi nhập mã từ tệp. Giữ bí mật mã này.
