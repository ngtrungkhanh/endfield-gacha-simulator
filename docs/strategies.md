# Các chiến thuật mô phỏng

Tài liệu này mô tả hành vi đang được triển khai trong `js/strategies.js`. Đây là quy tắc ra quyết định của simulator, không phải luật gacha chính thức.

## Luồng chung mỗi banner

Mọi chiến thuật đều thực hiện theo thứ tự sau:

1. Vé Dossier tích lũy ở banner trước trở thành vé khả dụng; vé khả dụng cũ chưa dùng hết hạn.
2. Nhận thu nhập vé nhân vật được cấu hình cho banner.
3. Quay 15 lượt Standard miễn phí để ghi nhận Operator, Bond Quota và Arsenal rebate.
4. Quay bắt buộc 10 lượt Limited miễn phí.
5. Quyết định có chi vé trong ví hay không theo chiến thuật.
6. Nếu chiến thuật skip nhưng còn Dossier sắp hết hạn, tự động dùng hết Dossier.
7. Nếu đã đạt từ 20 đến 29 lượt mà chưa có featured, có thể dùng tối đa 10 vé ví để chạm mốc 30.
8. Ngay khi lượt hợp lệ thứ 30 hoàn tất, bắt buộc thực hiện đủ 10 Urgent Recruitment miễn phí trước khi tiếp tục bất kỳ lượt Limited hoặc quyết định nào khác. Urgent không thể để dành.
9. Khi Bond Quota đạt 25, tự động đổi thành vé nhân vật và cộng ngay vào ví; vé mới có thể được dùng tiếp trong chính banner đang chạy.
10. Tại mỗi 240 lượt hợp lệ trên cùng banner, ghi nhận một token Potential của featured 6★.
11. Cộng Arsenal rebate cùng thu nhập Arsenal ngoài gacha, sau đó áp dụng chính sách quay vũ khí của chiến thuật.

### Quy tắc chuyển sang roll x1

Mặc định simulator ưu tiên quay theo cụm x10. Tất cả chiến thuật tự chuyển sang roll x1 khi còn từ 1 đến 9 lượt để chạm một trong các mốc 30, 60 hoặc guarantee 120. Nói cách khác, khoảng cách đến mốc phải **nhỏ hơn 10 lượt**; nếu còn đúng 10 lượt thì vẫn có thể dùng một cụm x10.

Sau khi chạm mốc, chiến thuật có thể quay lại x10 nếu vẫn tiếp tục quay và không còn điều kiện ép roll lẻ khác. Simulator cũng chuyển sang x1 khi pity 6★ từ 71, tài nguyên không đủ một cụm x10 hoặc số lượt còn lại đến mục tiêu chiến thuật nhỏ hơn 10.

Một cụm x10 đã bắt đầu không thể bị ngắt giữa chừng. Nếu featured xuất hiện giữa cụm, các lượt còn lại của cụm vẫn hoàn tất; chiến thuật chỉ dừng chi vé sau khi cụm kết thúc. Nếu cụm đó chạm mốc 30, 10 lượt Urgent vẫn phải thực hiện ngay sau lượt thứ 30.

## 1. Save & Commit

ID: `save_commit`

- Chỉ chi vé khi có đủ vé bảo hiểm 120 lượt (ví + Dossier, đã tính đến cả Bond Quota hoàn trả tối thiểu thu về trong quá trình roll).
- Quay đến khi nhận featured 6★ hoặc đạt mục tiêu 120 lượt; nếu featured xuất hiện giữa cụm x10 thì hoàn tất cụm trước khi dừng.
- Dùng x10 thông thường và áp dụng quy tắc chuyển x1 chung khi gần mốc 30, 60, pity 6★ hoặc guarantee 120.
- Chỉ bắt đầu quay vũ khí sau khi đã nhận featured Operator và có ít nhất 15.840 Arsenal Tickets, tương đương tám Issue.
- Dừng quay vũ khí khi nhận featured hoặc phần thưởng mốc được simulator tính là featured.

## 2. Save & Commit — Roll lẻ

ID: `save_commit_single`

- Điều kiện tích vé và chính sách vũ khí giống Save & Commit.
- Tất cả lượt sử dụng vé trong ví được thực hiện theo từng lượt x1.
- Dừng ngay khi nhận featured 6★.

## 3. Yolo / Spend All

ID: `yolo`

- Sử dụng toàn bộ vé khả dụng trên banner.
- Dừng ngay khi nhận featured 6★; nếu chưa nhận featured thì tiếp tục đến khi hết vé.
- Sau khi nhận featured Operator, dùng Arsenal Tickets cho các Issue cho đến khi nhận featured hoặc không còn đủ 1.980 vé.

## 4. Pull 60

ID: `pull_60`

- Nếu tổng vé thường và Dossier có ít nhất 50 lượt, cộng 10 lượt miễn phí để quay đến mốc 60.
- Nếu không đủ mốc 60 nhưng tổng tài nguyên có ít nhất 20 lượt, quay đến mốc 30.
- Nếu không đủ mốc 30, chiến thuật skip ngoài các lượt miễn phí và Dossier bắt buộc phải dùng.
- Không dừng sớm khi nhận featured; mục tiêu chính là hoàn thành mốc đã chọn.
- Sau khi nhận featured Operator, chính sách vũ khí giống Yolo.

## 5. Roll Meta

ID: `roll_meta`

- Người dùng cấu hình trực tiếp số banner Meta từ `0` đến tổng số banner. Giá trị mặc định trên giao diện được gợi ý bằng `floor(30% × tổng số banner)`, nhưng không phải tỷ lệ cố định.
- Đúng số vị trí Meta đã cấu hình được chọn ngẫu nhiên bằng Fisher–Yates trong chuỗi banner. Cùng một lượt Monte Carlo dùng chung tập vị trí này cho mọi người chơi và chiến thuật để so sánh trên cùng lịch banner; Single Run dùng seed riêng nên có thể tái lập tập Meta.
- Banner Meta luôn được phép quay tối đa 120 lượt và dừng khi nhận featured.
- Ở banner không Meta, chỉ quay khi có đủ ngân sách bảo hiểm 120 lượt và vẫn có thể tích lại đủ lượng vé bảo hiểm cho banner Meta kế tiếp từ phần dư cộng thu nhập dự kiến.
- Nếu không còn banner Meta phía sau, quay theo điều kiện Save & Commit thông thường.
- Trên banner Meta, quay vũ khí sau khi đã nhận featured Operator.
- Trên banner thường, có thể quay vũ khí nếu đã nhận featured Operator, ví hiện tại đủ tám Issue và phần dư cộng thu nhập dự kiến vẫn bảo đảm tám Issue cho banner Meta kế tiếp. Nếu không còn banner Meta phía sau, áp dụng ngưỡng tám Issue cho banner hiện tại.

## Quy ước vũ khí trong simulator

- Một Issue luôn được tính là 10 lượt và tiêu tốn 1.980 Arsenal Tickets.
- Các chiến thuật dừng săn vũ khí khi nhận featured trực tiếp hoặc khi phần thưởng mốc trả về `featured_weapon`.
- `selector_box` là hộp chọn 6★ ngoài rate-up: tăng thống kê 6★ Standard và hộp chọn, nhưng không tăng Featured Weapon và không hoàn thành mục tiêu săn Featured.
- Save & Commit yêu cầu ngân sách đủ tám Issue trước khi bắt đầu; các chiến thuật còn lại có thể bắt đầu ngay khi đủ một Issue và thỏa điều kiện featured Operator của chúng.

## Giả định mô hình cần tiếp tục xác minh

Các giá trị sau đang được dùng trong code để mô phỏng dupe và Bond Quota, nhưng chưa phải luật được xác nhận từ hai trang wiki:

- Bể giả lập gồm 6 Standard 6★, 3 Limited lệch và 15 Operator 5★.
- Khi lệch Featured 6★, có 10% khả năng kết quả thuộc nhóm Limited lệch.
- Mô hình giả định tài khoản đã sở hữu gần đủ pool: Standard 6★ lệch luôn được tính là dupe và nhận 50 Bond Quota.
- Cũng theo giả định tài khoản lâu năm, Operator 5★ luôn nhận 10 Bond Quota; Featured/Limited 6★ chỉ nhận 50 Quota khi đã sở hữu.
- Mỗi 25 Bond Quota tự động đổi thành một vé nhân vật.
- Pity 6★ của Arsenal (`issuesSince6`) hiện được giữ khi đổi Issue banner, trong khi featured guarantee và số Issue cột mốc reset.

Những giả định này cần được thay bằng dữ liệu pool/sở hữu đầu vào nếu simulator phát triển theo hướng mô phỏng tài khoản thực tế.

## Run kiểm chứng chi tiết

[`reports/detailed_gacha_run.md`](../reports/detailed_gacha_run.md) là một run Save & Commit có seed cố định `20260711`, dùng để kiểm tra thứ tự quyết định, pity 80/120, mốc 30/60, Urgent, Dossier, Bond Quota và Arsenal qua 10 banner.

Run này gọi trực tiếp cùng `SimulatorPlayer` và `runSingleBannerForPlayer()` mà giao diện web sử dụng. Với cùng seed và cấu hình, tab Gacha Simulator có thể tái tạo cùng timeline. Mô phỏng Monte Carlo nhiều người chơi vẫn dùng `Math.random()` và không có seed đầu vào, nên mỗi lần chạy có cùng logic nhưng không nhất thiết cho đúng cùng một mẫu ngẫu nhiên.
