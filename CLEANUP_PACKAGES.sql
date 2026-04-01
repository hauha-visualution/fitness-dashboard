-- ============================================================
-- XÓA toàn bộ data liên quan đến gói tập để test lại
-- Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Xóa tất cả sessions (buổi tập)
DELETE FROM sessions;

-- 2. Xóa tất cả payments (thanh toán)
DELETE FROM payments;

-- 3. Xóa tất cả packages (gói tập)
DELETE FROM packages;

-- ============================================================
-- KIỂM TRA sau khi xóa:
-- ============================================================
-- SELECT COUNT(*) FROM sessions;   -- Phải = 0
-- SELECT COUNT(*) FROM payments;   -- Phải = 0
-- SELECT COUNT(*) FROM packages;   -- Phải = 0

-- ============================================================
-- Nếu chỉ muốn xóa data của 1 client cụ thể:
-- ============================================================
-- DELETE FROM sessions WHERE client_id = <CLIENT_ID>;
-- DELETE FROM payments WHERE client_id = <CLIENT_ID>;
-- DELETE FROM packages WHERE client_id = <CLIENT_ID>;
