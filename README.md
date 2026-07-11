# Endfield Gacha Simulator

Trình giả lập gacha dành cho **Arknights: Endfield**, hỗ trợ quay tương tác và mô phỏng Monte Carlo để so sánh các chiến thuật sử dụng tài nguyên qua nhiều banner.

## Tính năng

- Quay Operator và vũ khí trực tiếp trên giao diện.
- Theo dõi ví vé, pity, kết quả quay và tài nguyên hoàn trả.
- Theo dõi Bond Quota, vé tự động quy đổi và các mốc pity 80/120 trong báo cáo run chi tiết.
- Chạy mô phỏng nhiều người chơi qua nhiều banner.
- So sánh năm chiến thuật chi tiêu bằng bảng thống kê và biểu đồ.
- Lưu trạng thái và cấu hình gần nhất trong LocalStorage.
- Cho phép cấu hình tài nguyên ban đầu và thu nhập theo phiên bản.

## Chạy dự án

Có thể mở trực tiếp `index.html`, hoặc chạy bằng local server:

```bash
npx serve ./
```

Sau khi sửa các module trong `js/`, tạo lại bundle dùng bởi giao diện:

```bash
npm run build
```

Dùng chế độ theo dõi khi phát triển:

```bash
npm run watch
```

Chạy bộ kiểm thử hồi quy cho xác suất, pity, guarantee và chiến thuật:

```bash
npm test
```

## Cấu trúc chính

- `index.html`: giao diện ứng dụng.
- `css/style.css`: bố cục và giao diện.
- `js/gacha-math.js`: xác suất, pity và kết quả quay.
- `js/strategies.js`: trạng thái người chơi và chiến thuật mô phỏng.
- `js/simulator.js`: bộ điều phối Monte Carlo.
- `js/chart-helper.js`: biểu đồ kết quả.
- `js/app.js`: điều khiển giao diện và LocalStorage.
- `js/bundle.js`: bundle được tạo từ các module JavaScript.
- [`docs/gacha_rules.md`](docs/gacha_rules.md): luật gacha dùng làm cơ sở mô phỏng.
- [`docs/strategies.md`](docs/strategies.md): định nghĩa các chiến thuật đang được triển khai.
- [`data/bookkeeping.md`](data/bookkeeping.md): toàn bộ dữ liệu công khai từ workbook Endfield Bookkeeping.
- [`reports/detailed_gacha_run.md`](reports/detailed_gacha_run.md): run Save & Commit một người qua 10 banner để kiểm chứng diễn biến simulator.

README chỉ giới thiệu sản phẩm. Luật, chiến thuật và dữ liệu được duy trì trong các tài liệu chuyên biệt ở trên.
