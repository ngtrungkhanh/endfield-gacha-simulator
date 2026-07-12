# Luật gacha dùng trong Endfield Gacha Simulator

Tài liệu này chỉ chứa luật gacha. Dữ liệu thu nhập tài nguyên theo phiên bản được tách riêng tại [`data/bookkeeping.md`](../data/bookkeeping.md), còn cách sử dụng tài nguyên được mô tả tại [`strategies.md`](strategies.md).

## Nguồn và quy ước

- Luật Headhunting: [Endfield Talos Wiki — Headhunting](https://endfield.wiki.gg/wiki/Headhunting).
- Luật Arsenal Exchange: [Endfield Talos Wiki — Arsenal Exchange](https://endfield.wiki.gg/wiki/Arsenal_Exchange).
- Các cơ chế Urgent Recruitment, Headhunting Dossier, rebate và quy ước vòng đời vé không xuất hiện trên hai trang wiki trên nhưng vẫn được giữ theo dữ liệu và yêu cầu của dự án.
- Khi tài liệu wiki và quy ước dự án khác nhau, phải ghi rõ nguồn thay vì trộn chúng với dữ liệu bookkeeping.

## 1. Headhunting

### Chi phí và tỷ lệ cơ bản

- Một lượt quay tiêu tốn 500 Oroberyl hoặc một permit phù hợp với loại banner.
- Quay lẻ 10 lần và quay x10 không khác nhau về mặt xác suất.
- Tỷ lệ cơ bản: 6★ `0,8%`, 5★ `8%`, 4★ `91,2%`.

### Bảo hiểm 5★

- Trong mỗi chuỗi 10 lượt, chắc chắn có ít nhất một Operator 5★ trở lên.
- Nếu chín lượt liên tiếp không có 5★ hoặc 6★, lượt thứ 10 chắc chắn là 5★ trở lên.
- Bộ đếm reset khi xuất hiện 5★ hoặc 6★.
- Theo quy ước đã xác nhận của dự án, bộ đếm 5★ được cộng dồn qua banner.
- Operator 5★ không áp dụng cơ chế rate-up 50% trong simulator.

### Pity 6★

- Từ lượt 1 đến lượt 65 kể từ 6★ gần nhất, tỷ lệ 6★ là `0,8%` mỗi lượt.
- Nếu 65 lượt chưa có 6★, mỗi lượt tiếp theo tăng thêm 5 điểm phần trăm:
  - Lượt 66: `5,8%`.
  - Lượt 67: `10,8%`.
  - Lượt 79: `70,8%`.
- Lượt 80 chắc chắn là Operator 6★.
- Khi xuất hiện 6★, pity 6★ reset về 0.
- Pity 6★ và mức tỷ lệ đã tăng được bảo lưu qua các banner Headhunting.

### Featured 6★

- Khi xuất hiện Operator 6★, xác suất nhận Operator featured là 50%.
- Không có bảo hiểm kiểu “lệch 50/50 thì 6★ tiếp theo chắc chắn featured” mang sang banner khác.
- Guarantee 120 chỉ kích hoạt một lần trong một banner: nếu 119 lượt đầu chưa nhận featured 6★, lượt thứ 120 chắc chắn là featured 6★.
- Tiến độ guarantee 120 không mang sang banner khác và reset khi banner kết thúc.
- Mỗi 240 lượt trên cùng banner nhận một token Potential của featured 6★; bộ đếm này reset khi banner kết thúc.

#### Quy ước Featured động của Interactive Pull

- Tab Interactive Pull cho phép tiếp tục săn nhiều bản Featured trên cùng banner và dùng chuỗi mốc cộng dồn `120 → 240 → 480 → 720 → 960...`.
- Featured đầu tiên được bảo đảm chậm nhất ở pull 120. Sau khi đã có một bản, bản tiếp theo được bảo đảm tại tổng pull 240; từ bản thứ ba trở đi, mốc kế tiếp tăng thêm 240 pull.
- Featured nhận lại trên cùng banner được ghi nhận là dupe/Potential và nhận 50 Bond Quota theo mô hình sở hữu hiện tại.
- Token Potential thưởng tại mỗi mốc 240 pull vẫn được theo dõi riêng bởi bộ đếm `potentialTokensThisBanner`.
- Strategy Simulator chỉ đặt mục tiêu một Featured trên mỗi banner, nên dừng sau khi nhận Featured và chỉ sử dụng guarantee 120 đầu tiên.

### Mốc 30 — Urgent Recruitment

- Khi đạt 30 lượt quay hợp lệ trên banner hiện tại, nhận 10 lượt Urgent Recruitment miễn phí.
- Mười lượt Urgent phải được thực hiện ngay sau lượt quay thứ 30; không thể lưu lại để quay ở thời điểm khác.
- Urgent chỉ dùng trong banner hiện tại và không chuyển sang banner sau.
- Urgent không tăng pity 6★, không tăng tiến độ guarantee 120 và 6★ nhận từ Urgent không reset các bộ đếm đó.
- Gói 10 Urgent có bảo hiểm cục bộ: nếu chín lượt đầu đều là 4★, lượt thứ 10 chắc chắn là 5★ trở lên.

### Mốc 60 — Headhunting Dossier

- Khi đạt 60 lượt quay hợp lệ, nhận một Headhunting Dossier, tự chuyển thành 10 lượt miễn phí cho banner giới hạn kế tiếp.
- Vé Dossier chỉ khả dụng ở banner liền sau. Phần chưa dùng sẽ hết hạn khi chuyển sang banner tiếp theo nữa.
- Lượt quay bằng Dossier được tính vào pity và các mốc giống lượt quay thông thường.

### Bond Quota và quy đổi vé trong simulator

Các giá trị dưới đây là quy ước mô hình của dự án và chưa được xác nhận từ hai trang wiki nêu ở đầu tài liệu:

- Để mô phỏng tài khoản lâu năm đã sở hữu gần đủ pool, mọi Operator 5★ được giả định là bản trùng và nhận 10 Bond Quota.
- Standard 6★ lệch cũng được giả định là bản trùng và nhận 50 Bond Quota; Featured/Limited 6★ chỉ nhận 50 Quota khi là bản trùng theo tập sở hữu đang theo dõi.
- Mỗi 25 Bond Quota tự động đổi thành một vé nhân vật.
- Vé nhận từ quy đổi được cộng ngay vào ví tại lượt phát sinh, vì vậy có thể được dùng cho các lượt tiếp theo trong cùng banner.
- Phần Bond Quota chưa đủ 25 được giữ lại qua banner.

## 2. Arsenal Exchange

### Mua trực tiếp

- Vũ khí 4★ giá 20 Arsenal Tickets.
- Vũ khí 5★ giá 400 Arsenal Tickets.
- Vũ khí 6★ giá 2.480 Arsenal Tickets.
- Danh sách xoay tua gồm một vũ khí 6★ và một vũ khí 5★ theo tuần; hai vũ khí 5★ và một vũ khí 4★ theo ngày.

### Issue gacha

- Một Issue tiêu tốn 1.980 Arsenal Tickets hoặc một Issue Cert và trả về 10 vũ khí.
- Tỷ lệ cơ bản cho từng vũ khí: 6★ `4%`, 5★ `15%`, 4★ `81%`.
- Mỗi Issue chắc chắn chứa ít nhất một vũ khí 5★ trở lên.
- Nếu ba Issue liên tiếp không có 6★, Issue thứ tư chắc chắn có ít nhất một 6★; kết quả này không chắc chắn là rate-up.
- Khi xuất hiện vũ khí 6★, xác suất là vũ khí rate-up là 25%.
- Nếu bảy Issue liên tiếp chưa có rate-up 6★, Issue thứ tám chắc chắn có rate-up 6★. Guarantee này chỉ kích hoạt một lần trong banner và không mang sang banner khác.

### Phần thưởng theo số Issue

- Issue thứ 10: nhận một Weapon Selection Box/Arms OC để chọn một vũ khí 6★ ngoài rate-up. Phần thưởng này không được tính là Featured Weapon.
- Issue thứ 18: nhận trực tiếp vũ khí rate-up 6★.
- Sau đó, cứ thêm tám Issue, phần thưởng luân phiên giữa Weapon Selection Box và rate-up 6★: Issue 26 là hộp chọn, 34 là rate-up, 42 là hộp chọn, 50 là rate-up...
- Bộ đếm số Issue reset khi banner Issue kết thúc.

### Rebate được dùng trong simulator

Các giá trị sau là quy ước dữ liệu của dự án, không được trích từ hai trang wiki nêu trên:

- Operator 6★: 2.000 Arsenal Tickets.
- Operator 5★: 200 Arsenal Tickets.
- Operator 4★: 20 Arsenal Tickets.

Tài liệu luật không cố định lượng Arsenal Tickets nhận từ nhiệm vụ, cửa hàng hoặc Protocol Pass. Các nguồn thu nhập theo phiên bản phải lấy từ [`data/bookkeeping.md`](../data/bookkeeping.md) hoặc cấu hình trực tiếp trên giao diện.
