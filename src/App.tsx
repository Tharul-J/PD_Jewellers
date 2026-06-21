/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Layout } from './components/Layout';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { PricingProvider } from './context/PricingContext';

// Pages
import Home from './pages/Home';
import Collections from './pages/Collections';
import Configurator from './pages/Configurator';
import Materials from './pages/Materials';
import AboutUs from './pages/AboutUs';
import Inquiry from './pages/Inquiry';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import ProductDetail from './pages/ProductDetail';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <motion.div initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Home />
            </motion.div>
          } />
          <Route path="collections" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Collections />
            </motion.div>
          } />
          <Route path="configurator" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Configurator />
            </motion.div>
          } />
          <Route path="materials" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Materials />
            </motion.div>
          } />
          <Route path="about" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <AboutUs />
            </motion.div>
          } />
          <Route path="inquiry" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Inquiry />
            </motion.div>
          } />
          <Route path="login" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Login />
            </motion.div>
          } />
          <Route path="register" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Register />
            </motion.div>
          } />
          <Route path="profile" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Profile />
            </motion.div>
          } />
          <Route path="admin" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <Admin />
            </motion.div>
          } />
          <Route path="product/:id" element={
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-full">
              <ProductDetail />
            </motion.div>
          } />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <PricingProvider>
            <Router>
              <AnimatedRoutes />
            </Router>
          </PricingProvider>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
