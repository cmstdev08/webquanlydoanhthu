import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Key, User, Bell, Shield, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { toast } from '@/hooks/useToast';
import { Avatar } from '@/components/common/Avatar';
import { Spinner } from '@/components/common/Spinner';
import { clsx } from 'clsx';

interface ProfileFormData {
  full_name: string;
  phone: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type SettingsTab = 'profile' | 'password' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const { profile, updateProfile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (data: ProfileFormData) => {
    setSavingProfile(true);
    try {
      let avatarUrl = profile?.avatar_url;
      if (avatarFile && user) {
        avatarUrl = await authService.uploadAvatar(user.id, avatarFile);
      }
      await updateProfile({ ...data, avatar_url: avatarUrl });
      toast.success('Cập nhật thành công', 'Thông tin cá nhân đã được lưu');
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      toast.error('Cập nhật thất bại', err instanceof Error ? err.message : 'Vui lòng thử lại');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError('confirmPassword', { message: 'Mật khẩu xác nhận không khớp' });
      return;
    }
    setSavingPassword(true);
    try {
      await authService.updatePassword(data.newPassword);
      toast.success('Đổi mật khẩu thành công', 'Vui lòng sử dụng mật khẩu mới trong lần đăng nhập tiếp theo');
      passwordForm.reset();
    } catch (err) {
      toast.error('Đổi mật khẩu thất bại', err instanceof Error ? err.message : 'Vui lòng thử lại');
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Hồ sơ cá nhân', icon: <User size={16} /> },
    { id: 'password', label: 'Đổi mật khẩu', icon: <Key size={16} /> },
    { id: 'notifications', label: 'Thông báo', icon: <Bell size={16} /> },
    { id: 'appearance', label: 'Giao diện', icon: <Palette size={16} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="page-header">
        <h1 className="page-title">Cài đặt</h1>
        <p className="page-subtitle">Quản lý tài khoản và cấu hình hệ thống của bạn</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar tabs */}
        <nav className="md:w-56 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-secondary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Hồ sơ cá nhân</h2>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Avatar
                    src={avatarPreview || profile?.avatar_url}
                    name={profile?.full_name}
                    size="xl"
                  />
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-secondary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                    <User size={12} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{profile?.full_name || 'Chưa cập nhật'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Nhấn vào ảnh để thay đổi</p>
                </div>
              </div>

              <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Họ và tên</label>
                    <input
                      {...profileForm.register('full_name', { required: 'Vui lòng nhập họ tên' })}
                      className="input"
                      placeholder="Nguyễn Văn A"
                    />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-xs text-danger mt-1">{profileForm.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Số điện thoại</label>
                    <input
                      {...profileForm.register('phone')}
                      className="input"
                      placeholder="0901234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <input value={user?.email || ''} className="input bg-gray-50 dark:bg-gray-700" disabled />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email không thể thay đổi</p>
                </div>

                <div>
                  <label className="label">Vai trò</label>
                  <input value={profile?.role === 'admin' ? 'Quản trị viên' : profile?.role === 'manager' ? 'Quản lý' : 'Thành viên'} className="input bg-gray-50 dark:bg-gray-700" disabled />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className="btn-primary flex items-center gap-2" disabled={savingProfile}>
                    {savingProfile ? <Spinner size="sm" /> : null}
                    {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Shield size={20} className="text-secondary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Đổi mật khẩu</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật mật khẩu tài khoản của bạn</p>
                </div>
              </div>

              <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                <div>
                  <label className="label">Mật khẩu mới</label>
                  <input
                    {...passwordForm.register('newPassword', {
                      required: 'Vui lòng nhập mật khẩu mới',
                      minLength: { value: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                    })}
                    type="password"
                    className="input"
                    placeholder="Ít nhất 8 ký tự"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-danger mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Xác nhận mật khẩu mới</label>
                  <input
                    {...passwordForm.register('confirmPassword', { required: 'Vui lòng xác nhận mật khẩu' })}
                    type="password"
                    className="input"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-danger mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    ⚠️ Sau khi đổi mật khẩu, bạn sẽ cần đăng nhập lại trên tất cả thiết bị.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className="btn-primary flex items-center gap-2" disabled={savingPassword}>
                    {savingPassword ? <Spinner size="sm" /> : null}
                    {savingPassword ? 'Đang lưu...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Cài đặt thông báo</h2>
              <div className="space-y-4">
                {[
                  { key: 'new_order', label: 'Đơn hàng mới', desc: 'Nhận thông báo khi có đơn hàng mới được tạo' },
                  { key: 'order_status', label: 'Cập nhật trạng thái đơn hàng', desc: 'Nhận thông báo khi trạng thái đơn hàng thay đổi' },
                  { key: 'low_stock', label: 'Cảnh báo hàng sắp hết', desc: 'Nhận thông báo khi sản phẩm sắp hết hàng' },
                  { key: 'fund_request', label: 'Yêu cầu chi quỹ', desc: 'Nhận thông báo khi có yêu cầu chi quỹ cần duyệt' },
                  { key: 'expense_request', label: 'Yêu cầu chi phí', desc: 'Nhận thông báo khi có yêu cầu chi phí mới' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-secondary" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Giao diện</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Chủ đề màu sắc</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {[
                      { label: 'Sáng (Light)', value: 'light' },
                      { label: 'Tối (Dark)', value: 'dark' },
                      { label: 'Hệ thống', value: 'system' },
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-secondary transition-colors"
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Ngôn ngữ</label>
                  <select className="input">
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
