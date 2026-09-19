import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { Toast, ToastType } from '../../hooks/useToast';

// Warm palette to match the site: gold-brown for success, red for failure,
// neutral paper for anything informational.
const STYLES: Record<ToastType, { bar: string; icon: string; Icon: typeof Info }> = {
  success: { bar: 'bg-[var(--color-gold)]', icon: 'text-[var(--color-gold)]', Icon: CheckCircle2 },
  error:   { bar: 'bg-red-600',             icon: 'text-red-600',             Icon: AlertCircle },
  info:    { bar: 'bg-[#8a7f66]',           icon: 'text-[#8a7f66]',           Icon: Info },
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    // Above the z-[200] offline banner so a failure is never hidden behind a modal.
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] z-[300] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map(toast => {
          const { bar, icon, Icon } = STYLES[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-stretch bg-white rounded-lg shadow-[0_10px_34px_rgba(0,0,0,0.16)] border border-black/5 overflow-hidden"
            >
              <span className={`w-1 shrink-0 ${bar}`} />
              <div className="flex items-start gap-3 px-4 py-3 flex-1">
                <Icon size={17} className={`${icon} shrink-0 mt-0.5`} />
                <p className="text-sm text-[var(--color-ink)] leading-snug flex-1 break-words">
                  {toast.message}
                </p>
                <button
                  onClick={() => onDismiss(toast.id)}
                  className="shrink-0 text-gray-400 hover:text-[var(--color-ink)] transition-colors p-0.5"
                  aria-label="Dismiss"
                >
                  <X size={15} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
