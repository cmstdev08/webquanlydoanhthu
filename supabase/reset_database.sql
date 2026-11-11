-- ==============================================================================
-- SCRIPT RESET DỮ LIỆU: GROUP BUSINESS MANAGER
-- Hướng dẫn: Mở Supabase SQL Editor -> Dán lệnh dưới đây -> Nhấn RUN
-- ==============================================================================

-- ==============================================================================
-- CÁCH 1: RESET DỮ LIỆU KINH DOANH (GIỮ LẠI TÀI KHOẢN ĐĂNG NHẬP ADMIN & NHÓM)
-- Xóa sạch: Đơn hàng, Kho hàng, Sản phẩm, Chi phí, Thu chi quỹ, Vốn góp, Nhật ký
-- Giữ lại: Tài khoản user, Danh mục sản phẩm mặc định
-- ==============================================================================

-- 1. Xóa dữ liệu các bảng giao dịch & vận hành
TRUNCATE TABLE 
    public.order_items,
    public.orders,
    public.inventory_transactions,
    public.products,
    public.expenses,
    public.fund_transactions,
    public.capital_contributions,
    public.activity_logs,
    public.notifications
RESTART IDENTITY CASCADE;

-- 2. Đặt lại số lượng sản phẩm trong bảng categories về 0
UPDATE public.categories SET product_count = 0;


-- ==============================================================================
-- CÁCH 2 (TÙY CHỌN): RESET SẠCH 100% VỀ TRẮNG (XÓA CẢ TÀI KHOẢN ĐỂ ĐĂNG KÝ ADMIN LẠI TỪ ĐẦU)
-- Nếu bạn muốn xóa cả các tài khoản test đã tạo, hãy BỎ DẤU COMMENT (--) đoạn dưới:
-- ==============================================================================

/*
-- Xóa toàn bộ dữ liệu bảng nghiệp vụ
TRUNCATE TABLE 
    public.order_items,
    public.orders,
    public.inventory_transactions,
    public.products,
    public.expenses,
    public.fund_transactions,
    public.capital_contributions,
    public.activity_logs,
    public.notifications,
    public.categories,
    public.suppliers,
    public.expense_categories,
    public.profiles
RESTART IDENTITY CASCADE;

-- Xóa cả tài khoản trong bảng Auth của Supabase
DELETE FROM auth.users;

-- Nạp lại dữ liệu nhóm và danh mục ban đầu
INSERT INTO public.groups (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nhóm Dự Án Thương Mại Điện Tử', 'Nhóm sinh viên thực hiện dự án kinh doanh trực tuyến môn TMĐT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (group_id, name, description)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Đồ uống & Trà sữa', 'Các loại thức uống giải khát, trà sữa, cà phê'),
    ('00000000-0000-0000-0000-000000000001', 'Đồ ăn vặt', 'Bánh tráng, khô bò, snack các loại'),
    ('00000000-0000-0000-0000-000000000001', 'Phụ kiện sinh viên', 'Móc khóa, sticker, sổ tay, bút vẽ'),
    ('00000000-0000-0000-0000-000000000001', 'Sản phẩm Handmade', 'Vòng tay, nến thơm, thiệp thiết kế riêng')
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (group_id, name, description, color)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Nhập hàng', 'Tiền mua hàng hóa ban đầu', '#2563EB'),
    ('00000000-0000-0000-0000-000000000001', 'Vận chuyển & Giao hàng', 'Phí ship, xăng xe, bao bì ship', '#16A34A'),
    ('00000000-0000-0000-0000-000000000001', 'Quảng cáo & Marketing', 'Chạy ads FB, in tờ rơi, poster', '#EA580C'),
    ('00000000-0000-0000-0000-000000000001', 'Vật tư & Bao bì', 'Túi nilon, tem nhãn, băng dính', '#7C3AED'),
    ('00000000-0000-0000-0000-000000000001', 'Chi phí phát sinh', 'Các khoản chi ngoài dự kiến', '#DC2626')
ON CONFLICT DO NOTHING;
*/
