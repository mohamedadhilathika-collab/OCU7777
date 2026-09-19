import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase, isSupabaseConfigured, checkUserBanStatus } from '../lib/supabase';
import { Shield, Mail, Lock, User, ArrowRight, Sparkles, Loader2, AlertCircle, Info, ChevronLeft, Ban } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any, profile: any) => void;
  onContinueAsGuest: () => void;
  initialError?: string | null;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export default function LoginPage({ onLoginSuccess, onContinueAsGuest, initialError }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError || null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (initialError) {
      setErrorMsg(initialError);
    }
  }, [initialError]);

  // Helper to ensure any lingering admin access flags are wiped on authentication
  const clearStoredAdminFlags = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('ocu_admin_logged_in');
    localStorage.removeItem('admin');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('ocu_admin_logged_in');
    sessionStorage.removeItem('admin');
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.');
      return;
    }

    // Force clear any previous session admin flags before initiating login
    clearStoredAdminFlags();

    setGoogleLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.');
      return;
    }

    if (!email.trim() || (mode !== 'forgot' && !password)) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (mode === 'login') {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user) {
          // Explicitly clear any admin flags upon user sign-in
          clearStoredAdminFlags();

          // REQUIREMENT 2: Immediately upon successful authentication, query the user's profile.
          // If current date and time is before banned_until timestamp, instantly trigger sign-out, deny access,
          // and display a prominent UI message: "You are banned temporarily."
          const banStatus = await checkUserBanStatus(data.user.id, data.user.user_metadata);
          if (banStatus.isBanned) {
            await supabase.auth.signOut();
            const untilStr = banStatus.bannedUntil
              ? ` Access is suspended until ${new Date(banStatus.bannedUntil).toLocaleString()}.`
              : '';
            setErrorMsg(`You are banned temporarily.${untilStr}`);
            setLoading(false);
            return;
          }

          const profile = {
            user_id: data.user.id,
            email: data.user.email || '',
            display_name: data.user.user_metadata?.full_name || email.split('@')[0],
            avatar_url: data.user.user_metadata?.avatar_url || '',
            last_login: new Date().toISOString()
          };
          onLoginSuccess(data.user, profile);
        }
      } else if (mode === 'signup') {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split('@')[0],
            },
          },
        });

        if (error) throw error;

        if (data?.user) {
          // Explicitly clear any admin flags upon user account creation
          clearStoredAdminFlags();

          // If confirmation is required, user is not fully logged in yet
          if (data.session) {
            const banStatus = await checkUserBanStatus(data.user.id, data.user.user_metadata);
            if (banStatus.isBanned) {
              await supabase.auth.signOut();
              const untilStr = banStatus.bannedUntil
                ? ` Access is suspended until ${new Date(banStatus.bannedUntil).toLocaleString()}.`
                : '';
              setErrorMsg(`You are banned temporarily.${untilStr}`);
              setLoading(false);
              return;
            }

            const profile = {
              user_id: data.user.id,
              email: data.user.email || '',
              display_name: data.user.user_metadata?.full_name || fullName.trim() || email.split('@')[0],
              avatar_url: data.user.user_metadata?.avatar_url || '',
              last_login: new Date().toISOString()
            };
            onLoginSuccess(data.user, profile);
          } else {
            setInfoMsg('Verification email sent! Please check your inbox to confirm your account.');
            // Clear passwords
            setPassword('');
          }
        }
      } else {
        // Forgot Password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });

        if (error) throw error;

        setInfoMsg('Password reset link sent! Please check your email to reset your credentials.');
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ocu-login-container" className="min-h-screen bg-ocu-dark flex flex-col justify-center items-center px-4 relative overflow-hidden py-12 select-none">
      {/* Dynamic Starry / Cosmic Backdrop Effect */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.02)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-ocu-crimson/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-ocu-gold/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <motion.div 
        id="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-ocu-graphite/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 crimson-glow flex flex-col"
      >
        {/* Decorative Gold Header Tag */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-24 bg-gradient-to-r from-transparent via-ocu-gold to-transparent" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-ocu-crimson to-ocu-gold p-[1px] mb-4">
            <div className="w-full h-full bg-ocu-dark rounded-xl flex items-center justify-center">
              <span className="font-display font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-ocu-crimson to-ocu-gold">
                Ω
              </span>
            </div>
          </div>
          <h1 className="font-display font-black text-2xl tracking-widest text-white uppercase leading-tight">
            OMNI COMIC
          </h1>
          <p className="font-mono text-[9px] tracking-[0.25em] text-ocu-gold uppercase font-bold mt-1">
            SECURE ACCESS PORTAL
          </p>
        </div>

        {/* Info/Error Banners */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-5 p-4 rounded-xl text-left border transition-all ${
              errorMsg.toLowerCase().includes('banned temporarily')
                ? 'bg-gradient-to-r from-red-950/80 to-red-900/40 border-red-500/60 shadow-lg shadow-red-950/50 ring-1 ring-red-500/40'
                : 'bg-ocu-crimson/10 border-ocu-crimson/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {errorMsg.toLowerCase().includes('banned temporarily') ? (
                <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30 shrink-0 mt-0.5">
                  <Ban className="text-red-400 w-5 h-5 animate-pulse" />
                </div>
              ) : (
                <AlertCircle className="text-ocu-crimson shrink-0 mt-0.5" size={16} />
              )}
              <div className="space-y-1">
                {errorMsg.toLowerCase().includes('banned temporarily') && (
                  <div className="font-display font-black text-sm tracking-wider uppercase text-red-400 flex items-center gap-2">
                    <span>SECURITY SUSPENSION ACTIVE</span>
                  </div>
                )}
                <span className="font-sans text-xs text-red-200 leading-relaxed block font-medium">
                  {errorMsg}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {infoMsg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-lg flex gap-3 text-left"
          >
            <Info className="text-ocu-gold shrink-0 mt-0.5" size={16} />
            <span className="font-sans text-xs text-amber-200 leading-relaxed">{infoMsg}</span>
          </motion.div>
        )}

        {/* Authentication Switch / Google Block */}
        {mode !== 'forgot' && (
          <div className="space-y-4 mb-6">
            <button
              id="btn-google-login"
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-display text-xs font-bold tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin text-ocu-gold" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>{googleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}</span>
            </button>

            <div className="flex items-center gap-4 my-4">
              <div className="h-[1px] bg-white/10 grow" />
              <span className="font-mono text-[9px] tracking-widest text-ocu-gray">OR MAIL PROTOCOL</span>
              <div className="h-[1px] bg-white/10 grow" />
            </div>
          </div>
        )}

        {/* Back to Login for Forgot Password */}
        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] text-ocu-gray hover:text-ocu-gold transition-colors text-left uppercase cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>BACK TO LOGIN PROTOCOL</span>
          </button>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5 text-left">
              <label className="font-mono text-[9px] text-ocu-gray tracking-wider uppercase">Your Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocu-gray" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-ocu-dark/50 border border-white/10 focus:border-ocu-gold rounded-lg font-sans text-sm text-white placeholder-white/30 outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="font-mono text-[9px] text-ocu-gray tracking-wider uppercase">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocu-gray" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-ocu-dark/50 border border-white/10 focus:border-ocu-gold rounded-lg font-sans text-sm text-white placeholder-white/30 outline-none transition-all"
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[9px] text-ocu-gray tracking-wider uppercase">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="font-mono text-[9px] text-ocu-gold hover:text-ocu-gold-hover transition-colors uppercase cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocu-gray" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-ocu-dark/50 border border-white/10 focus:border-ocu-gold rounded-lg font-sans text-sm text-white placeholder-white/30 outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 bg-ocu-crimson hover:bg-ocu-crimson-hover text-white font-display text-xs font-black tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-ocu-crimson/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'login' ? 'SECURE LOGIN' : mode === 'signup' ? 'CREATE ARCHIVE ACCOUNT' : 'SEND RESET LINK'}
                </span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </form>

        {/* Bottom Switch Links & Guest Action */}
        <div className="mt-8 text-center space-y-4">
          <div className="text-xs font-sans text-ocu-gray">
            {mode === 'login' ? (
              <>
                New to the Hub?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-ocu-gold font-semibold hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </>
            ) : mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-ocu-gold font-semibold hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </>
            ) : null}
          </div>

          <div className="h-[1px] bg-white/5" />

          {/* Continue as Guest */}
          <button
            id="btn-guest-continue"
            type="button"
            onClick={onContinueAsGuest}
            className="font-mono text-[10px] text-ocu-gray hover:text-white hover:underline transition-colors tracking-wider uppercase cursor-pointer block w-full text-center"
          >
            CONTINUE AS GUEST // READ-ONLY MODE 🔍
          </button>
        </div>
      </motion.div>
    </div>
  );
}
