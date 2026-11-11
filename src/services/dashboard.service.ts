import { supabase } from '@/config/supabase';
import { getDateRange } from '@/utils/helpers';
import type { DashboardStats, RevenueChartData } from '@/types';

export const dashboardService = {
  /**
   * Get main dashboard statistics
   */
  async getStats(groupId: string, dateFilter = 'this_month'): Promise<DashboardStats> {
    const { from, to } = getDateRange(dateFilter);
    const dateFrom = from.toISOString();
    const dateTo = to.toISOString();

    const [
      capitalResult,
      ordersResult,
      expensesResult,
      fundResult,
      productsResult,
      membersResult,
      inventoryResult,
    ] = await Promise.all([
      supabase.from('capital_contributions').select('paid_amount').eq('group_id', groupId).eq('status', 'confirmed'),
      supabase.from('orders').select('total_amount, cost_total').eq('group_id', groupId).eq('status', 'delivered').gte('created_at', dateFrom).lte('created_at', dateTo),
      supabase.from('expenses').select('amount').eq('group_id', groupId).eq('status', 'approved').gte('expense_date', dateFrom).lte('expense_date', dateTo),
      supabase.from('fund_transactions').select('type, amount').eq('group_id', groupId).eq('status', 'approved'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active'),
      supabase.from('products').select('stock_quantity, cost_price').eq('group_id', groupId).eq('status', 'active'),
    ]);

    const totalCapital = ((capitalResult.data || []) as any[]).reduce((sum, c) => sum + (c.paid_amount || 0), 0);
    const totalRevenue = ((ordersResult.data || []) as any[]).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalCost = ((ordersResult.data || []) as any[]).reduce((sum, o) => sum + (o.cost_total || 0), 0);
    const totalExpenses = ((expensesResult.data || []) as any[]).reduce((sum, e) => sum + (e.amount || 0), 0);
    const fundIncome = ((fundResult.data || []) as any[]).filter((t) => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const fundExpense = ((fundResult.data || []) as any[]).filter((t) => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const inventoryValue = ((inventoryResult.data || []) as any[]).reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.cost_price || 0), 0);
    
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;

    return {
      totalCapital,
      totalInventoryImport: 0,
      totalRevenue,
      totalExpenses,
      totalProfit: netProfit,
      fundBalance: fundIncome - fundExpense,
      inventoryValue,
      orderCount: ordersResult.data?.length || 0,
      productCount: productsResult.count || 0,
      memberCount: membersResult.count || 0,
    };
  },

  /**
   * Get revenue chart data for a date range (by day)
   */
  async getRevenueChartData(groupId: string, dateFrom: string, dateTo: string): Promise<RevenueChartData[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, cost_total, created_at')
      .eq('group_id', groupId)
      .eq('status', 'delivered')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .order('created_at');
    
    if (error) throw error;

    const dayMap = new Map<string, { revenue: number; cost: number }>();
    ((data || []) as any[]).forEach((order) => {
      const day = order.created_at.slice(0, 10);
      const existing = dayMap.get(day) || { revenue: 0, cost: 0 };
      dayMap.set(day, {
        revenue: existing.revenue + (order.total_amount || 0),
        cost: existing.cost + (order.cost_total || 0),
      });
    });

    return Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      revenue: v.revenue,
      cost: v.cost,
      profit: v.revenue - v.cost,
    }));
  },

  /**
   * Get expense breakdown by category
   */
  async getExpensesByCategory(groupId: string, dateFrom: string, dateTo: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, expense_categories:category_id(name, color)')
      .eq('group_id', groupId)
      .eq('status', 'approved')
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo);
    if (error) throw error;

    const catMap = new Map<string, { name: string; color: string; amount: number }>();
    ((data || []) as any[]).forEach((e: any) => {
      const catName = e.expense_categories?.name || 'Khác';
      const catColor = e.expense_categories?.color || '#6B7280';
      const existing = catMap.get(catName) || { name: catName, color: catColor, amount: 0 };
      catMap.set(catName, { ...existing, amount: existing.amount + (e.amount || 0) });
    });

    return Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);
  },

  /**
   * Get fund transactions chart data
   */
  async getFundChartData(groupId: string, dateFrom: string, dateTo: string) {
    const { data, error } = await supabase
      .from('fund_transactions')
      .select('type, amount, transaction_date')
      .eq('group_id', groupId)
      .eq('status', 'approved')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)
      .order('transaction_date');
    if (error) throw error;

    const dayMap = new Map<string, { income: number; expense: number }>();
    ((data || []) as any[]).forEach((t: any) => {
      const day = t.transaction_date.slice(0, 10);
      const existing = dayMap.get(day) || { income: 0, expense: 0 };
      if (t.type === 'income') {
        dayMap.set(day, { ...existing, income: existing.income + (t.amount || 0) });
      } else {
        dayMap.set(day, { ...existing, expense: existing.expense + (t.amount || 0) });
      }
    });

    return Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));
  },

  /**
   * Get capital contribution ratio by member
   */
  async getCapitalByMember(groupId: string) {
    const { data, error } = await supabase
      .from('capital_contributions')
      .select('paid_amount, profiles:member_id(full_name)')
      .eq('group_id', groupId)
      .eq('status', 'confirmed');
    if (error) throw error;

    const memberMap = new Map<string, { name: string; amount: number }>();
    ((data || []) as any[]).forEach((c: any) => {
      const name = c.profiles?.full_name || 'Thành viên';
      const existing = memberMap.get(name) || { name, amount: 0 };
      memberMap.set(name, { ...existing, amount: existing.amount + (c.paid_amount || 0) });
    });

    return Array.from(memberMap.values()).sort((a, b) => b.amount - a.amount);
  },
};
