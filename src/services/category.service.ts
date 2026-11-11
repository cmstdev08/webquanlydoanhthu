import { supabase } from '@/config/supabase';
import type { Category } from '@/types';

export const categoryService = {
  /**
   * Get all categories for a group
   */
  async getAll(groupId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('group_id', groupId)
      .order('name');
    if (error) throw error;
    return (data || []) as Category[];
  },

  /**
   * Get active categories
   */
  async getActive(groupId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return (data || []) as Category[];
  },

  /**
   * Create category
   */
  async create(category: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert(category as any)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  /**
   * Update category
   */
  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  /**
   * Toggle category status
   */
  async toggleStatus(id: string, status: 'active' | 'inactive') {
    return this.update(id, { status });
  },

  /**
   * Check if category has products before delete
   */
  async canDelete(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);
    if (error) return false;
    return (count || 0) === 0;
  },

  /**
   * Delete category (only if no products)
   */
  async delete(id: string): Promise<void> {
    const canDelete = await this.canDelete(id);
    if (!canDelete) throw new Error('Danh mục đang có sản phẩm. Vui lòng xử lý sản phẩm trước khi xóa danh mục.');
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },
};
