import type { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Group = Database['public']['Tables']['groups']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type CapitalContribution = Database['public']['Tables']['capital_contributions']['Row'];
export type FundTransaction = Database['public']['Tables']['fund_transactions']['Row'];
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export type UserRole = 'admin' | 'manager' | 'member';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type OrderStatus = Order['status'];
export type FundTransactionType = FundTransaction['type'];
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type DateFilter = 'today' | '7days' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardStats {
  totalCapital: number;
  totalInventoryImport: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  fundBalance: number;
  inventoryValue: number;
  orderCount: number;
  productCount: number;
  memberCount: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ProductWithCategory extends Product {
  categories?: Category | null;
  suppliers?: Supplier | null;
}

export interface OrderWithItems extends Order {
  order_items?: (OrderItem & { products?: Product })[];
  profiles?: Profile | null;
}

export interface ContributionWithMember extends CapitalContribution {
  profiles?: Profile | null;
}

export interface FundTransactionWithUser extends FundTransaction {
  performed_by_profile?: Profile | null;
  approved_by_profile?: Profile | null;
}

export interface ExpenseWithCategory extends Expense {
  expense_categories?: ExpenseCategory | null;
  performed_by_profile?: Profile | null;
}
