import React, { useState } from 'react';
import {
  FileText, Download, Printer, FileSpreadsheet,
  TrendingUp, PiggyBank, Wallet, Package, ShoppingCart, Users, Receipt
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/services/order.service';
import { financeService } from '@/services/finance.service';
import { productService } from '@/services/product.service';
import { memberService } from '@/services/member.service';
import { formatCurrency, formatDate, getDateRange } from '@/utils/helpers';
import { Spinner } from '@/components/common/Spinner';
import { toast } from '@/hooks/useToast';
import * as XLSX from 'xlsx';

type ReportType =
  | 'revenue'
  | 'profit'
  | 'expenses'
  | 'capital'
  | 'fund'
  | 'inventory'
  | 'orders'
  | 'members';

export default function ReportsPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const [selectedReport, setSelectedReport] = useState<ReportType>('revenue');
  const [dateFilter, setDateFilter] = useState('this_month');
  const [generating, setGenerating] = useState(false);

  const reportItems: { id: ReportType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'revenue',
      label: 'Báo cáo doanh thu',
      desc: 'Chi tiết các đơn hàng thành công, doanh số bán lẻ',
      icon: <TrendingUp size={20} className="text-success" />,
    },
    {
      id: 'profit',
      label: 'Báo cáo lợi nhuận',
      desc: 'Bảng kê doanh thu, giá vốn hàng bán và lợi nhuận ròng',
      icon: <FileText size={20} className="text-secondary" />,
    },
    {
      id: 'expenses',
      label: 'Báo cáo chi phí',
      desc: 'Tổng hợp chi phí vận hành, quảng cáo và phát sinh',
      icon: <Receipt size={20} className="text-danger" />,
    },
    {
      id: 'capital',
      label: 'Báo cáo vốn góp',
      desc: 'Danh sách và tiến độ góp vốn của từng thành viên',
      icon: <PiggyBank size={20} className="text-purple-600" />,
    },
    {
      id: 'fund',
      label: 'Báo cáo quỹ chung',
      desc: 'Sổ thu chi quỹ sinh hoạt nhóm và số dư khả dụng',
      icon: <Wallet size={20} className="text-orange-500" />,
    },
    {
      id: 'inventory',
      label: 'Báo cáo tồn kho',
      desc: 'Giá trị hàng hóa tồn kho, số lượng thực tế và định mức',
      icon: <Package size={20} className="text-teal-600" />,
    },
    {
      id: 'orders',
      label: 'Báo cáo đơn hàng',
      desc: 'Thống kê tổng số đơn theo trạng thái và kênh bán',
      icon: <ShoppingCart size={20} className="text-blue-500" />,
    },
    {
      id: 'members',
      label: 'Báo cáo hiệu suất thành viên',
      desc: 'Doanh số và số lượng đơn hàng từng cá nhân tạo ra',
      icon: <Users size={20} className="text-pink-600" />,
    },
  ];

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!groupId) return;
    setGenerating(true);
    try {
      const { from, to } = getDateRange(dateFilter);
      const dateFrom = from.toISOString();
      const dateTo = to.toISOString();

      let exportData: any[] = [];
      let filename = `BaoCao_${selectedReport}_${new Date().toISOString().slice(0, 10)}`;

      if (selectedReport === 'revenue' || selectedReport === 'orders') {
        const res = await orderService.getAll(groupId, { pageSize: 500, dateFrom, dateTo });
        exportData = (res.data as any[]).map((o: any) => ({
          'Mã đơn': o.order_code,
          'Khách hàng': o.customer_name || 'Vãng lai',
          'SĐT': o.customer_phone || '',
          'Tổng tiền (VNĐ)': o.total_amount,
          'Phương thức': o.payment_method,
          'Trạng thái': o.status,
          'Ngày tạo': formatDate(o.created_at),
        }));
      } else if (selectedReport === 'expenses') {
        const res = await financeService.getExpenses(groupId, { pageSize: 500, dateFrom, dateTo });
        exportData = (res.data as any[]).map((e: any) => ({
          'Ngày chi': formatDate(e.expense_date),
          'Nội dung': e.description,
          'Danh mục': (e as any).expense_categories?.name || 'Khác',
          'Số tiền (VNĐ)': e.amount,
          'Phương thức': e.payment_method,
          'Trạng thái': e.status,
        }));
      } else if (selectedReport === 'capital') {
        const contribs = await financeService.getCapitalContributions(groupId);
        exportData = (contribs as any[]).map((c: any) => ({
          'Thành viên': (c as any).profiles?.full_name || '---',
          'Đợt góp vốn': c.round_name,
          'Vốn cam kết': c.committed_amount,
          'Thực nộp': c.paid_amount,
          'Phương thức': c.payment_method,
          'Trạng thái': c.status,
          'Ngày nộp': formatDate(c.paid_at || c.created_at),
        }));
      } else if (selectedReport === 'fund') {
        const res = await financeService.getFundTransactions(groupId, { pageSize: 500, dateFrom, dateTo });
        exportData = (res.data as any[]).map((tx: any) => ({
          'Ngày': formatDate(tx.transaction_date),
          'Loại': tx.type === 'income' ? 'Thu quỹ' : 'Chi quỹ',
          'Danh mục': tx.category,
          'Nội dung': tx.description,
          'Số tiền (VNĐ)': tx.amount,
          'Trạng thái': tx.status,
        }));
      } else if (selectedReport === 'inventory') {
        const prods = await productService.getAll(groupId, { pageSize: 500 });
        exportData = (prods.data as any[]).map((p: any) => ({
          'Mã SP': p.code,
          'Tên sản phẩm': p.name,
          'Danh mục': (p as any).categories?.name || '',
          'Đơn vị tính': p.unit,
          'Giá vốn (VNĐ)': p.cost_price,
          'Giá bán (VNĐ)': p.sell_price,
          'Tồn kho': p.stock_quantity,
          'Giá trị tồn (VNĐ)': p.stock_quantity * p.cost_price,
          'Trạng thái': p.status,
        }));
      } else if (selectedReport === 'members') {
        const mems = await memberService.getGroupMembers(groupId);
        exportData = await Promise.all(
          mems.map(async (m) => {
            const stats = await memberService.getMemberStats(m.id, groupId);
            return {
              'Họ và tên': m.full_name || '---',
              'Email': m.email,
              'Vai trò': m.role,
              'Số đơn bán được': stats.orderCount,
              'Doanh số (VNĐ)': stats.totalRevenue,
              'Vốn đã góp (VNĐ)': stats.totalCapital,
            };
          })
        );
      } else {
        // Profit summary
        const rev = await orderService.getRevenueStats(groupId, dateFrom, dateTo);
        const exp = await financeService.getTotalExpenses(groupId);
        exportData = [
          { 'Chỉ tiêu': 'Tổng doanh thu', 'Số tiền (VNĐ)': rev.revenue },
          { 'Chỉ tiêu': 'Giá vốn hàng bán', 'Số tiền (VNĐ)': rev.cost },
          { 'Chỉ tiêu': 'Lợi nhuận gộp', 'Số tiền (VNĐ)': rev.profit },
          { 'Chỉ tiêu': 'Chi phí hoạt động', 'Số tiền (VNĐ)': exp },
          { 'Chỉ tiêu': 'Lợi nhuận ròng', 'Số tiền (VNĐ)': rev.profit - exp },
        ];
      }

      if (exportData.length === 0) {
        toast.info('Không có dữ liệu trong kỳ này để xuất');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');

      if (format === 'csv') {
        XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }

      toast.success(`Đã xuất báo cáo ${format.toUpperCase()} thành công!`);
    } catch (err: any) {
      toast.error('Lỗi khi xuất file', err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Trung tâm Báo cáo & Xuất dữ liệu</h1>
          <p className="page-subtitle">Xuất file Excel, CSV và in báo cáo định kỳ phục vụ báo cáo môn học</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? <Spinner size="sm" /> : <FileSpreadsheet size={16} />}
            Xuất Excel (.xlsx)
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={generating}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} />
            Xuất CSV
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer size={16} />
            In trực tiếp
          </button>
        </div>
      </div>

      {/* Date Filter & Options */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Kỳ báo cáo:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày gần nhất</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="this_quarter">Quý này</option>
            <option value="this_year">Năm nay</option>
          </select>
        </div>
        <p className="text-xs text-gray-400">
          Dự án: GROUP BUSINESS MANAGER · Môn Thương mại điện tử
        </p>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportItems.map((item) => {
          const isSelected = selectedReport === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedReport(item.id)}
              className={`card p-5 cursor-pointer transition-all border-2 ${
                isSelected
                  ? 'border-secondary shadow-md bg-blue-50/20 dark:bg-blue-900/10'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {item.icon}
                </div>
                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{item.label}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Preview Card */}
      <div className="card p-6 border-l-4 border-secondary bg-white dark:bg-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
          Đang chọn: {reportItems.find((r) => r.id === selectedReport)?.label}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Bấm nút "Xuất Excel" hoặc "Xuất CSV" ở trên để tải xuống toàn bộ bảng dữ liệu đầy đủ tương ứng với kỳ báo cáo đã chọn.
        </p>
      </div>
    </div>
  );
}
