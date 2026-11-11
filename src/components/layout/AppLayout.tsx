import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { clsx } from 'clsx';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tổng quan',
  '/capital': 'Quản lý vốn góp',
  '/fund': 'Quỹ chung',
  '/products': 'Sản phẩm',
  '/categories': 'Danh mục sản phẩm',
  '/inventory': 'Nhập hàng',
  '/orders': 'Đơn hàng',
  '/revenue': 'Doanh thu & Lợi nhuận',
  '/expenses': 'Chi phí',
  '/members': 'Thành viên',
  '/reports': 'Báo cáo',
  '/activity': 'Lịch sử hoạt động',
  '/settings': 'Cài đặt',
};

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop always visible, mobile overlay */}
      <div className={clsx('hidden lg:block')}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-40 lg:hidden transition-transform duration-300',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar
          collapsed={false}
          onToggle={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div
        className={clsx(
          'min-h-screen flex flex-col transition-all duration-300',
          'lg:ml-64',
          sidebarCollapsed && 'lg:ml-16'
        )}
      >
        <Header
          onToggleSidebar={() => setMobileSidebarOpen((v) => !v)}
          pageTitle={pageTitle}
        />

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
