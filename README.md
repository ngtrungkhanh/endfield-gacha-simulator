# Endfield Gacha Simulator v1.1.0

Trình giả lập gacha dành cho **Arknights: Endfield**, hỗ trợ quay tương tác và mô phỏng Monte Carlo để so sánh các chiến thuật sử dụng tài nguyên qua nhiều banner.

An offline-first Vietnamese/English gacha simulator for **Arknights: Endfield**, with interactive pulls and Monte Carlo strategy comparisons.

## Tính năng

- Quay Operator và vũ khí trực tiếp trên giao diện.
- Theo dõi ví vé, pity, kết quả quay và tài nguyên hoàn trả.
- Theo dõi Bond Quota, vé tự động quy đổi và các mốc pity 80/120 trong báo cáo run chi tiết.
- Chạy mô phỏng nhiều người chơi qua nhiều banner.
- Chạy một người chơi với seed ngẫu nhiên hoặc seed tự nhập, chọn một trong năm chiến thuật và xem timeline chi tiết theo từng banner.
- So sánh năm chiến thuật chi tiêu bằng bảng thống kê và biểu đồ.
- Lưu trạng thái và cấu hình gần nhất trong LocalStorage.
- Cho phép cấu hình tài nguyên ban đầu và thu nhập theo phiên bản.
- Chuyển đổi toàn bộ giao diện giữa tiếng Việt và tiếng Anh mà không reload hoặc mất trạng thái.
- Chạy trực tiếp qua `file://` mà không cần server hay kết nối mạng.
- Tài liệu luật và chiến thuật được nhúng trực tiếp trong giao diện, không phụ thuộc file Markdown khi chạy.

## Kiểm thử nội bộ / Internal testing

Tạo bản offline chưa đóng gói release:

```bash
npm ci
npm test
npm run build
npm run build:offline
```

Sau đó mở trực tiếp `dist/index.html`. Không cần local server. Khi kiểm thử offline, nên tắt mạng hoặc dùng DevTools để chặn network.

Then open `dist/index.html` directly. No local server is required. Disable the network or block requests in DevTools for the offline smoke test.

Tạo file HTML duy nhất tự chứa (self-contained) phục vụ kiểm thử nhanh hoặc phân phối gọn nhẹ:
Create a single self-contained HTML file for quick testing or lightweight distribution:

```bash
npm run build:single
```

Sau đó mở trực tiếp `A9EGacha.html` ở thư mục gốc. Then open `A9EGacha.html` directly in the root folder.


Sau khi sửa các module trong `js/`, tạo lại bundle dùng bởi giao diện:

```bash
npm run build
```

Dùng chế độ theo dõi khi phát triển:

```bash
npm run watch
```

Chỉ sau khi smoke test nội bộ đạt mới tạo ZIP release:

```bash
npm run package
```

## Cấu trúc chính

- `index.html`: giao diện ứng dụng.
- `css/style.css`: bố cục và giao diện.
- `js/gacha-math.js`: xác suất, pity và kết quả quay.
- `js/strategies.js`: trạng thái người chơi và chiến thuật mô phỏng.
- `js/simulator.js`: bộ điều phối Monte Carlo.
- `js/single-run.js`: runner một người chơi có seed tái lập và dữ liệu báo cáo chi tiết.
- `js/chart-helper.js`: biểu đồ kết quả.
- `js/app.js`: điều khiển giao diện và LocalStorage.
- `js/i18n.js`: catalog VI/EN, định dạng số và locale độc lập với schema gacha.
- `js/bundle.js`: bundle được tạo từ các module JavaScript.
- `docs/` và `data/`: tài liệu nguồn phục vụ phát triển; không còn được sao chép vào bản offline runtime.
- [`reports/detailed_gacha_run.md`](reports/detailed_gacha_run.md): run Save & Commit một người qua 10 banner để kiểm chứng diễn biến simulator.

README chỉ giới thiệu sản phẩm. Luật, chiến thuật và dữ liệu được duy trì trong các tài liệu chuyên biệt ở trên.
