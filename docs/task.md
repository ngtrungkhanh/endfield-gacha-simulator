# Danh sách nhiệm vụ thực hiện (TODO List)

## 1. Các hạng mục đã hoàn thành (Completed Tasks)
- `[x]` Khởi tạo các file Markdown cơ sở (`README.md`, `.agents/AGENTS.md` trong dự án)
- `[x]` Thiết lập cấu trúc thư mục dự án và file `index.html` cơ sở (tích hợp CDN Chart.js và Outfit Font)
- `[x]` Viết CSS giao diện tối và cam Endfield, glassmorphism (`css/style.css`)
- `[x]` Viết nhân core toán học Gacha và cơ chế 30-60 pull (`js/gacha-math.js`)
- `[x]` Tách biệt các chiến thuật gacha thành file riêng (`js/strategies.js`) để dễ dàng điều chỉnh và mở rộng
- `[x]` Xây dựng bộ giả lập chạy song song Monte Carlo (`js/simulator.js`)
- `[x]` Phát triển chức năng vẽ biểu đồ trực quan (`js/chart-helper.js`)
- `[x]` Tích hợp tương tác UI thời gian thực và quản lý các tab (`js/app.js`)
- `[x]` Xác minh tự động độ chính xác của tỉ lệ gacha qua console log
- `[x]` Kiểm thử thủ công các tùy chọn Thẻ Tháng/BP, chạy giả lập quy mô lớn
- `[x]` Hoàn thiện Walkthrough báo cáo kết quả
- `[x]` Cập nhật `js/strategies.js` để tích hợp nguồn vé vũ khí cố định in-game mỗi banner
- `[x]` Cập nhật `js/simulator.js` để bổ sung tính toán cực trị Best Luck và Worst Luck
- `[x]` Cập nhật `index.html` thêm form chọn chế độ giả lập (Theo banner vs Theo số pull) và Bảng thống kê Interactive Pull
- `[x]` Cập nhật `js/app.js` điều phối chuyển đổi chế độ và hiển thị thống kê may mắn thời gian thực
- `[x]` Lưu trữ dữ liệu thô ngoại tuyến (Raw Wiki & Bookkeeping Sheet) vào thư mục `data/` của dự án
- `[x]` Tuỳ chỉnh linh hoạt tài nguyên F2P gốc (nhân vật & vũ khí) ngay trên bảng điều khiển giao diện
- `[x]` Tính năng Lưu trữ Cấu hình (LocalStorage Persistence): Tự động lưu lại tủ đồ gacha tương tác, kết quả thống kê đợt quay, cấu hình simulator và kết quả chạy giả lập gần nhất qua LocalStorage

---

## 2. Kế hoạch phát triển tiếp theo (Next Session Backlog)
Dưới đây là các ý tưởng nâng cấp tiếp theo để nâng tầm ứng dụng:
- `[ ]` **Bộ điều chỉnh tham số Chiến thuật (Strategy Parameter Controls):** Cho phép người dùng tùy biến các ngưỡng số lượng roll của từng chiến thuật trên UI (ví dụ: tự đặt mốc dừng của Yolo, hoặc mức pity để chuyển đổi banner trong Save & Commit).
- `[ ]` **Hiệu ứng & Âm thanh Gacha cao cấp:** Thêm âm thanh hiệu ứng (sound effects) khi nổ 6★/5★ và hiệu ứng hạt sáng (particle effects) rơi rụng khi lật thẻ.
- `[ ]` **Xuất báo cáo kết quả (Export Results):** Thêm nút bấm cho phép tải xuống file CSV kết quả so sánh chiến thuật hoặc sao chép văn bản báo cáo tóm tắt để chia sẻ lên các diễn đàn cộng đồng.
- `[ ]` **Mô phỏng phân phối 5★ chi tiết:** Thống kê tỉ lệ nổ của các Operator và vũ khí 5★ cụ thể để tính toán độ đa dạng của đội hình.
