import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Cart } from './Cart';
import { Outlet, useLocation } from 'react-router-dom';
import { useScrollToTop } from '../lib/hooks';

export function Layout() {
  useScrollToTop();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Cart />
      <main className={`flex-grow ${isHome ? '' : 'pt-[112px] md:pt-[128px]'}`}>
        <Outlet />
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}
