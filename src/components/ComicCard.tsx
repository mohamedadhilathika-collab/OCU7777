import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Layers, BookOpen, Smartphone, Loader2, CheckCircle, AlertCircle, X, ExternalLink, Lock } from 'lucide-react';
import { ComicVolume, Order } from '../types';
import { verifyUpiPaymentScreenshot } from '../lib/tesseractOcr';
import { saveOrderInSupabase } from '../lib/supabase';

interface ComicCardProps {
  key?: string | number;
  comic: ComicVolume;
  onBuy?: (comic: ComicVolume) => void;
  hasDigitalAccess?: boolean;
  onRead?: (comic: ComicVolume) => void;
  onUnlockComic?: (comic: ComicVolume) => void | Promise<void>;
  userEmail?: string;
  isGuest?: boolean;
  user?: any;
  onRequireAuth?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function ComicCard({ 
  comic, 
  onBuy, 
  hasDigitalAccess = false, 
  onRead,
  onUnlockComic,
  userEmail = 'mohamedadhilathika@gmail.com',
  isGuest = false,
  user = null,
  onRequireAuth,
  showToast
}: ComicCardProps) {
  const isReleased = comic.releaseStatus === 'Released';

  // Local unlock persistence state
  const [isUnlockedLocally, setIsUnlockedLocally] = useState<boolean>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ocu_unlocked_comics') || '[]');
      return Array.isArray(stored) && stored.includes(comic.id);
    } catch {
      return false;
    }
  });

  // Verification flow states
  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strict check: if price == 0 or explicitly unlocked
  const isUnlocked = comic.price === 0 || hasDigitalAccess || isUnlockedLocally;

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * 2. UPI Deep Link on "PAY":
   * Triggers the exact UPI deep link to open native payment apps
   */
  const triggerUpiIntent = (itemPrice: number) => {
    const upiLink = `upi://pay?pa=mohamedadhilathika@okhdfcbank&pn=OmniComic&am=${itemPrice}&cu=INR`;
    console.log('[UPI Intent] Triggering exact deep link:', upiLink);

    try {
      window.location.href = upiLink;
    } catch (err) {
      console.warn('[UPI Intent] Direct navigation error:', err);
    }

    try {
      const a = document.createElement('a');
      a.href = upiLink;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 500);
    } catch (e) {
      // Ignored
    }
  };

  /**
   * Handle PAY button click
   * 1. Trigger UPI deep link
   * 2. Immediately replace button area with Verification UI
   */
  const handlePayClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Module 2: Guest Authentication Gate Interception Check
    if (isGuest || !user) {
      if (onRequireAuth) {
        onRequireAuth();
      } else if (showToast) {
        showToast("Authentication Required. Please log in to read or purchase materials.", 'warning', 'Authentication Required');
      }
      return;
    }

    // 1. Trigger exact UPI intent
    triggerUpiIntent(comic.price);

    // 2. Immediately show Verification UI
    setShowVerification(true);
    setVerificationError('');
    setSuccessMessage('');
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  /**
   * Handle READ NOW click:
   * STRICT ACCESS CONTROL: Only allow reading if authenticated, and if price == 0 or item IS unlocked!
   */
  const handleReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Module 2: Guest Authentication Gate Interception Check
    if (isGuest || !user) {
      if (onRequireAuth) {
        onRequireAuth();
      } else if (showToast) {
        showToast("Authentication Required. Please log in to read or purchase materials.", 'warning', 'Authentication Required');
      }
      return;
    }

    if (comic.price > 0 && !isUnlocked) {
      // Paywall bypass blocked! Trigger payment flow
      handlePayClick(e);
      return;
    }

    if (e.nativeEvent) {
      (e.nativeEvent as any).__comicReadHandled = true;
    }

    if (onRead) {
      onRead(comic);
    } else if (typeof (window as any).openComicReader === 'function') {
      (window as any).openComicReader(comic);
    } else if (typeof (window as any).viewComic === 'function') {
      (window as any).viewComic(comic);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationError('');
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setVerificationError('Invalid file format. Please upload an image screenshot.');
        return;
      }
      setSelectedFile(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  /**
   * 4. Tesseract.js OCR Validation:
   */
  const handleVerifyPayment = async () => {
    if (!selectedFile) {
      setVerificationError('Waiting for payment... Please upload your payment screenshot here.');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      const result = await verifyUpiPaymentScreenshot(
        selectedFile,
        comic.price,
        'mohamedadhilathika@okhdfcbank'
      );

      if (result.success) {
        console.log('[Verification] UPI Payment screenshot verified successfully for Comic:', comic.id);

        // 1. Mark comic as unlocked in local storage
        try {
          const stored = JSON.parse(localStorage.getItem('ocu_unlocked_comics') || '[]');
          if (!stored.includes(comic.id)) {
            stored.push(comic.id);
            localStorage.setItem('ocu_unlocked_comics', JSON.stringify(stored));
          }
        } catch (storageErr) {
          console.warn('Could not store unlocked comic in localStorage:', storageErr);
        }

        // 2. Persist order in Supabase
        const newOrder: Order = {
          id: `OCU-${Math.floor(100000 + Math.random() * 900000)}-UPI`,
          comicId: comic.id,
          comicTitle: comic.title,
          customerEmail: userEmail || 'mohamedadhilathika@gmail.com',
          purchaseDate: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          price: comic.price,
          status: 'Completed',
          paymentStatus: 'Paid'
        };

        try {
          await saveOrderInSupabase(newOrder);
        } catch (dbErr) {
          console.error('Error saving order to Supabase:', dbErr);
        }

        // 3. Notify parent app
        if (onUnlockComic) {
          await onUnlockComic(comic);
        }

        // 4. Update UI: unlock item, hide verification UI, reveal green READ button
        setIsUnlockedLocally(true);
        setShowVerification(false);
        setSuccessMessage('Payment Verified! Comic Unlocked.');

        if (showToast) {
          showToast(`Payment Verified! "${comic.title}" is now unlocked.`, 'success', 'Payment Successful');
        }

        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        setVerificationError('Verification failed. Please ensure the UPI ID and exact amount are clearly visible.');
      }
    } catch (err: any) {
      console.error('[Verification Error]:', err);
      setVerificationError('Verification failed. Please ensure the UPI ID and exact amount are clearly visible.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.article
      id={`comic-card-${comic.id}`}
      data-comic-id={comic.id}
      data-comic-file={isUnlocked ? (comic.digitalFile || '') : ''}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col h-full bg-ocu-graphite border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 shadow-xl"
    >
      {/* 1. Cover Container */}
      <div 
        onClick={handleReadClick}
        title={isUnlocked ? `Click to read ${comic.title}` : `Locked • Click to Pay ₹${comic.price}`}
        className="relative aspect-[3/4] w-full bg-neutral-950 overflow-hidden border-b border-white/10 flex items-center justify-center cursor-pointer group/cover"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${comic.coverGradient} transition-transform duration-700 group-hover:scale-105`} />
        
        {/* Cover metadata */}
        <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold tracking-widest text-ocu-gold bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/5">
              VOL. 0{comic.volumeNumber}
            </span>
            <span className={`font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded border ${
              isUnlocked
                ? 'text-emerald-400 bg-emerald-950/70 border-emerald-500/30'
                : 'text-amber-400 bg-amber-950/70 border-amber-500/30'
            }`}>
              {isUnlocked ? 'UNLOCKED' : `LOCKED • ₹${comic.price}`}
            </span>
          </div>

          <div className="text-left">
            <p className="font-mono text-[10px] tracking-widest text-white/50 uppercase font-medium mb-1">
              OMNI COMIC UNIVERSE
            </p>
            <h3 className="font-display font-black text-2xl tracking-tight text-white leading-tight uppercase group-hover:text-ocu-crimson transition-colors duration-300">
              {comic.title}
            </h3>
            <p className="font-sans text-[11px] text-white/70 italic mt-2 line-clamp-1">
              Written by {comic.writer}
            </p>
          </div>
        </div>

        {/* Hover Prompt: Open Reader (if unlocked) or Pay (if locked) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-15 backdrop-blur-[2px]">
          {isUnlocked ? (
            <span className="px-3.5 py-1.5 rounded-full bg-black/80 border border-emerald-400 text-emerald-300 font-display text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
              <BookOpen size={12} />
              <span>Open Reader</span>
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full bg-black/80 border border-amber-400 text-amber-300 font-display text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
              <Lock size={12} />
              <span>Pay ₹{comic.price} to Unlock</span>
            </span>
          )}
        </div>

        <div className="absolute inset-y-0 left-0 w-[15px] bg-gradient-to-r from-black/40 via-transparent to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-[4px] bg-white/5 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0" />
      </div>

      {/* 2. Details */}
      <div className="flex flex-col flex-grow p-6 text-left justify-between">
        <div>
          <div className="flex items-center gap-4 text-ocu-gray font-mono text-[11px] mb-3">
            <span className="flex items-center gap-1.5">
              <Layers size={11} className="text-ocu-crimson" />
              {comic.pages} Pages
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <span className="flex items-center gap-1.5">
              <Calendar size={11} className="text-ocu-gold" />
              {comic.releaseDate}
            </span>
          </div>

          <p className="font-sans text-sm text-ocu-gray font-light leading-relaxed mb-6 line-clamp-3">
            {comic.shortDescription}
          </p>
        </div>

        {/* 3. Strict Conditional Button & Verification Area */}
        <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] tracking-widest text-ocu-gray uppercase">
                {isUnlocked ? 'ACCESS' : 'PRICE'}
              </span>
              <span className={`font-display font-black text-xl ${isUnlocked ? 'text-emerald-400' : 'text-white'}`}>
                {isUnlocked ? 'UNLOCKED' : comic.price === 0 ? 'FREE' : `₹${comic.price}`}
              </span>
            </div>

            {/* If NOT in verification mode, render exactly one button based on price and isUnlocked */}
            {!showVerification && (
              <div className="flex items-center gap-2">
                {/* 1. If price == 0 or item IS unlocked: Render the normal green "READ NOW" button */}
                {isUnlocked ? (
                  <button
                    type="button"
                    id={`btn-read-comic-${comic.id}`}
                    data-action="read-comic"
                    data-comic-id={comic.id}
                    data-comic-file={comic.digitalFile || ''}
                    onClick={handleReadClick}
                    className="btn-read-now px-4 py-2.5 rounded font-display text-xs font-bold tracking-widest uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95 bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/25 border border-emerald-400"
                    title={`Read ${comic.title}`}
                    aria-label={`Read ${comic.title} now`}
                  >
                    <BookOpen size={14} className="text-black" />
                    <span>READ NOW</span>
                  </button>
                ) : (
                  /* 2. If price > 0 and NOT unlocked: Do NOT render READ button. Render "PAY ₹[Price]" button */
                  <button
                    type="button"
                    id={`btn-pay-comic-${comic.id}`}
                    onClick={handlePayClick}
                    className="px-4 py-2.5 rounded bg-ocu-crimson hover:bg-rose-600 text-white border border-rose-500/40 hover:border-rose-400 transition-all duration-300 font-display text-xs font-bold tracking-widest uppercase flex items-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-ocu-crimson/25"
                    title={`Pay ₹${comic.price} via UPI to unlock`}
                    aria-label={`Pay ₹${comic.price} to unlock ${comic.title}`}
                  >
                    <Lock size={13} className="text-white" />
                    <span>PAY ₹{comic.price}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Success Toast / Banner */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-mono"
              >
                <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Screenshot Verification UI (Replaces button area when PAY clicked) */}
          <AnimatePresence>
            {!isUnlocked && showVerification && (
              <motion.div
                id={`payment-verification-box-${comic.id}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-3.5 bg-neutral-900/95 border border-ocu-gold/30 rounded-lg flex flex-col gap-2.5 overflow-hidden text-left"
              >
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="font-mono text-[10px] uppercase font-bold text-ocu-gold flex items-center gap-1">
                    <Smartphone size={12} className="text-ocu-gold" />
                    UPI Payment: ₹{comic.price}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVerification(false);
                      setVerificationError('');
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl('');
                      }
                    }}
                    className="text-white/40 hover:text-white text-xs p-1 transition-colors"
                    title="Cancel verification"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Exact Required Message */}
                <p className="font-sans text-xs text-white/90 leading-snug">
                  Waiting for payment... Please upload your payment screenshot here.
                </p>

                {/* Recipient details */}
                <div className="p-2 bg-black/40 border border-white/5 rounded text-[11px] font-mono text-white/60 flex items-center justify-between">
                  <span>UPI ID: <strong className="text-white">mohamedadhilathika@okhdfcbank</strong></span>
                  <button
                    type="button"
                    onClick={() => triggerUpiIntent(comic.price)}
                    className="text-ocu-gold hover:underline flex items-center gap-1 text-[10px] cursor-pointer"
                  >
                    <span>Reopen UPI</span>
                    <ExternalLink size={10} />
                  </button>
                </div>

                {/* Exact Required File Input with class payment-screenshot-input */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="payment-screenshot-input"
                    className="payment-screenshot-input block w-full text-xs text-white/70 file:mr-2.5 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 file:cursor-pointer cursor-pointer border border-white/10 rounded-md p-1.5 bg-black/40 focus:outline-none focus:border-ocu-gold/50"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isVerifying}
                  />
                </div>

                {/* Screenshot Preview */}
                {previewUrl && (
                  <div className="relative w-full max-h-24 overflow-hidden rounded border border-white/10 bg-black flex items-center justify-center p-1">
                    <img 
                      src={previewUrl} 
                      alt="Payment screenshot preview" 
                      className="max-h-22 max-w-full object-contain rounded"
                    />
                  </div>
                )}

                {/* Verification Error */}
                {verificationError && (
                  <div className="flex items-start gap-1.5 text-xs text-rose-300 bg-rose-950/50 p-2.5 rounded border border-rose-800/50">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                    <span className="font-sans leading-tight">{verificationError}</span>
                  </div>
                )}

                {/* Exact Required Action Button: "Verify Payment" */}
                <button
                  type="button"
                  id={`btn-verify-payment-${comic.id}`}
                  onClick={handleVerifyPayment}
                  disabled={isVerifying}
                  className="w-full py-2.5 px-3 rounded bg-ocu-crimson hover:bg-rose-600 disabled:bg-neutral-800 disabled:text-white/40 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-ocu-crimson/20"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-white" />
                      <span>Verifying payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={13} />
                      <span>Verify Payment</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
