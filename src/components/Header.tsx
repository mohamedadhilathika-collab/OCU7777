import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Compass, Menu, X, ArrowUpRight, Lock, LogOut, GraduationCap, LogIn } from 'lucide-react';
import { ViewState } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  user: any;
  userProfile: any;
  onLogout: () => void;
  isGuest?: boolean;
  onLoginWithGoogle?: () => void;
}

export default function Header({ 
  currentView, 
  setView, 
  isAdminLoggedIn, 
  onOpenAdminLogin, 
  user, 
  userProfile, 
  onLogout,
  isGuest = false,
  onLoginWithGoogle
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    if (onLoginWithGoogle) {
      onLoginWithGoogle();
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      console.warn("Supabase is not configured");
      return;
    }
    try {
      setIsLoggingIn(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google OAuth error in navigation:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home' as ViewState, label: 'Hub', icon: Compass },
    { id: 'comics' as ViewState, label: 'Comics', icon: BookOpen },
    ...(isAdminLoggedIn ? [{ id: 'admin' as ViewState, label: 'Command', icon: Lock }] : []),
  ];

  const handleComicsClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    if (currentView !== 'home') {
      setView('home');
      setTimeout(() => {
        document.getElementById('catalog-comics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      document.getElementById('catalog-comics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAcademyClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    if (currentView !== 'home') {
      setView('home');
      setTimeout(() => {
        document.getElementById('catalog-academy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      document.getElementById('catalog-academy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  return (
    <header
      id="ocu-main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out border-b ${
        isScrolled
          ? 'bg-ocu-dark/80 backdrop-blur-xl border-white/10 py-3'
          : 'bg-transparent border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Brand/Logo */}
        <button
          id="btn-brand-home"
          onClick={() => {
            setView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-ocu-crimson to-ocu-gold p-[1px] transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-ocu-dark rounded-lg flex items-center justify-center">
              <span className="font-display font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-ocu-crimson to-ocu-gold">
                Ω
              </span>
            </div>
            {/* Ambient logo flare */}
            <div className="absolute inset-0 rounded-lg bg-ocu-crimson opacity-0 blur-md group-hover:opacity-40 transition-opacity duration-500" />
          </div>

          <div className="flex flex-col text-left">
            <span className="font-display font-black text-lg tracking-widest text-white leading-none">
              OMNI COMIC
            </span>
            <span className="font-mono text-[9px] tracking-widest text-ocu-gold font-bold">
              UNIVERSAL HUB
            </span>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav id="desktop-nav" className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                id={`nav-item-${item.id}`}
                key={item.id}
                onClick={(e) => {
                  if (item.id === 'comics') {
                    handleComicsClick(e);
                  } else {
                    setView(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`relative px-4 py-2 rounded-md font-display font-medium text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'text-ocu-gray hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-glow"
                    className="absolute inset-0 bg-white/[0.04] border-b-2 border-ocu-crimson rounded-md -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={14} className={isActive ? 'text-ocu-crimson' : 'text-current'} />
                {item.label}
              </button>
            );
          })}
          <button
            id="nav-item-ocu-academy"
            type="button"
            onClick={handleAcademyClick}
            className="relative px-4 py-2 rounded-md font-display font-medium text-sm transition-all duration-300 flex items-center gap-2 text-ocu-gray hover:text-white cursor-pointer hover:bg-white/[0.03]"
          >
            <GraduationCap size={14} className="text-ocu-gold" />
            <span>OCU Academy</span>
          </button>
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-4">
          <button
            id="nav-btn-explore-comics"
            onClick={() => setView('comics')}
            className="group px-4 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 font-display text-xs font-semibold tracking-wider text-white uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <span>RELEASES</span>
            <ArrowUpRight size={12} className="text-ocu-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-white/10">
              {userProfile?.avatar_url ? (
                <img
                  id="header-user-avatar"
                  src={userProfile.avatar_url}
                  alt={userProfile.display_name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full border border-ocu-gold/40 object-cover"
                />
              ) : (
                <div id="header-user-avatar-fallback" className="w-7 h-7 rounded-full bg-gradient-to-br from-ocu-crimson to-ocu-gold flex items-center justify-center text-[10px] font-mono font-bold text-white border border-ocu-gold/40">
                  {userProfile?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex flex-col text-left max-w-[100px]">
                <span id="header-user-name" className="text-xs font-display font-bold text-white truncate leading-tight">
                  {userProfile?.display_name}
                </span>
                <span className="font-mono text-[8px] text-ocu-gold tracking-wider leading-none uppercase">
                  AGENT
                </span>
              </div>
              {!isAdminLoggedIn && (
                <button
                  id="desktop-admin-login-trigger"
                  onClick={onOpenAdminLogin}
                  title="Unlock Admin Access"
                  className="p-1.5 rounded hover:bg-white/5 text-ocu-gray hover:text-ocu-gold transition-colors cursor-pointer"
                >
                  <Lock size={14} />
                </button>
              )}
              <button
                id="btn-header-logout"
                onClick={onLogout}
                title="Secure Sign Out"
                className="p-1.5 rounded hover:bg-white/5 text-ocu-gray hover:text-ocu-crimson transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <button
                id="desktop-btn-login-google"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white font-display text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50"
                title="Login with Google"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Login'}</span>
              </button>

              {!isAdminLoggedIn && (
                <button
                  id="desktop-admin-login-trigger-guest"
                  onClick={onOpenAdminLogin}
                  className="px-2.5 py-1.5 rounded hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-ocu-gray hover:text-ocu-gold font-mono text-[10px] tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span>🔑 Admin</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          id="btn-mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-white hover:text-ocu-crimson transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-nav-drawer"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 bg-ocu-dark/95 backdrop-blur-2xl border-b border-white/10 md:hidden flex flex-col py-6 px-6 gap-4 crimson-glow"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    id={`mobile-nav-item-${item.id}`}
                    key={item.id}
                    onClick={(e) => {
                      if (item.id === 'comics') {
                        handleComicsClick(e);
                      } else {
                        setView(item.id);
                        setMobileMenuOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-display text-base font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-white/[0.06] text-white border-l-4 border-ocu-crimson'
                        : 'text-ocu-gray hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-ocu-crimson' : 'text-ocu-gray'} />
                    {item.label}
                  </button>
                );
              })}
              <button
                id="mobile-nav-item-ocu-academy"
                type="button"
                onClick={handleAcademyClick}
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-display text-base font-semibold text-ocu-gray hover:text-white hover:bg-white/[0.02] transition-all duration-200 cursor-pointer text-left"
              >
                <GraduationCap size={18} className="text-ocu-gold" />
                <span>OCU Academy</span>
              </button>
            </div>

            <div className="h-[1px] bg-white/10 my-1" />

            {user ? (
              <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg my-1">
                <div className="flex items-center gap-3">
                  {userProfile?.avatar_url ? (
                    <img
                      id="mobile-header-user-avatar"
                      src={userProfile.avatar_url}
                      alt={userProfile.display_name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full border border-ocu-gold/40 object-cover"
                    />
                  ) : (
                    <div id="mobile-header-user-avatar-fallback" className="w-9 h-9 rounded-full bg-gradient-to-br from-ocu-crimson to-ocu-gold flex items-center justify-center text-xs font-mono font-bold text-white border border-ocu-gold/40">
                      {userProfile?.display_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span id="mobile-header-user-name" className="text-sm font-display font-bold text-white">
                      {userProfile?.display_name}
                    </span>
                    <span className="font-mono text-[8px] text-ocu-gold tracking-widest uppercase">
                      SECURE MEMBER
                    </span>
                  </div>
                </div>
                <button
                  id="btn-mobile-header-logout"
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 bg-ocu-crimson/10 hover:bg-ocu-crimson/20 border border-ocu-crimson/20 rounded font-mono text-[10px] text-ocu-crimson uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <LogOut size={12} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 my-1">
                <button
                  id="mobile-nav-btn-login-google"
                  onClick={() => {
                    handleGoogleLogin();
                    setMobileMenuOpen(false);
                  }}
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-display text-center text-xs font-bold tracking-widest uppercase rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2.5 shadow-lg disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>{isLoggingIn ? 'CONNECTING...' : 'LOGIN WITH GOOGLE'}</span>
                </button>
              </div>
            )}

            <button
              id="mobile-nav-btn-comics"
              onClick={handleComicsClick}
              className="w-full py-3 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover hover:from-red-600 hover:to-red-700 text-white font-display text-center text-sm font-bold tracking-widest uppercase rounded cursor-pointer transition-all duration-300 shadow-lg shadow-ocu-crimson/20"
            >
              BROWSE CATALOGUE
            </button>

            {!isAdminLoggedIn && (
              <button
                id="mobile-admin-login-trigger"
                onClick={() => {
                  onOpenAdminLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 border border-dashed border-white/10 hover:border-ocu-gold/30 text-center text-ocu-gray hover:text-ocu-gold rounded font-mono text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all mt-1"
              >
                <span>🔑 Admin Access</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
