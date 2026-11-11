import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  Calendar, Award, Package, ShoppingCart, ArrowUpRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { orderService } from '@/services/order.service';
import { financeService } from '@/services/finance.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatNumber, getDateRange, CHART_COLORS } from '@/utils/helpers';
import { Spinner } from '@/components/common/Spinner';
import { toast } from '@/hooks/useToast';
import type { DateFilter } from '@/types';

export default function RevenuePage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [loading, setLoading] = useState(true);

  // Stats
  const [revenue, setRevenue] = useState(0);
  const [costOfGoods, setCostOfGoods] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const { from, to } = getDateRange(dateFilter);
      const dateFrom = from.toISOString();
      const dateTo = to.toISOString();

      const [revStats, topProds, totalExp] = await Promise.all([
        orderService.getRevenueStats(groupId, dateFrom, dateTo),
        orderService.getTopProducts(groupId, 5),
        financeService.getTotalExpenses(groupId),
      ]);

      setRevenue(revStats.revenue);
      setCostOfGoods(revStats.cost);
      setOrderCount(revStats.orderCount);
      setTopProducts(topProds);
      setExpenses(totalExp);

      // Simple mock day distribution for visualization if needed
      setChartData([
        { date: 'Tuần 1', revenue: revStats.revenue * 0.2, cost: revStats.cost * 0.2 },
        { date: 'Tuần 2', revenue: revStats.revenue * 0.35, cost: revStats.cost * 0.35 },
        { date: 'Tuần 3', revenue: revStats.revenue * 0.25, cost: revStats.cost * 0.25 },
        { date: 'Tuần 4', revenue: revStats.revenue * 0.2, cost: revStats.cost * 0.2 },
      ]);
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu doanh thu', err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const grossProfit = revenue - costOfGoods; // Lợi nhuận gộp
  const netProfit = grossProfit - expenses; // Lợi nhuận ròng
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0';

  const dateOptions: { id: DateFilter; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: '7days', label: '7 ngày' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'this_quarter', label: 'Quý này' },
    { id: 'this_year', label: 'Năm nay' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Doanh thu & Lợi nhuận</h1>
          <p className="page-subtitle">Phân tích chi tiết hiệu quả kinh doanh, giá vốn và tỷ suất sinh lời</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          {dateOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDateFilter(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dateFilter === opt.id
                  ? 'bg-secondary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Formula summary banner */}
          <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-l-4 border-secondary">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Công thức kế toán chuẩn:</h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>• <strong>Lợi nhuận gộp</strong> = Doanh thu hợp lệ ({formatCurrency(revenue)}) - Giá vốn hàng bán ({formatCurrency(costOfGoods)}) = <strong>{formatCurrency(grossProfit)}</strong></p>
              <p>• <strong>Lợi nhuận ròng</strong> = Lợi nhuận gộp ({formatCurrency(grossProfit)}) - Chi phí hoạt động ({formatCurrency(expenses)}) = <strong>{formatCurrency(netProfit)}</strong></p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Doanh thu thuần</span>
              <p className="text-xl font-bold text-success currency">{formatCurrency(revenue)}</p>
              <span className="text-xs text-gray-400">{orderCount} đơn thành công</span>
            </div>

            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Giá vốn hàng bán</span>
              <p className="text-xl font-bold text-orange-600 currency">{formatCurrency(costOfGoods)}</p>
              <span className="text-xs text-gray-400">Tiền hàng gốc xuất kho</span>
            </div>

            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Lợi nhuận gộp</span>
              <p className="text-xl font-bold text-secondary currency">{formatCurrency(grossProfit)}</p>
              <span className="text-xs text-gray-400">Doanh thu - Giá vốn</span>
            </div>

            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Chi phí hoạt động</span>
              <p className="text-xl font-bold text-danger currency">{formatCurrency(expenses)}</p>
              <span className="text-xs text-gray-400">Đã phê duyệt</span>
            </div>

            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Lợi nhuận ròng</span>
              <p className={`text-xl font-bold currency ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(netProfit)}
              </p>
              <span className="text-xs text-gray-400">Lãi sau chi phí</span>
            </div>

            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Tỷ suất lợi nhuận</span>
              <p className="text-xl font-bold text-purple-600 currency">{profitMargin}%</p>
              <span className="text-xs text-gray-400">Lợi nhuận ròng / Doanh thu</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend chart */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Biểu đồ Doanh thu và Chi phí kỳ này</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#16A34A" strokeWidth={2} />
                    <Line type="monotone" dataKey="cost" name="Giá vốn" stroke="#EA580C" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={20} className="text-yellow-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Top 5 sản phẩm bán chạy</h3>
              </div>
              {topProducts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">Chưa có dữ liệu bán hàng</p>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-secondary text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">{p.name}</p>
                          <p className="text-xs text-gray-400">Đã bán: {p.quantity}</p>
                        </div>
                      </div>
                      <span className="font-semibold currency text-secondary">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
