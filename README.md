# A9E Gacha Simulator

**Tiếng Việt** · [English](README.en.md)

A9E Gacha Simulator là ứng dụng mô phỏng gacha dành cho **Arknights: Endfield**. Ứng dụng hỗ trợ quay thử trực tiếp, so sánh chiến thuật bằng mô phỏng Monte Carlo và xem chi tiết toàn bộ diễn biến của một người chơi qua nhiều banner.

Ứng dụng chạy hoàn toàn offline, không gửi dữ liệu ra ngoài và hỗ trợ chuyển đổi tức thời giữa tiếng Việt và tiếng Anh.

## Mới trong 1.4.1

- Save & Commit chỉ hoàn tất mốc 30/60 sau Featured khi vẫn bảo vệ được mốc 120 của banner sau; Yolo vẫn ưu tiên lấy mốc nếu ví hiện tại đủ.
- Pull 60 đi thẳng tới 60 khi đủ ngay từ đầu. Nhánh fallback chỉ đi tới 30 khi vẫn bảo vệ được mốc 60 banner sau và không kiểm tra nâng lại ở pull 30.
- Tại pull 60 chưa có Featured, lộ trình nâng cấp luôn phải bảo vệ `120 hiện tại → 60 banner sau`.
- Mọi phép bảo vệ tương lai ở banner cuối dùng một banner kế tiếp ảo với thu nhập chuẩn, tránh ngoại lệ xả vé cuối kỳ.

Xem toàn bộ thay đổi tại [CHANGELOG.md](CHANGELOG.md).

## Bắt đầu nhanh

### Dùng bản phát hành

1. Tải file `A9EGacha_<phiên-bản>.html` mới nhất trong thư mục `release/` hoặc từ trang GitHub Releases.
2. Mở file bằng trình duyệt hiện đại như Chrome, Edge hoặc Firefox.
3. Không cần cài Node.js, không cần chạy server và không cần kết nối mạng.

### Chạy trực tiếp từ mã nguồn

Clone repository rồi mở `index.html`. Repository lưu sẵn `js/bundle.js`, vì vậy trang có thể chạy trực tiếp mà không cần build trước.

## Ba chế độ chính

### Quay tương tác

Dùng chế độ này để tự quay banner nhân vật và vũ khí:

- Quay x1, x10 và Weapon Issue.
- Theo dõi pity 5★, pity 6★, bảo hiểm Featured 120 và các mốc banner.
- Quản lý vé nhân vật, Dossier, Bond Quota và Arsenal.
- Xem lịch sử kết quả, nhân vật/vũ khí sở hữu và đánh giá may mắn.
- Chuyển banner trong khi vẫn giữ các trạng thái được phép kế thừa.

### Mô phỏng chiến thuật

Dùng chế độ này để so sánh năm cách sử dụng tài nguyên trên cùng một cấu hình:

- Save & Commit.
- Save & Commit — Quay lẻ.
- Yolo / Dùng hết.
- Mốc 60.
- Quay theo Meta.

Nhập số người chơi, số banner, tài nguyên ban đầu và thu nhập mỗi banner, sau đó chọn **Chạy giả lập**. Kết quả gồm số Featured trung bình, hiệu suất sử dụng vé, kết quả vũ khí, tỷ lệ hoàn thành toàn bộ Limited và biểu đồ phân phối.

Mô phỏng Monte Carlo phản ánh kết quả trung bình của nhiều lượt chạy ngẫu nhiên; đây không phải bảo đảm cho tài khoản thật.

Các chiến thuật dùng checkpoint ngân sách theo trạng thái hiện tại. Pull 60 đi thẳng tới 60 nếu đủ ngay từ đầu; nhánh fallback 30 chỉ chạy khi vẫn bảo vệ được mốc 60 banner sau và luôn dừng tại 30. Roll Meta giữ quỹ dự phòng cho Meta gần nhất thay vì dự báo chính xác nhiều banner xa.

### Gacha Simulator — một người chơi

Chế độ này chạy đúng một người chơi và hiển thị chi tiết từng banner:

- Quyết định roll hoặc skip của chiến thuật.
- Các lượt Standard, Limited, Urgent và Dossier, gồm 15 Standard + 10 Limited miễn phí được mô hình tự chạy mỗi banner.
- Thay đổi pity, Bond Quota, Arsenal và số dư cuối banner.
- Vị trí chính xác nhận Featured Operator hoặc Featured Weapon.

Có thể nhập lại cùng một seed và cấu hình để tái tạo kết quả.

## Ngôn ngữ và lưu dữ liệu

- Chọn `VI` hoặc `EN` ở góc trên bên phải để đổi ngôn ngữ giao diện.
- Cấu hình, trạng thái quay tương tác và kết quả gần nhất được lưu trong `localStorage` của trình duyệt.
- Nút reset trong ứng dụng sẽ đưa cấu hình liên quan về mặc định.

## Luật và giả định mô phỏng

- [Luật gacha](docs/gacha_rules.md)
- [Chi tiết các chiến thuật](docs/strategies.md)
- [Snapshot dữ liệu thu nhập](data/bookkeeping.md)

Một số dữ liệu như 15 Standard miễn phí mỗi banner mô phỏng, pool sở hữu, Bond Quota và xác suất lệch Limited là giả định/đầu vào của mô hình, không phải luật chính thức. Các quy ước đang dùng được ghi rõ trong tài liệu.

## Dành cho nhà phát triển

Yêu cầu: Node.js 20 trở lên và npm.

```bash
npm ci
npm test
```

Sau khi sửa bất kỳ file nguồn JavaScript nào trong `js/`, phải tạo lại bundle để `index.html` chạy ngay:

```bash
npm run build
```

Có thể tự động build lại trong lúc phát triển:

```bash
npm run watch
```

Chỉ tạo hoặc cập nhật file trong `release/` khi tăng phiên bản hoặc khi được yêu cầu phát hành:

```bash
npm run package
```

Các đầu ra:

- `js/bundle.js`: bundle được commit để `index.html` chạy trực tiếp.
- `dist/`: bản production trung gian, có thể xóa và tạo lại.
- `release/A9EGacha_<phiên-bản>.html`: file offline đơn nhất kèm checksum SHA-256.

## Cấu trúc dự án

```text
css/       Giao diện và responsive layout
data/      Snapshot dữ liệu dùng để đối chiếu
docs/      Luật gacha và mô tả chiến thuật
js/        Mã nguồn ứng dụng và bundle trình duyệt
scripts/   Công cụ build, đóng gói và phát hành
test/      Kiểm thử tự động
dist/      Build production tạm thời, không commit
release/   File HTML phát hành và checksum, không commit
```

## Lưu ý

Đây là công cụ mô phỏng cộng đồng, không phải sản phẩm chính thức của Hypergryph. Không sử dụng kết quả mô phỏng như cam kết nhận được nhân vật hoặc vũ khí cụ thể.
