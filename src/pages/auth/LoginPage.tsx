import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Building2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { toast } from '@/hooks/useToast';
import { Spinner } from '@/components/common/Spinner';

interface AuthFormData {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  remember?: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    defaultValues: { remember: true, role: 'admin' },
  });

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    try {
      if (isRegister) {
        await authService.signUp(data.email, data.password, data.fullName || 'Người dùng', data.role || 'admin');
        toast.success('Đăng ký tài khoản thành công', 'Bạn có thể đăng nhập ngay bây giờ!');
        setIsRegister(false);
        reset();
      } else {
        await signIn(data.email, data.password);
        toast.success('Đăng nhập thành công', 'Chào mừng bạn trở lại!');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác thất bại';
      if (msg.includes('Invalid login credentials')) {
        toast.error('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng');
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Tài khoản chưa xác nhận', 'Vui lòng kiểm tra email để xác nhận tài khoản (hoặc tắt Confirm email trong Supabase)');
      } else {
        toast.error(isRegister ? 'Đăng ký thất bại' : 'Đăng nhập thất bại', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-900 to-secondary flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Building2 size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">GROUP BUSINESS MANAGER</h1>
          <p className="text-blue-200 mt-1 text-sm">Hệ thống quản lý kinh doanh & quỹ nhóm TMĐT</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); reset(); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                !isRegister
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); reset(); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                isRegister
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name for Registration */}
            {isRegister && (
              <div>
                <label className="label">Họ và tên *</label>
                <input
                  {...register('fullName', {
                    required: isRegister ? 'Vui lòng nhập họ tên' : false,
                  })}
                  type="text"
                  className="input"
                  placeholder="Nguyễn Văn A"
                  autoFocus
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label">Email *</label>
              <input
                {...register('email', {
                  required: 'Email là bắt buộc',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email không hợp lệ',
                  },
                })}
                type="email"
                className="input"
                placeholder="email@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label">Mật khẩu *</label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Mật khẩu là bắt buộc',
                    minLength: { value: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Nhập mật khẩu (từ 6 ký tự)"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* Role selection on register */}
            {isRegister && (
              <div>
                <label className="label">Vai trò ban đầu</label>
                <select {...register('role')} className="input text-sm">
                  <option value="admin">Quản trị viên (Admin - Nhóm trưởng)</option>
                  <option value="manager">Quản lý (Manager - Thủ kho/Đơn hàng)</option>
                  <option value="member">Thành viên (Member)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Đăng ký tài khoản đầu tiên làm Quản trị viên để quản lý hệ thống.
                </p>
              </div>
            )}

            {/* Remember & Forgot (Login only) */}
            {!isRegister && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    {...register('remember')}
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ghi nhớ đăng nhập</span>
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-secondary hover:text-blue-700 font-medium"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : isRegister ? (
                <UserPlus size={18} />
              ) : (
                <LogIn size={18} />
              )}
              {loading
                ? isRegister
                  ? 'Đang đăng ký...'
                  : 'Đang đăng nhập...'
                : isRegister
                ? 'Đăng ký tài khoản'
                : 'Đăng nhập'}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            {isRegister
              ? 'Tài khoản đăng ký sẽ tự động kết nối vào nhóm kinh doanh mặc định.'
              : 'Dành riêng cho thành viên nhóm thực hiện dự án Thương mại điện tử.'}
          </p>
        </div>

        {/* Bottom info */}
        <p className="text-center text-blue-200/60 text-xs mt-6">
          © {new Date().getFullYear()} Group Business Manager · Supabase Cloud Connected
        </p>
      </div>
    </div>
  );
}
