/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';

// Pages
import Home from './pages/Home';
import Collections from './pages/Collections';
import Configurator from './pages/Configurator';
import Materials from './pages/Materials';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="collections" element={<Collections />} />
                <Route path="configurator" element={<Configurator />} />
                <Route path="materials" element={<Materials />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin" element={<Admin />} />
              </Route>
            </Routes>
          </Router>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
