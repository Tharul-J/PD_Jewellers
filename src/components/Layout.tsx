import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Cart } from './Cart';
import { StyleQuiz } from './StyleQuiz';
import { Outlet, useLocation } from 'react-router-dom';
import { useScrollToTop } from '../lib/hooks';

export function Layout() {
  useScrollToTop();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname.startsWith('/admin');

  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Cart />
      <main className={`flex-grow ${isHome ? '' : 'pt-[112px] md:pt-[128px]'}`}>
        <Outlet />
      </main>
      {!isAdmin && <Footer />}

      {/* Global floating style assistant — hidden on admin */}
      {!isAdmin && (
        <>
          <StyleQuiz isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} position="bottom" />

          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
            {/* Tooltip label */}
            <AnimatePresence>
              {!assistantOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: 1.0, duration: 0.3 }}
                  className="btn-richbrown text-white text-[11px] font-semibold tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
                >
                  Find Your Style
                </motion.div>
              )}
            </AnimatePresence>

            {/* FAB */}
            <motion.button
              onClick={() => setAssistantOpen(v => !v)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="pointer-events-auto w-14 h-14 rounded-full btn-richbrown shadow-[0_8px_30px_rgba(0,0,0,0.28)] flex items-center justify-center text-[var(--color-gold)] relative"
              aria-label="Style Assistant"
            >
              <AnimatePresence mode="wait">
                {assistantOpen ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X size={22} />
                  </motion.span>
                ) : (
                  <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sparkles size={22} />
                  </motion.span>
                )}
              </AnimatePresence>
              {!assistantOpen && (
                <span className="absolute inset-0 rounded-full border-2 border-[var(--color-gold)]/40 animate-ping pointer-events-none" />
              )}
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
