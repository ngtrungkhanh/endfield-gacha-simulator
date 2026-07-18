# Các chiến thuật mô phỏng

Tài liệu này mô tả hành vi đang được triển khai trong `js/strategies.js`. Đây là quy tắc ra quyết định của simulator, không phải luật gacha chính thức.

## Luồng chung mỗi banner

Mọi chiến thuật đều thực hiện theo thứ tự sau:

1. Vé Dossier tích lũy từ banner trước trở thành vé khả dụng; Dossier cũ chưa dùng sẽ hết hạn.
2. Nhận thu nhập vé nhân vật được cấu hình cho banner hiện tại.
3. Quay 15 lượt Standard miễn phí theo quy ước mô hình. Các lượt này dùng pity Standard riêng, không tăng mốc Limited 30/60/120 nhưng vẫn tạo Bond Quota và Arsenal rebate.
4. Quay 10 lượt Limited miễn phí; các lượt này dùng pity Limited và tăng tiến độ mốc như lượt Limited thông thường.
5. Dùng hết Dossier sắp hết hạn.
6. Chụp trạng thái và kiểm tra ngân sách chiến thuật. Đây là checkpoint chính, trước khi tiêu bất kỳ vé thường nào.
7. Nếu chiến thuật cho phép chi vé, thực hiện mục tiêu đã chọn. Tùy chọn tối ưu Dossier → Urgent chỉ được chạy sau bước duyệt ngân sách này.
8. Khi Bond Quota đạt 25, tự động đổi thành một vé nhân vật và cộng ngay vào ví; vé mới có thể được dùng tiếp trong chính banner đang chạy.
9. Tại mỗi 240 lượt hợp lệ trên cùng banner, ghi nhận một token Potential của Featured 6★.
10. Cộng Arsenal rebate cùng thu nhập Arsenal ngoài gacha, sau đó áp dụng chính sách quay vũ khí của chiến thuật.

### Hàm ước tính vé an toàn

Các checkpoint nhân vật dùng chung `calculateMinimumTicketsRequired()` để trả lời câu hỏi: **ngay tại thời điểm check phải có tối thiểu bao nhiêu vé thường để hoàn thành một mốc hoặc một lộ trình mốc?**

Đầu vào gồm pity 5★, tiến độ 120 hiện tại, Bond Quota hiện tại và một mốc hoặc chuỗi mốc. Ví dụ:

- `60`: đi tới mốc 60 của banner hiện tại.
- `[120, 60]`: đi tới 120 ở banner hiện tại rồi vẫn đủ tới 60 ở banner kế tiếp.

Mô hình dùng các bảo đảm tối thiểu sau:

- Mỗi kết quả 5★ hoặc 6★ được tính là 10 Bond Quota.
- Pity 5★ bảo đảm tối thiểu một kết quả 5★+ trong mỗi 10 Limited pull.
- Pull 120 được tính là Featured 6★.
- Banner tương lai tự tính 15 Standard, 10 Limited miễn phí, 10 Dossier nếu banner trước đạt 60 và 10 Urgent khi đi qua mốc 30.
- Quota nhận ở pull cuối chỉ dùng được từ pull kế tiếp, không được dùng ngược để thanh toán chính pull vừa tạo ra Quota.

Để công thức ngắn và thiên an toàn, nó bỏ qua 6★ từ pity 80, bỏ qua Featured ra sớm và bỏ qua Limited lệch không nhận Quota. Vì không cộng Quota từ pity 80, kết quả thường bằng hoặc cao hơn nhu cầu thực tế; sai số chủ yếu chỉ khoảng một vé trên mỗi banner. Featured ra sớm không làm sai quyết định thực tế vì chiến thuật săn Featured sẽ dừng tại đó.

Hàm chạy theo từng đoạn giữa các mốc 30/60/120, không mô phỏng từng pull. Do số đoạn cố định và rất nhỏ, chi phí của mỗi lần check là `O(số banner trong lộ trình)`; các checkpoint hiện tại chỉ dùng một hoặc hai banner.

### Quy ước banner kế tiếp ảo

Mọi phép kiểm tra cần bảo vệ tài nguyên cho banner sau đều được áp dụng giống nhau ở mọi vị trí. Nếu đang ở banner cuối của lượt mô phỏng, simulator vẫn dựng một **banner kế tiếp ảo** với mức thu nhập vé chuẩn đã cấu hình để tính lộ trình. Banner ảo chỉ phục vụ quyết định ngân sách, không được thực sự quay và không xuất hiện trong kết quả.

Quy ước này tránh ngoại lệ “xả tài nguyên ở banner cuối”, nhờ đó cùng một trạng thái luôn cho cùng một quyết định dù người dùng mô phỏng dài hay ngắn hơn một banner.

### Tối ưu Dossier → Urgent

Khi tùy chọn này bật, nếu sau Free/Dossier người chơi đang ở pull 20–29, chưa có Featured và đủ vé để chạm 30, simulator có thể bù đúng phần thiếu để nhận 10 Urgent.

Mốc này không còn là một khoản chi bắt buộc trước budget check:

- Save & Commit chỉ tối ưu khi checkpoint 120 đã đạt.
- Roll Meta chỉ tối ưu sau khi banner được phép quay.
- Yolo luôn cho phép vì mục tiêu của chiến thuật là dùng hết tài nguyên.
- Pull 60 tự đi tới 30 hoặc 60 theo checkpoint riêng nên không cần pha tối ưu tách biệt.

### Quy tắc chuyển sang roll x1

Mặc định simulator ưu tiên quay theo cụm x10. Tất cả chiến thuật tự chuyển sang roll x1 khi còn từ 1 đến 9 lượt để chạm một trong các mốc 30, 60 hoặc guarantee 120. Nếu còn đúng 10 lượt thì vẫn có thể dùng một cụm x10.

Sau khi chạm mốc, chiến thuật có thể quay lại x10 nếu vẫn tiếp tục quay và không còn điều kiện ép roll lẻ khác. Simulator cũng chuyển sang x1 khi pity 6★ từ 71, tài nguyên không đủ một cụm x10 hoặc số lượt còn lại đến mục tiêu chiến thuật nhỏ hơn 10.

Một cụm x10 đã bắt đầu không thể bị ngắt giữa chừng. Nếu Featured xuất hiện giữa cụm, các lượt còn lại của cụm vẫn hoàn tất; chiến thuật chỉ dừng chi vé sau khi cụm kết thúc. Nếu cụm đó chạm mốc 30, 10 lượt Urgent vẫn phải thực hiện ngay sau lượt thứ 30.

Save & Commit và Yolo có thêm ngoại lệ sau khi nhận Featured nếu còn từ 1 đến 10 lượt để chạm mốc thưởng 30 hoặc 60. Yolo chỉ cần ví đủ phần thiếu. Save & Commit còn yêu cầu lộ trình `mốc hiện tại → 120 banner sau` an toàn; nếu không bảo vệ được 120 banner sau thì dừng ngay dù có đủ vé chạm mốc. Quy tắc không nối tiếp từ 30 lên 60. Save & Commit — Roll lẻ không dùng ngoại lệ này để giữ mục tiêu dừng chính xác tại Featured.

## 1. Save & Commit

ID: `save_commit`

- Tại checkpoint sau Free/Dossier, tính số vé hiện tại cần để bảo hiểm mốc 120 bằng hàm ước tính chung.
- Chỉ cam kết quay nếu ví vé thường hiện tại đạt ngưỡng đó.
- Nếu được phép quay, chỉ check ngân sách một lần, sau đó quay đến khi nhận Featured 6★ hoặc đạt mốc 120 mà không check lại tại 30/60.
- Sau Featured, chỉ hoàn tất mốc 30/60 gần nhất nếu còn tối đa 10 lượt, ví đủ phần thiếu và tổng tài nguyên vẫn bảo vệ được mốc 120 của banner sau; nếu banner sau thiếu 120 dù có hoặc không hoàn tất mốc thì dừng ngay.
- Nếu Featured xuất hiện giữa cụm x10 thì hoàn tất cụm trước khi dừng.
- Chỉ bắt đầu quay vũ khí sau khi đã nhận Featured Operator và có ít nhất 15.840 Arsenal Tickets, tương đương tám Issue.
- Dừng quay vũ khí khi nhận Featured hoặc phần thưởng mốc được simulator tính là Featured.

## 2. Save & Commit — Roll lẻ

ID: `save_commit_single`

- Checkpoint và điều kiện bảo hiểm 120 giống Save & Commit.
- Tất cả lượt sử dụng vé trong ví được thực hiện theo từng lượt x1.
- Dừng ngay khi nhận Featured 6★.
- Chính sách vũ khí giống Save & Commit.

## 3. Yolo / Spend All

ID: `yolo`

- Luôn cho phép chi vé sau các lượt Free/Dossier bắt buộc.
- Nếu bật tối ưu mốc 30, bù phần thiếu trước rồi tiếp tục dùng toàn bộ vé khả dụng.
- Dừng khi nhận Featured 6★; nếu chưa nhận Featured thì tiếp tục đến khi hết vé.
- Sau Featured, hoàn tất mốc 30/60 gần nhất nếu còn tối đa 10 lượt và đủ vé, rồi dừng; Yolo không giữ quỹ cho banner sau.
- Sau khi nhận Featured Operator, dùng Arsenal Tickets cho các Issue cho đến khi nhận Featured Weapon hoặc không còn đủ 1.980 vé.

## 4. Pull 60

ID: `pull_60`

Pull 60 dùng hai checkpoint quyết định: đầu banner và tại pull 60.

### Checkpoint đầu banner: mốc 30 và 60

Sau 10 Limited miễn phí và Dossier bắt buộc:

1. Tính đồng thời số vé cần cho mốc 60 và mốc 30.
2. Nếu đủ mốc 60, quay thẳng tới 60.
3. Nếu chưa đủ 60 nhưng đủ 30, chỉ quay tới 30 khi phần dư cộng thu nhập banner kế tiếp vẫn bảo vệ được mốc 60 của banner sau.
4. Nếu không đủ 30, hoặc lộ trình `30 hiện tại → 60 banner sau` không an toàn, skip và giữ vé.

Nếu đã chọn mục tiêu 60 ngay từ đầu, chiến thuật đi thẳng tới 60 kể cả nhận Featured sớm và không kiểm tra lại tại pull 30.

Nếu checkpoint đầu chỉ cho phép fallback 30, chiến thuật hoàn tất pull 30 cùng 10 Urgent rồi **luôn dừng tại đó**. Kết quả Quota thực tế tại 30 không được dùng để mở lại quyết định lên 60; muốn đi thẳng tới 60 thì ngân sách phải đạt điều kiện 60 ngay từ checkpoint đầu banner.

### Checkpoint tại pull 60: cân nhắc nâng lên 120

Nếu đạt pull 60 mà vẫn chưa có Featured:

1. Tính số vé hiện tại cần để hoàn thành 120 của banner này.
2. Đồng thời tính lộ trình `[120, 60]` để bảo vệ mốc 60 của banner sau, kể cả khi banner sau là banner ảo.
3. Chỉ nâng lên 120 khi:
   - ví hiện tại tự đủ cho 120 hiện tại; và
   - ví hiện tại cộng thu nhập vé của banner kế tiếp đủ cho toàn lộ trình `[120, 60]`.

Thu nhập banner sau chỉ được dùng để bảo vệ mốc 60 của banner sau, không được tài trợ ngược cho 120 hiện tại. Banner cuối không có ngoại lệ: phép kiểm tra vẫn dùng banner kế tiếp ảo.

Sau khi nhận Featured Operator, chính sách vũ khí giữ nguyên: chỉ bắt đầu khi đã tích đủ 15.840 Arsenal Tickets và dừng khi nhận Featured Weapon.

## 5. Roll Meta

ID: `roll_meta`

### Chọn banner Meta

- Người dùng cấu hình trực tiếp số banner Meta từ `0` đến tổng số banner.
- Giá trị mặc định trên giao diện được gợi ý bằng `floor(30% × tổng số banner)`, nhưng không phải tỷ lệ cố định.
- Đúng số vị trí Meta đã cấu hình được chọn ngẫu nhiên bằng Fisher–Yates.
- Trong cùng một lượt Monte Carlo, mọi người chơi và chiến thuật dùng chung tập vị trí Meta để so sánh trên cùng lịch banner. Single Run dùng seed riêng nên có thể tái lập lịch.

### Ngân sách nhân vật kiểu rolling reserve

Roll Meta không dự báo chi tiết kết quả gacha qua nhiều banner. Mỗi banner chỉ nhìn tới **banner Meta kế tiếp** và tính lại từ trạng thái hiện tại:

- Banner Meta hiện tại luôn được phép dùng toàn bộ vé khả dụng để săn Featured, kể cả khi chưa đủ bảo hiểm 120. Nó dừng khi nhận Featured hoặc hết tài nguyên/mốc 120.
- Ở banner thường có Meta phía sau, chỉ quay banner hiện tại khi đồng thời:
  - ví hiện tại đủ bảo hiểm 120 của banner hiện tại; và
  - phần dư sau kịch bản xấu nhất, cộng toàn bộ thu nhập vé đã cấu hình từ các banner kế tiếp tới Meta, vẫn đạt quỹ dự phòng Meta.
- Nếu Meta kế tiếp nằm ngay sau banner hiện tại, quỹ dự phòng là **95 vé** vì banner hiện tại đi tới 120 chắc chắn tạo 10 Dossier cho Meta.
- Nếu còn ít nhất một banner xen giữa, quỹ dự phòng là **105 vé** vì Dossier từ banner hiện tại sẽ hết hạn trước Meta.
- Nếu không còn Meta phía sau, banner thường hành xử như Save & Commit.

Hai mức 95/105 được tạo bởi chính hàm ước tính an toàn, không phải số trung bình Monte Carlo. Cách rolling reserve tránh việc dự báo quá xa theo các kết quả gacha chưa xảy ra, đồng thời vẫn dùng đúng lịch thu nhập của từng banner, kể cả banner cuối bị cắt ngắn trong chế độ giới hạn theo tổng pull.

### Ngân sách vũ khí

Phần vũ khí không thay đổi trong phiên bản này:

- Trên banner Meta, quay vũ khí sau khi đã nhận Featured Operator.
- Trên banner thường, chỉ quay nếu đã nhận Featured Operator, ví hiện tại đủ tám Issue và phần dư cộng thu nhập Arsenal dự kiến vẫn bảo đảm tám Issue cho banner Meta kế tiếp.
- Nếu không còn Meta phía sau, áp dụng ngưỡng tám Issue cho banner hiện tại.

## Quy ước vũ khí trong simulator

- Một Issue luôn được tính là 10 lượt và tiêu tốn 1.980 Arsenal Tickets.
- Các chiến thuật dừng săn vũ khí khi nhận Featured trực tiếp hoặc khi phần thưởng mốc trả về `featured_weapon`.
- `selector_box` là hộp chọn 6★ ngoài rate-up: tăng thống kê 6★ Standard và hộp chọn, nhưng không tăng Featured Weapon và không hoàn thành mục tiêu săn Featured.
- Save & Commit, Save & Commit — Roll lẻ và Pull 60 yêu cầu đủ tám Issue trước khi bắt đầu.
- Yolo có thể bắt đầu từ một Issue.
- Roll Meta áp dụng điều kiện riêng như mô tả ở trên.

## Giả định mô hình cần tiếp tục xác minh

Các giá trị sau đang được dùng trong code để mô phỏng dupe và Bond Quota, nhưng chưa phải luật được xác nhận từ hai trang wiki:

- Bể giả lập gồm 6 Standard 6★, 3 Limited lệch và 15 Operator 5★.
- Khi lệch Featured 6★, có 10% khả năng kết quả thuộc nhóm Limited lệch.
- Mô hình giả định tài khoản đã sở hữu gần đủ pool: Standard 6★ lệch luôn được tính là dupe và nhận 50 Bond Quota.
- Cũng theo giả định tài khoản lâu năm, Operator 5★ luôn nhận 10 Bond Quota; Featured/Limited 6★ chỉ nhận 50 Quota khi đã sở hữu.
- Mỗi 25 Bond Quota tự động đổi thành một vé nhân vật.
- Pity 6★ của Arsenal (`issuesSince6`) hiện được giữ khi đổi Issue banner, trong khi Featured guarantee và số Issue cột mốc reset.

Những giả định này cần được thay bằng dữ liệu pool/sở hữu đầu vào nếu simulator phát triển theo hướng mô phỏng tài khoản thực tế.
