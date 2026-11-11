import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Wallet, ArrowDownLeft, ArrowUpRight, CheckCircle,
  XCircle, Clock, Filter, Calendar, FileText
} from 'lucide-react';
import { financeService } from '@/services/finance.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime, FUND_INCOME_CATEGORIES, FUND_EXPENSE_CATEGORIES } from '@/utils/helpers';
import { Modal, ConfirmModal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { ApprovalStatusBadge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import type { FundTransaction } from '@/types';

export default function FundPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;
  const isManagerOrAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState({ income: 0, expense: 0, balance: 0 });

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const createModal = useDisclosure();
  const approveModal = useDisclosure();
  const [selectedTx, setSelectedTx] = useState<FundTransaction | null>(null);
  const [approvalAction, setApprovalAction] = useState<boolean>(true);

  // Form State
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>(FUND_INCOME_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const pagination = usePagination({ total: totalCount, pageSize: 15 });

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const [res, bal] = await Promise.all([
        financeService.getFundTransactions(groupId, {
          page: pagination.page,
          pageSize: pagination.pageSize,
          type: activeTab === 'all' ? undefined : activeTab,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        financeService.getFundBalance(groupId),
      ]);
      setTransactions(res.data as any);
      setTotalCount(res.count);
      setBalanceData(bal);
    } catch (err: any) {
      toast.error('Lỗi khi tải thông tin quỹ', err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, pagination.page, pagination.pageSize, activeTab, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = (type: 'income' | 'expense') => {
    setTxType(type);
    setCategory(type === 'income' ? FUND_INCOME_CATEGORIES[0] : FUND_EXPENSE_CATEGORIES[0]);
    setAmount(0);
    setDescription('');
    setTxDate(new Date().toISOString().slice(0, 10));
    createModal.open();
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !profile) return;
    if (amount <= 0) {
      toast.error('Số tiền phải lớn hơn 0');
      return;
    }
    if (!description.trim()) {
      toast.error('Vui lòng nhập nội dung chi tiết');
      return;
    }

    setSubmitting(true);
    try {
      await financeService.addFundTransaction({
        group_id: groupId,
        type: txType,
        amount,
        category,
        description,
        performed_by: profile.id,
        approved_by: isManagerOrAdmin ? profile.id : null,
        attachment_url: null,
        status: isManagerOrAdmin ? 'approved' : 'pending',
        transaction_date: txDate,
      });

      toast.success(
        txType === 'income' ? 'Đã ghi nhận thu quỹ' : 'Đã ghi nhận yêu cầu chi quỹ',
        isManagerOrAdmin ? 'Giao dịch đã được duyệt tự động' : 'Đang chờ quản lý phê duyệt'
      );
      createModal.close();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi khi tạo giao dịch quỹ', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveTransaction = async () => {
    if (!selectedTx || !profile) return;
    try {
      await financeService.approveFundTransaction(selectedTx.id, profile.id, approvalAction);
      toast.success(approvalAction ? 'Đã duyệt giao dịch quỹ' : 'Đã từ chối giao dịch quỹ');
      approveModal.close();
      setSelectedTx(null);
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
          <h1 className="page-title">Quản lý quỹ chung</h1>
          <p className="page-subtitle">Theo dõi tiền quỹ sinh hoạt nhóm, tiền thưởng, tài trợ và các chi phí phụ trợ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreate('income')}
            className="btn-secondary flex items-center gap-1.5 text-success"
          >
            <ArrowDownLeft size={16} />
            Thu quỹ
          </button>
          <button
            onClick={() => handleOpenCreate('expense')}
            className="btn-danger flex items-center gap-1.5"
          >
            <ArrowUpRight size={16} />
            Đề xuất chi
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="text-xs text-gray-500 uppercase font-medium">Tổng tiền thu quỹ</span>
          <p className="text-2xl font-bold text-success currency">{formatCurrency(balanceData.income)}</p>
          <span className="text-xs text-gray-400">Đóng góp, tài trợ, thưởng...</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-gray-500 uppercase font-medium">Tổng tiền chi quỹ</span>
          <p className="text-2xl font-bold text-danger currency">{formatCurrency(balanceData.expense)}</p>
          <span className="text-xs text-gray-400">Vật dụng, marketing, phát sinh...</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-gray-500 uppercase font-medium">Số dư quỹ hiện tại</span>
          <p className={`text-2xl font-bold currency ${balanceData.balance >= 0 ? 'text-secondary' : 'text-danger'}`}>
            {formatCurrency(balanceData.balance)}
          </p>
          <span className="text-xs text-gray-400">Tổng thu - Tổng chi</span>
        </div>
      </div>

      {/* Filter Tabs & Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              activeTab === 'all' ? 'bg-secondary text-white' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              activeTab === 'income' ? 'bg-success text-white' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Thu quỹ
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              activeTab === 'expense' ? 'bg-danger text-white' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Chi quỹ
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs py-1"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Wallet size={32} className="text-gray-400" />}
            title="Chưa có giao dịch quỹ"
            description="Các khoản thu và chi quỹ nhóm sẽ xuất hiện ở đây"
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Loại</th>
                  <th>Danh mục</th>
                  <th>Nội dung</th>
                  <th>Số tiền</th>
                  <th>Người đề xuất</th>
                  <th>Trạng thái</th>
                  {isManagerOrAdmin && <th className="text-right">Duyệt</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="text-xs text-gray-500">{formatDate(tx.transaction_date)}</td>
                    <td>
                      {tx.type === 'income' ? (
                        <span className="badge bg-green-100 text-green-800">Thu quỹ</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-800">Chi quỹ</span>
                      )}
                    </td>
                    <td className="font-medium text-sm">{tx.category}</td>
                    <td className="text-sm text-gray-700 dark:text-gray-300">{tx.description}</td>
                    <td className={`font-bold currency ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="text-xs">{(tx as any).performed_by_profile?.full_name || 'Thành viên'}</td>
                    <td>
                      <ApprovalStatusBadge status={tx.status} />
                    </td>
                    {isManagerOrAdmin && (
                      <td className="text-right space-x-2">
                        {tx.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTx(tx);
                                setApprovalAction(true);
                                approveModal.open();
                              }}
                              className="text-xs btn-primary py-1 px-2.5"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTx(tx);
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

      {/* Modal Add Transaction */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title={txType === 'income' ? 'Ghi nhận thu quỹ' : 'Đề xuất chi quỹ'}>
        <form onSubmit={handleCreateTransaction} className="space-y-4">
          <div>
            <label className="label">Số tiền (VNĐ) *</label>
            <input
              type="number"
              min={1000}
              step={1000}
              required
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="input text-lg font-bold"
              placeholder="100,000"
            />
          </div>

          <div>
            <label className="label">Danh mục</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              {(txType === 'income' ? FUND_INCOME_CATEGORIES : FUND_EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
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
              placeholder="Mô tả lý do thu hoặc chi quỹ..."
              className="input"
            />
          </div>

          <div>
            <label className="label">Ngày giao dịch</label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={createModal.close} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Đang lưu...' : 'Ghi nhận'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Approve Confirmation */}
      <ConfirmModal
        isOpen={approveModal.isOpen}
        onClose={approveModal.close}
        onConfirm={handleApproveTransaction}
        title={approvalAction ? 'Phê duyệt giao dịch quỹ' : 'Từ chối giao dịch quỹ'}
        message={`Bạn có chắc muốn ${approvalAction ? 'phê duyệt' : 'từ chối'} khoản ${selectedTx?.type === 'income' ? 'thu' : 'chi'} quỹ "${selectedTx?.description}" trị giá ${formatCurrency(selectedTx?.amount)}?`}
        confirmLabel={approvalAction ? 'Phê duyệt' : 'Từ chối'}
        variant={approvalAction ? 'primary' : 'danger'}
      />
    </div>
  );
}
