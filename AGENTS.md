# AGENTS.md

> **Hướng dẫn kỹ thuật và quy chuẩn phát triển dành cho AI Coding Agents (và Contributors)**  
> Đọc kỹ tài liệu này trước khi thực hiện bất kỳ tác vụ nào trong dự án Endfield Gacha Simulator.

---

## 1. Mục tiêu dự án (What this is)

**Arknights: Endfield Gacha Simulator** là ứng dụng web mô phỏng chuyên sâu hệ thống quay thưởng (gacha) của tựa game *Arknights: Endfield*. Ứng dụng mô phỏng chính xác cơ chế xác suất tích lũy (Soft Pity, Hard Pity, mốc bảo hiểm 120, bảo hiểm kép vũ khí), ngân sách vé động, hoàn trả Bond Quota, và chạy kiểm thử chiến lược dài hạn cho hàng chục nghìn người chơi (Monte Carlo Simulation).

**Đặc tính kỹ thuật cốt lõi:**
*   **Hoàn toàn Offline (100% Offline-First):** Ứng dụng chạy trực tiếp trên trình duyệt, không gọi API bên ngoài, không phụ thuộc CDN, không tracking, có thể đóng gói thành 1 file HTML duy nhất (`release/A9EGacha_<version>.html`).
*   **Kiến trúc tinh gọn:** Vanilla JavaScript (ES6 Modules) + CSS thuần (Dark Glassmorphic UI) + Chart.js + Bundler siêu tốc `esbuild` + Linter `Biome` + Native Test Runner (`node --test`).

---

## 2. Từ điển thuật ngữ chuẩn (Words & Domain Terminology)

> [!IMPORTANT]
> **Bắt buộc sử dụng đúng các thuật ngữ sau trong code, chú thích, tài liệu và câu trả lời. Tuyệt đối không tự bịa đặt hoặc dùng lẫn lộn thuật ngữ.**

| Thuật ngữ chuẩn | Giải thích kỹ thuật | Lưu ý khi code |
|---|---|---|
| **Operator 6★** | Nhân vật phẩm cấp cao nhất (tỉ lệ cơ bản 0.8%). | Không gọi là "champion" hay "hero". |
| **Featured Operator** | Nhân vật 6★ xuất hiện trên banner (tỉ lệ 50% khi nổ 6★). | Khác với nhân vật lệch rate. |
| **Off-rate Operator** | Nhân vật 6★ thường hoặc 10% cơ hội lệch ra Limited cũ khi trượt 50/50. | Biến cờ `isLechLimited`. |
| **5★ / 4★** | Phẩm cấp Epic (5★, cơ bản 8%) và Rare (4★, phần còn lại). | Trong CBT, 5★ **không** có rate-up. |
| **Arsenal Exchange (Vũ khí)** | Hệ thống quay/đổi vũ khí chuyên dụng (cơ bản 6★: 4%, 5★: 15%). | Dùng đơn vị Issue, không gọi là "Weapon banner". |
| **Weapon Issue** | 1 lượt quay x10 vũ khí với giá **1,980 điểm Arsenal**. | Issue thứ 4 bảo hiểm 6★, Issue thứ 8 bảo hiểm Featured. |
| **Selector Box** | Hộp tự chọn một vũ khí 6★ ngoài rate-up (thưởng ở Issue 10 và luân phiên sau đó). | Không dùng lẫn với vũ khí Featured. |
| **Wallet Tickets** | Vé quay nhân vật tích lũy trong ví của người chơi. | Phân biệt với vé tặng tạm thời. |
| **Dossier** | 10 vé quay tặng ở mốc 60 lượt. | **Hết hạn sau banner**, tiêu thụ trước vé ví. |
| **Urgent Recruitment** | 5 lượt quay phụ tặng ở mốc 30 lượt. | Không tăng pity và không reset bộ đếm pity. |
| **Bond Quota / Quota Tickets** | Vé hoàn trả thu được khi quay ra nhân vật trùng lặp (5★/6★). | Được tính vào công thức ngân sách động. |
| **Soft Pity** | Bắt đầu từ lượt thứ 66 (`pity6 > 65`), tỉ lệ tăng thêm **+5% mỗi lượt**. | Cực kỳ quan trọng với thuật toán toán học. |
| **Hard Pity** | Lượt thứ 80 chắc chắn ra Operator 6★ (100%). | |
| **Featured Guarantee** | Lượt thứ 120 chắc chắn ra Featured Operator (tiêu thụ 1 lần/banner). | Biến `guarantee120Consumed`. |
| **Save & Commit** | Chiến thuật chỉ roll khi ví đủ ngân sách an toàn chạm mốc 120. | Skip banner nếu không đủ ngân sách. |
| **Save & Commit (Singles)**| Giống Save & Commit nhưng dùng quay x1 để dừng chính xác khi ra Featured. | Tiết kiệm vé tối đa. |
| **Spend All (Yolo)** | Chiến thuật dốc cạn vé hiện có đến khi trúng Featured hoặc hết vé. | Không giữ quỹ dự phòng banner sau. |
| **Pull 60** | Chiến thuật nhắm thẳng mốc 60 lấy 10 Dossier; nâng cấp lên 120 nếu trượt ở 60. | |
| **Roll Meta** | Chiến thuật chọn N banner Meta và giữ quỹ dự phòng (95/105 vé) cho Meta kế tiếp. | |

---

## 3. Cấu trúc thư mục (Layout)

```text
endfield-gacha-simulator/
├── AGENTS.md                  # Tài liệu này (Luật chơi dành cho Agent & Dev)
├── package.json               # Cấu hình dự án, dependencies, scripts
├── biome.json                 # Cấu hình Biome Linter & Formatter (indent 4 spaces, line 120)
├── index.html                 # Giao diện chính của ứng dụng web
│
├── js/                        # Mã nguồn JavaScript (ES6 Modules)
│   ├── constants.js           # TẬP TRUNG TOÀN BỘ HẰNG SỐ (tỉ lệ, mốc pity, chi phí)
│   ├── gacha-math.js          # Toán học xác suất, RNG seed, Soft/Hard pity, hoàn trả Quota
│   ├── strategies.js          # Logic quyết định chi tiêu và bảo vệ ngân sách chiến thuật
│   ├── simulator.js           # Bộ điều phối mô phỏng Monte Carlo (hàng chục nghìn lượt chạy)
│   ├── single-run.js          # Giả lập chi tiết 1 người chơi (tái lập được qua seed)
│   ├── single-run-view.js     # Render giao diện visual timeline và thẻ kết quả
│   ├── chart-helper.js        # Adapter vẽ biểu đồ phân phối xác suất Chart.js
│   ├── i18n.js                # Quản lý đa ngôn ngữ (VI và EN), định dạng số theo locale
│   ├── app.js                 # Điều khiển DOM chính, bắt sự kiện, lưu trữ cấu hình
│   └── bundle.js              # Tệp bundle do esbuild sinh ra (CẤM SỬA TAY)
│
├── css/                       # Định dạng giao diện (Dark theme #0d0f12, kính mờ, accent #ff6b00)
├── data/                      # DỮ LIỆU GỐC: bookkeeping.md (BẢO TOÀN NGUYÊN BẢN)
├── docs/                      # Tài liệu giải thích luật gacha và chiến thuật
├── scripts/                   # Scripts build và đóng gói release offline
├── test/                      # Bộ kiểm thử tự động toàn diện (node --test)
├── dist/                      # Thư mục build phân phối offline (tự động sinh)
├── release/                   # Bản phát hành file đơn độc lập HTML (tự động sinh)
└── .github/workflows/         # CI/CD tự động kiểm thử (test.yml)
```

---

## 4. Quy ước phát triển bắt buộc (Conventions)

### A. Quản lý hằng số (Constants)
*   **Mọi con số xác suất, mốc bảo hiểm, chi phí vé PHẢI nằm trong `js/constants.js`.**
*   Tuyệt đối không hardcode các số ma thuật (`80`, `66`, `120`, `1980`, `0.008`...) rải rác trong logic.
*   Khi thêm hoặc điều chỉnh hằng số, bắt buộc kèm chú thích rõ ràng về nguồn trích xuất (từ `data/bookkeeping.md` hoặc đợt Closed Beta nào).

### B. Tính thuần khiết và Độc lập của Logic (Pure Functions)
*   Mọi thuật toán tính toán xác suất (`gacha-math.js`) và chiến thuật (`strategies.js`) phải là **Pure Functions**.
*   Không gọi DOM, `window`, `document` hoặc `localStorage` bên trong các module toán học/chiến thuật. Điều này cho phép test chạy hoàn toàn độc lập với tốc độ mili-giây.

### C. Đa ngôn ngữ (i18n)
*   Mọi chuỗi text hiển thị trên giao diện đều phải thông qua hàm `t(key, params)` trong `js/i18n.js`.
*   Khi thêm key mới, **bắt buộc thêm đồng thời cả 2 catalog `vi` và `en`**. Kiểm thử `test/i18n.test.js` sẽ tự động phát hiện và báo lỗi nếu thiếu key ở bất kỳ ngôn ngữ nào.

### D. Bảo toàn dữ liệu nghiên cứu (`data/bookkeeping.md`)
*   `data/bookkeeping.md` là dữ liệu thực nghiệm ghi nhận từ game.
*   **TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA, RÚT GỌN, VIẾT LẠI HOẶC SỬA ĐỔI FILE NÀY.**

### E. Quy tắc Bundle & Release
*   Sau khi sửa mã nguồn trong `js/`, phải chạy `npm run build` để cập nhật `js/bundle.js`.
*   Không tự ý chạy `npm run package` trừ khi có yêu cầu phát hành bản đóng gói độc lập.
*   Không chỉnh sửa thủ công `js/bundle.js`, thư mục `dist/` hay `release/`.

---

## 5. Quy trình Kiểm thử & Vành đai An toàn (Verification)

> [!CAUTION]
> **Trước khi báo hoàn thành bất kỳ tác vụ nào, Agent BẮT BUỘC phải chạy:**
> ```bash
> npm run check
> ```
> Lệnh này tự động thực thi tuần tự:
> 1. `npm run lint` (Biome kiểm tra cú pháp và style trong < 50ms)
> 2. `npm test` (Toàn bộ 60+ unit tests chạy trong < 1s)
> 3. `npm run build` (Cập nhật bundle mới nhất cho `index.html`)

### Quy tắc "Review Fixes -> Regression Tests":
*   Khi một lỗi logic, edge case hoặc phản hồi review được chỉ ra, Agent **bắt buộc tạo hoặc bổ sung một test case cụ thể trong thư mục `test/`** để tái hiện và chặn đứng lỗi đó vĩnh viễn (tương tự như cách `the-grand-project` áp dụng qua `test_review_fixes`).
