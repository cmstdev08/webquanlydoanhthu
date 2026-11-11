import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, ShoppingCart, Eye, CheckCircle2, Clock, Truck,
  CheckCheck, XCircle, RotateCcw, Filter, User, Calendar, Trash2, Printer
} from 'lucide-react';
import { supabase } from '@/config/supabase';
import { orderService } from '@/services/order.service';
import { productService } from '@/services/product.service';
import { memberService } from '@/services/member.service';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUS_MAP, PAYMENT_METHODS } from '@/utils/helpers';
import { Modal, ConfirmModal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { Badge, OrderStatusBadge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDisclosure } from '@/hooks/useDisclosure';
import { toast } from '@/hooks/useToast';
import type { Order, Product, Profile, OrderItem } from '@/types';

interface OrderItemForm {
  productId: string;
  productName: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  discount: number;
  stock: number;
}

export default function OrdersPage() {
  const { profile } = useAuth();
  const groupId = profile?.group_id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Modals
  const createModal = useDisclosure();
  const detailModal = useDisclosure();
  const cancelModal = useDisclosure();
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  // Pagination
  const pagination = usePagination({ total: totalOrders, pageSize: 15 });

  // Create form state
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [membersList, setMembersList] = useState<Profile[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await orderService.getAll(groupId, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setOrders(res.data as any);
      setTotalOrders(res.count);
    } catch (err: any) {
      toast.error('Lỗi tải danh sách đơn hàng', err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, pagination.page, pagination.pageSize, search, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Load helpers for create modal
  useEffect(() => {
    if (groupId) {
      productService.getAll(groupId, { pageSize: 100, status: 'active' }).then((res) => {
        setProductsList(res.data);
      });
      memberService.getGroupMembers(groupId).then((res) => {
        setMembersList(res);
      });
    }
  }, [groupId]);

  const handleOpenCreate = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setPaymentMethod(PAYMENT_METHODS[0]);
    setShippingFee(0);
    setDiscountAmount(0);
    setNotes('');
    setAssignedTo(profile?.id || '');
    setOrderItems([]);
    createModal.open();
  };

  const handleAddProductItem = () => {
    if (!selectedProductToAdd) return;
    const prod = productsList.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;

    const exists = orderItems.find((item) => item.productId === prod.id);
    if (exists) {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === prod.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: prod.id,
          productName: prod.name,
          costPrice: prod.cost_price,
          sellPrice: prod.sell_price,
          quantity: 1,
          discount: 0,
          stock: prod.stock_quantity,
        },
      ]);
    }
    setSelectedProductToAdd('');
  };

  const handleRemoveProductItem = (productId: string) => {
    setOrderItems(orderItems.filter((i) => i.productId !== productId));
  };

  const handleUpdateItemQty = (productId: string, qty: number) => {
    setOrderItems(
      orderItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(qty, item.stock)) }
          : item
      )
    );
  };

  // Calculations
  const subtotal = orderItems.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);
  const totalCost = orderItems.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !profile) return;
    if (orderItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return;
    }

    setSubmitting(true);
    try {
      const orderCode = `DH-${Date.now().toString(36).toUpperCase()}`;
      const newOrder = {
        group_id: groupId,
        order_code: orderCode,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        status: 'pending' as const,
        subtotal,
        discount_amount: discountAmount,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        cost_total: totalCost,
        payment_method: paymentMethod,
        payment_status: 'unpaid' as const,
        assigned_to: assignedTo || null,
        notes: notes || null,
        created_by: profile.id,
        confirmed_at: null,
        delivered_at: null,
      };

      const itemsToInsert = orderItems.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.sellPrice,
        cost_price: i.costPrice,
        discount: i.discount,
        total: i.sellPrice * i.quantity - i.discount,
      }));

      await orderService.create(newOrder, itemsToInsert);
      toast.success('Tạo đơn hàng thành công', `Mã đơn: ${orderCode}`);
      createModal.close();
      loadOrders();
    } catch (err: any) {
      toast.error('Lỗi khi tạo đơn hàng', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (orderId: string) => {
    try {
      const details = await orderService.getById(orderId);
      setSelectedOrder(details);
      detailModal.open();
    } catch (err: any) {
      toast.error('Không thể tải chi tiết đơn hàng', err.message);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await orderService.updateStatus(orderId, newStatus, profile?.id);
      toast.success('Cập nhật trạng thái thành công', `Đơn hàng chuyển sang: ${ORDER_STATUS_MAP[newStatus]?.label}`);
      loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      toast.error('Cập nhật trạng thái thất bại', err.message);
    }
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      await orderService.updateStatus(orderToCancel, 'cancelled', profile?.id);
      toast.success('Đã hủy đơn hàng');
      cancelModal.close();
      setOrderToCancel(null);
      loadOrders();
    } catch (err: any) {
      toast.error('Không thể hủy đơn', err.message);
    }
  };

  const statusTabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending', label: 'Chờ duyệt' },
    { id: 'confirmed', label: 'Đã xác nhận' },
    { id: 'preparing', label: 'Đang chuẩn bị' },
    { id: 'shipping', label: 'Đang giao' },
    { id: 'delivered', label: 'Thành công' },
    { id: 'cancelled', label: 'Đã hủy' },
    { id: 'returned', label: 'Hoàn trả' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Quản lý đơn hàng</h1>
          <p className="page-subtitle">Theo dõi quy trình bán hàng, xử lý đơn và doanh số</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Tạo đơn hàng
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin border-b border-gray-200 dark:border-gray-700">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.id
                ? 'bg-secondary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên hoặc SĐT khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={32} className="text-gray-400" />}
            title="Chưa có đơn hàng nào"
            description="Tạo đơn hàng mới để bắt đầu theo dõi hoạt động kinh doanh"
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>SĐT</th>
                  <th>Tổng tiền</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Người phụ trách</th>
                  <th>Ngày tạo</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-semibold text-secondary">{o.order_code}</td>
                    <td>{o.customer_name || 'Khách vãng lai'}</td>
                    <td>{o.customer_phone || '---'}</td>
                    <td className="font-semibold currency text-gray-900 dark:text-gray-100">
                      {formatCurrency(o.total_amount)}
                    </td>
                    <td>
                      <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {o.payment_method || 'Tiền mặt'}
                      </span>
                    </td>
                    <td>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td>
                      <span className="text-sm font-medium">
                        {(o as any).profiles?.full_name || 'Chưa gán'}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{formatDate(o.created_at)}</td>
                    <td className="text-right space-x-2">
                      <button
                        onClick={() => handleViewDetail(o.id)}
                        className="btn-ghost p-1.5"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      {o.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'confirmed')}
                          className="text-xs btn-primary py-1 px-2.5"
                        >
                          Duyệt đơn
                        </button>
                      )}
                      {o.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'preparing')}
                          className="text-xs btn-secondary py-1 px-2.5"
                        >
                          Chuẩn bị
                        </button>
                      )}
                      {o.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'shipping')}
                          className="text-xs btn-secondary py-1 px-2.5"
                        >
                          Giao hàng
                        </button>
                      )}
                      {o.status === 'shipping' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'delivered')}
                          className="text-xs bg-success hover:bg-green-700 text-white font-medium py-1 px-2.5 rounded-lg"
                        >
                          Hoàn thành
                        </button>
                      )}
                      {!['delivered', 'cancelled', 'returned'].includes(o.status) && (
                        <button
                          onClick={() => {
                            setOrderToCancel(o.id);
                            cancelModal.open();
                          }}
                          className="text-xs text-danger hover:underline py-1 px-1.5"
                        >
                          Hủy
                        </button>
                      )}
                    </td>
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

      {/* Modal Create Order */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title="Tạo đơn hàng mới" size="xl">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Tên khách hàng</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Số điện thoại</label>
              <input
                type="text"
                placeholder="0987654321"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phương thức thanh toán</label>
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
          </div>

          <div>
            <label className="label">Địa chỉ giao hàng</label>
            <input
              type="text"
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành..."
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="input"
            />
          </div>

          {/* Add product section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <label className="label font-semibold">Chọn sản phẩm</label>
            <div className="flex gap-2">
              <select
                value={selectedProductToAdd}
                onChange={(e) => setSelectedProductToAdd(e.target.value)}
                className="input flex-1"
              >
                <option value="">-- Chọn sản phẩm để thêm --</option>
                {productsList.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                    {p.name} ({p.code}) - Giá: {formatCurrency(p.sell_price)} - Còn: {p.stock_quantity}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProductItem}
                disabled={!selectedProductToAdd}
                className="btn-primary"
              >
                Thêm
              </button>
            </div>

            {/* Selected items table */}
            {orderItems.length > 0 && (
              <div className="table-wrapper bg-white dark:bg-gray-800 mt-2">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Đơn giá</th>
                      <th className="w-24">Số lượng</th>
                      <th>Thành tiền</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="font-medium">{item.productName}</td>
                        <td className="currency">{formatCurrency(item.sellPrice)}</td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemQty(item.productId, parseInt(e.target.value) || 1)
                            }
                            className="input py-1 px-2 text-xs w-20"
                          />
                        </td>
                        <td className="font-semibold currency">
                          {formatCurrency(item.sellPrice * item.quantity)}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemoveProductItem(item.productId)}
                            className="text-danger hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Giảm giá (VNĐ)</label>
              <input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phí vận chuyển (VNĐ)</label>
              <input
                type="number"
                min={0}
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Giao cho thành viên phụ trách</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="input"
              >
                <option value="">-- Chọn thành viên --</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ghi chú đơn hàng</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Giao hàng buổi sáng, lưu ý đặc biệt..."
                className="input"
              />
            </div>
          </div>

          {/* Total summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex justify-between items-center text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-300">Tạm tính: {formatCurrency(subtotal)}</p>
              <p className="text-gray-600 dark:text-gray-300">Giảm giá: -{formatCurrency(discountAmount)} | Vận chuyển: +{formatCurrency(shippingFee)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase">Tổng thanh toán</span>
              <p className="text-xl font-bold text-secondary currency">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={createModal.close} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal View Detail */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title="Chi tiết đơn hàng"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Printer size={16} />
              In hóa đơn
            </button>
            <button
              type="button"
              onClick={detailModal.close}
              className="btn-primary"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
              <div>
                <span className="text-xs text-gray-500">Mã đơn hàng</span>
                <p className="text-lg font-bold text-secondary">{selectedOrder.order_code}</p>
              </div>
              <OrderStatusBadge status={selectedOrder.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Khách hàng</p>
                <p className="font-medium">{selectedOrder.customer_name || 'Vãng lai'}</p>
                <p className="text-gray-600">{selectedOrder.customer_phone}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedOrder.customer_address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Thanh toán & Phụ trách</p>
                <p className="font-medium">{selectedOrder.payment_method}</p>
                <p className="text-gray-600">Phụ trách: {selectedOrder.profiles?.full_name || 'Chưa gán'}</p>
                <p className="text-xs text-gray-500 mt-1">Ngày tạo: {formatDateTime(selectedOrder.created_at)}</p>
              </div>
            </div>

            {/* Items */}
            <div className="table-wrapper">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.order_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.products?.name || 'Sản phẩm'}</td>
                      <td className="currency">{formatCurrency(item.unit_price)}</td>
                      <td>{item.quantity}</td>
                      <td className="currency font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-right space-y-1 text-sm">
              <p>Tạm tính: <span className="font-semibold">{formatCurrency(selectedOrder.subtotal)}</span></p>
              <p>Giảm giá: <span className="text-danger">-{formatCurrency(selectedOrder.discount_amount)}</span></p>
              <p>Phí ship: <span>+{formatCurrency(selectedOrder.shipping_fee)}</span></p>
              <p className="text-base font-bold text-secondary pt-1 border-t border-gray-200 dark:border-gray-700">
                Tổng cộng: {formatCurrency(selectedOrder.total_amount)}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cancel Confirmation */}
      <ConfirmModal
        isOpen={cancelModal.isOpen}
        onClose={cancelModal.close}
        onConfirm={confirmCancelOrder}
        title="Xác nhận hủy đơn hàng"
        message="Bạn có chắc chắn muốn hủy đơn hàng này không? Nếu đơn đã được xác nhận trước đó, số lượng tồn kho sẽ được hoàn lại tự động."
        confirmLabel="Hủy đơn ngay"
        variant="danger"
      />
    </div>
  );
}
