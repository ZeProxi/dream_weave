'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 10);

    // Auto remove
    const timer = setTimeout(() => {
      setIsRemoving(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getToastStyles = () => {
    const baseStyles = {
      transform: isRemoving ? 'translateX(100%)' : isVisible ? 'translateX(0)' : 'translateX(100%)',
      opacity: isRemoving ? 0 : isVisible ? 1 : 0,
      transition: 'all 0.3s ease-in-out',
    };

    switch (toast.type) {
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: 'var(--color-success-green)',
          borderColor: '#059669',
          color: 'white'
        };
      case 'error':
        return {
          ...baseStyles,
          backgroundColor: 'var(--color-error-red)',
          borderColor: '#dc2626',
          color: 'white'
        };
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: 'var(--color-warning-yellow)',
          borderColor: '#d97706',
          color: '#1a1b2e'
        };
      case 'info':
        return {
          ...baseStyles,
          backgroundColor: 'var(--color-accent-cyan)',
          borderColor: '#0891b2',
          color: 'white'
        };
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div
      className="mb-3 p-4 rounded-lg border shadow-lg flex items-center space-x-3 cursor-pointer"
      style={getToastStyles()}
      onClick={() => {
        setIsRemoving(true);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      <span className="text-xl flex-shrink-0">{getIcon()}</span>
      <p className="font-medium flex-1">{toast.message}</p>
      <button 
        className="text-xl opacity-70 hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setIsRemoving(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
      >
        ×
      </button>
    </div>
  );
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'], duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const contextValue: ToastContextType = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed top-4 right-4 z-50"
        style={{ 
          width: '380px',
          maxWidth: 'calc(100vw - 2rem)'
        }}
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}; 