import { supabase } from '@/config/supabase';
import type { Profile } from '@/types';

export const memberService = {
  /**
   * Get all members of a group
   */
  async getGroupMembers(groupId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('group_id', groupId)
      .order('full_name');
    if (error) throw error;
    return (data || []) as Profile[];
  },

  /**
   * Get member by ID
   */
  async getMemberById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Update member role and status
   */
  async updateMember(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Toggle member status (active/suspended)
   */
  async toggleStatus(id: string, status: 'active' | 'suspended' | 'inactive'): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Get member statistics (orders, revenue, etc.)
   */
  async getMemberStats(memberId: string, groupId: string) {
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('group_id', groupId)
      .eq('assigned_to', memberId)
      .eq('status', 'delivered');
    
    const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    const orderCount = orders?.length || 0;

    const { data: contributions } = await supabase
      .from('capital_contributions')
      .select('paid_amount')
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .eq('status', 'confirmed');
    
    const totalCapital = (contributions || []).reduce((sum: number, c: any) => sum + (c.paid_amount || 0), 0);

    return { totalRevenue, orderCount, totalCapital };
  },
};
