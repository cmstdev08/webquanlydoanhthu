import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Users, Shield, Lock, Unlock, Edit, Eye,
  Mail, Phone, Calendar, ShoppingBag, PiggyBank, Award
} from 'lucide-react';
import { memberService } from '@/services/member.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Modal, ConfirmModal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { Avatar } from '@/components/common/Avatar';
import { RoleBadge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import type { Profile } from '@/types';

export default function MembersPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;
  const isAdmin = profile?.role === 'admin';

  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const statsModal = useDisclosure();
  const toggleModal = useDisclosure();

  // Selected member
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [memberStats, setMemberStats] = useState<{ totalRevenue: number; orderCount: number; totalCapital: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await memberService.getGroupMembers(groupId);
      setMembers(res);
    } catch (err: any) {
      toast.error('Lỗi khi tải danh sách thành viên', err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleOpenEdit = (m: Profile) => {
    setSelectedMember(m);
    setFullName(m.full_name || '');
    setPhone(m.phone || '');
    setRole(m.role);
    editModal.open();
  };

  const handleOpenStats = async (m: Profile) => {
    if (!groupId) return;
    setSelectedMember(m);
    statsModal.open();
    setLoadingStats(true);
    try {
      const stats = await memberService.getMemberStats(m.id, groupId);
      setMemberStats(stats);
    } catch (err: any) {
      toast.error('Không thể tải thống kê', err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      await memberService.updateMember(selectedMember.id, {
        full_name: fullName,
        phone: phone || null,
        role: role,
      });
      toast.success('Đã cập nhật thông tin thành viên');
      editModal.close();
      loadMembers();
    } catch (err: any) {
      toast.error('Cập nhật thất bại', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedMember) return;
    const newStatus = selectedMember.status === 'active' ? 'suspended' : 'active';
    try {
      await memberService.toggleStatus(selectedMember.id, newStatus);
      toast.success(newStatus === 'active' ? 'Đã kích hoạt lại tài khoản' : 'Đã tạm khóa tài khoản');
      toggleModal.close();
      loadMembers();
    } catch (err: any) {
      toast.error('Thao tác thất bại', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Quản lý thành viên & Tài khoản</h1>
          <p className="page-subtitle">Phân quyền, theo dõi hoạt động và chỉ số hiệu suất của từng cá nhân</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users size={32} className="text-gray-400" />}
          title="Chưa có thành viên nào"
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tham gia</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar src={m.avatar_url} name={m.full_name} size="md" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{m.full_name || 'Chưa cập nhật'}</p>
                          <p className="text-xs text-gray-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">
                      <p className="text-gray-600 dark:text-gray-400">{m.phone || 'Chưa có SĐT'}</p>
                    </td>
                    <td>
                      <RoleBadge role={m.role} />
                    </td>
                    <td>
                      {m.status === 'active' ? (
                        <span className="badge bg-green-100 text-green-800">Hoạt động</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-800">Đã khóa</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500">{formatDate(m.created_at)}</td>
                    <td className="text-right space-x-2">
                      <button
                        onClick={() => handleOpenStats(m)}
                        className="btn-ghost p-1.5"
                        title="Xem hiệu suất"
                      >
                        <Award size={16} />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="btn-ghost p-1.5"
                            title="Chỉnh sửa quyền"
                          >
                            <Edit size={16} />
                          </button>
                          {m.id !== profile?.id && (
                            <button
                              onClick={() => {
                                setSelectedMember(m);
                                toggleModal.open();
                              }}
                              className={`p-1.5 rounded-lg ${
                                m.status === 'active'
                                  ? 'text-danger hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'text-success hover:bg-green-50 dark:hover:bg-green-900/20'
                              }`}
                              title={m.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                            >
                              {m.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Edit Member */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.close} title="Chỉnh sửa thông tin & phân quyền">
        <form onSubmit={handleUpdateMember} className="space-y-4">
          <div>
            <label className="label">Họ và tên</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Số điện thoại</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Vai trò trong nhóm *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="input"
            >
              <option value="member">Thành viên (Member)</option>
              <option value="manager">Quản lý (Manager)</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Admin có toàn quyền, Manager quản lý kho & đơn hàng, Member xem và đề xuất.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={editModal.close} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Member Stats */}
      <Modal isOpen={statsModal.isOpen} onClose={statsModal.close} title="Chỉ số hiệu suất thành viên">
        {selectedMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <Avatar src={selectedMember.avatar_url} name={selectedMember.full_name} size="lg" />
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">{selectedMember.full_name}</p>
                <p className="text-xs text-gray-400">{selectedMember.email}</p>
                <div className="mt-1">
                  <RoleBadge role={selectedMember.role} />
                </div>
              </div>
            </div>

            {loadingStats ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : memberStats ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="card p-3">
                  <ShoppingBag size={20} className="mx-auto text-secondary mb-1" />
                  <span className="text-xs text-gray-400">Đơn hàng bán được</span>
                  <p className="text-lg font-bold">{memberStats.orderCount}</p>
                </div>
                <div className="card p-3">
                  <Award size={20} className="mx-auto text-success mb-1" />
                  <span className="text-xs text-gray-400">Doanh số đem về</span>
                  <p className="text-sm font-bold text-success currency">{formatCurrency(memberStats.totalRevenue)}</p>
                </div>
                <div className="card p-3">
                  <PiggyBank size={20} className="mx-auto text-purple-600 mb-1" />
                  <span className="text-xs text-gray-400">Vốn đã đóng góp</span>
                  <p className="text-sm font-bold text-purple-600 currency">{formatCurrency(memberStats.totalCapital)}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Modal Toggle Lock Confirmation */}
      <ConfirmModal
        isOpen={toggleModal.isOpen}
        onClose={toggleModal.close}
        onConfirm={handleToggleStatus}
        title={selectedMember?.status === 'active' ? 'Khóa tài khoản thành viên' : 'Kích hoạt lại tài khoản'}
        message={`Bạn có chắc muốn ${selectedMember?.status === 'active' ? 'khóa' : 'kích hoạt lại'} tài khoản của ${selectedMember?.full_name}?`}
        confirmLabel={selectedMember?.status === 'active' ? 'Khóa tài khoản' : 'Kích hoạt lại'}
        variant={selectedMember?.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
}
