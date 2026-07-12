# Arknights: Endfield Gacha Simulator v1.2.2

Trình giả lập gacha dành cho **Arknights: Endfield**, hỗ trợ quay tương tác và mô phỏng Monte Carlo để so sánh các chiến thuật sử dụng tài nguyên qua nhiều banner.

An offline-first Vietnamese/English gacha simulator for **Arknights: Endfield**, with interactive pulls and Monte Carlo strategy comparisons.

---

## Tính năng nổi bật

### 1. Quay tương tác (Interactive Pulls)
- Quay Operator và vũ khí trực tiếp trên giao diện trực quan.
- Theo dõi pity hiện tại dạng `xx/80`, kết quả quay, Dossier, Bond Quota, Arsenal rebate và thống kê tài nguyên đã sử dụng/nhận được.
- **Bảo hiểm Featured động (Dynamic Featured Pity)**: bảo đảm Featured đầu tiên ở mốc 120; nếu tiếp tục quay trên cùng banner, các bản tiếp theo được bảo đảm tại mốc tổng 240/480/720/960... Bản Featured trùng được ghi nhận thành dupe/Potential và nhận Bond Quota theo mô hình tài khoản hiện tại.
- **Hệ thống Vé Dossier**: Tích lũy 10 vé Dossier khi đạt mốc 60 lượt quay trên banner hiện tại, tự động tích lũy và ưu tiên sử dụng trước khi chuyển sang banner tiếp theo.
- Tự động gợi ý chuyển banner khi quay trúng nhân vật Featured của banner hiện tại.

### 2. Mô phỏng chiến thuật (Strategy Simulator)
- Chạy giả lập Monte Carlo nhiều người chơi qua chu kỳ Banner (Banner cycles) để so sánh hiệu năng.
- Tích hợp 5 chiến thuật gacha thông minh: *Save & Commit*, *Save & Commit (Roll lẻ)*, *Yolo / Spend All*, *Pull 60*, và *Roll Meta*.
- Số banner Meta do người dùng cấu hình; các vị trí Meta được chọn ngẫu nhiên trong chuỗi banner và dùng chung khi so sánh các chiến thuật.
- Tích hợp nút **Reset cài đặt** để khôi phục cấu hình mặc định và xóa cache cũ một cách an toàn.
- So sánh hiệu suất chi tiêu bằng bảng thống kê chi tiết và biểu đồ trực quan (sử dụng thư viện Chart.js).

### 3. Gacha Simulator (Single Run)
- Chạy giả lập chi tiết cho một người chơi với hạt giống (seed) ngẫu nhiên hoặc tự nhập.
- Theo dõi toàn bộ timeline quyết định, pity, tài nguyên và kết quả quay chi tiết qua từng mùa banner.

### 4. Thiết kế kỹ thuật & Offline-First
- Chuyển đổi toàn bộ giao diện giữa tiếng Việt và tiếng Anh tức thời mà không cần reload.
- Lưu trữ cấu hình và kết quả gần nhất trong `localStorage`.
- Đóng gói toàn bộ tài nguyên (JS, CSS, Chart.js) thành một file HTML duy nhất **`A9EGacha.html`** có thể chạy trực tiếp qua giao diện file (`file://`) hoàn toàn không cần kết nối mạng hay server.

---

## Hướng dẫn phát triển và kiểm thử

### Cài đặt dependencies
```bash
npm ci
```

### Chạy kiểm thử tự động
```bash
npm test
```

### Biên dịch lại mã nguồn khi có thay đổi (js/ -> js/bundle.js)
```bash
npm run build
```

### Theo dõi thay đổi tự động khi phát triển
```bash
npm run watch
```

### Đóng gói bản phát hành offline đơn nhất
```bash
npm run package
```
Sau khi hoàn tất, file HTML độc lập sẽ được tạo tại:
- Thư mục gốc: `A9EGacha.html`
- Thư mục phát hành: `release/A9EGacha.html` (đi kèm mã băm SHA-256 để kiểm chứng toàn vẹn).

---

## Cấu trúc mã nguồn

- `index.html`: Giao diện ứng dụng chính.
- `css/style.css`: Hệ thống CSS, bố cục và hiệu ứng responsive.
- `js/gacha-math.js`: Xác suất, pity, bảo hiểm động và kết quả quay gacha.
- `js/strategies.js`: Trạng thái người chơi và logic 5 chiến thuật mô phỏng.
- `js/simulator.js`: Bộ điều phối chạy Monte Carlo.
- `js/single-run.js`: Trình chạy một người chơi có seed để tái lập và kết xuất timeline.
- `js/chart-helper.js`: Tích hợp vẽ biểu đồ Chart.js.
- `js/app.js`: Điểm khởi chạy (entry point), điều khiển DOM và đồng bộ LocalStorage.
- `js/i18n.js`: Quản lý đa ngôn ngữ VI/EN và định dạng số theo locale.
- `js/bundle.js`: File đóng gói runtime hoàn chỉnh cho trình duyệt.
- `reports/detailed_gacha_run.md`: Báo cáo chạy Save & Commit một người qua 10 banner mẫu để kiểm chứng simulator.
