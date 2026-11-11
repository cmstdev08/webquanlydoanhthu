-- ==============================================================================
-- DATABASE SCHEMA: GROUP BUSINESS & FUND MANAGEMENT SYSTEM
-- System: GROUP BUSINESS MANAGER
-- Target: Supabase (PostgreSQL) with Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. GROUPS TABLE (Business groups / Teams)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID,
    settings JSONB DEFAULT '{"currency": "VND", "allow_member_orders": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES TABLE (User profiles linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATEGORIES TABLE (Product categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    product_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPLIERS TABLE (Vendors / Suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCTS TABLE (Inventory items)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    unit VARCHAR(50) DEFAULT 'Cái',
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sell_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_code_per_group UNIQUE (group_id, code)
);

-- 7. INVENTORY TRANSACTIONS (Stock movement history)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('import', 'export', 'adjustment', 'return')),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    attachment_url TEXT,
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ORDERS TABLE (Sales orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    order_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled', 'returned')),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cost_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Tiền mặt',
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    confirmed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_order_code_per_group UNIQUE (group_id, order_code)
);

-- 9. ORDER ITEMS TABLE (Items inside an order)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CAPITAL CONTRIBUTIONS (Initial & Additional Capital)
CREATE TABLE IF NOT EXISTS public.capital_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    round_name VARCHAR(255) DEFAULT 'Đợt 1',
    committed_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Chuyển khoản',
    attachment_url TEXT,
    confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. FUND TRANSACTIONS (Group Cash Fund)
CREATE TABLE IF NOT EXISTS public.fund_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    attachment_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#2563EB',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. EXPENSES TABLE (Operating Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Tiền mặt',
    attachment_url TEXT,
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ACTIVITY LOGS (Audit trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON public.profiles(group_id);
CREATE INDEX IF NOT EXISTS idx_products_group_id ON public.products(group_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON public.orders(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_capital_group_id ON public.capital_contributions(group_id);
CREATE INDEX IF NOT EXISTS idx_fund_group_id ON public.fund_transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_group_id ON public.activity_logs(group_id);

-- ==============================================================================
-- AUTOMATIC TRIGGER FOR PROFILE CREATION ON USER SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INT;
    assigned_role VARCHAR(20);
BEGIN
    -- Check if this is the first user in the system
    SELECT COUNT(*) INTO user_count FROM public.profiles;

    IF user_count = 0 THEN
        assigned_role := 'admin';
    ELSE
        assigned_role := 'member';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status, group_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        assigned_role,
        'active',
        '00000000-0000-0000-0000-000000000001'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: get user group_id
CREATE OR REPLACE FUNCTION public.get_user_group_id()
RETURNS UUID AS $$
    SELECT COALESCE(
        (SELECT group_id FROM public.profiles WHERE id = auth.uid() LIMIT 1),
        '00000000-0000-0000-0000-000000000001'::uuid
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Anyone authenticated can view and update their profile
CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles update policy" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Profiles insert policy" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (true);

-- Groups
CREATE POLICY "Groups select policy" ON public.groups
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Groups all policy" ON public.groups
    FOR ALL TO authenticated USING (true);

-- Categories
CREATE POLICY "Categories select policy" ON public.categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Categories modify policy" ON public.categories
    FOR ALL TO authenticated USING (true);

-- Suppliers
CREATE POLICY "Suppliers select policy" ON public.suppliers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers modify policy" ON public.suppliers
    FOR ALL TO authenticated USING (true);

-- Products
CREATE POLICY "Products select policy" ON public.products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Products modify policy" ON public.products
    FOR ALL TO authenticated USING (true);

-- Inventory Transactions
CREATE POLICY "Inventory select policy" ON public.inventory_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inventory modify policy" ON public.inventory_transactions
    FOR ALL TO authenticated USING (true);

-- Orders
CREATE POLICY "Orders select policy" ON public.orders
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Orders modify policy" ON public.orders
    FOR ALL TO authenticated USING (true);

-- Order Items
CREATE POLICY "Order items select policy" ON public.order_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Order items modify policy" ON public.order_items
    FOR ALL TO authenticated USING (true);

-- Capital Contributions
CREATE POLICY "Capital select policy" ON public.capital_contributions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Capital modify policy" ON public.capital_contributions
    FOR ALL TO authenticated USING (true);

-- Fund Transactions
CREATE POLICY "Fund select policy" ON public.fund_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Fund modify policy" ON public.fund_transactions
    FOR ALL TO authenticated USING (true);

-- Expense Categories
CREATE POLICY "Expense categories select policy" ON public.expense_categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Expense categories modify policy" ON public.expense_categories
    FOR ALL TO authenticated USING (true);

-- Expenses
CREATE POLICY "Expenses select policy" ON public.expenses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Expenses modify policy" ON public.expenses
    FOR ALL TO authenticated USING (true);

-- Activity Logs
CREATE POLICY "Activity logs select policy" ON public.activity_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Activity logs insert policy" ON public.activity_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications
CREATE POLICY "Notifications access policy" ON public.notifications
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- ==============================================================================
-- DEFAULT SEED DATA (For easy first startup)
-- ==============================================================================
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
