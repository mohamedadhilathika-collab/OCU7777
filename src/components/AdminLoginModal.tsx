import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, Eye, EyeOff, X, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  adminAccessCode: string;
}

export default function AdminLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  adminAccessCode
}: AdminLoginModalProps) {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      // Secret code comparison (case-sensitive)
      if (code === adminAccessCode) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setCode('');
          onLoginSuccess();
          onClose();
        }, 1500);
      } else {
        setError('Invalid administrator access code.');
      }
    }, 1000);
  };

  const handleClose = () => {
    if (loading || isSuccess) return;
    setError(null);
    setCode('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="admin-login-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            id="admin-login-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            id="admin-login-container"
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-md bg-ocu-graphite border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 p-8 text-center"
          >
            {/* Close Button */}
            {!loading && !isSuccess && (
              <button
                id="btn-close-admin-login"
                onClick={handleClose}
                className="absolute top-4 right-4 text-ocu-gray hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close login dialog"
              >
                <X size={18} />
              </button>
            )}

            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                {/* Cinematic Header Icon & Title */}
                <div className="flex flex-col items-center text-center space-y-3 pb-2">
                  <div className="w-16 h-16 rounded-2xl bg-ocu-crimson/10 border border-ocu-crimson/25 flex items-center justify-center text-ocu-crimson shadow-xl shadow-ocu-crimson/5">
                    <Shield size={32} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-xl md:text-2xl text-white uppercase tracking-tight">
                      Administrator Access
                    </h3>
                    <p className="font-sans text-xs text-ocu-gray">
                      Authorized personnel only.
                    </p>
                  </div>
                </div>

                {/* Input Field */}
                <div className="space-y-2">
                  <label htmlFor="input-admin-code" className="block font-mono text-[10px] tracking-widest text-ocu-gray uppercase">
                    Secret Access Code
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-3.5 text-neutral-500">
                      <Lock size={16} />
                    </div>
                    <input
                      id="input-admin-code"
                      type={showCode ? 'text' : 'password'}
                      required
                      placeholder="Enter access credentials"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={loading}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-11 py-3.5 font-mono text-sm text-white focus:outline-none focus:border-ocu-crimson transition-all tracking-wider"
                    />
                    <button
                      id="btn-toggle-admin-code"
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="absolute right-3.5 top-3.5 text-ocu-gray hover:text-white transition-colors cursor-pointer"
                      title={showCode ? "Hide code" : "Show code"}
                    >
                      {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error Panel */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 text-rose-400 bg-rose-950/20 border border-rose-500/20 px-4 py-3 rounded-lg text-xs font-mono"
                  >
                    <AlertTriangle size={15} className="flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    id="btn-cancel-admin-login"
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-display font-bold tracking-widest uppercase border border-white/5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-admin-login"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover text-white rounded-xl text-xs font-display font-bold tracking-widest uppercase cursor-pointer hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-ocu-crimson/20 disabled:opacity-50"
                  >
                    {loading ? 'Authenticating...' : 'Access Command'}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Anim */
              <motion.div
                id="admin-login-success-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <CheckCircle size={44} className="animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-black text-2xl text-emerald-400 uppercase tracking-tight">
                    Access Granted
                  </h3>
                  <p className="font-mono text-[10px] text-ocu-gold tracking-widest uppercase">
                    Administrator Session Activated
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
