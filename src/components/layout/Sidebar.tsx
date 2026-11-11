import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PiggyBank, Wallet, Package, Tags, Archive,
  ShoppingCart, TrendingUp, Receipt, Users, BarChart3, History,
  Settings, ChevronLeft, ChevronRight, LogOut, Building2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/common/Avatar';
import { toast } from '@/hooks/useToast';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { label: 'Vốn góp', icon: <PiggyBank size={18} />, to: '/capital' },
  { label: 'Quỹ chung', icon: <Wallet size={18} />, to: '/fund' },
  { label: 'Sản phẩm', icon: <Package size={18} />, to: '/products' },
  { label: 'Danh mục', icon: <Tags size={18} />, to: '/categories' },
  { label: 'Nhập hàng', icon: <Archive size={18} />, to: '/inventory' },
  { label: 'Đơn hàng', icon: <ShoppingCart size={18} />, to: '/orders' },
  { label: 'Doanh thu', icon: <TrendingUp size={18} />, to: '/revenue' },
  { label: 'Chi phí', icon: <Receipt size={18} />, to: '/expenses' },
  { label: 'Thành viên', icon: <Users size={18} />, to: '/members', roles: ['admin'] },
  { label: 'Báo cáo', icon: <BarChart3 size={18} />, to: '/reports' },
  { label: 'Lịch sử', icon: <History size={18} />, to: '/activity' },
  { label: 'Cài đặt', icon: <Settings size={18} />, to: '/settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/auth/login');
    } catch {
      toast.error('Đăng xuất thất bại');
    } finally {
      setLoggingOut(false);
    }
  };

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(profile?.role || '');
  });

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen z-40 flex flex-col',
        'bg-primary dark:bg-gray-900 shadow-lg',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-blue-900 dark:border-gray-700 min-h-[64px]">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight truncate">GROUP BUSINESS</p>
              <p className="text-blue-300 text-xs truncate">MANAGER</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="ml-auto flex-shrink-0 p-1 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2 space-y-0.5">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                'text-blue-200 hover:text-white hover:bg-blue-800 dark:hover:bg-gray-700',
                isActive && 'bg-secondary text-white shadow-sm',
                collapsed && 'justify-center'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-blue-900 dark:border-gray-700 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Người dùng'}</p>
              <p className="text-blue-300 text-xs capitalize">{profile?.role || 'member'}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="text-blue-300 hover:text-white p-1.5 rounded-lg hover:bg-blue-800 dark:hover:bg-gray-700 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="text-blue-300 hover:text-white p-1.5 rounded-lg hover:bg-blue-800 dark:hover:bg-gray-700 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
