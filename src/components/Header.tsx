import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Compass, Menu, X, ArrowUpRight, Lock, LogOut, GraduationCap } from 'lucide-react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  user: any;
  userProfile: any;
  onLogout: () => void;
}

export default function Header({ currentView, setView, isAdminLoggedIn, onOpenAdminLogin, user, userProfile, onLogout }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            !isAdminLoggedIn && (
              <button
                id="desktop-admin-login-trigger-guest"
                onClick={onOpenAdminLogin}
                className="px-3 py-1.5 rounded hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-ocu-gray hover:text-ocu-gold font-mono text-[10px] tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔑 Admin</span>
              </button>
            )
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

            {user && (
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
