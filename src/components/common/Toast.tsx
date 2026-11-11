import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useToasts } from '@/hooks/useToast';
import type { Toast } from '@/hooks/useToast';
import { toast as toastApi } from '@/hooks/useToast';

function ToastItem({ t }: { t: Toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const icons = {
    success: <CheckCircle size={18} className="text-success flex-shrink-0" />,
    error: <XCircle size={18} className="text-danger flex-shrink-0" />,
    warning: <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />,
    info: <Info size={18} className="text-secondary flex-shrink-0" />,
  };

  const borders = {
    success: 'border-l-4 border-success',
    error: 'border-l-4 border-danger',
    warning: 'border-l-4 border-yellow-400',
    info: 'border-l-4 border-secondary',
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4',
        'border border-gray-200 dark:border-gray-700 w-80 max-w-full',
        borders[t.type],
        'transition-all duration-300',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      )}
    >
      {icons[t.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.title}</p>
        {t.message && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t.message}</p>
        )}
      </div>
      <button
        onClick={() => toastApi.dismiss(t.id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToasts();

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem t={t} />
        </div>
      ))}
    </div>
  );
}
