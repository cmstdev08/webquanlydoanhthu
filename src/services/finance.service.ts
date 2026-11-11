import { supabase } from '@/config/supabase';
import type { CapitalContribution, FundTransaction, Expense, ExpenseCategory } from '@/types';

export const financeService = {
  // ==================== CAPITAL CONTRIBUTIONS ====================
  
  async getCapitalContributions(groupId: string): Promise<CapitalContribution[]> {
    const { data, error } = await supabase
      .from('capital_contributions')
      .select('*, profiles:member_id(full_name, email, avatar_url), confirmed_by_profile:confirmed_by(full_name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CapitalContribution[];
  },

  async addCapitalContribution(contribution: Partial<CapitalContribution>): Promise<CapitalContribution> {
    const { data, error } = await supabase
      .from('capital_contributions')
      .insert(contribution as any)
      .select()
      .single();
    if (error) throw error;
    return data as CapitalContribution;
  },

  async updateCapitalContribution(id: string, updates: Partial<CapitalContribution>): Promise<CapitalContribution> {
    const { data, error } = await supabase
      .from('capital_contributions')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CapitalContribution;
  },

  async confirmCapitalContribution(id: string, confirmedBy: string): Promise<CapitalContribution> {
    const { data, error } = await supabase
      .from('capital_contributions')
      .update({
        status: 'confirmed',
        confirmed_by: confirmedBy,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CapitalContribution;
  },

  async getTotalCapital(groupId: string): Promise<number> {
    const { data, error } = await supabase
      .from('capital_contributions')
      .select('paid_amount')
      .eq('group_id', groupId)
      .eq('status', 'confirmed');
    if (error) throw error;
    return ((data || []) as any[]).reduce((sum, c) => sum + (c.paid_amount || 0), 0);
  },

  // ==================== FUND TRANSACTIONS ====================

  async getFundTransactions(groupId: string, opts: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const { page = 1, pageSize = 20, type, status, dateFrom, dateTo } = opts;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('fund_transactions')
      .select(`
        *,
        performed_by_profile:performed_by(full_name, avatar_url),
        approved_by_profile:approved_by(full_name)
      `, { count: 'exact' })
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('transaction_date', dateFrom);
    if (dateTo) query = query.lte('transaction_date', dateTo);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as FundTransaction[], count: count || 0 };
  },

  async addFundTransaction(tx: Partial<FundTransaction>): Promise<FundTransaction> {
    const { data, error } = await supabase
      .from('fund_transactions')
      .insert(tx as any)
      .select()
      .single();
    if (error) throw error;
    return data as FundTransaction;
  },

  async updateFundTransaction(id: string, updates: Partial<FundTransaction>): Promise<FundTransaction> {
    const { data, error } = await supabase
      .from('fund_transactions')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as FundTransaction;
  },

  async approveFundTransaction(id: string, approvedBy: string, approved: boolean): Promise<FundTransaction> {
    const { data, error } = await supabase
      .from('fund_transactions')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as FundTransaction;
  },

  async getFundBalance(groupId: string): Promise<{ income: number; expense: number; balance: number }> {
    const { data, error } = await supabase
      .from('fund_transactions')
      .select('type, amount')
      .eq('group_id', groupId)
      .eq('status', 'approved');
    if (error) throw error;
    
    const items = (data || []) as any[];
    const income = items.filter((t) => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = items.filter((t) => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    return { income, expense, balance: income - expense };
  },

  // ==================== EXPENSES ====================

  async getExpenses(groupId: string, opts: {
    page?: number;
    pageSize?: number;
    categoryId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const { page = 1, pageSize = 20, categoryId, status, dateFrom, dateTo } = opts;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('expenses')
      .select(`
        *,
        expense_categories:category_id(name, color),
        performed_by_profile:performed_by(full_name),
        approved_by_profile:approved_by(full_name)
      `, { count: 'exact' })
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (categoryId) query = query.eq('category_id', categoryId);
    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('expense_date', dateFrom);
    if (dateTo) query = query.lte('expense_date', dateTo);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as Expense[], count: count || 0 };
  },

  async addExpense(expense: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense as any)
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },

  async approveExpense(id: string, approvedBy: string, approved: boolean): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },

  async getTotalExpenses(groupId: string): Promise<number> {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('group_id', groupId)
      .eq('status', 'approved');
    if (error) throw error;
    return ((data || []) as any[]).reduce((sum, e) => sum + (e.amount || 0), 0);
  },

  async getExpenseCategories(groupId: string): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('group_id', groupId)
      .order('name');
    if (error) throw error;
    return (data || []) as ExpenseCategory[];
  },

  async addExpenseCategory(category: { group_id: string; name: string; description?: string; color?: string }): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert(category as any)
      .select()
      .single();
    if (error) throw error;
    return data as ExpenseCategory;
  },

  /**
   * Upload attachment (invoice, receipt, etc.)
   */
  async uploadAttachment(folder: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const filename = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(filename, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(filename);
    return data.publicUrl;
  },
};
