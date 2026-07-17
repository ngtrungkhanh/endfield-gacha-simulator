# Changelog

Mọi thay đổi đáng chú ý của A9E Gacha Simulator được ghi lại tại đây.

## [1.4.0] - 2026-07-17

### Thêm mới

- Thêm `calculateMinimumTicketsRequired()` để tính số vé thường tối thiểu phải có ngay tại checkpoint cho một mốc hoặc lộ trình nhiều banner.
- Hỗ trợ lộ trình như `[120, 60]`, tự tính các nguồn tối thiểu từ 15 Standard, 10 Limited miễn phí, Dossier, Urgent và Bond Quota.
- Thêm dữ liệu checkpoint chi tiết vào Single Run để hiển thị số vé cần/có và lý do tiếp tục hoặc dừng.
- Thêm test biên đối chiếu công thức với mô hình tham chiếu từng pull trên toàn bộ trạng thái pity 5★/120 liên quan.

### Thay đổi chiến thuật

- Dời budget checkpoint lên ngay sau Free Limited và Dossier bắt buộc. Tùy chọn tối ưu Dossier → Urgent chỉ được chi vé sau khi chiến thuật đã duyệt ngân sách.
- Save & Commit và bản roll lẻ dùng ngưỡng 120 động theo pity 5★, tiến độ banner và Bond Quota hiện tại thay vì ngưỡng cứng.
- Pull 60 được tách thành ba checkpoint:
  - đầu banner kiểm tra đồng thời mốc 30 và 60;
  - tại pull 30 cập nhật trạng thái thật rồi kiểm tra lại mốc 60;
  - tại pull 60 chỉ nâng lên 120 khi ví hiện tại tự đủ và vẫn bảo vệ được mốc 60 banner sau.
- Không cho phép thu nhập banner sau tài trợ ngược cho 120 của banner hiện tại.
- Roll Meta chuyển sang rolling reserve:
  - 95 vé nếu Meta kế tiếp liền kề và nhận được Dossier;
  - 105 vé nếu có banner xen giữa;
  - dùng lịch thu nhập thực tế tới Meta kế tiếp, không dự báo kết quả gacha qua nhiều banner.
- Banner Meta hiện tại luôn dùng tài nguyên khả dụng để săn Featured, kể cả chưa đủ bảo hiểm 120.
- Khi không còn Meta phía sau, Roll Meta trở về hành vi Save & Commit.
- Chính sách quay vũ khí được giữ nguyên trong phiên bản này.

### Giao diện và báo cáo

- Cập nhật nội dung quyết định trong Single Run cho các lần check Pull 60 và quỹ dự phòng Roll Meta.
- Bổ sung bản dịch tiếng Việt/Anh cho trạng thái vượt/thiếu mốc, nâng mục tiêu 120 và reserve Meta.

### Hiệu năng và độ chính xác

- Công thức ngân sách nhảy theo các đoạn mốc thay vì loop đủ 120 pull; độ phức tạp theo số banner trong lộ trình.
- Bỏ qua Quota từ pity 6★/80 để thiên an toàn; sai số dự kiến chủ yếu khoảng một vé mỗi banner.
- Simulator tiền tính lịch thu nhập vé, kể cả banner cuối bị cắt ngắn trong chế độ giới hạn tổng pull.

### Tài liệu và kiểm thử

- Viết lại tài liệu chiến thuật để mô tả thứ tự checkpoint, công thức an toàn, Pull 60 và rolling reserve của Roll Meta.
- Bổ sung quy ước ước tính vé vào tài liệu luật gacha và cập nhật README song ngữ.
- Mở rộng test hồi quy cho checkpoint trước tối ưu 30, biên thiếu một vé, Pull 60 recheck/upgrade và Roll Meta reserve.

## [1.3.0] - 2026-07-14

### Thêm mới và thay đổi

- Nâng cấp giao diện, báo cáo mô phỏng và nội dung song ngữ.
- Cải thiện hiển thị quyết định chiến thuật, biểu đồ và thông tin Single Run.
- Chuẩn hóa quy trình build bundle, đóng gói offline và checksum phát hành.
- Bổ sung tài liệu chiến thuật, dữ liệu bookkeeping và các test giao diện/bundle liên quan.

## [1.2.4] - 2026-07-13

### Thêm mới

- Thêm báo cáo Single Run chi tiết và phần hiển thị diễn biến theo banner.
- Cải thiện báo cáo mô phỏng, giao diện responsive và bản dịch.
- Cập nhật quy trình tạo file HTML offline cùng checksum.

## [1.2.3] - 2026-07-12

### Sửa lỗi

- Sửa lỗi seed ngẫu nhiên để kết quả có thể tái lập đúng.

## [1.2.2] - 2026-07-12

### Thay đổi

- Cập nhật chính sách tích và bảo vệ Arsenal Tickets của chiến thuật Roll Meta.
- Bổ sung kiểm thử hồi quy cho điều kiện ngân sách vũ khí.

## [1.2.1] - 2026-07-12

### Sửa lỗi

- Ghi nhận đúng số lần Featured nhận từ guarantee 120 trong thống kê.

## [1.2.0] - 2026-07-12

### Thêm mới và thay đổi

- Nâng cấp mô phỏng chiến thuật, biểu đồ kết quả và giao diện cấu hình.
- Cải thiện luồng Single Run, quy tắc mốc banner và các giả định gacha.
- Thêm thống kê Meta cho nhân vật/vũ khí và hoàn thiện cơ chế bảo vệ ngân sách vũ khí Roll Meta.
- Mở rộng đáng kể bộ test cho chiến thuật và báo cáo.

## [1.1.0] - 2026-07-12

### Thêm mới

- Thêm quy trình đóng gói HTML offline đơn nhất.
- Nâng cấp Interactive Pull và mô phỏng chiến thuật.
- Bổ sung hỗ trợ Dossier, Urgent Recruitment, Bond Quota và các trạng thái kế thừa.

[1.4.0]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/compare/v1.2.4...v1.3.0
[1.2.4]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ngtrungkhanh/endfield-gacha-simulator/releases/tag/v1.1.0
