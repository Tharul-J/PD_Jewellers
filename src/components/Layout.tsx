import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Cart } from './Cart';
import { Outlet, useLocation } from 'react-router-dom';
import { useScrollToTop } from '../lib/hooks';
import { motion, AnimatePresence } from 'motion/react';

export function Layout() {
  useScrollToTop();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Cart />
      <main className={`flex-grow ${isHome ? '' : 'pt-[112px] md:pt-[128px]'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex-grow flex flex-col min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
