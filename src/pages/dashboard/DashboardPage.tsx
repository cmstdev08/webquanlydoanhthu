import React, { useState, useEffect, useCallback } from 'react';
import {
  PiggyBank, TrendingUp, TrendingDown, Wallet, Package,
  ShoppingCart, Users, BarChart3, ArrowUpRight, ArrowDownRight,
  RefreshCw, Calendar,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/dashboard.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatNumber, getDateRange, CHART_COLORS } from '@/utils/helpers';
import { SkeletonDashboard } from '@/components/common/Skeleton';
import { toast } from '@/hooks/useToast';
import type { DashboardStats, RevenueChartData, DateFilter } from '@/types';

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'this_quarter', label: 'Quý này' },
  { value: 'this_year', label: 'Năm nay' },
];

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  change?: { value: string; positive: boolean };
  subtitle?: string;
}

function StatCard({ title, value, icon, iconBg, change, subtitle }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 currency">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      {change && (
        <div className="flex items-center gap-1 mt-2">
          {change.positive ? (
            <ArrowUpRight size={14} className="text-success" />
          ) : (
            <ArrowDownRight size={14} className="text-danger" />
          )}
          <span className={`text-xs font-medium ${change.positive ? 'text-success' : 'text-danger'}`}>
            {change.value}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">so với kỳ trước</span>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueChartData[]>([]);
  const [expenseData, setExpenseData] = useState<{ name: string; amount: number; color: string }[]>([]);
  const [capitalData, setCapitalData] = useState<{ name: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const groupId = profile?.group_id;

  const loadData = useCallback(async (filter: DateFilter) => {
    if (!groupId) return;
    try {
      const { from, to } = getDateRange(filter);
      const dateFrom = from.toISOString();
      const dateTo = to.toISOString();

      const [statsData, revenue, expenses, capital] = await Promise.all([
        dashboardService.getStats(groupId, filter),
        dashboardService.getRevenueChartData(groupId, dateFrom, dateTo),
        dashboardService.getExpensesByCategory(groupId, dateFrom, dateTo),
        dashboardService.getCapitalByMember(groupId),
      ]);

      setStats(statsData);
      setRevenueData(revenue);
      setExpenseData(expenses);
      setCapitalData(capital);
    } catch (err) {
      toast.error('Không thể tải dữ liệu', 'Vui lòng thử lại');
    }
  }, [groupId]);

  useEffect(() => {
    setLoading(true);
    loadData(dateFilter).finally(() => setLoading(false));
  }, [dateFilter, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(dateFilter);
    setRefreshing(false);
    toast.success('Đã cập nhật dữ liệu');
  };

  if (loading) return <SkeletonDashboard />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Tổng quan tài chính</h1>
          <p className="page-subtitle">Xin chào, {profile?.full_name || 'bạn'}! Đây là tổng quan hoạt động kinh doanh.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            {DATE_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  dateFilter === opt.value
                    ? 'bg-secondary text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Cập nhật
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Tổng vốn góp"
            value={formatCurrency(stats.totalCapital)}
            icon={<PiggyBank size={20} className="text-purple-600" />}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            subtitle="Tổng cộng từ trước đến nay"
          />
          <StatCard
            title="Doanh thu"
            value={formatCurrency(stats.totalRevenue)}
            icon={<TrendingUp size={20} className="text-success" />}
            iconBg="bg-green-100 dark:bg-green-900/30"
          />
          <StatCard
            title="Lợi nhuận"
            value={formatCurrency(stats.totalProfit)}
            icon={<BarChart3 size={20} className="text-secondary" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            change={
              stats.totalRevenue > 0
                ? {
                    value: `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}%`,
                    positive: stats.totalProfit >= 0,
                  }
                : undefined
            }
          />
          <StatCard
            title="Chi phí"
            value={formatCurrency(stats.totalExpenses)}
            icon={<TrendingDown size={20} className="text-danger" />}
            iconBg="bg-red-100 dark:bg-red-900/30"
          />
          <StatCard
            title="Số dư quỹ"
            value={formatCurrency(stats.fundBalance)}
            icon={<Wallet size={20} className="text-orange-500" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
          />
          <StatCard
            title="Tồn kho (giá trị)"
            value={formatCurrency(stats.inventoryValue)}
            icon={<Package size={20} className="text-teal-600" />}
            iconBg="bg-teal-100 dark:bg-teal-900/30"
          />
          <StatCard
            title="Đơn hàng"
            value={formatNumber(stats.orderCount)}
            icon={<ShoppingCart size={20} className="text-secondary" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            subtitle="Đơn hàng thành công"
          />
          <StatCard
            title="Sản phẩm"
            value={formatNumber(stats.productCount)}
            icon={<Package size={20} className="text-indigo-600" />}
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            subtitle="Đang kinh doanh"
          />
          <StatCard
            title="Thành viên"
            value={formatNumber(stats.memberCount)}
            icon={<Users size={20} className="text-pink-600" />}
            iconBg="bg-pink-100 dark:bg-pink-900/30"
          />
          <StatCard
            title="Lợi nhuận gộp"
            value={formatCurrency(stats.totalRevenue - stats.totalExpenses)}
            icon={<TrendingUp size={20} className="text-green-700" />}
            iconBg="bg-green-100 dark:bg-green-900/30"
          />
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Doanh thu & Chi phí</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Theo ngày trong kỳ được chọn</p>
            </div>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#16A34A" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" name="Giá vốn" stroke="#DC2626" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <Calendar size={32} className="mx-auto mb-2" />
                <p className="text-sm">Chưa có dữ liệu doanh thu trong kỳ này</p>
              </div>
            </div>
          )}
        </div>

        {/* Capital Pie Chart */}
        <div className="card p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Tỷ lệ vốn góp</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Theo từng thành viên</p>
          </div>
          {capitalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={capitalData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {capitalData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <PiggyBank size={32} className="mx-auto mb-2" />
                <p className="text-sm">Chưa có vốn góp</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      {expenseData.length > 0 && (
        <div className="card p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Chi phí theo danh mục</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Phân bổ chi phí trong kỳ được chọn</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expenseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                formatter={(value) => [formatCurrency(value as number), 'Chi phí']}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {expenseData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
