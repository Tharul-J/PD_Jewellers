import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Sparkles, Key, Mail, Lock, ShieldAlert, CheckCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to login');
      }

      login(data);
      if (data.role === 'administrator') {
         navigate('/admin');
      } else {
         navigate('/profile');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#faf9f6]">
      {/* Editorial/Graphic Left Cover Panel */}
      <div className="relative lg:col-span-5 xl:col-span-6 hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-stone-900 border-r border-[#edd19b]/30">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105"
          style={{ 
            backgroundImage: `url('https://www.shutterstock.com/image-photo/beautiful-girl-jewelry-set-woman-600nw-2686459985.jpg')`
          }}
        />
        {/* Warm Golden Tint & Silhouette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/45 to-amber-950/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-stone-950/10" />

        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <span className="font-serif text-lg tracking-[0.3em] uppercase text-[#edd19b] font-semibold">PD JEWELLERS</span>
            <span className="block text-[8px] tracking-[0.4em] uppercase text-amber-200/50 mt-0.5">COLOMBO LUXE</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <span className="px-2.5 py-1 text-[9px] uppercase font-bold tracking-[0.2em] bg-amber-500/20 text-[#edd19b] border border-[#edd19b]/30 rounded-full inline-flex items-center gap-1.5 backdrop-blur-sm">
            <Sparkles size={11} className="text-yellow-400 animate-pulse" />
            2026 Sovereign Edition
          </span>
          <h2 className="text-4xl xl:text-5xl font-serif text-[#fbf8f3] font-normal leading-tight tracking-tight">
            Crafted for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#edd19b] via-amber-200 to-[#edd19b] font-semibold">Impeccable Legacy</span>
          </h2>
          <p className="text-stone-300 leading-relaxed text-xs tracking-wide font-sans font-light">
            Each bespoke component represents generations of authentic masterpiece-making. Access your digital portal to trace orders, design virtual 3D concepts, and lock in exclusive base-metal rates.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-12 text-[10px] uppercase tracking-widest font-mono text-stone-400">
          <span>01 / Bespoke Customizer</span>
          <span>02 / Live Ledger rates</span>
        </div>
      </div>

      {/* Interactive Form Right Panel */}
      <div 
        className="lg:col-span-12 lg:lg:col-span-7 xl:col-span-6 flex items-center justify-center p-6 sm:p-12 relative bg-cover bg-center lg:bg-none"
      >
        {/* Mobile Background Image (Only visible on small viewports) */}
        <div 
          className="absolute inset-0 bg-cover bg-center lg:hidden"
          style={{ 
            backgroundImage: `url('https://www.shutterstock.com/image-photo/beautiful-girl-jewelry-set-woman-600nw-2686459985.jpg')`
          }}
        />
        <div className="absolute inset-0 bg-stone-950/80 lg:hidden" />

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full px-6 py-10 sm:py-12 bg-white/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none rounded-2xl border border-amber-500/10 lg:border-none shadow-2xl lg:shadow-none relative z-10"
        >
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-serif text-stone-900 lg:text-[var(--color-ink)] mb-2 font-normal tracking-tight">Welcome Back</h1>
            <p className="text-xs text-stone-500 font-sans tracking-wide">Enter credentials to unlock custom pricing matrices and gold portfolios.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-rose-600 text-xs p-3.5 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-stone-700">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-stone-300 py-2.5 pl-7 focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-stone-400 text-sm font-sans"
                  placeholder="you@luxury.com"
                />
                <Mail size={14} className="absolute left-0 bottom-3 text-stone-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-stone-700">Password Access Code</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-b border-stone-300 py-2.5 pl-7 focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-stone-400 text-sm font-sans"
                  placeholder="••••••••"
                />
                <Lock size={14} className="absolute left-0 bottom-3 text-stone-400" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="rounded text-amber-500 focus:ring-amber-500 border-stone-300" />
                <label htmlFor="remember" className="text-xs text-stone-500 select-none">Remember this ledger</label>
              </div>
              <Link to="/profile" className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">Forgot Access Code?</Link>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-stone-900 to-stone-955 text-white hover:from-amber-600 hover:to-orange-600 py-4 text-xs tracking-[0.2em] uppercase font-bold rounded-xl transition-all shadow-md shadow-stone-900/10 hover:shadow-orange-500/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              Secure Portal Entry
            </button>
          </form>

          {/* Aesthetic registration trigger */}
          <div className="text-center lg:text-left mt-10 p-1 border-t border-stone-100 pt-6 text-xs text-stone-500">
            <p>
              New collector to PD Jewellers?{' '}
              <Link 
                to="/register" 
                className="text-stone-900 hover:text-amber-600 font-bold underline decoration-amber-200 decoration-2 transition-colors inline-block ml-1"
              >
                Register a luxury account
              </Link>
            </p>
          </div>

          {/* Luxury Touchless Quick-Logins Box */}
          <div className="mt-8 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-white p-5 rounded-2xl border border-amber-100/50">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800 flex items-center gap-1.5 mb-3">
              <Key size={12} className="text-amber-500 animate-pulse" />
              Touchless Verification Keys
            </h3>
            <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
              Skip typing. Select a credential card to automatically fill secure access certificates.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@pdjewellers.com', 'password123')}
                className="text-left p-3 rounded-xl border border-amber-200/40 hover:border-amber-400 bg-white hover:bg-amber-50/20 transition-all group flex flex-col justify-between animate-hover"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-sans">Master Admin</span>
                  <CheckCircle size={10} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[11px] font-mono text-stone-600 block truncate">admin@pdjewellers.com</span>
                <span className="text-[9px] font-mono text-stone-400 block mt-0.5">Role: Administrator</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('pathum2@gmail.com', 'password123')}
                className="text-left p-3 rounded-xl border border-orange-200/40 hover:border-orange-400 bg-white hover:bg-orange-50/20 transition-all group flex flex-col justify-between animate-hover"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider font-sans">VIP Customer</span>
                  <CheckCircle size={10} className="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[11px] font-mono text-stone-600 block truncate">pathum2@gmail.com</span>
                <span className="text-[9px] font-mono text-stone-400 block mt-0.5">Role: Verified Collector</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
