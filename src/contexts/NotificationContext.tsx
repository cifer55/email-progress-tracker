/**
 * NotificationContext
 * Provides global notification management for toasts, banners, and dialogs
 * Requirements: 6.3, 6.5, 9.1, 9.2, 9.3, 9.5
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from '../components/Toast';
import { Banner, BannerType } from '../components/Banner';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ToastNotification {
  id: string;
  message: string;
  duration?: number;
}

interface BannerNotification {
  id: string;
  type: BannerType;
  message: string;
}

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

interface NotificationContextValue {
  // Toast notifications (success messages)
  showToast: (message: string, duration?: number) => void;
  
  // Banner notifications (warnings and errors)
  showWarning: (message: string) => void;
  showError: (message: string) => void;
  
  // Confirm dialog
  showConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [banners, setBanners] = useState<BannerNotification[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  // Remove toast notification
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Show warning banner
  const showWarning = useCallback((message: string) => {
    const id = `banner-${Date.now()}-${Math.random()}`;
    setBanners((prev) => [...prev, { id, type: 'warning', message }]);
  }, []);

  // Show error banner
  const showError = useCallback((message: string) => {
    const id = `banner-${Date.now()}-${Math.random()}`;
    setBanners((prev) => [...prev, { id, type: 'error', message }]);
  }, []);

  // Remove banner notification
  const removeBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((banner) => banner.id !== id));
  }, []);

  // Show confirm dialog
  const showConfirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ options, resolve });
    });
  }, []);

  // Handle confirm dialog response
  const handleConfirm = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.resolve(true);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const handleCancel = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.resolve(false);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const value: NotificationContextValue = {
    showToast,
    showWarning,
    showError,
    showConfirm,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      
      {/* Render banners */}
      {banners.map((banner) => (
        <Banner
          key={banner.id}
          type={banner.type}
          message={banner.message}
          onClose={() => removeBanner(banner.id)}
        />
      ))}
      
      {/* Render confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.options.title}
          message={confirmDialog.options.message}
          confirmLabel={confirmDialog.options.confirmLabel}
          cancelLabel={confirmDialog.options.cancelLabel}
          isDestructive={confirmDialog.options.isDestructive}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 * Throws error if used outside of NotificationProvider
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
