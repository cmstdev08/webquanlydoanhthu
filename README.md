# GROUP BUSINESS MANAGER (Hệ Thống Quản Lý Kinh Doanh & Quỹ Nhóm)

Website quản lý kinh doanh trực tuyến và quản trị tài chính chuyên nghiệp dành cho nhóm sinh viên thực hiện dự án môn Thương mại điện tử. Hỗ trợ đầy đủ nghiệp vụ: Vốn góp, Sản phẩm & Tồn kho, Đơn hàng & In hóa đơn, Chi phí, Sổ quỹ, Báo cáo tài chính, Xuất Excel/CSV và Phân quyền thành viên.

---

## 📑 Mục Lục
1. [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
2. [Cơ Chế Phân Quyền & Tài Khoản](#-cơ-chế-phân-quyền--tài-khoản)
3. [Hướng Dẫn Cài Đặt Ban Đầu (Supabase & Chạy Local)](#-hướng-dẫn-cài-đặt-ban-đầu)
4. [Hướng Dẫn Deploy Lên Vercel](#-hướng-dẫn-deploy-lên-vercel)
5. [Quy Trình Vận Hành Kinh Doanh Chuẩn](#-quy-trình-vận-hành-kinh-doanh-chuẩn)
6. [🔥 Hướng Dẫn Reset Toàn Bộ Dữ Liệu](#-hướng-dẫn-reset-toàn-bộ-dữ-liệu)
7. [Các Lưu Ý & Mẹo Sử Dụng](#-các-lưu-ý--mẹo-sử-dụng)

---

## 🚀 Công Nghệ Sử Dụng

- **Frontend**:
  - **React 18 (Vite)** + **TypeScript**.
  - **Tailwind CSS 3**: Giao diện SaaS hiện đại, Dark/Light Mode, responsive trên cả điện thoại và máy tính.
  - **Recharts**: Biểu đồ phân tích doanh thu, chi phí, cơ cấu vốn góp.
  - **Lucide React**: Bộ icon giao diện hiện đại.
  - **React Router DOM v6**: Điều hướng SPA mượt mà kèm cơ chế Protected Routes theo vai trò.
  - **XLSX**: Xuất dữ liệu báo cáo ra file Excel (.xlsx) và file (.csv), hỗ trợ in hóa đơn (`window.print`).
- **Backend & Database**:
  - **Supabase Authentication**: Đăng nhập, đăng ký, khôi phục mật khẩu.
  - **Supabase PostgreSQL**: Cơ sở dữ liệu quan hệ, transaction toàn vẹn.
  - **Supabase Storage**: Lưu trữ ảnh sản phẩm, avatar và chứng từ thu chi.
  - **Row Level Security (RLS)**: Bảo vệ dữ liệu nhiều lớp theo vai trò (`admin`, `manager`, `member`).

---

## 👥 Cơ Chế Phân Quyền & Tài Khoản

Hệ thống áp dụng cơ chế tự động nhận diện Admin đầu tiên:
1. **Tài khoản đầu tiên đăng ký**: Tự động được hệ thống cấp quyền **Quản trị viên (Admin - Nhóm trưởng)**.
2. **Các tài khoản đăng ký sau**: Mặc định nhận quyền **Thành viên (Member)**.
3. **Phân quyền lại**: Chỉ Admin mới có quyền đổi vai trò của thành viên khác (sang `Manager` hoặc `Admin`), hoặc khóa tài khoản trong trang **Thành viên** (`/members`).

---

## 🛠️ Hướng Dẫn Cài Đặt Ban Đầu

### Bước 1: Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc:
```env
VITE_SUPABASE_URL=https://wcmqcqctpoeqghelqrgh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_qZeIT6GQQVBov5QWT4ssBw_sY222qFP
```

### Bước 2: Thiết lập Database Supabase
1. Đăng nhập [Supabase Dashboard](https://supabase.com).
2. Vào **SQL Editor** $\rightarrow$ Mở file `supabase/migrations/20261111_init.sql` $\rightarrow$ Dán vào và bấm **Run**.
3. Vào **Storage** $\rightarrow$ Tạo **2 Bucket** công khai (gạt bật `Public bucket`):
   - `public`: Lưu trữ ảnh sản phẩm, avatar người dùng.
   - `documents`: Lưu trữ chứng từ, file hóa đơn.
4. Vào **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**:
   - Gạt **TẮT** mục `Confirm email` (để tránh lỗi `email rate limit exceeded` trên gói miễn phí, người dùng đăng ký xong có thể đăng nhập ngay).
   - Đảm bảo mục `Allow new users to sign up` đang được **BẬT**.

### Bước 3: Chạy thử trên máy cá nhân
```bash
npm install
npm run dev
```
Truy cập: `http://localhost:5173`

---

## 🌐 Hướng Dẫn Deploy Lên Vercel

1. Đăng nhập [vercel.com](https://vercel.com) bằng tài khoản GitHub.
2. Bấm **Add New...** $\rightarrow$ chọn **Project** $\rightarrow$ chọn repository `webquanlydoanhthu` $\rightarrow$ bấm **Import**.
3. Tại mục **Environment Variables**, thêm 2 biến:
   - `VITE_SUPABASE_URL`: `https://wcmqcqctpoeqghelqrgh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_qZeIT6GQQVBov5QWT4ssBw_sY222qFP`
4. Bấm **Deploy**. Sau khoảng 1 phút, trang web sẽ có đường link online (ví dụ `https://webquanlydoanhthu.vercel.app`) để toàn bộ thành viên trong nhóm truy cập cùng lúc.

---

## 💼 Quy Trình Vận Hành Kinh Doanh Chuẩn

1. **Ghi nhận vốn góp** (`/capital`):
   - Admin vào ghi nhận số tiền cam kết và số tiền thực nộp của từng thành viên.
   - Bảng tổng kết tự tính số tiền còn thiếu, tỷ lệ % hoàn thành và vẽ biểu đồ tròn cơ cấu vốn.
2. **Khai báo Sản phẩm** (`/categories` & `/products`):
   - Tạo các danh mục mặt hàng.
   - Thêm sản phẩm kèm mã tự sinh, giá vốn, giá bán lẻ và mức cảnh báo tồn kho.
3. **Nhập kho** (`/inventory`):
   - Tạo phiếu nhập kho khi nhập hàng từ nhà cung cấp. Hệ thống tự động cộng tồn kho và cập nhật giá trị tồn kho.
4. **Bán hàng & Đơn hàng** (`/orders`):
   - Khi có khách mua, tạo đơn hàng mới (chọn sản phẩm, nhập số lượng, tiền ship, giảm giá).
   - Đổi trạng thái sang **Hoàn thành**: Hệ thống tự động trừ kho, tính giá vốn (COGS) và ghi nhận doanh thu.
   - Có nút **In hóa đơn** chuyên nghiệp để gửi cho khách.
5. **Ghi nhận chi phí** (`/expenses`):
   - Chi tiền mua bao bì, in ấn, chạy quảng cáo $\rightarrow$ Tạo phiếu chi và Admin bấm **Duyệt chi**.
6. **Báo cáo & Thống kê** (`/dashboard` & `/reports`):
   - Theo dõi tự động: **Doanh thu - Giá vốn = Lợi nhuận gộp - Chi phí = Lợi nhuận ròng**.
   - Bấm nút **Xuất Excel (.xlsx)** để nộp báo cáo cho giảng viên.

---

## 🔥 Hướng Dẫn Reset Toàn Bộ Dữ Liệu

Khi bạn đã hoàn thành giai đoạn chạy thử nghiệm và muốn **xóa toàn bộ số liệu nháp** để bắt đầu vận hành kinh doanh thực tế, hãy làm theo hướng dẫn sau:

> **Cách thực hiện chung:**
> 1. Mở [Supabase Dashboard](https://supabase.com).
> 2. Chọn dự án của bạn $\rightarrow$ bấm vào mục **SQL Editor** ở thanh menu bên trái.
> 3. Bấm **New query**, sao chép một trong hai đoạn mã SQL dưới đây, dán vào và bấm **RUN**.

---

### 👉 CÁCH 1: Reset dữ liệu kinh doanh (KHUYÊN DÙNG)
> **Tác dụng:** Xóa sạch toàn bộ đơn hàng, sản phẩm, phiếu nhập kho, chi phí, thu chi quỹ, vốn góp và lịch sử thao tác. **Giữ lại nguyên vẹn tài khoản đăng nhập Admin và nhóm**, bạn không cần phải đăng ký lại tài khoản.

```sql
-- 1. Xóa sạch dữ liệu các bảng nghiệp vụ kinh doanh
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

-- 2. Đặt lại số đếm sản phẩm trong danh mục về 0
UPDATE public.categories SET product_count = 0;
```
*(Chạy xong đoạn này, trang web của bạn sẽ sạch bong dữ liệu và sẵn sàng nhập liệu thực tế).*

---

### 👉 CÁCH 2: Reset sạch 100% về trắng (Xóa cả tài khoản để làm lại từ đầu)
> **Tác dụng:** Xóa trắng toàn bộ cơ sở dữ liệu kể cả các tài khoản user đã đăng ký. Bạn sẽ bắt đầu như một hệ thống mới tinh (người đăng ký đầu tiên sẽ làm Admin).

```sql
-- 1. Xóa toàn bộ dữ liệu bảng nghiệp vụ và danh mục
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

-- 2. Xóa toàn bộ tài khoản người dùng trong hệ thống Auth
DELETE FROM auth.users;

-- 3. Nạp lại nhóm mặc định và danh mục mẫu ban đầu
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
```

---

## 💡 Các Lưu Ý & Mẹo Sử Dụng

1. **Nhập số tiền**:
   - Tất cả các ô nhập tiền (Vốn góp, Đơn hàng, Phí ship, Giảm giá, Chi phí) đã được xử lý để tự động xóa sạch khi bắt đầu gõ, **không bao giờ bị dính số 0 ở đầu**.
   - Ở trang Góp vốn có nút **"Bằng số cam kết"** để sao chép nhanh số tiền cam kết sang số thực nộp.
2. **Xóa dòng nộp vốn nhập nhầm**:
   - Ở bảng *Lịch sử các đợt nộp vốn*, Admin có thể bấm vào biểu tượng **Thùng rác 🗑️** ở cuối dòng để xóa bỏ bản ghi nộp tiền bị sai sót.
3. **Xuất báo cáo nộp bài môn học**:
   - Tại trang **Báo cáo & Thống kê** (`/reports`), bạn có thể lọc theo khoảng ngày bất kỳ và bấm **Xuất Excel** để lấy toàn bộ dữ liệu bảng tính nộp cho giảng viên hướng dẫn.
