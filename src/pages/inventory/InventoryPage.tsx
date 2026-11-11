import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Archive,
  Plus,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  Search,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/config/supabase';
import { productService } from '@/services/product.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePagination } from '@/hooks/usePagination';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from '@/utils/helpers';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { SkeletonTable } from '@/components/common/Skeleton';
import { Spinner } from '@/components/common/Spinner';
import type { InventoryTransaction, Product } from '@/types';

interface InventoryTxWithRelations extends InventoryTransaction {
  products?: { id: string; name: string; code: string; unit: string } | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface ImportFormValues {
  product_id: string;
  quantity: number;
  unit_price: number;
  import_date: string;
  notes: string;
}

const TX_TYPE_MAP: Record<
  InventoryTransaction['type'],
  { label: string; colorClass: string }
> = {
  import: {
    label: 'Nhập kho',
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  export: {
    label: 'Xuất kho',
    colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  adjustment: {
    label: 'Điều chỉnh',
    colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  return: {
    label: 'Hoàn trả',
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function InventoryPage() {
  const { user, profile } = useAuth();
  const groupId = profile?.group_id;

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [transactions, setTransactions] = useState<InventoryTxWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [importsStats, setImportsStats] = useState({ count: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Searchable dropdown state inside modal
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const importModal = useDisclosure();
  const pagination = usePagination({ total: totalCount, pageSize: 20 });
  const { goToPage } = pagination;
  const goToPageRef = useRef(goToPage);
  goToPageRef.current = goToPage;
  const isFirstSearchRef = useRef(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ImportFormValues>({
    defaultValues: {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      import_date: getTodayDateString(),
      notes: '',
    },
  });

  const selectedProductId = watch('product_id');
  const watchQuantity = Number(watch('quantity') || 0);
  const watchUnitPrice = Number(watch('unit_price') || 0);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce product search filter
  useEffect(() => {
    if (isFirstSearchRef.current) {
      isFirstSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
      goToPageRef.current(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Load all products in group (for value calculation, low stock alerts, search & modal selector)
  const loadProductsAndStats = useCallback(async () => {
    if (!groupId) {
      setProductsLoaded(true);
      return;
    }
    try {
      const [productsRes, importsRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('group_id', groupId)
          .order('name', { ascending: true }),
        supabase
          .from('inventory_transactions')
          .select('total_amount', { count: 'exact' })
          .eq('group_id', groupId)
          .eq('type', 'import'),
      ]);

      if (productsRes.error) throw productsRes.error;
      setProducts(productsRes.data || []);
      setProductsLoaded(true);

      if (!importsRes.error) {
        const totalAmt = ((importsRes.data || []) as any[]).reduce(
          (sum: number, row: any) => sum + (row.total_amount || 0),
          0
        );
        setImportsStats({
          count: importsRes.count || 0,
          totalAmount: totalAmt,
        });
      }
    } catch (err) {
      console.error('Failed to load inventory products/stats:', err);
      setProductsLoaded(true);
    }
  }, [groupId]);

  // Load paginated inventory transactions
  const loadTransactions = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    if (!productsLoaded) return;

    setLoading(true);
    try {
      const searchTrimmed = debouncedProductSearch.trim().toLowerCase();
      let matchingProductIds: string[] | null = null;

      if (searchTrimmed) {
        matchingProductIds = products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(searchTrimmed) ||
              p.code.toLowerCase().includes(searchTrimmed)
          )
          .map((p) => p.id);

        if (matchingProductIds.length === 0) {
          setTransactions([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

      const offset = (pagination.page - 1) * pagination.pageSize;
      let query = supabase
        .from('inventory_transactions')
        .select(
          '*, products:product_id(id, name, code, unit), profiles:performed_by(full_name, email)',
          { count: 'exact' }
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pagination.pageSize - 1);

      if (typeFilter) {
        query = query.eq('type', typeFilter as InventoryTransaction['type']);
      }
      if (matchingProductIds) {
        query = query.in('product_id', matchingProductIds);
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(`${dateFrom}T00:00:00`).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(`${dateTo}T23:59:59.999`).toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setTransactions((data as InventoryTxWithRelations[]) || []);
      setTotalCount(count || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại';
      toast.error('Không thể tải lịch sử kho', message);
    } finally {
      setLoading(false);
    }
  }, [
    groupId,
    productsLoaded,
    products,
    pagination.page,
    pagination.pageSize,
    typeFilter,
    debouncedProductSearch,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    loadProductsAndStats();
  }, [loadProductsAndStats]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Derived metrics
  const { totalInventoryValue, totalStockUnits, lowStockProducts } = useMemo(() => {
    let value = 0;
    let units = 0;
    const lowStock: Product[] = [];

    for (const p of products) {
      const qty = p.stock_quantity ?? 0;
      const cost = p.cost_price ?? 0;
      value += qty * cost;
      units += qty;

      if (p.status !== 'discontinued' && qty <= (p.min_stock_alert ?? 0)) {
        lowStock.push(p);
      }
    }

    lowStock.sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));
    return {
      totalInventoryValue: value,
      totalStockUnits: units,
      lowStockProducts: lowStock,
    };
  }, [products]);

  // Available products for searchable dropdown in modal
  const availableProducts = useMemo(() => {
    const q = dropdownSearch.trim().toLowerCase();
    return products
      .filter((p) => p.status !== 'discontinued')
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        );
      });
  }, [products, dropdownSearch]);

  const handleOpenImportModal = (preselectedProduct?: Product) => {
    setDropdownSearch('');
    setDropdownOpen(false);
    reset({
      product_id: preselectedProduct?.id || '',
      quantity: 1,
      unit_price: preselectedProduct?.cost_price ?? 0,
      import_date: getTodayDateString(),
      notes: '',
    });
    importModal.open();
  };

  const handleSelectProduct = (product: Product) => {
    setValue('product_id', product.id, { shouldValidate: true });
    setValue('unit_price', product.cost_price ?? 0);
    setDropdownOpen(false);
    setDropdownSearch('');
  };

  const onSubmitImport = async (values: ImportFormValues) => {
    if (!groupId || !user) {
      toast.error('Thiếu thông tin nhóm hoặc tài khoản');
      return;
    }

    const quantity = Number(values.quantity);
    const unitPrice = Number(values.unit_price);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Số lượng nhập phải lớn hơn 0');
      return;
    }

    setSubmitting(true);
    try {
      const today = getTodayDateString();
      const rawNotes = values.notes?.trim() || '';
      const finalNotes =
        values.import_date && values.import_date !== today
          ? `[Ngày nhập: ${formatDate(values.import_date)}]${rawNotes ? ` ${rawNotes}` : ''}`
          : rawNotes;

      await productService.addInventoryTransaction({
        group_id: groupId,
        product_id: values.product_id,
        type: 'import',
        quantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        supplier_id: selectedProduct?.supplier_id || null,
        reference_id: null,
        reference_type: null,
        notes: finalNotes || null,
        attachment_url: null,
        performed_by: user.id,
      });

      toast.success(
        'Nhập kho thành công',
        `Đã nhập ${formatNumber(quantity)} ${selectedProduct?.unit || 'SP'} "${
          selectedProduct?.name || ''
        }"`
      );
      importModal.close();
      await loadProductsAndStats();
      await loadTransactions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại';
      toast.error('Nhập kho thất bại', message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(
    typeFilter || debouncedProductSearch || dateFrom || dateTo
  );

  const handleResetFilters = () => {
    setTypeFilter('');
    setProductSearch('');
    setDebouncedProductSearch('');
    setDateFrom('');
    setDateTo('');
    goToPage(1);
  };

  if (!groupId && !loading) {
    return (
      <EmptyState
        title="Chưa tham gia nhóm"
        description="Bạn cần thuộc về một nhóm kinh doanh để quản lý nhập xuất kho."
        icon={<Archive size={28} className="text-gray-400" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header mb-0">
        <div>
          <h1 className="page-title">Quản lý nhập hàng & Tồn kho</h1>
          <p className="page-subtitle">
            Theo dõi biến động nhập xuất kho, giá trị tồn kho và cảnh báo hàng sắp hết
          </p>
        </div>
        <button
          onClick={() => handleOpenImportModal()}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} />
          Nhập hàng mới
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tổng giá trị tồn kho
              </p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 currency">
                {formatCurrency(totalInventoryValue)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {formatNumber(totalStockUnits)} đơn vị hàng trong kho
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <TrendingUp size={20} className="text-teal-600 dark:text-teal-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tổng lượt nhập kho
              </p>
              <p className="mt-1.5 text-2xl font-bold text-secondary currency">
                {formatNumber(importsStats.count)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Tổng giá trị: {formatCurrency(importsStats.totalAmount)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Archive size={20} className="text-secondary" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Sản phẩm sắp hết hàng
              </p>
              <p className="mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400 currency">
                {formatNumber(lowStockProducts.length)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Tồn kho ≤ mức cảnh báo tối thiểu
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      <div className="card p-5 border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Cảnh báo tồn kho thấp ({lowStockProducts.length})
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Các sản phẩm có số lượng tồn kho nhỏ hơn hoặc bằng mức cảnh báo
              </p>
            </div>
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg">
            <Check size={16} />
            <span>Tất cả sản phẩm hiện đều đủ định mức tồn kho an toàn.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            {lowStockProducts.map((product) => {
              const isOut = (product.stock_quantity ?? 0) === 0;
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/10"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                        {product.code}
                      </span>
                      <span
                        className={`badge text-[10px] px-1.5 py-0.5 ${
                          isOut
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {isOut ? 'Hết hàng' : 'Sắp hết'}
                      </span>
                    </div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate mt-0.5">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 currency">
                      Tồn:{' '}
                      <strong className={isOut ? 'text-danger' : 'text-amber-700 dark:text-amber-400'}>
                        {formatNumber(product.stock_quantity)}
                      </strong>{' '}
                      / Cảnh báo: {formatNumber(product.min_stock_alert)} {product.unit}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenImportModal(product)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1 flex-shrink-0 transition-colors"
                  >
                    <Plus size={14} />
                    Nhập
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Product Search */}
          <div className="md:col-span-4">
            <label className="label text-xs">Tìm sản phẩm</label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Tên hoặc mã sản phẩm..."
                className="input pl-9"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-3">
            <label className="label text-xs">Loại giao dịch</label>
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  goToPage(1);
                }}
                className="input appearance-none pr-9"
              >
                <option value="">Tất cả loại</option>
                <option value="import">Nhập kho</option>
                <option value="export">Xuất kho</option>
                <option value="adjustment">Điều chỉnh</option>
                <option value="return">Hoàn trả</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Date From */}
          <div className="md:col-span-2">
            <label className="label text-xs">Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                goToPage(1);
              }}
              className="input"
            />
          </div>

          {/* Date To */}
          <div className="md:col-span-2">
            <label className="label text-xs">Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                goToPage(1);
              }}
              className="input"
            />
          </div>

          {/* Clear filters */}
          <div className="md:col-span-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-secondary w-full flex items-center justify-center gap-1 py-2"
                title="Xóa bộ lọc"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={8} />
      ) : transactions.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Chưa có giao dịch kho nào"
            description={
              hasActiveFilters
                ? 'Không có giao dịch nào khớp với bộ lọc hiện tại.'
                : 'Tạo phiếu nhập hàng đầu tiên để ghi nhận hàng hóa vào kho.'
            }
            icon={<Archive size={28} className="text-gray-400" />}
            action={
              !hasActiveFilters ? (
                <button
                  onClick={() => handleOpenImportModal()}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nhập hàng mới
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Sản phẩm</th>
                  <th>Loại giao dịch</th>
                  <th className="text-right">Số lượng</th>
                  <th className="text-right">Đơn giá</th>
                  <th className="text-right">Thành tiền</th>
                  <th>Ghi chú</th>
                  <th>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const typeInfo = TX_TYPE_MAP[tx.type] || {
                    label: tx.type,
                    colorClass: 'bg-gray-100 text-gray-800',
                  };
                  const isPositive = tx.type === 'import' || tx.type === 'return';

                  return (
                    <React.Fragment key={tx.id}>
                      <tr>
                        <td className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {formatDateTime(tx.created_at)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500">
                              <Package size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                                {tx.products?.name || 'Sản phẩm đã xóa'}
                              </p>
                              {tx.products?.code && (
                                <p className="font-mono text-xs text-gray-400">
                                  {tx.products.code}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <span
                            className={`badge gap-1 px-2.5 py-0.5 text-xs font-medium ${typeInfo.colorClass}`}
                          >
                            {tx.type === 'import' && <ArrowUpCircle size={12} />}
                            {tx.type === 'export' && <ArrowDownCircle size={12} />}
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="text-right currency font-semibold whitespace-nowrap">
                          <span
                            className={
                              isPositive
                                ? 'text-success'
                                : tx.type === 'export'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-gray-700 dark:text-gray-300'
                            }
                          >
                            {isPositive ? '+' : tx.type === 'export' ? '-' : ''}
                            {formatNumber(tx.quantity)}
                          </span>{' '}
                          <span className="text-xs font-normal text-gray-400">
                            {tx.products?.unit || ''}
                          </span>
                        </td>
                        <td className="text-right currency whitespace-nowrap">
                          {formatCurrency(tx.unit_price)}
                        </td>
                        <td className="text-right currency font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {formatCurrency(tx.total_amount)}
                        </td>
                        <td>
                          {tx.notes ? (
                            <div className="flex items-start gap-1.5 max-w-xs">
                              <FileText
                                size={14}
                                className="text-gray-400 mt-0.5 flex-shrink-0"
                              />
                              <span className="text-gray-600 dark:text-gray-300 line-clamp-2">
                                {tx.notes}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">---</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          {tx.profiles?.full_name || tx.profiles?.email || '---'}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
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
      )}

      {/* Add Import Transaction Modal */}
      <Modal
        isOpen={importModal.isOpen}
        onClose={importModal.close}
        title="Tạo phiếu nhập kho"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmitImport)} className="space-y-4">
          {/* Hidden registered input for validation */}
          <input
            type="hidden"
            {...register('product_id', { required: 'Vui lòng chọn sản phẩm nhập kho' })}
          />

          {/* Searchable Product Dropdown */}
          <div ref={dropdownRef} className="relative">
            <label className="label">
              Sản phẩm <span className="text-danger">*</span>
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="input flex items-center justify-between text-left"
            >
              {selectedProduct ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                    {selectedProduct.code}
                  </span>
                  <span className="font-medium truncate">{selectedProduct.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    (Tồn: {formatNumber(selectedProduct.stock_quantity)}{' '}
                    {selectedProduct.unit})
                  </span>
                </div>
              ) : (
                <span className="text-gray-400">-- Tìm và chọn sản phẩm --</span>
              )}
              <ChevronDown
                size={16}
                className={`text-gray-400 flex-shrink-0 transition-transform ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      placeholder="Gõ tên hoặc mã sản phẩm..."
                      className="input pl-8 py-1.5 text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-700">
                  {availableProducts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      Không tìm thấy sản phẩm phù hợp
                    </div>
                  ) : (
                    availableProducts.map((p) => {
                      const isSelected = p.id === selectedProductId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                            isSelected ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                {p.code}
                              </span>
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                {p.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Tồn hiện tại: {formatNumber(p.stock_quantity)} {p.unit} ·
                              Giá vốn: {formatCurrency(p.cost_price)}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={16} className="text-secondary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {errors.product_id && (
              <p className="mt-1 text-xs text-danger">{errors.product_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity */}
            <div>
              <label className="label">
                Số lượng nhập <span className="text-danger">*</span>
              </label>
              <input
                {...register('quantity', {
                  required: 'Vui lòng nhập số lượng',
                  min: { value: 1, message: 'Số lượng phải lớn hơn 0' },
                  valueAsNumber: true,
                })}
                type="number"
                min={1}
                step={1}
                className="input currency"
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-danger">{errors.quantity.message}</p>
              )}
            </div>

            {/* Unit price */}
            <div>
              <label className="label">
                Đơn giá nhập (VNĐ) <span className="text-danger">*</span>
              </label>
              <input
                {...register('unit_price', {
                  required: 'Vui lòng nhập đơn giá',
                  min: { value: 0, message: 'Đơn giá không được âm' },
                  valueAsNumber: true,
                })}
                type="number"
                min={0}
                step="any"
                className="input currency"
              />
              {errors.unit_price && (
                <p className="mt-1 text-xs text-danger">{errors.unit_price.message}</p>
              )}
            </div>

            {/* Import date */}
            <div>
              <label className="label">
                Ngày nhập <span className="text-danger">*</span>
              </label>
              <input
                {...register('import_date', { required: 'Vui lòng chọn ngày nhập' })}
                type="date"
                className="input"
              />
              {errors.import_date && (
                <p className="mt-1 text-xs text-danger">{errors.import_date.message}</p>
              )}
            </div>
          </div>

          {/* Summary preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3.5 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Tổng giá trị phiếu nhập:
              </span>
              <span className="font-bold text-secondary text-base currency">
                {formatCurrency(
                  Math.max(0, watchQuantity) * Math.max(0, watchUnitPrice)
                )}
              </span>
            </div>
            {selectedProduct && (
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Tồn kho sau khi nhập:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 currency">
                  {formatNumber(selectedProduct.stock_quantity)} →{' '}
                  {formatNumber(
                    (selectedProduct.stock_quantity || 0) + Math.max(0, watchQuantity)
                  )}{' '}
                  {selectedProduct.unit}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Ghi chú</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input"
              placeholder="Nhà cung cấp, số hóa đơn, lô hàng, ghi chú thêm..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={importModal.close}
              className="btn-secondary"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2"
            >
              {submitting && <Spinner size="sm" />}
              Xác nhận nhập kho
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
