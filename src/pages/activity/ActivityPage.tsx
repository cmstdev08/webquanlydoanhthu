import React, { useState, useEffect, useCallback } from 'react';
import {
  History, User, Clock, Search, Filter, ShieldCheck,
  ChevronDown, ChevronRight, FileText
} from 'lucide-react';
import { activityService } from '@/services/activity.service';
import { memberService } from '@/services/member.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/helpers';
import { Spinner } from '@/components/common/Spinner';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { toast } from '@/hooks/useToast';
import type { ActivityLog, Profile } from '@/types';

export default function ActivityPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pagination = usePagination({ total: totalCount, pageSize: 20 });

  const loadLogs = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await activityService.getGroupLogs(groupId, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        userId: selectedUser === 'all' ? undefined : selectedUser,
      });
      setLogs(res.data as any);
      setTotalCount(res.count);
    } catch (err: any) {
      toast.error('Lỗi khi tải lịch sử hoạt động', err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, pagination.page, pagination.pageSize, selectedUser]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (groupId) {
      memberService.getGroupMembers(groupId).then(setMembers);
    }
  }, [groupId]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Nhật ký hoạt động (Audit Log)</h1>
          <p className="page-subtitle">Theo dõi minh bạch toàn bộ các thao tác chỉnh sửa dữ liệu, duyệt thu chi và đơn hàng</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 flex items-center gap-3">
        <span className="text-xs text-gray-500">Lọc theo thành viên:</span>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="input text-sm py-1.5 max-w-xs"
        >
          <option value="all">Tất cả thành viên</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History size={32} className="text-gray-400" />}
            title="Chưa có bản ghi hoạt động nào"
            description="Các hành động của thành viên trong nhóm sẽ được tự động ghi lại tại đây"
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Thời gian</th>
                  <th>Người thực hiện</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Mã đối tượng</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const hasDetails = log.old_data || log.new_data;
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td>
                          {hasDetails && (
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={(log as any).profiles?.avatar_url}
                              name={(log as any).profiles?.full_name}
                              size="xs"
                            />
                            <span className="font-medium text-sm">
                              {(log as any).profiles?.full_name || 'Hệ thống'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 font-semibold text-xs">
                            {log.action}
                          </span>
                        </td>
                        <td className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {log.entity_type}
                        </td>
                        <td className="text-xs font-mono text-gray-400 truncate max-w-[120px]">
                          {log.entity_id || '---'}
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 dark:bg-gray-800/80 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              {log.old_data && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900/40">
                                  <p className="font-bold text-danger mb-1">Dữ liệu trước khi sửa:</p>
                                  <pre className="overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_data && (
                                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900/40">
                                  <p className="font-bold text-success mb-1">Dữ liệu sau khi sửa:</p>
                                  <pre className="overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.new_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
    </div>
  );
}
