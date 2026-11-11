import React from 'react';
import { clsx } from 'clsx';
import { ORDER_STATUS_MAP } from '@/utils/helpers';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses = {
  default: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={clsx('badge font-medium', sizeClass, variantClasses[variant], className)}>
      {children}
    </span>
  );
}

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const info = ORDER_STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={clsx('badge px-2 py-0.5 text-xs font-medium', info.color)}>
      {info.label}
    </span>
  );
}

interface ApprovalStatusBadgeProps {
  status: string;
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Chờ duyệt', variant: 'warning' },
    approved: { label: 'Đã duyệt', variant: 'success' },
    rejected: { label: 'Từ chối', variant: 'danger' },
  };
  const info = map[status] || { label: status, variant: 'gray' };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    admin: { label: 'Admin', variant: 'danger' },
    manager: { label: 'Manager', variant: 'purple' },
    member: { label: 'Thành viên', variant: 'info' },
  };
  const info = map[role] || { label: role, variant: 'gray' };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
