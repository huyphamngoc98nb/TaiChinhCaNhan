import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { APP_ERROR_TOAST_EVENT } from '@/core/telemetry/error.service';
import { Toast, ToastType } from './Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const MAX_VISIBLE_TOASTS = 3;
let nextToastId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextToastId++;
    setToasts(prev => [...prev, { id, message, type }].slice(-MAX_VISIBLE_TOASTS));
  }, []);

  useEffect(() => {
    const handleAppErrorToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; type?: ToastType }>).detail;
      if (!detail?.message) return;
      showToast(detail.message, detail.type ?? 'error');
    };

    window.addEventListener(APP_ERROR_TOAST_EVENT, handleAppErrorToast);
    return () => window.removeEventListener(APP_ERROR_TOAST_EVENT, handleAppErrorToast);
  }, [showToast]);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div className="toast-wrapper">
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
