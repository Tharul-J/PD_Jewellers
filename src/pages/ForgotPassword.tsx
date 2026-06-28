import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Mail, ShieldAlert, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#faf9f6]">
      {/* Left cover panel */}
      <div className="relative lg:col-span-5 xl:col-span-6 hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-stone-900 border-r border-[#edd19b]/30">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105"
          style={{
            backgroundImage: `url('https://www.shutterstock.com/image-photo/beautiful-girl-jewelry-set-woman-600nw-2686459985.jpg')`
          }}
        />
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

      {/* Right form panel */}
      <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Mobile background */}
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
            <h1 className="text-3xl font-serif text-stone-900 lg:text-[var(--color-ink)] mb-2 font-normal tracking-tight">Reset Password</h1>
            <p className="text-xs text-stone-500 font-sans tracking-wide">Enter your email and we'll send you a reset link.</p>
          </div>

          {submitted ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 font-sans leading-relaxed">
                  If that email is registered, you'll receive a password reset link shortly. Check your inbox.
                </p>
              </div>
              <Link
                to="/login"
                className="block text-center w-full mt-2 btn-richbrown text-white py-4 text-xs tracking-[0.2em] uppercase font-bold rounded-xl transition-all shadow-md shadow-stone-900/10"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
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
                    className="w-full border-b border-stone-300 py-2.5 pl-7 pr-4 focus:outline-none focus:border-amber-500 transition-colors bg-transparent placeholder-stone-400 text-sm font-sans"
                    placeholder="you@example.com"
                  />
                  <Mail size={14} className="absolute left-0 bottom-3 text-stone-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 btn-richbrown text-white py-4 text-xs tracking-[0.2em] uppercase font-bold rounded-xl transition-all shadow-md shadow-stone-900/10 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="text-center lg:text-left mt-8 border-t border-stone-100 pt-6 text-xs text-stone-500">
            <p>
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-stone-900 hover:text-amber-600 font-bold underline decoration-amber-200 decoration-2 transition-colors inline-block ml-1"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
