import { supabase } from '@/config/supabase';
import type { Product, InventoryTransaction } from '@/types';

export const productService = {
  /**
   * Get all products for a group
   */
  async getAll(groupId: string, opts: { 
    page?: number; 
    pageSize?: number; 
    search?: string;
    categoryId?: string;
    status?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const { page = 1, pageSize = 20, search, categoryId, status, sortBy = 'created_at', sortDir = 'desc' } = opts;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('products')
      .select('*, categories:category_id(name), suppliers:supplier_id(name)', { count: 'exact' })
      .eq('group_id', groupId)
      .order(sortBy, { ascending: sortDir === 'asc' })
      .range(offset, offset + pageSize - 1);

    if (search) query = query.ilike('name', `%${search}%`);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as Product[], count: count || 0 };
  },

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories:category_id(*), suppliers:supplier_id(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Product;
  },

  /**
   * Create product
   */
  async create(product: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product as any)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  /**
   * Update product
   */
  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  /**
   * Delete / deactivate product
   */
  async deactivate(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'inactive', updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  /**
   * Get inventory transactions for a product
   */
  async getInventoryHistory(productId: string): Promise<InventoryTransaction[]> {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*, profiles:performed_by(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as InventoryTransaction[];
  },

  /**
   * Add inventory transaction (import/export/adjustment)
   */
  async addInventoryTransaction(
    tx: Partial<InventoryTransaction>
  ): Promise<InventoryTransaction> {
    const { data: txData, error: txError } = await supabase
      .from('inventory_transactions')
      .insert(tx as any)
      .select()
      .single();
    if (txError) throw txError;

    const quantityChange = tx.type === 'import' || tx.type === 'return' ? (tx.quantity || 0) : -(tx.quantity || 0);
    
    if (tx.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', tx.product_id)
        .single();
      
      if (product) {
        const newQty = Math.max(0, ((product as any).stock_quantity || 0) + quantityChange);
        await supabase
          .from('products')
          .update({ stock_quantity: newQty, updated_at: new Date().toISOString() } as any)
          .eq('id', tx.product_id);
      }
    }

    return txData as InventoryTransaction;
  },

  /**
   * Get low stock products
   */
  async getLowStock(groupId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'active');
    if (error) throw error;
    return ((data || []) as Product[]).filter((p) => p.stock_quantity <= p.min_stock_alert);
  },

  /**
   * Upload product image
   */
  async uploadImage(productId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `products/${productId}.${ext}`;
    const { error } = await supabase.storage.from('public').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('public').getPublicUrl(path);
    return data.publicUrl;
  },
};
