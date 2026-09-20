import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldAlert, X, ArrowRight, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLoginScreen?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function AuthRequiredModal({
  isOpen,
  onClose,
  onSwitchToLoginScreen,
  showToast
}: AuthRequiredModalProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        if (showToast) {
          showToast('Authentication service is not configured. Please check Supabase credentials.', 'error', 'Auth Error');
        }
        return;
      }

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
      console.error('[Auth Gate] Google Sign In error:', err);
      if (showToast) {
        showToast(err.message || 'Failed to authenticate with Google. Please try again.', 'error', 'Login Failed');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRedirectToLogin = () => {
    onClose();
    if (onSwitchToLoginScreen) {
      onSwitchToLoginScreen();
    } else {
      sessionStorage.removeItem('ocu_guest_mode');
      localStorage.removeItem('ocu_guest_mode');
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="auth-required-backdrop"
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none"
        onClick={onClose}
      >
        <motion.div
          id="auth-required-modal"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-neutral-950 border border-ocu-crimson/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-center space-y-6 overflow-hidden"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-ocu-crimson/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-ocu-gold/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

          {/* Close button */}
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>

          {/* Security Icon Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-ocu-crimson/20 via-neutral-900 to-rose-900/30 border border-ocu-crimson/40 flex items-center justify-center text-ocu-crimson shadow-lg shadow-rose-950/50">
              <Lock size={30} className="text-red-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ShieldAlert size={12} />
            </div>
          </div>

          {/* Header Texts */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] tracking-[0.25em] text-red-400 font-bold uppercase block">
              SECURITY PROTOCOL // GUEST GATE
            </span>
            <h3 className="font-display font-black text-2xl text-white uppercase tracking-tight">
              Authentication Required
            </h3>
            <p className="font-sans text-sm text-neutral-300 font-medium">
              Please log in to read or purchase materials.
            </p>
            <p className="font-sans text-xs text-neutral-400 font-light leading-relaxed pt-1">
              Guests are permitted to browse and explore the comic catalogue and academy syllabus overview. Full digital reader decryption and UPI checkout require a verified account.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            {/* Primary Google Login Button */}
            <button
              id="btn-guest-login-google"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 font-sans font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-white/10 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isLoggingIn ? 'Redirecting to Google...' : 'Login with Google'}</span>
            </button>

            {/* Switch to Full Login Screen option */}
            <button
              id="btn-guest-return-login"
              onClick={handleRedirectToLogin}
              className="w-full py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Main Sign-In Screen</span>
              <ArrowRight size={13} />
            </button>

            {/* Dismiss and continue as guest */}
            <button
              id="btn-guest-continue-browsing"
              onClick={onClose}
              className="w-full py-2 text-neutral-500 hover:text-neutral-300 font-sans text-xs transition-colors cursor-pointer"
            >
              Continue Browsing Catalogue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
