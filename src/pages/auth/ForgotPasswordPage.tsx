import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, Building2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { toast } from '@/hooks/useToast';
import { Spinner } from '@/components/common/Spinner';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      await authService.resetPassword(data.email);
      setSent(true);
    } catch (err: unknown) {
      toast.error('Gửi yêu cầu thất bại', err instanceof Error ? err.message : 'Vui lòng thử lại');
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
          {!sent ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail size={20} className="text-secondary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quên mật khẩu</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nhập email để nhận link đặt lại mật khẩu</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Địa chỉ email</label>
                  <input
                    {...register('email', {
                      required: 'Email là bắt buộc',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email không hợp lệ' },
                    })}
                    type="email"
                    className="input"
                    placeholder="email@example.com"
                    autoFocus
                  />
                  {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Spinner size="sm" /> : null}
                  {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-success" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Email đã được gửi!</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Chúng tôi đã gửi link đặt lại mật khẩu đến{' '}
                <strong>{getValues('email')}</strong>. Vui lòng kiểm tra hộp thư của bạn.
              </p>
            </div>
          )}

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
