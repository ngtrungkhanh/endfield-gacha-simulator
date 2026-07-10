# Arknights: Endfield Gacha Simulator

Trang web giả lập gacha tương tác trực quan dành cho game **Arknights: Endfield** (A9E). Dự án này giả lập cơ chế quay Operator (Headhunting) và Vũ khí (Arsenal Exchange) để phân tích, so sánh hiệu quả của các chiến thuật chi tiêu vé pull khác nhau.

## 🚀 Tính năng nổi bật
- **Giả lập thời gian thực (Interactive Pull):** Trải nghiệm kéo thẻ gacha x1/x10 nhân vật và gói x10 vũ khí với hoạt ảnh phát sáng theo độ hiếm thực tế.
- **Giả lập quy mô lớn (Monte Carlo Simulation):** Giả lập từ 100 đến 50,000 người chơi quay qua 1-50 banner để thu thập dữ liệu thống kê khoa học.
- **Tùy chỉnh Paid Passes:** Bật/tắt Thẻ Tháng (Monthly Pass) và Battle Pass (Protocol Pass) để thay đổi lượng vé tích lũy thực tế của mỗi phiên bản.
- **Cơ chế Mốc đặc biệt (30-60 pull):** Tự động mô phỏng việc tặng 10 Urgent recruits miễn phí ở mốc 30 roll và tặng 10 vé limited Dossier ở mốc 60 roll.
- **Tích hợp Vé vũ khí:** Tự động hoàn trả vé vũ khí (Arsenal Tickets) khi quay gacha nhân vật và mô phỏng việc dùng số vé đó để săn vũ khí giới hạn.
- **So sánh 4 chiến thuật chi tiêu:** Trực quan hóa dữ liệu hiệu suất và phân phối số lượng 6★ thu được qua biểu đồ Chart.js.

## 📁 Cấu trúc thư mục
- `index.html`: Giao diện chính của ứng dụng.
- `css/style.css`: Hệ thống thiết kế, bố cục responsive, hiệu ứng tối và cam Endfield.
- `data/`: Thư mục lưu trữ dữ liệu ngoại tuyến (Offline Raw Data) phục vụ nghiên cứu và phân tích:
  - `headhunting_wiki.md`: Luật lệ gacha nhân vật thô từ trang Wiki.
  - `arsenal_exchange_wiki.md`: Luật lệ gacha vũ khí thô từ trang Wiki.
  - `bookkeeping_overview.csv`: Bảng tính tích lũy tổng quan từ Google Sheet.
  - `bookkeeping_data_tab.csv`: Dữ liệu phân tách chi tiết các nguồn tích lũy theo từng phiên bản.
  - `bookkeeping_version_1.3_tab.csv`: Nhật ký tích lũy mẫu chi tiết của phiên bản 1.3.
- `docs/`: Thư mục tài liệu thiết kế và tổng kết dự án:
  - `walkthrough.md`: Báo cáo kết quả gacha và hướng dẫn vận hành.
  - `gacha_rules_and_data.md`: Tóm tắt luật lệ gacha và tích lũy bookkeeping.
  - `implementation_plan.md`: Bản kế hoạch triển khai kiến trúc hệ thống.
  - `task.md`: Danh mục nhiệm vụ đã hoàn thành và kế hoạch tương lai.
- `js/gacha-math.js`: Core xử lý xác suất gacha nhân vật, vũ khí và mốc quà tặng.
- `js/strategies.js`: Chứa định nghĩa và logic của các chiến thuật quay gacha nhân vật & vũ khí (dễ dàng chỉnh sửa và mở rộng).
- `js/simulator.js`: Bộ điều phối chạy mô phỏng Monte Carlo quy mô lớn.
- `js/chart-helper.js`: Khởi tạo và vẽ các biểu đồ phân tích tần suất bằng thư viện Chart.js.
- `js/app.js`: Nhập các module, quản lý tabs và liên kết sự kiện UI.
- `js/bundle.js`: Bản build gộp (bundled) của toàn bộ code Javascript để chạy offline trực tiếp.

## 🛠️ Cách sử dụng

Dự án đã được đóng gói toàn bộ code Javascript vào `js/bundle.js` để có thể chạy trực tiếp từ tệp tin cục bộ mà không cần máy chủ:

1. **Mở trực tiếp:** Nhấp đúp mở file [index.html](file:///d:/A9E%20Gacha/index.html) bằng trình duyệt web (Chạy qua giao thức `file://` hoàn hảo, không bị lỗi CORS).
2. **Hoặc chạy server local (tùy chọn):**
   ```bash
   npx serve ./
   ```
3. Chuyển đổi qua lại giữa tab **Interactive Pull** để thử vận may và tab **Strategy Simulator** để chạy mô phỏng so sánh.

## 💻 Hướng dẫn Phát triển & Build tiếp theo

Nếu bạn chỉnh sửa các file code module nhỏ trong thư mục `js/` (ví dụ: `js/app.js`, `js/strategies.js`, `js/gacha-math.js`), bạn cần biên dịch/gom nhóm lại thành `js/bundle.js` để trang `index.html` nhận diện được thay đổi:

*   **Build một lần:**
    ```bash
    npm run build
    ```
*   **Tự động build khi sửa file (Khuyên dùng khi code):**
    ```bash
    npm run watch
    ```
