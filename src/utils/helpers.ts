/**
 * Format number as Vietnamese currency (VNĐ)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Format date to Vietnamese format: DD/MM/YYYY
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '---';
  const d = new Date(date);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '---';
  const d = new Date(date);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format relative time (e.g., "2 giờ trước")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return formatDate(date);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

/**
 * Calculate profit margin
 */
export function calcProfitMargin(profit: number, revenue: number): string {
  if (revenue === 0) return '0%';
  return `${((profit / revenue) * 100).toFixed(1)}%`;
}

/**
 * Generate a short unique order code
 */
export function generateOrderCode(prefix = 'DH'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}`;
}

/**
 * Generate a short unique product code
 */
export function generateProductCode(prefix = 'SP'): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Truncate text to a max length
 */
export function truncate(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Get initials from a name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Get start and end date for date filter
 */
export function getDateRange(filter: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  switch (filter) {
    case 'today': {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case '7days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const toLast = new Date(now.getFullYear(), now.getMonth(), 0);
      toLast.setHours(23, 59, 59, 999);
      return { from, to: toLast };
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const from = new Date(now.getFullYear(), quarter * 3, 1);
      return { from, to };
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to };
    }
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
  }
}

/**
 * Color palette for charts
 */
export const CHART_COLORS = [
  '#2563EB', '#16A34A', '#DC2626', '#D97706', '#7C3AED',
  '#0891B2', '#BE185D', '#059669', '#EA580C', '#1D4ED8',
];

/**
 * Order status labels and colors
 */
export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  preparing: { label: 'Đang chuẩn bị', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  shipping: { label: 'Đang giao hàng', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  delivered: { label: 'Đã giao', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  returned: { label: 'Hoàn trả', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

/**
 * Fund transaction categories
 */
export const FUND_INCOME_CATEGORIES = [
  'Đóng góp thành viên',
  'Tiền thưởng',
  'Tài trợ',
  'Thu khác',
];

export const FUND_EXPENSE_CATEGORIES = [
  'Mua vật dụng',
  'Chi phí vận chuyển',
  'Quảng cáo',
  'Marketing',
  'Hoạt động nhóm',
  'Chi phí phát sinh',
  'Khác',
];

export const PAYMENT_METHODS = [
  'Tiền mặt',
  'Chuyển khoản',
  'Ví điện tử',
  'Thẻ ngân hàng',
];
