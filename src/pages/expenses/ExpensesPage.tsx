import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Receipt, CheckCircle, XCircle, Clock,
  Filter, Calendar, FileText, ArrowUpRight
} from 'lucide-react';
import { financeService } from '@/services/finance.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime, PAYMENT_METHODS } from '@/utils/helpers';
import { Modal, ConfirmModal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { Badge, ApprovalStatusBadge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import type { Expense, ExpenseCategory } from '@/types';

export default function ExpensesPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;
  const isManagerOrAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const createModal = useDisclosure();
  const approveModal = useDisclosure();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalAction, setApprovalAction] = useState<boolean>(true);

  // Form State
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const pagination = usePagination({ total: totalExpenses, pageSize: 15 });

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const [res, cats] = await Promise.all([
        financeService.getExpenses(groupId, {
          page: pagination.page,
          pageSize: pagination.pageSize,
          status: statusFilter === 'all' ? undefined : statusFilter,
          categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        }),
        financeService.getExpenseCategories(groupId),
      ]);
      setExpenses(res.data as any);
      setTotalExpenses(res.count);
      setCategories(cats);
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu chi phí', err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, pagination.page, pagination.pageSize, statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setAmount(0);
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setPaymentMethod(PAYMENT_METHODS[0]);
    setExpenseDate(new Date().toISOString().slice(0, 10));
    createModal.open();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !profile) return;
    if (amount <= 0) {
      toast.error('Số tiền chi phí phải lớn hơn 0');
      return;
    }
    if (!description.trim()) {
      toast.error('Vui lòng nhập nội dung chi');
      return;
    }

    setSubmitting(true);
    try {
      await financeService.addExpense({
        group_id: groupId,
        category_id: categoryId || null,
        amount,
        description,
        payment_method: paymentMethod,
        attachment_url: null,
        performed_by: profile.id,
        approved_by: isManagerOrAdmin ? profile.id : null,
        status: isManagerOrAdmin ? 'approved' : 'pending',
        expense_date: expenseDate,
      });

      toast.success(
        'Đã tạo khoản chi',
        isManagerOrAdmin ? 'Khoản chi đã được tự động duyệt' : 'Đang chờ quản lý phê duyệt'
      );
      createModal.close();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi tạo khoản chi', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveExpense = async () => {
    if (!selectedExpense || !profile) return;
    try {
      await financeService.approveExpense(selectedExpense.id, profile.id, approvalAction);
      toast.success(approvalAction ? 'Đã duyệt khoản chi' : 'Đã từ chối khoản chi');
      approveModal.close();
      setSelectedExpense(null);
      loadData();
    } catch (err: any) {
      toast.error('Thao tác thất bại', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Quản lý chi phí kinh doanh</h1>
          <p className="page-subtitle">Theo dõi các khoản chi phí hoạt động, quảng cáo, tiếp thị và vật dụng</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Thêm khoản chi
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 whitespace-nowrap">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 whitespace-nowrap">Danh mục:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<Receipt size={32} className="text-gray-400" />}
            title="Chưa có khoản chi nào"
            description="Tạo khoản chi mới để theo dõi các chi phí trong kỳ"
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày chi</th>
                  <th>Nội dung</th>
                  <th>Danh mục</th>
                  <th>Số tiền</th>
                  <th>Phương thức</th>
                  <th>Người đề xuất</th>
                  <th>Trạng thái</th>
                  {isManagerOrAdmin && <th className="text-right">Duyệt</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="text-xs text-gray-500">{formatDate(e.expense_date)}</td>
                    <td className="font-medium text-gray-900 dark:text-gray-100">{e.description}</td>
                    <td>
                      <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {(e as any).expense_categories?.name || 'Chung'}
                      </span>
                    </td>
                    <td className="font-semibold text-danger currency">
                      {formatCurrency(e.amount)}
                    </td>
                    <td>
                      <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {e.payment_method || 'Tiền mặt'}
                      </span>
                    </td>
                    <td className="text-sm">{(e as any).performed_by_profile?.full_name || '---'}</td>
                    <td>
                      <ApprovalStatusBadge status={e.status} />
                    </td>
                    {isManagerOrAdmin && (
                      <td className="text-right space-x-2">
                        {e.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedExpense(e);
                                setApprovalAction(true);
                                approveModal.open();
                              }}
                              className="text-xs btn-primary py-1 px-2.5"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => {
                                setSelectedExpense(e);
                                setApprovalAction(false);
                                approveModal.open();
                              }}
                              className="text-xs text-danger hover:underline py-1 px-2"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        from={pagination.from}
        to={pagination.to}
        onNext={pagination.nextPage}
        onPrev={pagination.prevPage}
        onPage={pagination.goToPage}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        pageSize={pagination.pageSize}
        onPageSizeChange={pagination.setPageSize}
      />

      {/* Modal Add Expense */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title="Thêm khoản chi phí">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="label">Số tiền (VNĐ) *</label>
            <input
              type="number"
              min={1000}
              step={1000}
              required
              value={amount === 0 ? '' : amount}
              onChange={(e) => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              className="input text-lg font-bold"
              placeholder="50,000"
            />
          </div>

          <div>
            <label className="label">Danh mục chi phí</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nội dung chi tiết *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chi tiết khoản chi: Mua bao bì, chạy ads Facebook..."
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phương thức</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ngày chi</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={createModal.close} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Đang lưu...' : 'Ghi nhận chi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Approve Confirmation */}
      <ConfirmModal
        isOpen={approveModal.isOpen}
        onClose={approveModal.close}
        onConfirm={handleApproveExpense}
        title={approvalAction ? 'Xác nhận duyệt khoản chi' : 'Xác nhận từ chối khoản chi'}
        message={`Bạn có chắc muốn ${approvalAction ? 'phê duyệt' : 'từ chối'} khoản chi "${selectedExpense?.description}" với số tiền ${formatCurrency(selectedExpense?.amount)}?`}
        confirmLabel={approvalAction ? 'Duyệt khoản chi' : 'Từ chối'}
        variant={approvalAction ? 'primary' : 'danger'}
      />
    </div>
  );
}
