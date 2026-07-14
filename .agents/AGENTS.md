# Nguyên tắc Phát triển và Style Guidelines - Endfield Gacha Simulator

Dự án này tuân thủ các quy tắc thiết kế và viết code sau để đảm bảo chất lượng, tính khả chuyển và giao diện hiện đại tối cao.

## 1. Thiết kế Giao diện (UI/UX)
*   **Chủ đề:** Dark theme hiện đại công nghệ cao.
*   **Màu sắc chủ đạo:**
    *   Nền tối: `#0d0f12` (nền sâu), `#161a22` (thẻ glassmorphic).
    *   Accent: `#ff6b00` (Cam Endfield).
    *   6-Star (Amber Gold): `#ffb800`.
    *   5-Star (Epic Purple): `#9d4edd`.
    *   4-Star (Rare Blue): `#0077b6`.
*   **Hiệu ứng:** Sử dụng hiệu ứng mờ kính (backdrop-filter: blur(10px) kết hợp với đường viền mỏng sáng màu), các hiệu ứng phóng to nhẹ (scale) và phát sáng (glow) khi hover vào các thẻ gacha.
*   **Font chữ:** Outfit làm chủ đạo, Inter cho các đoạn text nhỏ để dễ đọc.

## 2. Tiêu chuẩn viết Code JavaScript
*   **ES6 Modules:** Toàn bộ code logic phải được tổ chức thành các file Module nhỏ gọn, tách biệt bằng từ khóa `export` và nạp vào trang bằng `import`.
*   **Toán học xác suất (`gacha-math.js`):**
    *   Không sử dụng các thư viện toán học bên ngoài trừ khi thực sự cần thiết.
    *   Đảm bảo hàm tạo số ngẫu nhiên `Math.random()` hoạt động chuẩn xác theo tỉ lệ tích lũy (Soft Pity) và các bộ đếm bảo hiểm phải được quản lý chặt chẽ.
*   **Tách biệt Chiến thuật (`strategies.js`):**
    *   Các chiến thuật gacha phải được viết dưới dạng các hàm hoặc cấu trúc dữ liệu cấu hình độc lập để nhà phát triển dễ dàng sửa đổi thông số, điều kiện kích hoạt, hoặc thêm mới chiến thuật mà không cần chạm vào logic lõi của simulator hay gacha-math.
*   **State Management:** State của các đợt chạy giả lập quy mô lớn nên được giải phóng khỏi bộ nhớ sau khi hoàn thành để tránh rò rỉ bộ nhớ (memory leaks) khi mô phỏng trên 50,000 người chơi.

## 3. SEO & Tối ưu hóa trình duyệt
*   Mỗi trang thành phần/tab phải có thẻ ID định danh rõ ràng cho các tương tác tự động.
*   Sử dụng thẻ ngữ nghĩa HTML5 (`<header>`, `<main>`, `<section>`, `<aside>`, `<nav>`).
*   Giữ hiệu năng tải trang ở mức tối đa bằng cách không lạm dụng các hình ảnh nặng, ưu tiên sử dụng CSS thuần và SVG vector.

## 4. Quy tắc phát hành
*   Sử dụng tiếng Việt khi giao tiếp hoặc lập kế hoạch.
*   Sau khi sửa mã nguồn JavaScript trong `js/`, phải chạy `npm run build` để cập nhật `js/bundle.js`, bảo đảm `index.html` luôn mở và chạy trực tiếp được.
*   Trước khi bàn giao thay đổi ảnh hưởng đến giao diện hoặc runtime, bắt buộc chạy `npm run build` và `npm test`; không được báo hoàn thành nếu `js/bundle.js` dành cho `index.html` chưa được cập nhật hoặc kiểm thử còn lỗi.
*   Không tự động chạy `npm run package` sau mỗi lần sửa code. Chỉ đóng gói/phát hành file `release/A9EGacha_<phiên-bản>.html` khi người dùng yêu cầu rõ ràng. Khi có yêu cầu đó, phải chạy `npm run package`, xác minh file release cùng checksum SHA-256 và bảo đảm `dist/index.html` là bản production mới nhất.
*   Chỉ tạo hoặc cập nhật file HTML tổng hợp trong `release/` khi tăng phiên bản hoặc khi người dùng yêu cầu; không tạo bản sao ở thư mục gốc của dự án.
*   Không chỉnh sửa thủ công `js/bundle.js`, `dist/` hoặc file HTML trong `release/`; mọi file này phải được tạo từ script build/package.

## 5. Bảo toàn dữ liệu nghiên cứu
*   `data/bookkeeping.md` là dữ liệu raw được ghi nhận từ nội dung ingame và lưu lại để phục vụ nghiên cứu, đối chiếu nguồn, tái kiểm tra giả định và kiểm chứng kết quả mô phỏng trong tương lai.
*   Phải giữ nguyên dữ liệu gốc trong `data/bookkeeping.md`; không rút gọn, chuẩn hóa lại, diễn giải thay thế hoặc xóa file này chỉ vì dung lượng lớn hay định dạng khó đọc.
*   Nếu cần tạo bảng tóm tắt hoặc dữ liệu đã xử lý, phải lưu ở file khác và ghi rõ nguồn dẫn về `data/bookkeeping.md`.
