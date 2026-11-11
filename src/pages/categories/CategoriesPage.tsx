import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Package,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/config/supabase';
import { categoryService } from '@/services/category.service';
import { useAuth } from '@/contexts/AuthContext';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import { formatDate, formatNumber } from '@/utils/helpers';
import { Modal, ConfirmModal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { SkeletonTable } from '@/components/common/Skeleton';
import { Spinner } from '@/components/common/Spinner';
import type { Category } from '@/types';

interface CategoryFormValues {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

export default function CategoriesPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [countsLoaded, setCountsLoaded] = useState(false);
  const [totalGroupProducts, setTotalGroupProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Selected items & modals
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const formModal = useDisclosure();
  const deleteModal = useDisclosure();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
    },
  });

  const loadCategories = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [categoriesData, productsRes] = await Promise.all([
        categoryService.getAll(groupId),
        supabase
          .from('products')
          .select('id, category_id')
          .eq('group_id', groupId),
      ]);

      setCategories(categoriesData);

      if (!productsRes.error && productsRes.data) {
        const countMap: Record<string, number> = {};
        for (const p of (productsRes.data as any[])) {
          if (p.category_id) {
            countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
          }
        }
        setProductCounts(countMap);
        setTotalGroupProducts(productsRes.data.length);
        setCountsLoaded(true);
      } else {
        setCountsLoaded(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại';
      toast.error('Không thể tải danh sách danh mục', message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const getProductCount = useCallback(
    (category: Category): number => {
      if (countsLoaded) {
        return productCounts[category.id] || 0;
      }
      return category.product_count || 0;
    },
    [countsLoaded, productCounts]
  );

  // Summary counts
  const summary = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.status === 'active').length;
    const inactive = categories.filter((c) => c.status === 'inactive').length;
    const categorizedProducts = categories.reduce(
      (sum, c) => sum + getProductCount(c),
      0
    );
    const totalProducts = countsLoaded ? totalGroupProducts : categorizedProducts;

    return { total, active, inactive, totalProducts };
  }, [categories, countsLoaded, totalGroupProducts, getProductCount]);

  // Filtered list
  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return categories.filter((cat) => {
      if (statusFilter !== 'all' && cat.status !== statusFilter) return false;
      if (q) {
        const matchName = cat.name.toLowerCase().includes(q);
        const matchDesc = (cat.description || '').toLowerCase().includes(q);
        return matchName || matchDesc;
      }
      return true;
    });
  }, [categories, searchTerm, statusFilter]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    reset({
      name: '',
      description: '',
      status: 'active',
    });
    formModal.open();
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      status: category.status,
    });
    formModal.open();
  };

  const handleOpenDelete = (category: Category) => {
    setDeletingCategory(category);
    deleteModal.open();
  };

  const onSubmitForm = async (values: CategoryFormValues) => {
    if (!groupId) {
      toast.error('Thiếu thông tin nhóm kinh doanh');
      return;
    }

    setSubmitting(true);
    try {
      const name = values.name.trim();
      const description = values.description?.trim() || null;

      if (editingCategory) {
        await categoryService.update(editingCategory.id, {
          name,
          description,
          status: values.status,
        });
        toast.success('Cập nhật thành công', `Đã cập nhật danh mục "${name}"`);
      } else {
        await categoryService.create({
          group_id: groupId,
          name,
          description,
          icon: null,
          image_url: null,
          status: values.status,
        });
        toast.success('Thêm danh mục thành công', `Đã tạo danh mục "${name}"`);
      }

      formModal.close();
      await loadCategories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      toast.error(
        editingCategory ? 'Cập nhật danh mục thất bại' : 'Thêm danh mục thất bại',
        message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (category: Category) => {
    const nextStatus: 'active' | 'inactive' =
      category.status === 'active' ? 'inactive' : 'active';
    setTogglingId(category.id);
    try {
      await categoryService.toggleStatus(category.id, nextStatus);
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, status: nextStatus } : c))
      );
      toast.success(
        nextStatus === 'active' ? 'Đã hiển thị danh mục' : 'Đã ẩn danh mục',
        `Danh mục "${category.name}" hiện ${
          nextStatus === 'active' ? 'đang hoạt động' : 'đã bị ẩn'
        }`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại';
      toast.error('Không thể đổi trạng thái', message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setSubmitting(true);
    try {
      await categoryService.delete(deletingCategory.id);
      toast.success(
        'Đã xóa danh mục',
        `Danh mục "${deletingCategory.name}" đã được xóa khỏi hệ thống`
      );
      deleteModal.close();
      setDeletingCategory(null);
      await loadCategories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể xóa danh mục';
      toast.error('Xóa danh mục thất bại', message);
      deleteModal.close();
    } finally {
      setSubmitting(false);
    }
  };

  const deletingProductCount = deletingCategory
    ? getProductCount(deletingCategory)
    : 0;

  if (!groupId && !loading) {
    return (
      <EmptyState
        title="Chưa tham gia nhóm"
        description="Bạn cần thuộc về một nhóm kinh doanh để quản lý danh mục."
        icon={<Tags size={28} className="text-gray-400" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header mb-0">
        <div>
          <h1 className="page-title">Quản lý danh mục</h1>
          <p className="page-subtitle">
            Phân loại nhóm sản phẩm để dễ dàng quản lý và theo dõi bán hàng
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} />
          Thêm danh mục
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tổng danh mục
              </p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 currency">
                {formatNumber(summary.total)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Tags size={20} className="text-secondary" />
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
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Eye size={20} className="text-success" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Đang ẩn
              </p>
              <p className="mt-1.5 text-2xl font-bold text-gray-600 dark:text-gray-300 currency">
                {formatNumber(summary.inactive)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <EyeOff size={20} className="text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tổng sản phẩm
              </p>
              <p className="mt-1.5 text-2xl font-bold text-indigo-600 dark:text-indigo-400 currency">
                {formatNumber(summary.totalProducts)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Package size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm danh mục..."
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg self-start sm:self-auto">
            {(
              [
                { value: 'all', label: 'Tất cả' },
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Đang ẩn' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-white dark:bg-gray-800 text-secondary shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : filteredCategories.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Chưa có danh mục nào"
            description={
              searchTerm || statusFilter !== 'all'
                ? 'Không tìm thấy danh mục phù hợp với điều kiện lọc.'
                : 'Thêm danh mục sản phẩm đầu tiên để sắp xếp hàng hóa khoa học hơn.'
            }
            icon={<Tags size={28} className="text-gray-400" />}
            action={
              !searchTerm && statusFilter === 'all' ? (
                <button
                  onClick={handleOpenAdd}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  Thêm danh mục
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Tên danh mục</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
                <th className="text-right">Số sản phẩm</th>
                <th>Ngày tạo</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => {
                const count = getProductCount(cat);
                const isActive = cat.status === 'active';
                return (
                  <React.Fragment key={cat.id}>
                    <tr>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <Tags size={15} className="text-secondary" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {cat.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="text-gray-600 dark:text-gray-400 line-clamp-2 max-w-md">
                          {cat.description || '---'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <Badge variant={isActive ? 'success' : 'gray'}>
                          {isActive ? 'Đang hoạt động' : 'Đang ẩn'}
                        </Badge>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 currency">
                          {formatNumber(count)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatDate(cat.created_at)}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-secondary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(cat)}
                            disabled={togglingId === cat.id}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                            title={isActive ? 'Ẩn danh mục' : 'Hiện danh mục'}
                          >
                            {isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => handleOpenDelete(cat)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Xóa danh mục"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="label">
              Tên danh mục <span className="text-danger">*</span>
            </label>
            <input
              {...register('name', {
                required: 'Tên danh mục là bắt buộc',
                minLength: { value: 2, message: 'Tên danh mục tối thiểu 2 ký tự' },
              })}
              type="text"
              className="input"
              placeholder="Ví dụ: Điện tử, Thời trang, Gia dụng..."
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="label">Mô tả</label>
            <textarea
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Mô tả ngắn gọn về danh mục sản phẩm..."
            />
          </div>

          <div>
            <label className="label">Trạng thái</label>
            <select {...register('status')} className="input">
              <option value="active">Đang hoạt động (Hiển thị)</option>
              <option value="inactive">Đang ẩn</option>
            </select>
          </div>

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
              {editingCategory ? 'Lưu thay đổi' : 'Thêm danh mục'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa danh mục"
        message={
          deletingProductCount > 0
            ? `⚠️ Cảnh báo: Danh mục "${deletingCategory?.name || ''}" hiện đang có ${deletingProductCount} sản phẩm! Bạn cần chuyển hoặc xóa các sản phẩm này trước khi có thể xóa danh mục.`
            : `Bạn có chắc chắn muốn xóa danh mục "${deletingCategory?.name || ''}"? Hành động này không thể hoàn tác.`
        }
        confirmLabel={deletingProductCount > 0 ? 'Vẫn thử xóa' : 'Xóa danh mục'}
        cancelLabel="Hủy"
        variant="danger"
        loading={submitting}
      />
    </div>
  );
}
