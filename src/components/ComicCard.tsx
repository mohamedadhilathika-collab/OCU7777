import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Calendar, Layers, BookOpen, Smartphone, UploadCloud, Loader2, CheckCircle, AlertCircle, X, ExternalLink } from 'lucide-react';
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
}

export default function ComicCard({ 
  comic, 
  onBuy, 
  hasDigitalAccess = false, 
  onRead,
  onUnlockComic,
  userEmail = 'mohamedadhilathika@gmail.com'
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

  const isUnlocked = hasDigitalAccess || isUnlockedLocally || comic.price === 0;

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.nativeEvent) {
      (e.nativeEvent as any).__comicReadHandled = true;
    }
    if (onRead) {
      onRead(comic);
    } else if (typeof (window as any).openComicReader === 'function') {
      (window as any).openComicReader(comic);
    } else if (typeof (window as any).viewComic === 'function') {
      (window as any).viewComic(comic);
    } else {
      console.warn('[ComicCard] onRead, openComicReader, and viewComic are undefined for comic:', comic.id);
    }
  };

  /**
   * 1. UPI Deep Link Integration:
   * Generates and triggers the standard UPI intent link to open native UPI apps
   */
  const triggerUpiIntent = (comicPrice: number) => {
    const upiLink = `upi://pay?pa=mohamedadhilathika@okhdfcbank&pn=OmniComic&am=${comicPrice}&cu=INR&tn=OmniComicPayment`;
    console.log('[UPI Intent] Triggering deep link:', upiLink);

    // Trigger mobile device's app chooser dialog to open UPI apps natively (GPay, PhonePe, Paytm)
    try {
      window.location.href = upiLink;
    } catch (err) {
      console.warn('[UPI Intent] Direct location assignment error:', err);
    }

    // Fallback anchor click to trigger mobile browser intent
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
   * Handle BUY button click
   */
  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Generate and trigger standard UPI deep link
    triggerUpiIntent(comic.price);

    // 2. Immediately render payment verification section in place / below the button
    setShowVerification(true);
    setVerificationError('');
    setSuccessMessage('');
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
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
   * 3. Client-Side OCR Verification (Tesseract.js) & 4. Validation Logic
   */
  const handleVerifyPayment = async () => {
    if (!selectedFile) {
      setVerificationError('Waiting for payment... Please upload your payment screenshot here.');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      // Run Tesseract.js OCR verification against merchant UPI and comic price
      const result = await verifyUpiPaymentScreenshot(
        selectedFile,
        comic.price,
        'mohamedadhilathika@okhdfcbank'
      );

      if (result.success) {
        console.log('[Verification] UPI Payment screenshot verified successfully!');

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

        // 2. Persist order in Supabase database
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

        // 3. Notify parent component to update app-level state
        if (onUnlockComic) {
          await onUnlockComic(comic);
        }

        // 4. Update UI states: hide payment box, enable green READ NOW button, show success
        setIsUnlockedLocally(true);
        setShowVerification(false);
        setSuccessMessage('Payment Verified! Comic Unlocked.');

        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        // Verification failed
        setVerificationError(
          result.error ||
          'Verification failed. Please ensure the UPI ID and exact amount are clearly visible in the screenshot.'
        );
      }
    } catch (err: any) {
      console.error('[Verification Error]:', err);
      setVerificationError('Verification failed. Please ensure the UPI ID and exact amount are clearly visible in the screenshot.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.article
      id={`comic-card-${comic.id}`}
      data-comic-id={comic.id}
      data-comic-file={comic.digitalFile || ''}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col h-full bg-ocu-graphite border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 shadow-xl"
    >
      {/* 1. Cover Placeholder Container with Cinematic 3D Spine & Glow Effect */}
      <div 
        onClick={handleReadClick}
        title={`Click to read ${comic.title}`}
        className="relative aspect-[3/4] w-full bg-neutral-950 overflow-hidden border-b border-white/10 flex items-center justify-center cursor-pointer group/cover"
      >
        {/* Cover Placeholder image simulation using custom gradients */}
        <div className={`absolute inset-0 bg-gradient-to-br ${comic.coverGradient} transition-transform duration-700 group-hover:scale-105`} />
        
        {/* Sleek book cover text details */}
        <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold tracking-widest text-ocu-gold bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/5">
              VOL. 0{comic.volumeNumber}
            </span>
            <span className={`font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded border ${
              isUnlocked
                ? 'text-emerald-400 bg-emerald-950/70 border-emerald-500/30'
                : isReleased
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/20'
                : 'text-ocu-gold bg-yellow-950/60 border-ocu-gold/20'
            }`}>
              {isUnlocked ? 'UNLOCKED' : comic.releaseStatus.toUpperCase()}
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

        {/* Hover quick-read prompt */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-15 backdrop-blur-[2px]">
          <span className="px-3.5 py-1.5 rounded-full bg-black/80 border border-ocu-gold/60 text-ocu-gold font-display text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
            <BookOpen size={12} />
            <span>Open Reader</span>
          </span>
        </div>

        {/* Cinematic ambient shadows & highlights of a printed cover */}
        <div className="absolute inset-y-0 left-0 w-[15px] bg-gradient-to-r from-black/40 via-transparent to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-[4px] bg-white/5 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0" />
      </div>

      {/* 2. Comic Meta & Details */}
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

        {/* Pricing & Checkout Controls */}
        <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] tracking-widest text-ocu-gray uppercase">
                {isUnlocked ? 'ACCESS' : 'PRICE'}
              </span>
              <span className={`font-display font-black text-xl ${isUnlocked ? 'text-emerald-400' : 'text-white'}`}>
                {isUnlocked ? 'PURCHASED' : comic.price === 0 ? 'FREE' : `₹${comic.price}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 1. READ NOW BUTTON: When unlocked, enabled in vibrant green */}
              <button
                type="button"
                id={`btn-read-comic-${comic.id}`}
                data-action="read-comic"
                data-comic-id={comic.id}
                data-comic-file={comic.digitalFile || ''}
                data-file-url={comic.digitalFile || ''}
                onClick={handleReadClick}
                className={`btn-read-now px-3.5 py-2.5 rounded font-display text-xs font-bold tracking-widest uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                  isUnlocked
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/25 border border-emerald-400'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:border-ocu-gold/50'
                }`}
                title={isUnlocked ? 'Read Full Digital Comic (Unlocked)' : 'Read Digital Edition / Preview'}
                aria-label={`Read ${comic.title} now`}
              >
                <BookOpen size={13} className={isUnlocked ? 'text-black' : 'text-ocu-gold'} />
                <span>READ NOW</span>
              </button>

              {/* 2. BUY BUTTON: Only rendered when the comic is not yet unlocked and verification is not open */}
              {!isUnlocked && !showVerification && (
                <button
                  type="button"
                  id={`btn-buy-comic-${comic.id}`}
                  onClick={handleBuyClick}
                  className="group px-3.5 py-2.5 rounded bg-ocu-crimson hover:bg-rose-600 text-white border border-rose-500/40 hover:border-rose-400 transition-all duration-300 font-display text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-ocu-crimson/20"
                  title={`Pay ₹${comic.price} via UPI & Unlock ${comic.title}`}
                  aria-label={`Buy ${comic.title}`}
                >
                  <ShoppingCart size={13} className="text-white transition-colors" />
                  <span>{isReleased ? 'BUY' : 'PRE-ORDER'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Banner */}
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

          {/* 2. Payment Verification Section */}
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
                    UPI Verification (₹{comic.price})
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
                    title="Close verification"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Exact Required Message */}
                <p className="font-sans text-xs text-white/90 leading-snug">
                  Waiting for payment... Please upload your payment screenshot here.
                </p>

                {/* Target Merchant Details */}
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

                {/* Exact Required File Input */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="payment-screenshot-input"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isVerifying}
                    className="block w-full text-xs text-white/70 file:mr-2.5 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 file:cursor-pointer cursor-pointer border border-white/10 rounded-md p-1.5 bg-black/40 focus:outline-none focus:border-ocu-gold/50"
                  />
                </div>

                {/* Screenshot Preview thumbnail */}
                {previewUrl && (
                  <div className="relative w-full max-h-24 overflow-hidden rounded border border-white/10 bg-black flex items-center justify-center p-1">
                    <img 
                      src={previewUrl} 
                      alt="Payment screenshot preview" 
                      className="max-h-22 max-w-full object-contain rounded"
                    />
                  </div>
                )}

                {/* Verification Error message */}
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
                      <span>Verifying payment... Please wait.</span>
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
