import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color="#10b981" />;
      case 'error': return <AlertCircle size={20} color="#f43f5e" />;
      case 'info': return <Info size={20} color="#3b82f6" />;
    }
  };

  return (
    <div className={`toast-container toast-${type} ${isVisible ? 'toast-visible' : 'toast-hidden'}`}>
      <div className="toast-icon">{getIcon()}</div>
      <p className="toast-message">{message}</p>
      <button 
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="toast-close"
      >
        <X size={16} />
      </button>
    </div>
  );
};
