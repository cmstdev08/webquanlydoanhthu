import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { KeyRound, ArrowLeft, Building2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { toast } from '@/hooks/useToast';
import { Spinner } from '@/components/common/Spinner';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>();

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword(data.password);
      toast.success('Đặt lại mật khẩu thành công', 'Vui lòng đăng nhập bằng mật khẩu mới');
      navigate('/auth/login');
    } catch (err: unknown) {
      toast.error('Đặt lại mật khẩu thất bại', err instanceof Error ? err.message : 'Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-900 to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg mb-4">
            <Building2 size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-white">GROUP BUSINESS MANAGER</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <KeyRound size={20} className="text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Đặt lại mật khẩu mới</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nhập mật khẩu mới cho tài khoản của bạn</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Mật khẩu mới</label>
              <input
                {...register('password', {
                  required: 'Vui lòng nhập mật khẩu mới',
                  minLength: { value: 6, message: 'Mật khẩu phải từ 6 ký tự' },
                })}
                type="password"
                className="input"
                placeholder="Ít nhất 6 ký tự"
                autoFocus
              />
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Xác nhận mật khẩu mới</label>
              <input
                {...register('confirmPassword', {
                  required: 'Vui lòng nhập lại mật khẩu',
                  validate: (val) => val === watch('password') || 'Mật khẩu xác nhận không khớp',
                })}
                type="password"
                className="input"
                placeholder="Nhập lại mật khẩu mới"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>

          <div className="mt-6 flex justify-center">
            <Link
              to="/auth/login"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
