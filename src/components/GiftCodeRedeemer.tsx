import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, ShieldCheck, Lock, Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { GiftCode } from '../types';

interface GiftCodeRedeemerProps {
  onRedeemSuccess: (code: string) => void;
  activeRedeemedCode: string | null;
  giftCodes: GiftCode[];
  onRedeemAttempt: (code: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onResetSession: () => void;
}

export default function GiftCodeRedeemer({
  onRedeemSuccess,
  activeRedeemedCode,
  giftCodes,
  onRedeemAttempt,
  onResetSession
}: GiftCodeRedeemerProps) {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setLoading(true);
    setFeedback(null);

    // Simulate cybernetic grid database latency for cinematic effect
    setTimeout(async () => {
      try {
        const result = await onRedeemAttempt(inputCode.trim().toUpperCase());
        setLoading(false);
        
        if (result.success) {
          setFeedback({ type: 'success', message: result.message });
          onRedeemSuccess(inputCode.trim().toUpperCase());
          setInputCode('');
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      } catch (err) {
        setLoading(false);
        setFeedback({ type: 'error', message: 'An unexpected connection error occurred.' });
      }
    }, 1500);
  };

  return (
    <div
      id="gift-code-redeemer-widget"
      className="bg-ocu-graphite border border-white/10 rounded-xl p-6 md:p-8 relative overflow-hidden text-left crimson-glow"
    >
      {/* Visual neon grid backdrop */}
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-ocu-crimson/5 rounded-full blur-[40px] pointer-events-none" />

      <div className="relative z-10">
        
        {/* Widget Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-ocu-crimson/10 border border-ocu-crimson/20 flex items-center justify-center text-ocu-crimson">
            <Gift size={20} />
          </div>
          <div>
            <span className="font-mono text-[9px] tracking-[0.25em] text-ocu-gold font-bold uppercase">
              COSMIC COMPLEMENTARY ACCESS
            </span>
            <h3 className="font-display font-black text-xl text-white uppercase tracking-tight leading-none mt-1">
              REDEEM GIFT CODE
            </h3>
          </div>
        </div>

        <p className="font-sans text-xs text-ocu-gray leading-relaxed mb-6">
          Possess a safe OCU pre-authorized voucher? Enter your security key below to permanently unlock reading access to all Phase One digital comic volumes.
        </p>

        {activeRedeemedCode ? (
          /* Active Access Success Panel */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-emerald-400 mt-0.5 flex-shrink-0" size={18} />
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-emerald-400 tracking-wider uppercase block">
                  DIGITAL FEED UNLOCKED
                </span>
                <p className="font-sans text-xs text-white/90">
                  Congratulations! Your session has been granted full reading privileges. The active code <strong className="font-mono text-ocu-gold">{activeRedeemedCode}</strong> is verified.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-500/10">
              <span className="font-mono text-[9px] text-emerald-400/70 uppercase">
                📖 COMIC VOLUMES UNLOCKED FOR CURRENT SESSION
              </span>
              <button
                id="btn-disconnect-session"
                onClick={onResetSession}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-rose-950/40 text-ocu-gray hover:text-rose-400 text-[10px] font-mono transition-all border border-white/5 hover:border-rose-500/25 cursor-pointer"
              >
                <RefreshCw size={10} />
                <span>REDEEM ANOTHER CODE</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Interactive Input Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <input
                  id="input-gift-code"
                  type="text"
                  required
                  disabled={loading}
                  placeholder="e.g., OCU-GIFT-XXXX-XXXX"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-ocu-crimson transition-all tracking-wider placeholder:text-neutral-700 uppercase"
                />
                <div className="absolute right-3.5 top-3.5 text-neutral-600">
                  <Lock size={14} />
                </div>
              </div>

              <button
                id="btn-submit-gift-code"
                type="submit"
                disabled={loading || !inputCode.trim()}
                className="px-6 py-3 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover hover:scale-[1.01] transition-all duration-300 font-display text-xs font-bold tracking-widest text-white uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer shadow-lg shadow-ocu-crimson/15"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>DECRYPTING CODE...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-ocu-gold" />
                    <span>VERIFY & UNLOCK</span>
                  </>
                )}
              </button>
            </div>

            {/* Verification Feedbacks */}
            <AnimatePresence mode="wait">
              {feedback && (
                <motion.div
                  id="gift-redeem-feedback"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`flex items-start gap-2.5 px-4 py-3 rounded-md text-xs font-mono border ${
                    feedback.type === 'success'
                      ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-400'
                      : 'bg-rose-950/20 border-rose-500/25 text-rose-400'
                  }`}
                >
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{feedback.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Direct code tip for easy evaluation and preview by testing administrators */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="font-mono text-[9px] text-neutral-500">
                🔒 GATEWAY VALIDATION PROTOCOL: V.2
              </span>
              <span className="font-mono text-[9px] text-ocu-gold/60">
                💡 Tip: Try code <code className="text-white bg-white/5 px-1 py-0.5 rounded border border-white/5">OCU-GIFT-7X9A-K2M1</code> to test.
              </span>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
