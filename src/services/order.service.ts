import { supabase } from '@/config/supabase';
import type { Order, OrderItem } from '@/types';

export const orderService = {
  /**
   * Get all orders for a group
   */
  async getAll(groupId: string, opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const { page = 1, pageSize = 20, search, status, assignedTo, dateFrom, dateTo } = opts;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('orders')
      .select('*, profiles:assigned_to(full_name, avatar_url)', { count: 'exact' })
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (search) {
      query = query.or(`order_code.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as Order[], count: count || 0 };
  },

  /**
   * Get order by ID with items
   */
  async getById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*, products(*)),
        profiles:assigned_to(full_name, avatar_url),
        created_by_profile:created_by(full_name)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Create order with items
   */
  async create(
    order: Partial<Order>,
    items: Partial<OrderItem>[]
  ): Promise<Order> {
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(order as any)
      .select()
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items.map((item) => ({ ...item, order_id: (newOrder as any).id })) as any);
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', (newOrder as any).id);
      throw itemsError;
    }

    return newOrder as Order;
  },

  /**
   * Update order status
   */
  async updateStatus(id: string, status: Order['status'], confirmedBy?: string): Promise<Order> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'confirmed' && confirmedBy) {
      updates.confirmed_at = new Date().toISOString();
    }
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    if (status === 'confirmed') {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', id);
      
      if (items) {
        for (const item of (items as any[])) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();
          if (product) {
            await supabase
              .from('products')
              .update({ stock_quantity: Math.max(0, ((product as any).stock_quantity || 0) - item.quantity) } as any)
              .eq('id', item.product_id);
          }
        }
      }
    } else if (status === 'cancelled' || status === 'returned') {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', id)
        .single();
      
      if (currentOrder && ['confirmed', 'preparing', 'shipping', 'delivered'].includes((currentOrder as any).status)) {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', id);
        
        if (items) {
          for (const item of (items as any[])) {
            const { data: product } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();
            if (product) {
              await supabase
                .from('products')
                .update({ stock_quantity: ((product as any).stock_quantity || 0) + item.quantity } as any)
                .eq('id', item.product_id);
            }
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  },

  /**
   * Get revenue stats for a date range
   */
  async getRevenueStats(groupId: string, dateFrom: string, dateTo: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, cost_total, discount_amount, shipping_fee, status, created_at')
      .eq('group_id', groupId)
      .in('status', ['delivered'])
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);
    if (error) throw error;
    
    const revenue = ((data || []) as any[]).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const cost = ((data || []) as any[]).reduce((sum, o) => sum + (o.cost_total || 0), 0);
    const profit = revenue - cost;
    
    return { revenue, cost, profit, orderCount: data?.length || 0 };
  },

  /**
   * Get top selling products
   */
  async getTopProducts(groupId: string, limit = 10) {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        quantity, total,
        products(id, name, code),
        orders!inner(group_id, status)
      `)
      .eq('orders.group_id', groupId)
      .eq('orders.status', 'delivered');
    if (error) throw error;

    const productMap = new Map<string, { name: string; code: string; quantity: number; revenue: number }>();
    ((data || []) as any[]).forEach((item: any) => {
      if (!item.products) return;
      const key = item.products.id;
      const existing = productMap.get(key) || { name: item.products.name, code: item.products.code, quantity: 0, revenue: 0 };
      productMap.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.total,
      });
    });

    return Array.from(productMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },
};
