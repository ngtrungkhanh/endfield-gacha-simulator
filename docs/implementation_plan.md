# Kế hoạch xây dựng Web Giả lập Gacha Arknights: Endfield (Cập nhật 2 chế độ mô phỏng)

Bản kế hoạch này cập nhật phương thức tính toán tài nguyên vũ khí và bổ sung 2 chế độ giả lập gacha chi tiết theo yêu cầu của bạn.

---

## 1. Dữ liệu bổ sung: Nguồn vé vũ khí cố định (Arsenal Tickets)
Ngoài nguồn chính là hoàn trả khi quay nhân vật, người chơi còn nhận được Arsenal Tickets từ các hoạt động in-game (Tuần/Tháng, Credit Store, Events, Battle Pass):
*   **F2P (Chỉ chơi miễn phí):** Giả định nhận thêm **~1,200 Arsenal Tickets/phiên bản** (~0.6 Issue).
*   **Paid BP (Mua Protocol Pass):** Nhận thêm **~1,000 Arsenal Tickets/phiên bản** (Tổng cộng **~2,200 vé/phiên bản** ~ 1.1 Issues).

---

## 2. Thiết kế 2 Chế độ Giả lập mới

### Chế độ A: Giả lập tổng quan (Statistical Overview Mode)
Cho phép người dùng nhập vào **Tổng số lượt roll nhân vật muốn test (ví dụ: `xxx` rolls = 500 rolls)**, hệ thống sẽ:
1.  **Tính số lượng banner tương ứng:** Chia ngược số rolls cho lượng vé tích lũy được mỗi banner (dựa trên cấu hình F2P/Monthly/BP) để ra số lượng banner giới hạn sẽ trải qua (ví dụ: 500 rolls / 159 rolls/banner = ~3.14 banner).
2.  **Chạy giả lập Monte Carlo `yy` lần (số lượng người chơi):** Giả lập `yy` người chơi quay đúng lượng tài nguyên đó.
3.  **Tính số lượng roll vũ khí kiếm được:** Cộng dồn vé hoàn trả từ gacha nhân vật + vé Arsenal cố định in-game thu được qua thời gian tương ứng.
4.  **Báo cáo thống kê bổ sung chỉ số cực trị:**
    *   *Trung bình (Average):* Số 6★ nhân vật/vũ khí trung bình nhận được.
    *   *Hên nhất (Best Luck):* Số lượng nhân vật/vũ khí 6★ tối đa mà 1 người chơi đạt được trong nhóm giả lập.
    *   *Đen nhất (Worst Luck):* Số lượng nhân vật/vũ khí 6★ tối thiểu mà 1 người chơi đạt được (để thấy kịch bản đen đủi nhất là gì).

### Chế độ B: Giả lập tương tác & Thống kê thời gian thực (Interactive Gacha & Stats Panel)
Ở Tab 1 (Interactive Pull), bên cạnh hoạt ảnh thẻ gacha lật mở, chúng ta sẽ xây dựng một **Bảng thống kê kết quả tương tác thời gian thực** đặt ngay phía dưới khu vực banner:
*   **Thống kê nhân vật:** Tổng lượt quay, số 6★ trúng (tỉ lệ thực tế), số 5★ trúng, số lượt quay trung bình cho mỗi 6★, số lần lệch 50/50.
*   **Thống kê vũ khí:** Tổng vé Arsenal tích lũy được, tổng số Issue đã quay, số vũ khí 6★ trúng, số hộp chọn nhận được.
*   **Đánh giá độ may mắn (Luck Rating):** Đưa ra đánh giá vui vẻ dựa trên hiệu suất quay thực tế so với tỉ lệ toán học trung bình (ví dụ: "Siêu đỏ - Nhân phẩm vô cực", "Bình thường", "Hơi đen - Cần rửa tay").

---

## 3. Đề xuất cập nhật mã nguồn

*   **[js/strategies.js](file:///d:/A9E Gacha/js/strategies.js):** 
    *   Cập nhật hàm điều phối để bổ sung nguồn vé vũ khí cố định in-game mỗi banner dựa trên cấu hình trả phí của người chơi.
*   **[js/simulator.js](file:///d:/A9E%20Gacha/js/simulator.js):**
    *   Cập nhật logic phân tích để ghi nhận giá trị tối đa (Best Luck) và tối thiểu (Worst Luck) về số lượng 6★ thu được của người chơi.
*   **[index.html](file:///d:/A9E%20Gacha/index.html):**
    *   Thêm form cấu hình Chế độ Giả lập theo Tổng số Pull nhân vật vào Control Panel.
    *   Thêm Bảng thống kê chi tiết thời gian thực ở phần dưới khu vực banner của Tab 1.
*   **[js/app.js](file:///d:/A9E%20Gacha/js/app.js):**
    *   Cập nhật logic tính toán và hiển thị dữ liệu lên bảng thống kê Tab 1 sau mỗi lượt quay.
    *   Chuyển đổi giao diện Control Panel khi người dùng chọn cấu hình theo Banner hay theo Tổng số Pull.
