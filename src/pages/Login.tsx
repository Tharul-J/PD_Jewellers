import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen pt-32 pb-16 flex items-center justify-center bg-[var(--color-paper)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full px-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif text-[var(--color-ink)] mb-4 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-500 font-sans tracking-wide">Enter your details to access your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="text-red-600 text-sm p-3 bg-red-50 text-center">{error}</div>}
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-ink)] mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-[var(--color-gold)] transition-colors bg-transparent placeholder-gray-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-ink)] mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-[var(--color-gold)] transition-colors bg-transparent placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-[var(--color-gold)] transition-colors">Forgot your password?</Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--color-ink)] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-black transition-colors disabled:opacity-50"
          >
            Sign In
          </button>
        </form>

        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Don't have an account? <Link to="/register" className="text-[var(--color-ink)] font-semibold border-b border-[var(--color-ink)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)] transition-all pb-0.5">Create an account</Link></p>
        </div>

        <div className="mt-8 bg-gray-100 p-4 border border-gray-200 text-xs">
          <h3 className="font-bold mb-2 uppercase tracking-wide text-gray-700">Dummy Credentials</h3>
          <ul className="text-gray-600 mb-2">
            <li><strong>Admin:</strong> admin@pdjewellers.com / password123</li>
            <li><strong>Customer:</strong> john@example.com / password123</li>
          </ul>
          <p className="opacity-70">* Require database connection (`MONGODB_URI`) and seeding (`npx tsx seeder.ts`) to work.</p>
        </div>
      </motion.div>
    </div>
  );
}
