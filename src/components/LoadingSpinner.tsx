import { motion } from 'motion/react';

export function LoadingSpinner({ fullScreen = true }: { fullScreen?: boolean }) {
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
           className="absolute w-full h-full rounded-full border-2 border-gray-200 border-t-[var(--color-gold)] opacity-70"
        />
        <motion.div
           animate={{ rotate: -360 }}
           transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
           className="absolute w-12 h-12 rounded-full border-2 border-gray-200 border-b-[var(--color-gold)] opacity-50"
        />
        <motion.div
           animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
           transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
           className="absolute w-4 h-4 rounded-full bg-gold-gradient shadow-[0_0_15px_rgba(212,175,55,0.4)]"
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-gradient animate-pulse">Loading...</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)]">
        {spinner}
      </div>
    );
  }

  return spinner;
}
