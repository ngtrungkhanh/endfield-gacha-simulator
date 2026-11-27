/**
 * constants.js - Các hằng số toán học, tỉ lệ gacha và thông số chiến thuật
 * của Arknights: Endfield Gacha Simulator.
 *
 * Mọi số đo được đối chiếu từ dữ liệu nghiên cứu `data/bookkeeping.md`
 * và các tài liệu Closed Beta Test (CBT).
 */

// ==========================================
// 1. TỈ LỆ & BẢO HIỂM OPERATOR (HEADHUNTING)
// ==========================================

/** Tỉ lệ cơ bản xuất hiện Operator 6★ (0.8%) */
export const BASE_RATE_6STAR = 0.008;

/** Tỉ lệ cơ bản xuất hiện Operator 5★ (8.0%) */
export const BASE_RATE_5STAR = 0.08;

/** Tỉ lệ trúng Operator Featured trong số các Operator 6★ (50%) */
export const FEATURED_RATE_6STAR = 0.5;

/** Tỉ lệ lệch ra Operator Limited cũ khi trượt 50/50 (10%) */
export const OFF_RATE_LIMITED_CHANCE = 0.1;

/** Mốc bắt đầu Soft Pity: tỉ lệ bắt đầu tăng từ lượt 66 (tức pity > 65) */
export const SOFT_PITY_START = 65;

/** Mức tăng tỉ lệ 6★ mỗi lượt sau lượt 65 (+5.0%/lượt) */
export const SOFT_PITY_INCREMENT = 0.05;

/** Hard Pity: Chắc chắn ra Operator 6★ ở lượt thứ 80 (100%) */
export const HARD_PITY_6STAR = 80;

/** Cột mốc bảo hiểm chắc chắn nhận được Operator Featured (120 lượt) */
export const FEATURED_GUARANTEE_THRESHOLD = 120;

// ==========================================
// 2. CỘT MỐC PHẦN THƯỞNG & VÉ QUAY (MILESTONES)
// ==========================================

/** Cột mốc nhận thưởng phụ / Urgent Recruitment (30 lượt) */
export const PULL_30_MILESTONE = 30;

/** Cột mốc nhận vé Dossier (60 lượt) */
export const PULL_60_MILESTONE = 60;

/** Cột mốc nhận thưởng Urgent lượt thứ 3 của RE-Factor (90 lượt) */
export const PULL_90_MILESTONE = 90;

/** Số vé Dossier nhận được khi đạt mốc 60 (10 vé, chỉ dùng cho banner hiện tại) */
export const DOSSIER_TICKETS_REWARD = 10;

/** Cột mốc nhận Tín vật Potential của nhân vật Featured (240 lượt) */
export const POTENTIAL_TOKEN_240_MILESTONE = 240;

// ==========================================
// 3. VŨ KHÍ & ĐỔI TÀI NGUYÊN (ARSENAL EXCHANGE)
// ==========================================

/** Tỉ lệ cơ bản xuất hiện Vũ khí 6★ (4.0%) */
export const WEAPON_RATE_6STAR = 0.04;

/** Tỉ lệ cơ bản xuất hiện Vũ khí 5★ (15.0%) */
export const WEAPON_RATE_5STAR = 0.15;

/** Tỉ lệ trúng Vũ khí Featured khi quay ra 6★ (25%) */
export const WEAPON_FEATURED_RATE = 0.25;

/** Bảo hiểm 6★ Vũ khí: Issue thứ 4 chắc chắn ra 6★ (đếm từ 0 nên >= 3) */
export const WEAPON_PITY_4_ISSUES = 3;

/** Bảo hiểm Featured Vũ khí: Issue thứ 8 chắc chắn ra Featured (đếm từ 0 nên >= 7) */
export const WEAPON_GUARANTEE_8_ISSUES = 7;

/** Số lượt quay vũ khí trong 1 Issue (x10) */
export const WEAPON_ISSUE_PULLS = 10;

/** Giá Arsenal Points cho 1 Issue (1,980 Arsenal = 10 pulls) */
export const WEAPON_ISSUE_COST_ARSENAL = 1980;

/** Số lượng Issue cần tích lũy tối thiểu trước khi quay vũ khí (8 Issues = 15,840 Arsenal) */
export const WEAPON_SAVED_ISSUES_THRESHOLD = 8;

// ==========================================
// 4. QUỸ DỰ PHÒNG CHIẾN THUẬT META (RESERVES)
// ==========================================

/** Số vé dự phòng khi banner Meta kế tiếp ngay sát (95 vé) */
export const META_RESERVE_ADJACENT = 95;

/** Số vé dự phòng khi có banner thường xen giữa tiêu tốn Dossier (105 vé) */
export const META_RESERVE_INTERMEDIATE = 105;
