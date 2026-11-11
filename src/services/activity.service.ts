import { supabase } from '@/config/supabase';
import type { ActivityLog } from '@/types';

export const activityService = {
  /**
   * Log an activity
   */
  async log(params: {
    groupId?: string | null;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldData?: unknown;
    newData?: unknown;
  }): Promise<void> {
    const { error } = await supabase.from('activity_logs').insert({
      group_id: params.groupId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_data: params.oldData as any,
      new_data: params.newData as any,
    } as any);
    if (error) console.error('Activity log error:', error);
  },

  /**
   * Get activity logs for a group
   */
  async getGroupLogs(
    groupId: string,
    opts: { page?: number; pageSize?: number; userId?: string } = {}
  ) {
    const { page = 1, pageSize = 20, userId } = opts;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('activity_logs')
      .select('*, profiles:user_id(full_name, email, avatar_url)', { count: 'exact' })
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (userId) query = query.eq('user_id', userId);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as ActivityLog[], count: count || 0 };
  },
};
