import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ show, message, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md pointer-events-none flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.25)] text-white"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <Check size={14} className="stroke-[3]" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#F8FAFC]">
              {message}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
