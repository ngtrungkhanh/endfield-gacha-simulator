# Tài liệu Luật Gacha & Số liệu Tích lũy - Arknights: Endfield

Tài liệu này tổng hợp toàn bộ luật lệ gacha, cơ chế hoàn trả, cột mốc phần thưởng và số liệu tích lũy tài nguyên thực tế dựa trên dữ liệu từ Wiki và Google Sheet Cộng đồng (**Endfield Bookkeeping**). Tài liệu này được dùng làm cơ sở thiết kế thuật toán cho trang web giả lập.

---

## 1. Dữ liệu tích lũy tài nguyên (Từ Endfield Bookkeeping)

Theo thống kê trung bình từ phiên bản 1.1 đến 1.3 (loại trừ phiên bản ra mắt 1.0 do lượng tài nguyên quà tặng cực kỳ lớn khoảng 218.3 pulls), tổng số lượt pull (Chartered Headhunts) của một người chơi nhận được mỗi phiên bản (khoảng 6 tuần) khi **bật toàn bộ các nguồn tích lũy** là **~101 pulls** (khoảng **~17 pulls/tuần**).

Lượng tài nguyên này được phân bổ cụ thể theo các nguồn trả phí và miễn phí như sau để phục vụ tính năng bật/tắt (toggles) trong giả lập:

### Phân tích nguồn tích lũy nhân vật (mỗi phiên bản ~6 tuần):
1.  **Nguồn Miễn Phí (F2P - Free to Play):** **~73 pulls/phiên bản** (Loại trừ bản 1.0. Chi tiết: bản 1.1 có 71.1 pulls, bản 1.2 có 87.9 pulls, bản 1.3 có 59.5 pulls).
    *   Nhiệm vụ ngày/tuần, Event phiên bản, Operation Manual.
    *   Endpoint Quota Exchange (Đổi phế phẩm gacha).
    *   Vé Urgent Recruit miễn phí từ các hoạt động.
    *   Bản đồ mở rộng, rương báu và nhiệm vụ cốt truyện mới.
    *   Originium Supply (Battle Pass nhánh miễn phí).
2.  **Thẻ Tháng (Monthly Pass):** ~**18 pulls/phiên bản**
    *   Giá trị: Mua lập tức được 12 Origeometry, mỗi ngày nhận 200 Oroberyl trong 30 ngày (tổng cộng 6,000 Oroberyl = 12 pulls). 
    *   Tính theo chu kỳ phiên bản 6 tuần (42 ngày): Nhận được 8,400 Oroberyl (= 16.8 pulls) + Origeometry quy đổi tương đương tổng cộng **~18 pulls**.
3.  **Thẻ Thông Hành Cao Cấp (Protocol Customized Pass):** ~**10 pulls/phiên bản**
    *   Cung cấp thêm vé HH Permits và Oroberyl trong nhánh trả phí của Battle Pass.

> [!NOTE]
> *   **Người chơi F2P hoàn toàn:** Nhận **~73 pulls/version** (~12 pulls/tuần).
> *   **Người chơi mua Thẻ Tháng (Monthly Pass only):** Nhận **~91 pulls/version** (~15 pulls/tuần).
> *   **Người chơi mua cả Thẻ Tháng & BP (Dolphin/Spender):** Nhận **~101 pulls/version** (~17 pulls/tuần).

---

## 2. Luật Gacha Nhân vật (Headhunting)

*   **Tỉ lệ cơ bản:** 6★: `0.8%`, 5★: `8.0%`, 4★: `91.2%`.
*   **Bảo hiểm 5★:** Mỗi 10 lượt chắc chắn có ít nhất một 5★ trở lên. (Reset khi ra 5★ hoặc 6★, cộng dồn qua các banner).
*   **Soft Pity 6★:** Bắt đầu từ lượt pull thứ **65** không ra 6★, tỉ lệ ra 6★ tăng thêm **5%** mỗi lượt (lượt 65 là 5.8%, lượt 66 là 10.8%... lượt 79 là 75.8%).
*   **Hard Pity 6★:** Chắc chắn ra 6★ ở lượt thứ **80** (tỉ lệ 100%). Bộ đếm pity 6★ được cộng dồn và bảo lưu qua các banner khác nhau.
*   **Tỉ lệ trúng Rate-up (50/50):** Mỗi khi ra 6★, có 50% cơ hội trúng nhân vật rate-up. **Không có bảo hiểm lệch rate chuyển tiếp sang banner sau** (tức là không có bảo hiểm 100% cho lần ra 6★ tiếp theo).
*   **Bảo hiểm 120 lượt (Featured Guarantee):** Nếu chưa nhận được nhân vật rate-up trong 119 lượt đầu, lượt thứ **120** chắc chắn là nhân vật rate-up. Bộ đếm này **không mang sang banner tiếp theo** và tự động reset khi trúng nhân vật rate-up.

### Cơ chế Mốc Quay đặc biệt (30-60 Pull Milestone):
Khi người chơi thực hiện quay trên một banner nhân vật, họ sẽ nhận được các phần thưởng cột mốc sau:
1.  **Mốc 30 pulls (Urgent Recruitment):**
    *   Tặng ngay **10 lượt quay Urgent Recruitment** (tương đương 1 lần roll x10 miễn phí).
    *   *Quy tắc:* Chỉ được dùng trên banner hiện tại, không cộng dồn sang banner sau. Các lượt quay từ Urgent Recruitment này **không tính vào bộ đếm pity** (không tăng pity 6★, không tính vào bảo hiểm 120) và nếu may mắn ra 6★ từ đây thì cũng **không reset bộ đếm pity** hiện tại của bạn.
    *   *Bảo hiểm 5★:* Tương đương với 1 lần roll x10 tiêu chuẩn, 10 lượt Urgent Recruitment này áp dụng bảo hiểm cục bộ: nếu 9 lượt đầu toàn 4★, lượt thứ 10 chắc chắn là nhân vật 5★ trở lên để tránh lãng phí.
2.  **Mốc 60 pulls (Headhunting Dossier):**
    *   Tặng 1 vật phẩm **Headhunting Dossier**, vật phẩm này sẽ tự động chuyển đổi thành **10 lượt quay miễn phí dành cho banner giới hạn tiếp theo**.
    *   *Quy tắc:* Có giới hạn thời gian (sẽ hết hạn nếu không dùng ở banner tiếp theo). Các lượt quay từ Dossier này **có tính vào pity** như bình thường.
3.  **Mốc 240 pulls:** Tặng thêm 1 token của nhân vật rate-up 6★ (dùng để tăng Potential). Reset khi hết banner.

---

## 3. Luật Gacha & Kiếm lượt quay Vũ khí (Arsenal Exchange)

Không giống như nhân vật sử dụng Oroberyl, vũ khí sử dụng một loại tài nguyên riêng biệt gọi là **Arsenal Tickets** (Vé Kho Vũ Khí).

### Nguồn kiếm Arsenal Tickets (Cách kiếm lượt roll vũ khí):
Nguồn Arsenal Tickets lớn nhất và chủ yếu đến từ **cơ chế hoàn trả (rebate)** khi bạn quay banner nhân vật:
*   Mỗi khi quay ra **Operator 6★**: Tặng ngay **2,000 Arsenal Tickets**.
*   Mỗi khi quay ra **Operator 5★**: Tặng ngay **200 Arsenal Tickets**.
*   Mỗi khi quay ra **Operator 4★**: Tặng ngay **20 Arsenal Tickets**.

Ngoài ra còn có các nguồn phụ trợ cố định (Không tính gacha):
*   **Nguồn miễn phí (F2P - Nhiệm vụ tuần & Cửa hàng):** Nhận chính xác **100 Arsenal Tickets/tuần**, tương đương **600 Arsenal Tickets/phiên bản** 6 tuần.
*   **Protocol Pass (Customized Battle Pass trả phí):** Cung cấp thêm chính xác **2,400 Arsenal Tickets/phiên bản**.
*   *Tổng cộng:* Người chơi F2P nhận **600 vé/bản** cố định, người chơi mua BP nhận **3,000 vé/bản** cố định từ hoạt động in-game.
*   *Đổi trực tiếp:* Có thể đổi trực tiếp từ Origeometry (đá trả phí) với tỉ lệ 1 Origeometry = 25 Arsenal Tickets (tỉ lệ đổi rất thấp, không khuyến khích).

### Quy đổi chi phí:
*   Mỗi lượt quay Issue (mỗi Issue mặc định là một gói roll x10) tiêu tốn **1,980 Arsenal Tickets** (hoặc 1 Issue Cert).
*   *Tính toán hiệu suất:* Trung bình quay 100 lượt nhân vật sẽ nhận được khoảng **6,500 Arsenal Tickets**, tương đương với **~3.28 lượt quay Issue vũ khí** (tức ~33 lần roll vũ khí).

### Luật gacha vũ khí:
*   **Tỉ lệ cơ bản:** 6★: `4.0%`, 5★: `15.0%`, 4★: `81.0%` (Tỉ lệ ra 6★ vũ khí cơ bản rất cao).
*   **Pity 5★:** Mỗi Issue (x10) chắc chắn chứa ít nhất một vũ khí 5★ trở lên.
*   **Pity 6★:** Nếu không có vũ khí 6★ nào sau 3 Issues liên tiếp (30 pulls), Issue thứ **4** (lượt 31-40) chắc chắn chứa ít nhất một vũ khí 6★.
*   **Tỉ lệ trúng Rate-up:** Khi ra 6★, chỉ có **25% cơ hội** nhận vũ khí rate-up (thấp hơn nhiều so với nhân vật).
*   **Bảo hiểm vũ khí Rate-up:** Nếu không nhận được vũ khí rate-up sau 7 Issues liên tiếp, Issue thứ **8** chắc chắn sẽ ra vũ khí rate-up. Không mang tích lũy sang banner sau.
*   **Quà cột mốc vũ khí (Milestone):**
    *   Lượt Issue thứ **10**: Tặng 1 hộp tự chọn vũ khí 6★ (Weapon Selection Box).
    *   Lượt Issue thứ **18**: Tặng trực tiếp vũ khí 6★ rate-up.
    *   Mỗi **8 Issues tiếp theo** (lượt 26, 34...): Tặng trực tiếp vũ khí 6★ rate-up.

### Chiến thuật sở hữu vũ khí:
Vì trong shop vũ khí xoay tua cho phép mua trực tiếp vũ khí bằng Arsenal Tickets, người chơi có 2 chiến thuật chính:
1.  **Mua trực tiếp tại Shop (Direct Purchase):** Tích lũy đủ **2,480 Arsenal Tickets** để mua thẳng vũ khí 6★ mong muốn khi nó xuất hiện trong shop tuần (Không có RNG, chắc chắn 100%).
2.  **Quay Gacha banner (Gacha Issues):** Dùng **1,980 Arsenal Tickets** cho mỗi Issue để quay banner vũ khí, tận dụng tỉ lệ 4% và các mốc bảo hiểm để lấy vũ khí rate-up sớm hoặc tích cột mốc lấy hộp chọn vũ khí.
