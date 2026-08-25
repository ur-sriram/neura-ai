import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, Truck, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useApp();

  const [email, setEmail] = useState('admin.officer@doner.gov.in');
  const [password, setPassword] = useState('GovSecure@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, allow direct access to dashboard
  useEffect(() => {
    if (user.isAuthenticated) {
      // User is logged in
    }
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email/ID and password to authenticate.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      login(email, rememberMe);
      setIsLoading(false);
      navigate('/');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl p-8 z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 text-white font-black text-2xl shadow-xl shadow-brand-900/50 mb-4 ring-4 ring-slate-800/80">
            NE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">NE-Setu</h1>
          <p className="text-xs text-emerald-400 font-semibold tracking-wider uppercase mt-1">
            AI-Powered Adaptive Logistics & Accessibility Intelligence
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Ministry of Development of North Eastern Region (DoNER)
          </p>
        </div>

        {/* Error message if validation fails */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Official Email / Gov ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                placeholder="officer@doner.gov.in"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Access Passphrase
              </label>
              <button
                type="button"
                onClick={() => setPassword('GovSecure@2026')}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Reset Demo Pass
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                placeholder="Enter passphrase"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-300 font-medium">Keep Command Session Active</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm transition-all shadow-lg shadow-brand-700/30 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <span>Verifying Biometrics & Tokens...</span>
              ) : (
                <>
                  <span>Access Operations Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Authorized Personnel Only. Monitored under Northeast Multi-Modal Logistics Modernization Framework.
          </p>
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-6 text-center text-xs text-slate-500 z-10 flex items-center gap-2">
        <Truck className="w-4 h-4 text-emerald-400" />
        <span>NE-Setu Enterprise Platform • 8 Northeastern States Hub</span>
      </div>
    </div>
  );
};
