# Hướng dẫn Bàn giao & Báo cáo kết quả nâng cấp (Walkthrough)

Trang web **Giả lập Gacha Arknights: Endfield** đã được nâng cấp thành công để hỗ trợ đầy đủ các tính năng phân tích tài nguyên và 2 chế độ giả lập chuyên sâu theo yêu cầu của bạn.

---

## 1. Các nguồn tài nguyên & Tùy chọn Bật/Tắt

Tất cả các nguồn tài nguyên tích lũy được đồng bộ từ dữ liệu Google Sheet. Để đảm bảo tính chính xác theo cơ chế vận hành gacha, **toàn bộ tài nguyên của phiên bản (dài 6 tuần) được chia đôi khi tính theo từng Banner Limited (dài 3 tuần)**.

### Nguồn vé nhân vật (mỗi phiên bản ~6 tuần | mỗi banner ~3 tuần):
*   **F2P Base (Có thể tùy chỉnh cấu hình trên giao diện):** Mặc định **73 pulls/phiên bản** (~36.5 pulls/banner) (loại trừ phiên bản 1.0 có 218.3 pulls).
*   **Monthly Pass (Thẻ tháng, có nút Bật/Tắt):** **+18 pulls/phiên bản** (+9 pulls/banner).
*   **Protocol Pass (BP cao cấp, có nút Bật/Tắt):** **+10 pulls/phiên bản** (+5 pulls/banner).
*   *Tóm tắt:* Với cấu hình mặc định, người chơi F2P + Monthly + BP nhận **~101 pulls/phiên bản** (~50.5 pulls/banner).

### Nguồn vé vũ khí cố định (Arsenal Tickets từ in-game):
*   **F2P Base (Có thể tùy chỉnh cấu hình trên giao diện):** Mặc định **1,200 Arsenal Tickets/phiên bản** (600 tickets/banner).
    *   *Weekly Routine:* 100 vé/tuần (600/bản).
    *   *Credit Store (Acquisition Center):* 100 vé/tuần (600/bản).
*   **Protocol Pass (BP cao cấp, có nút Bật/Tắt):** **+2,400 Arsenal Tickets/phiên bản** (+1,200 tickets/banner).
*   *Tóm tắt:* Với cấu hình mặc định, F2P tích được **1,200 vé/bản** (~600 vé/banner). Nếu có mua BP tăng thêm 2400 vé, nâng tổng tích lũy cố định lên **3,600 vé/bản** (~1,800 vé/banner).

### Nguồn vé vũ khí hoàn trả (Rebate từ Gacha nhân vật):
*   *Tự động tính toán:* 6★ nhân vật hoàn 2,000 vé; 5★ hoàn 200 vé; 4★ hoàn 20 vé. Đây là nguồn kiếm vé vũ khí chính trong simulator.

---

## 2. Thiết kế 2 Chế độ Giả lập mới

### Chế độ A: Giả lập tổng quan (Statistical Overview Mode)
*   Bổ sung chế độ **Theo tổng số Pulls** trong Control Panel của Tab 2. Người dùng có thể kéo chọn tổng lượng vé nhân vật muốn test (ví dụ: `500 pulls`).
*   Hệ thống sẽ tự động quy đổi số pull đó sang số lượng banner tương ứng dựa trên cấu hình trả phí, chia đều vé qua từng banner, chạy gacha Monte Carlo và cộng dồn vé vũ khí tích lũy được tương ứng.
*   **Bổ sung chỉ số cực trị Hên / Đen (Best Luck / Worst Luck):** Trên bảng so sánh chi tiết, thêm cột **Hên / Đen** hiển thị số lượng Featured nhân vật tối đa / tối thiểu mà người chơi trong nhóm giả lập quay trúng. Giúp người dùng thấy được kịch bản đen đủi nhất và may mắn nhất là thế nào.

### Chế độ B: Giả lập tương tác & Thống kê nhân phẩm thời gian thực
*   Ở Tab 1 (Interactive Pull), một **Bảng thống kê đợt quay hiện tại** đã được thêm vào ngay bên dưới banner:
    *   *Thống kê nhân vật:* Tổng lượt quay (Standard/Urgent), số 6★ trúng (tỉ lệ nổ thực tế), số 5★ trúng, số pull trung bình để nổ mỗi 6★, số lần lệch 50/50.
    *   *Thống kê vũ khí:* Tổng vé Arsenal tích lũy, số Issue đã quay, số vũ khí 6★ trúng, số hộp chọn vũ khí mốc 10.
    *   *Đánh giá nhân phẩm (Luck Rating):* Hệ thống tự động đánh giá độ may mắn của người chơi dựa trên số pull trung bình nổ 6★:
        *   `< 40 pulls`: **Siêu Đỏ 👑** (Nhân phẩm vô cực).
        *   `< 64 pulls`: **Khá Đỏ 👍** (Vận may tốt).
        *   `64 - 72 pulls`: **Bình Thường ⚖️** (Hòa vốn).
        *   `> 72 pulls` hoặc `pity6 >= 65`: **Hơi Đen 🌧️** / **Đang Bị Đen 💀** (Cần rửa tay gấp).

---

## 3. Đường dẫn mã nguồn đã cập nhật trong workspace

*   [index.html](file:///d:/A9E%20Gacha/index.html): Thêm hai thanh kéo slider để tuỳ chỉnh giá trị F2P gốc (Vé nhân vật và Vé vũ khí).
*   [js/strategies.js](file:///d:/A9E%20Gacha/js/strategies.js): Cập nhật hàm điều phối nhận lượng vé vũ khí in-game cố định.
*   [js/simulator.js](file:///d:/A9E%20Gacha/js/simulator.js): Nâng cấp hàm `run` để chia đôi lượng vé phiên bản thành vé mỗi banner.
*   [js/app.js](file:///d:/A9E%20Gacha/js/app.js): Đồng bộ các bộ lắng nghe sự kiện slider và hàm cập nhật nhãn để đọc các giá trị F2P tùy chỉnh.
*   [gacha_rules_and_data.md](file:///C:/Users/DELL/.gemini/antigravity/brain/ad3ec152-e6d1-4d19-8563-3cb25d5a5eae/gacha_rules_and_data.md): Cập nhật dữ liệu về mốc 30-60 và nguồn Arsenal Tickets Credit Store.
