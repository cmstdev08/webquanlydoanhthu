import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, PiggyBank, CheckCircle, Clock, AlertCircle,
  FileSpreadsheet, Printer, Users, User, ArrowUpRight
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { financeService } from '@/services/finance.service';
import { memberService } from '@/services/member.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, CHART_COLORS, PAYMENT_METHODS } from '@/utils/helpers';
import { Modal, ConfirmModal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import * as XLSX from 'xlsx';
import type { CapitalContribution, Profile } from '@/types';

export default function CapitalPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;
  const isManagerOrAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const [contributions, setContributions] = useState<CapitalContribution[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const createModal = useDisclosure();
  const confirmModal = useDisclosure();
  const [selectedContribution, setSelectedContribution] = useState<CapitalContribution | null>(null);

  // Form state
  const [memberId, setMemberId] = useState('');
  const [roundName, setRoundName] = useState('Đợt 1 - Khởi đầu');
  const [committedAmount, setCommittedAmount] = useState<number>(1000000);
  const [paidAmount, setPaidAmount] = useState<number>(1000000);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[1]); // Chuyển khoản
  const [notes, setNotes] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const [contribs, mems] = await Promise.all([
        financeService.getCapitalContributions(groupId),
        memberService.getGroupMembers(groupId),
      ]);
      setContributions(contribs as any);
      setMembers(mems);
      if (mems.length > 0 && !memberId) {
        setMemberId(mems[0].id);
      }
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu vốn góp', err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate by member
  const memberCapitalMap = new Map<string, { member: Profile; committed: number; paid: number }>();
  
  // Seed with all active members
  members.forEach((m) => {
    memberCapitalMap.set(m.id, { member: m, committed: 0, paid: 0 });
  });

  contributions.forEach((c) => {
    const existing = memberCapitalMap.get(c.member_id);
    if (existing) {
      existing.committed += c.committed_amount || 0;
      if (c.status === 'confirmed') {
        existing.paid += c.paid_amount || 0;
      }
    }
  });

  const memberSummaryList = Array.from(memberCapitalMap.values());
  const totalCommitted = memberSummaryList.reduce((sum, item) => sum + item.committed, 0);
  const totalPaid = memberSummaryList.reduce((sum, item) => sum + item.paid, 0);
  const totalRemaining = Math.max(0, totalCommitted - totalPaid);

  // Pie chart data
  const chartData = memberSummaryList
    .filter((item) => item.paid > 0)
    .map((item) => ({
      name: item.member.full_name || item.member.email,
      value: item.paid,
    }));

  const handleOpenCreate = () => {
    setCommittedAmount(1000000);
    setPaidAmount(1000000);
    setNotes('');
    createModal.open();
  };

  const handleCreateContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !memberId) return;

    setSubmitting(true);
    try {
      await financeService.addCapitalContribution({
        group_id: groupId,
        member_id: memberId,
        round_name: roundName,
        committed_amount: committedAmount,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        attachment_url: null,
        confirmed_by: isManagerOrAdmin ? profile?.id || null : null,
        confirmed_at: isManagerOrAdmin ? new Date().toISOString() : null,
        notes: notes || null,
        status: isManagerOrAdmin ? 'confirmed' : 'pending',
        paid_at: paidAt,
      });

      toast.success('Ghi nhận đợt góp vốn thành công');
      createModal.close();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi khi ghi nhận vốn', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedContribution || !profile) return;
    try {
      await financeService.confirmCapitalContribution(selectedContribution.id, profile.id);
      toast.success('Đã xác nhận khoản vốn góp');
      confirmModal.close();
      setSelectedContribution(null);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi xác nhận', err.message);
    }
  };

  const handleExportExcel = () => {
    const data = memberSummaryList.map((item) => ({
      'Thành viên': item.member.full_name || item.member.email,
      'Email': item.member.email,
      'Vốn cam kết (VNĐ)': item.committed,
      'Đã đóng (VNĐ)': item.paid,
      'Còn thiếu (VNĐ)': Math.max(0, item.committed - item.paid),
      'Tỷ lệ hoàn thành (%)': item.committed > 0 ? ((item.paid / item.committed) * 100).toFixed(1) : 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo vốn góp');
    XLSX.writeFile(wb, `BaoCao_VonGop_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Đã xuất file Excel thành công');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Quản lý vốn góp</h1>
          <p className="page-subtitle">Theo dõi nguồn vốn đầu tư ban đầu của các thành viên trong nhóm</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet size={16} />
            Xuất Excel
          </button>
          <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Góp vốn mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Tổng vốn cam kết</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 currency">{formatCurrency(totalCommitted)}</p>
              <span className="text-xs text-gray-400">Theo kế hoạch ban đầu</span>
            </div>
            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Đã thực góp</span>
              <p className="text-xl font-bold text-success currency">{formatCurrency(totalPaid)}</p>
              <span className="text-xs text-gray-400">Tiền đã vào quỹ vốn</span>
            </div>
            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Còn thiếu</span>
              <p className="text-xl font-bold text-danger currency">{formatCurrency(totalRemaining)}</p>
              <span className="text-xs text-gray-400">Cần bổ sung thêm</span>
            </div>
            <div className="stat-card">
              <span className="text-xs text-gray-500 uppercase font-medium">Số thành viên</span>
              <p className="text-xl font-bold text-secondary">{members.length}</p>
              <span className="text-xs text-gray-400">Đã tham gia</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Member Capital Table */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Danh sách đóng góp của thành viên</h3>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Vốn cam kết</th>
                      <th>Đã góp</th>
                      <th>Còn thiếu</th>
                      <th>Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberSummaryList.map((item) => {
                      const remaining = Math.max(0, item.committed - item.paid);
                      const percent = item.committed > 0 ? Math.min(100, Math.round((item.paid / item.committed) * 100)) : 0;
                      return (
                        <tr key={item.member.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <Avatar src={item.member.avatar_url} name={item.member.full_name} size="sm" />
                              <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.member.full_name || 'Thành viên'}</p>
                                <p className="text-xs text-gray-400">{item.member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="currency font-medium">{formatCurrency(item.committed)}</td>
                          <td className="currency font-bold text-success">{formatCurrency(item.paid)}</td>
                          <td className="currency font-medium text-danger">{formatCurrency(remaining)}</td>
                          <td>
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className="bg-secondary h-2 rounded-full" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{percent}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Tỷ lệ vốn đã góp</h3>
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-10">Chưa có khoản vốn nào được duyệt</p>
              )}
            </div>
          </div>

          {/* Detailed History */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Lịch sử các đợt nộp tiền</h3>
            {contributions.length === 0 ? (
              <EmptyState title="Chưa có giao dịch góp vốn" description="Các đợt nộp tiền sẽ hiển thị tại đây" />
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngày nộp</th>
                      <th>Thành viên</th>
                      <th>Đợt góp vốn</th>
                      <th>Số tiền</th>
                      <th>Phương thức</th>
                      <th>Ghi chú</th>
                      <th>Trạng thái</th>
                      {isManagerOrAdmin && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map((c) => (
                      <tr key={c.id}>
                        <td className="text-xs text-gray-500">{formatDate(c.paid_at || c.created_at)}</td>
                        <td className="font-medium">{(c as any).profiles?.full_name || 'Thành viên'}</td>
                        <td>{c.round_name || 'Đợt 1'}</td>
                        <td className="font-bold text-success currency">{formatCurrency(c.paid_amount)}</td>
                        <td>
                          <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {c.payment_method}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">{c.notes || '---'}</td>
                        <td>
                          {c.status === 'confirmed' ? (
                            <span className="badge bg-green-100 text-green-800">Đã xác nhận</span>
                          ) : (
                            <span className="badge bg-yellow-100 text-yellow-800">Chờ xác nhận</span>
                          )}
                        </td>
                        {isManagerOrAdmin && (
                          <td>
                            {c.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setSelectedContribution(c);
                                  confirmModal.open();
                                }}
                                className="text-xs btn-primary py-1 px-2.5"
                              >
                                Xác nhận
                              </button>
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
        </>
      )}

      {/* Modal Add Contribution */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title="Ghi nhận góp vốn">
        <form onSubmit={handleCreateContribution} className="space-y-4">
          <div>
            <label className="label">Thành viên nộp *</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="input"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Đợt góp vốn</label>
            <input
              type="text"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="VD: Đợt 1 - Khởi đầu"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Số tiền cam kết (VNĐ)</label>
              <input
                type="number"
                min={0}
                step={50000}
                value={committedAmount}
                onChange={(e) => setCommittedAmount(Number(e.target.value) || 0)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Số tiền thực nộp (VNĐ) *</label>
              <input
                type="number"
                min={1000}
                step={50000}
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="input font-bold"
              />
            </div>
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
              <label className="label">Ngày nộp</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm về đợt nộp..."
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

      {/* Modal Confirm Confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        onConfirm={handleConfirm}
        title="Xác nhận giao dịch góp vốn"
        message={`Bạn có chắc muốn xác nhận khoản tiền ${formatCurrency(selectedContribution?.paid_amount)} đã được chuyển vào tài khoản quỹ vốn của nhóm?`}
        confirmLabel="Xác nhận tiền đã vào"
        variant="primary"
      />
    </div>
  );
}
