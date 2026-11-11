import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  Eye,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/config/supabase';
import { productService } from '@/services/product.service';
import { categoryService } from '@/services/category.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePagination } from '@/hooks/usePagination';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  generateProductCode,
} from '@/utils/helpers';
import { Modal, ConfirmModal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonTable } from '@/components/common/Skeleton';
import { Spinner } from '@/components/common/Spinner';
import type { Category, ProductWithCategory } from '@/types';

interface ProductFormValues {
  code: string;
  name: string;
  category_id: string;
  description: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  status: 'active' | 'inactive' | 'discontinued';
  image_url: string;
}

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Mới nhất' },
  { value: 'created_at:asc', label: 'Cũ nhất' },
  { value: 'name:asc', label: 'Tên A → Z' },
  { value: 'name:desc', label: 'Tên Z → A' },
  { value: 'sell_price:asc', label: 'Giá bán tăng dần' },
  { value: 'sell_price:desc', label: 'Giá bán giảm dần' },
  { value: 'stock_quantity:asc', label: 'Tồn kho thấp → cao' },
  { value: 'stock_quantity:desc', label: 'Tồn kho cao → thấp' },
];

const STATUS_BADGE_MAP: Record<
  string,
  { label: string; variant: 'success' | 'gray' | 'danger' }
> = {
  active: { label: 'Đang bán', variant: 'success' },
  inactive: { label: 'Tạm ngừng', variant: 'gray' },
  discontinued: { label: 'Ngừng KD', variant: 'danger' },
};

export default function ProductsPage() {
  const { user, profile } = useAuth();
  const groupId = profile?.group_id;

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOption, setSortOption] = useState('created_at:desc');

  // Selected items & modals
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductWithCategory | null>(null);
  const [deactivatingProduct, setDeactivatingProduct] = useState<ProductWithCategory | null>(null);

  const formModal = useDisclosure();
  const viewModal = useDisclosure();
  const deactivateModal = useDisclosure();

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
  } = useForm<ProductFormValues>({
    defaultValues: {
      code: '',
      name: '',
      category_id: '',
      description: '',
      unit: 'Cái',
      cost_price: 0,
      sell_price: 0,
      stock_quantity: 0,
      min_stock_alert: 5,
      status: 'active',
      image_url: '',
    },
  });

  const watchCostPrice = Number(watch('cost_price') || 0);
  const watchSellPrice = Number(watch('sell_price') || 0);
  const watchImageUrl = watch('image_url');

  // Debounce search input
  useEffect(() => {
    if (isFirstSearchRef.current) {
      isFirstSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      goToPageRef.current(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!groupId) return;
    try {
      const data = await categoryService.getAll(groupId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [groupId]);

  // Load summary metrics across all group products
  const loadSummary = useCallback(async () => {
    if (!groupId) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, status, stock_quantity, min_stock_alert')
        .eq('group_id', groupId);

      if (error) throw error;
      const rows = (data || []) as any[];
      setSummary({
        total: rows.length,
        active: rows.filter((p) => p.status === 'active').length,
        lowStock: rows.filter(
          (p) => p.status === 'active' && (p.stock_quantity ?? 0) <= (p.min_stock_alert ?? 0)
        ).length,
      });
    } catch (err) {
      console.error('Failed to load product summary:', err);
    }
  }, [groupId]);

  // Load paginated products
  const loadProducts = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [sortBy, sortDir] = sortOption.split(':') as [string, 'asc' | 'desc'];
      const { data, count } = await productService.getAll(groupId, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: debouncedSearch.trim() || undefined,
        categoryId: categoryFilter || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortDir,
      });
      setProducts(data as ProductWithCategory[]);
      setTotalCount(count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại';
      toast.error('Không thể tải danh sách sản phẩm', message);
    } finally {
      setLoading(false);
    }
  }, [
    groupId,
    pagination.page,
    pagination.pageSize,
    debouncedSearch,
    categoryFilter,
    statusFilter,
    sortOption,
  ]);

  useEffect(() => {
    loadCategories();
    loadSummary();
  }, [loadCategories, loadSummary]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    reset({
      code: generateProductCode(),
      name: '',
      category_id: '',
      description: '',
      unit: 'Cái',
      cost_price: 0,
      sell_price: 0,
      stock_quantity: 0,
      min_stock_alert: 5,
      status: 'active',
      image_url: '',
    });
    formModal.open();
  };

  const handleOpenEdit = (product: ProductWithCategory) => {
    setEditingProduct(product);
    reset({
      code: product.code,
      name: product.name,
      category_id: product.category_id || '',
      description: product.description || '',
      unit: product.unit || 'Cái',
      cost_price: product.cost_price ?? 0,
      sell_price: product.sell_price ?? 0,
      stock_quantity: product.stock_quantity ?? 0,
      min_stock_alert: product.min_stock_alert ?? 0,
      status: product.status || 'active',
      image_url: product.image_url || '',
    });
    formModal.open();
  };

  const handleOpenView = (product: ProductWithCategory) => {
    setViewingProduct(product);
    viewModal.open();
  };

  const handleOpenDeactivate = (product: ProductWithCategory) => {
    setDeactivatingProduct(product);
    deactivateModal.open();
  };

  const onSubmitForm = async (values: ProductFormValues) => {
    if (!groupId || !user) {
      toast.error('Thiếu thông tin nhóm hoặc tài khoản');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        category_id: values.category_id || null,
        description: values.description?.trim() || null,
        unit: values.unit.trim() || 'Cái',
        cost_price: Number(values.cost_price) || 0,
        sell_price: Number(values.sell_price) || 0,
        stock_quantity: Number(values.stock_quantity) || 0,
        min_stock_alert: Number(values.min_stock_alert) || 0,
        status: values.status,
        image_url: values.image_url?.trim() || null,
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, payload);
        toast.success('Cập nhật thành công', `Đã cập nhật sản phẩm "${payload.name}"`);
      } else {
        await productService.create({
          ...payload,
          group_id: groupId,
          supplier_id: null,
          created_by: user.id,
        });
        toast.success('Thêm sản phẩm thành công', `Đã tạo sản phẩm "${payload.name}"`);
      }

      formModal.close();
      await Promise.all([loadProducts(), loadSummary()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      toast.error(
        editingProduct ? 'Cập nhật sản phẩm thất bại' : 'Thêm sản phẩm thất bại',
        message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingProduct) return;
    setSubmitting(true);
    try {
      await productService.deactivate(deactivatingProduct.id);
      toast.success(
        'Đã ngừng bán sản phẩm',
        `"${deactivatingProduct.name}" đã chuyển sang trạng thái tạm ngừng`
      );
      deactivateModal.close();
      setDeactivatingProduct(null);
      await Promise.all([loadProducts(), loadSummary()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại';
      toast.error('Thao tác thất bại', message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeCategories = categories.filter((c) => c.status === 'active');

  if (!groupId && !loading) {
    return (
      <EmptyState
        title="Chưa tham gia nhóm"
        description="Bạn cần thuộc về một nhóm kinh doanh để quản lý sản phẩm."
        icon={<Package size={28} className="text-gray-400" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header mb-0">
        <div>
          <h1 className="page-title">Quản lý sản phẩm</h1>
          <p className="page-subtitle">
            Theo dõi danh sách hàng hóa, giá vốn, giá bán và định mức tồn kho
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} />
          Thêm sản phẩm
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tổng sản phẩm
              </p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 currency">
                {formatNumber(summary.total)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Tất cả mặt hàng trong hệ thống
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package size={20} className="text-secondary" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Đang hoạt động
              </p>
              <p className="mt-1.5 text-2xl font-bold text-success currency">
                {formatNumber(summary.active)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Sản phẩm đang mở bán
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Package size={20} className="text-success" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Sắp hết hàng
              </p>
              <p className="mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400 currency">
                {formatNumber(summary.lowStock)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Đang bán có tồn ≤ mức cảnh báo
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên sản phẩm..."
              className="input pl-9"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3 relative">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                goToPage(1);
              }}
              className="input appearance-none pr-9"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                goToPage(1);
              }}
              className="input appearance-none pr-9"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Tạm ngừng</option>
              <option value="discontinued">Ngừng kinh doanh</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3 relative">
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                goToPage(1);
              }}
              className="input appearance-none pr-9"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sắp xếp: {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={10} />
      ) : products.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description={
              debouncedSearch || categoryFilter || statusFilter
                ? 'Không có sản phẩm nào phù hợp với bộ lọc hiện tại.'
                : 'Bắt đầu thêm sản phẩm đầu tiên để quản lý kho và đơn hàng.'
            }
            icon={<Package size={28} className="text-gray-400" />}
            action={
              !debouncedSearch && !categoryFilter && !statusFilter ? (
                <button
                  onClick={handleOpenAdd}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  Thêm sản phẩm
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
                  <th className="w-12">Ảnh</th>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th className="text-right">Giá vốn</th>
                  <th className="text-right">Giá bán</th>
                  <th className="text-right">Tồn kho</th>
                  <th className="text-right">Cảnh báo</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isLowStock =
                    (product.stock_quantity ?? 0) <= (product.min_stock_alert ?? 0);
                  const statusInfo = STATUS_BADGE_MAP[product.status] || {
                    label: product.status,
                    variant: 'gray' as const,
                  };

                  return (
                    <tr
                      key={product.id}
                      className={
                        isLowStock
                          ? 'bg-yellow-50/90 dark:bg-yellow-900/20 hover:!bg-yellow-100/80 dark:hover:!bg-yellow-900/30'
                          : undefined
                      }
                    >
                      <td>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-8 h-8 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                            <Package size={16} />
                          </div>
                        )}
                      </td>
                      <td className="font-mono text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {product.code}
                      </td>
                      <td>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px]">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {product.categories?.name ? (
                          <Badge variant="info">{product.categories.name}</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">Chưa phân loại</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{product.unit}</td>
                      <td className="text-right currency whitespace-nowrap">
                        {formatCurrency(product.cost_price)}
                      </td>
                      <td className="text-right currency font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatCurrency(product.sell_price)}
                      </td>
                      <td className="text-right currency font-semibold whitespace-nowrap">
                        <span
                          className={
                            isLowStock
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }
                        >
                          {formatNumber(product.stock_quantity)}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 currency">
                          {isLowStock && (
                            <span title="Tồn kho thấp hơn hoặc bằng mức cảnh báo">
                              <AlertTriangle
                                size={15}
                                className="text-amber-500 flex-shrink-0"
                              />
                            </span>
                          )}
                          <span>{formatNumber(product.min_stock_alert)}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenView(product)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-secondary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-secondary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit size={16} />
                          </button>
                          {product.status !== 'inactive' && (
                            <button
                              onClick={() => handleOpenDeactivate(product)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Ngừng bán"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="label">
                Mã sản phẩm <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  {...register('code', { required: 'Mã sản phẩm là bắt buộc' })}
                  type="text"
                  className="input font-mono"
                  placeholder="SP-XXXXXX"
                />
                {!editingProduct && (
                  <button
                    type="button"
                    onClick={() => setValue('code', generateProductCode())}
                    className="btn-secondary px-3 flex-shrink-0"
                    title="Tạo mã mới"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
              {errors.code && (
                <p className="mt-1 text-xs text-danger">{errors.code.message}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="label">
                Tên sản phẩm <span className="text-danger">*</span>
              </label>
              <input
                {...register('name', { required: 'Tên sản phẩm là bắt buộc' })}
                type="text"
                className="input"
                placeholder="Nhập tên sản phẩm"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="label">Danh mục</label>
              <div className="relative">
                <select {...register('category_id')} className="input appearance-none pr-9">
                  <option value="">-- Chọn danh mục --</option>
                  {(editingProduct ? categories : activeCategories).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                      {cat.status === 'inactive' ? ' (Đang ẩn)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Unit */}
            <div>
              <label className="label">
                Đơn vị tính <span className="text-danger">*</span>
              </label>
              <input
                {...register('unit', { required: 'Đơn vị tính là bắt buộc' })}
                type="text"
                className="input"
                placeholder="Cái, Hộp, Kg..."
              />
              {errors.unit && (
                <p className="mt-1 text-xs text-danger">{errors.unit.message}</p>
              )}
            </div>

            {/* Cost Price */}
            <div>
              <label className="label">
                Giá vốn (VNĐ) <span className="text-danger">*</span>
              </label>
              <input
                {...register('cost_price', {
                  required: 'Vui lòng nhập giá vốn',
                  min: { value: 0, message: 'Giá vốn không được âm' },
                  valueAsNumber: true,
                })}
                type="number"
                min={0}
                step="1000"
                className="input currency"
              />
              {errors.cost_price && (
                <p className="mt-1 text-xs text-danger">{errors.cost_price.message}</p>
              )}
            </div>

            {/* Sell Price */}
            <div>
              <label className="label">
                Giá bán (VNĐ) <span className="text-danger">*</span>
              </label>
              <input
                {...register('sell_price', {
                  required: 'Vui lòng nhập giá bán',
                  min: { value: 0, message: 'Giá bán không được âm' },
                  valueAsNumber: true,
                })}
                type="number"
                min={0}
                step="1000"
                className="input currency"
              />
              {errors.sell_price && (
                <p className="mt-1 text-xs text-danger">{errors.sell_price.message}</p>
              )}
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="label">Số lượng tồn kho</label>
              <input
                {...register('stock_quantity', {
                  min: { value: 0, message: 'Tồn kho không được âm' },
                  valueAsNumber: true,
                })}
                type="number"
                min={0}
                className="input currency"
              />
              {errors.stock_quantity && (
                <p className="mt-1 text-xs text-danger">
                  {errors.stock_quantity.message}
                </p>
              )}
            </div>

            {/* Min Stock Alert */}
            <div>
              <label className="label">Mức cảnh báo tồn kho tối thiểu</label>
              <input
                {...register('min_stock_alert', {
                  min: { value: 0, message: 'Giá trị không được âm' },
                  valueAsNumber: true,
                })}
                type="number"
                min={0}
                className="input currency"
              />
              {errors.min_stock_alert && (
                <p className="mt-1 text-xs text-danger">
                  {errors.min_stock_alert.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="label">Trạng thái</label>
              <div className="relative">
                <select {...register('status')} className="input appearance-none pr-9">
                  <option value="active">Đang bán</option>
                  <option value="inactive">Tạm ngừng</option>
                  <option value="discontinued">Ngừng kinh doanh</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="label">URL hình ảnh (tùy chọn)</label>
              <div className="flex items-center gap-2">
                <input
                  {...register('image_url')}
                  type="url"
                  className="input"
                  placeholder="https://..."
                />
                {watchImageUrl && (
                  <img
                    src={watchImageUrl}
                    alt="Preview"
                    className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Profit preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              Lợi nhuận dự kiến / sản phẩm:
            </span>
            <span
              className={`font-semibold currency ${
                watchSellPrice - watchCostPrice >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {formatCurrency(watchSellPrice - watchCostPrice)}
              {watchSellPrice > 0
                ? ` (${(((watchSellPrice - watchCostPrice) / watchSellPrice) * 100).toFixed(1)}%)`
                : ''}
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="label">Mô tả sản phẩm</label>
            <textarea
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Mô tả chi tiết về quy cách, xuất xứ, ghi chú..."
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={formModal.close}
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
              {editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Product Detail Modal */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title="Chi tiết sản phẩm"
        size="lg"
      >
        {viewingProduct && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              {viewingProduct.image_url ? (
                <img
                  src={viewingProduct.image_url}
                  alt={viewingProduct.name}
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                  <Package size={32} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {viewingProduct.code}
                  </span>
                  <Badge
                    variant={STATUS_BADGE_MAP[viewingProduct.status]?.variant || 'gray'}
                  >
                    {STATUS_BADGE_MAP[viewingProduct.status]?.label ||
                      viewingProduct.status}
                  </Badge>
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {viewingProduct.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Danh mục: {viewingProduct.categories?.name || 'Chưa phân loại'} · Đơn vị:{' '}
                  {viewingProduct.unit}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Giá vốn</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 currency mt-1">
                  {formatCurrency(viewingProduct.cost_price)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Giá bán</p>
                <p className="font-semibold text-secondary currency mt-1">
                  {formatCurrency(viewingProduct.sell_price)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Tồn kho</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 currency mt-1">
                  {formatNumber(viewingProduct.stock_quantity)} {viewingProduct.unit}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Mức cảnh báo</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 currency mt-1">
                  {formatNumber(viewingProduct.min_stock_alert)} {viewingProduct.unit}
                </p>
              </div>
            </div>

            {viewingProduct.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Mô tả
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {viewingProduct.description}
                </p>
              </div>
            )}

            <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <span>Ngày tạo: {formatDateTime(viewingProduct.created_at)}</span>
              <span>Cập nhật: {formatDateTime(viewingProduct.updated_at)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={viewModal.close} className="btn-secondary">
                Đóng
              </button>
              <button
                onClick={() => {
                  viewModal.close();
                  handleOpenEdit(viewingProduct);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Edit size={16} />
                Chỉnh sửa
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate Confirm Modal */}
      <ConfirmModal
        isOpen={deactivateModal.isOpen}
        onClose={deactivateModal.close}
        onConfirm={handleConfirmDeactivate}
        title="Xác nhận ngừng bán sản phẩm"
        message={`Bạn có chắc chắn muốn ngừng bán sản phẩm "${deactivatingProduct?.name || ''}"? Trạng thái sản phẩm sẽ được chuyển sang Tạm ngừng.`}
        confirmLabel="Ngừng bán"
        cancelLabel="Hủy"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}
