import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, Bell, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  description?: string;
  type?: 'success' | 'info' | 'reminder' | 'warning';
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemoveToast: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onRemoveToast }) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      onRemoveToast(latest.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts, onRemoveToast]);

  return (
    <div
      id="toast-notification-center"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            id={`toast-${t.id}`}
            className="pointer-events-auto bg-[#3D3A35] text-[#FDFCF8] p-4 rounded-2xl shadow-xl border border-[#5C574F] flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#8A9A5B]" />}
              {t.type === 'reminder' && <Bell className="w-5 h-5 text-[#C98A4B]" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#D48C70]" />}
              {(!t.type || t.type === 'info') && <Info className="w-5 h-5 text-[#7096D4]" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight">{t.title}</h4>
              {(t.message || t.description) && (
                <p className="text-xs text-[#D4CFC7] mt-0.5 leading-normal">
                  {t.message || t.description}
                </p>
              )}
            </div>
            <button
              id={`dismiss-toast-${t.id}`}
              onClick={() => onRemoveToast(t.id)}
              className="text-[#AFA99E] hover:text-white p-1 rounded-md transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss?: (id: string) => void;
  onRemoveToast?: (id: string) => void;
}> = ({ toasts, onDismiss, onRemoveToast }) => {
  return <Toast toasts={toasts} onRemoveToast={onDismiss || onRemoveToast || (() => {})} />;
};
