# GROUP BUSINESS MANAGER (Hệ Thống Quản Lý Kinh Doanh & Quỹ Nhóm)

Hệ thống website quản lý kinh doanh trực tuyến và quản trị tài chính chuyên nghiệp dành cho nhóm sinh viên thực hiện dự án môn Thương mại điện tử.

---

## 🚀 Công Nghệ Sử Dụng

- **Frontend**:
  - React 18 (Vite) + TypeScript.
  - Tailwind CSS 3 (giao diện SaaS hiện đại, Dark/Light Mode, responsive 100%).
  - Recharts (Biểu đồ phân tích doanh thu, chi phí, cơ cấu vốn).
  - Lucide React (Bộ icon chuẩn giao diện quản trị).
  - React Router DOM v6 (Điều hướng trang & phân quyền Protected Routes).
  - React Hook Form (Validation form tối ưu).
  - XLSX (Xuất báo cáo Excel .xlsx & .csv).

- **Backend & Cơ sở dữ liệu**:
  - **Supabase Authentication**: Đăng nhập, phân quyền, khôi phục mật khẩu.
  - **Supabase PostgreSQL**: Lưu trữ dữ liệu quan hệ, transaction toàn vẹn.
  - **Supabase Storage**: Quản lý ảnh sản phẩm, avatar và chứng từ thu chi.
  - **Row Level Security (RLS)**: Bảo vệ dữ liệu nhiều lớp theo vai trò (`admin`, `manager`, `member`).

---

## 📂 Cấu Trúc Dự Án

```
webquanlyquyduan/
├── src/
│   ├── assets/              # Hình ảnh, logo
│   ├── components/
│   │   ├── common/          # Modal, Toast, Spinner, Pagination, Avatar, Badge, Skeleton, EmptyState
│   │   ├── layout/          # AppLayout, Header, Sidebar
│   ├── config/
│   │   └── supabase.ts      # Khởi tạo Supabase client an toàn
│   ├── contexts/
│   │   ├── AuthContext.tsx  # Quản lý phiên đăng nhập & thông tin người dùng
│   │   └── ThemeContext.tsx # Quản lý Dark/Light mode
│   ├── hooks/
│   │   ├── useToast.ts      # Hệ thống thông báo toast
│   │   ├── usePagination.ts # Phân trang dữ liệu
│   │   └── useDisclosure.ts # Quản lý đóng/mở modal
│   ├── pages/
│   │   ├── auth/            # LoginPage, ForgotPasswordPage, ResetPasswordPage
│   │   ├── dashboard/       # DashboardPage (Tổng quan tài chính 10 thẻ + biểu đồ)
│   │   ├── capital/         # CapitalPage (Quản lý vốn góp & tỷ lệ từng thành viên)
│   │   ├── fund/            # FundPage (Quỹ chung: Thu quỹ & Chi quỹ)
│   │   ├── products/        # ProductsPage (Quản lý kho hàng & cảnh báo tồn)
│   │   ├── categories/      # CategoriesPage (Danh mục sản phẩm)
│   │   ├── inventory/       # InventoryPage (Lịch sử nhập hàng)
│   │   ├── orders/          # OrdersPage (Đơn hàng & quy trình duyệt/giao hàng)
│   │   ├── revenue/         # RevenuePage (Phân tích Doanh thu & Lợi nhuận)
│   │   ├── expenses/        # ExpensesPage (Quản lý chi phí hoạt động)
│   │   ├── members/         # MembersPage (Phân quyền Admin/Manager/Member)
│   │   ├── reports/         # ReportsPage (Xuất Excel, CSV, in trực tiếp)
│   │   ├── activity/        # ActivityPage (Audit Log nhật ký thao tác)
│   │   └── settings/        # SettingsPage (Hồ sơ, đổi mật khẩu)
│   ├── routes/
│   │   └── ProtectedRoute.tsx # Phân quyền bảo vệ route
│   ├── services/            # Tách biệt API service với Supabase
│   ├── types/               # TypeScript type definitions & Database schema
│   ├── utils/               # Định dạng tiền tệ VNĐ, ngày tháng, helper
│   ├── App.tsx              # Router chính của ứng dụng
│   ├── main.tsx
│   └── index.css            # Tailwind custom styles
├── supabase/
│   └── migrations/
│       └── 20261111_init.sql # Toàn bộ SQL schema, triggers, RLS & seed data
├── .env.example
├── package.json
└── README.md
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc (hoặc sao chép từ `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Bước 2: Khởi tạo Database Supabase
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com).
2. Tạo một Project mới.
3. Vào mục **SQL Editor**, mở file `supabase/migrations/20261111_init.sql`, sao chép toàn bộ nội dung và nhấn **Run**.
4. Vào mục **Storage**, tạo 2 bucket công khai (Public bucket):
   - `public` (Dùng lưu trữ ảnh sản phẩm, avatar người dùng).
   - `documents` (Dùng lưu chứng từ, hóa đơn thu chi).

### Bước 3: Chạy ứng dụng trên môi trường phát triển
```bash
npm run dev
```
Truy cập trình duyệt tại: `http://localhost:5173`

---

## 💼 Các Quy Tắc Kế Toán & Quản Trị Được Áp Dụng

1. **Công thức chuẩn**:
   - **Doanh thu**: Tổng giá trị các đơn hàng giao thành công (`status = 'delivered'`).
   - **Giá vốn hàng bán (COGS)**: Tổng giá vốn của các sản phẩm thực tế đã xuất bán.
   - **Lợi nhuận gộp**: Doanh thu - Giá vốn hàng bán.
   - **Lợi nhuận ròng**: Lợi nhuận gộp - Chi phí hoạt động đã duyệt.
   - **Số dư quỹ chung**: Tổng tiền thu quỹ - Tổng tiền chi quỹ.

2. **Quy tắc phân tách dòng tiền**:
   - Không tính vốn góp vào doanh thu bán hàng.
   - Không tính toàn bộ tiền nhập hàng tồn kho là chi phí ngay lập tức (giá trị kho được theo dõi riêng).
   - Quỹ chung độc lập với dòng tiền doanh thu bán hàng.

3. **Bảo mật và phân quyền (RBAC)**:
   - **ADMIN**: Toàn quyền quản trị hệ thống, quản lý thành viên, xem toàn bộ báo cáo, phân quyền và duyệt chi.
   - **MANAGER**: Quản lý sản phẩm, tồn kho, đơn hàng, tạo giao dịch thu chi.
   - **MEMBER**: Xem thông tin, tạo đơn hàng, gửi yêu cầu thu/chi quỹ chờ duyệt.
