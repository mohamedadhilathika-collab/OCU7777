import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Check, Lock, Download, Smartphone, 
  Loader2, CheckCircle, AlertCircle, X, ExternalLink 
} from 'lucide-react';
import { AcademyResource, Order } from '../types';
import { verifyUpiPaymentScreenshot } from '../lib/tesseractOcr';
import { saveOrderInSupabase } from '../lib/supabase';

interface AcademyCardProps {
  key?: React.Key;
  item: AcademyResource;
  isAdminLoggedIn?: boolean;
  isUnlockedGlobally?: boolean;
  onRead: (item: AcademyResource) => void;
  onUnlock?: (item: AcademyResource) => void | Promise<void>;
  userEmail?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function AcademyCard({
  item,
  isAdminLoggedIn = false,
  isUnlockedGlobally = false,
  onRead,
  onUnlock,
  userEmail = 'mohamedadhilathika@gmail.com',
  showToast
}: AcademyCardProps) {
  // Local unlock persistence state for this specific academy item
  const [isUnlockedLocally, setIsUnlockedLocally] = useState<boolean>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ocu_unlocked_academy') || '[]');
      return Array.isArray(stored) && stored.includes(item.id);
    } catch {
      return false;
    }
  });

  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // An item is unlocked if:
  // 1. Price is 0 or free tier
  // 2. Or user is admin
  // 3. Or globally unlocked via app order records
  // 4. Or unlocked in local state/storage
  const isFree = !item.priceINR || item.priceINR === 0 || item.tier !== 'paid';
  const isUnlocked = isFree || isAdminLoggedIn || isUnlockedGlobally || isUnlockedLocally;

  // Clean up preview object URL on unmount
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
    console.log('[UPI Intent] Triggering exact deep link for Academy:', upiLink);

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
   */
  const handlePayClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Trigger UPI deep link
    triggerUpiIntent(item.priceINR);

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
        item.priceINR,
        'mohamedadhilathika@okhdfcbank'
      );

      if (result.success) {
        console.log('[Verification] UPI Payment screenshot verified successfully for Academy Resource:', item.id);

        // 1. Store in localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('ocu_unlocked_academy') || '[]');
          if (!stored.includes(item.id)) {
            stored.push(item.id);
            localStorage.setItem('ocu_unlocked_academy', JSON.stringify(stored));
          }
        } catch (storageErr) {
          console.warn('Could not store unlocked academy resource in localStorage:', storageErr);
        }

        // 2. Persist order in Supabase
        const newOrder: Order = {
          id: `OCU-${Math.floor(100000 + Math.random() * 900000)}-ACAD`,
          comicId: item.id,
          comicTitle: item.title,
          customerEmail: userEmail || 'mohamedadhilathika@gmail.com',
          purchaseDate: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          price: item.priceINR,
          status: 'Completed',
          paymentStatus: 'Paid'
        };

        try {
          await saveOrderInSupabase(newOrder);
        } catch (dbErr) {
          console.error('Error saving order to Supabase:', dbErr);
        }

        // 3. Notify parent app
        if (onUnlock) {
          await onUnlock(item);
        }

        // 4. Update UI: unlock item, hide verification UI, reveal green READ button
        setIsUnlockedLocally(true);
        setShowVerification(false);
        setSuccessMessage('Payment Verified! Study Notes Unlocked.');

        if (showToast) {
          showToast(`Payment Verified! "${item.title}" study notes are now unlocked.`, 'success', 'Payment Successful');
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
    <div
      id={`academy-card-${item.id}`}
      className="bg-[#12121c] border border-white/10 hover:border-ocu-gold/40 rounded-xl p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_rgba(251,191,36,0.12)] group relative overflow-hidden"
    >
      {/* Ambient corner glow */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-ocu-crimson/10 rounded-full blur-2xl group-hover:bg-ocu-gold/15 transition-all duration-500 pointer-events-none" />

      <div className="space-y-5">
        {/* Card Badges: Stream/Category, Pricing Tier & Pages */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-wider text-ocu-gold font-bold uppercase bg-ocu-gold/10 border border-ocu-gold/20 px-2.5 py-1 rounded">
              {item.badge}
            </span>
            {isUnlocked ? (
              <span className="font-mono text-[10px] tracking-wider text-emerald-400 font-bold uppercase bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded shadow-sm">
                UNLOCKED
              </span>
            ) : item.priceINR > 0 ? (
              <span className="font-mono text-[10px] tracking-wider text-amber-400 font-bold uppercase bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                <span>₹{item.priceINR}</span>
              </span>
            ) : (
              <span className="font-mono text-[10px] tracking-wider text-emerald-400 font-bold uppercase bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded shadow-sm">
                FREE
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-white/40 flex items-center gap-1">
            <FileText size={12} />
            <span>{item.docPages || 40} Pages</span>
          </span>
        </div>

        <div>
          <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-1">
            {item.stream}
          </p>
          <h3 className="font-display font-black text-xl text-white uppercase tracking-tight group-hover:text-ocu-gold transition-colors leading-snug">
            {item.title}
          </h3>
        </div>

        <p className="font-sans text-xs text-ocu-gray font-light leading-relaxed">
          {item.description}
        </p>

        {/* PDF Status Indicator */}
        {item.pdfUrl && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
            <Check size={12} className="flex-shrink-0" />
            <span className="truncate">PDF: {item.pdfFileName || 'Syllabus PDF Ready'}</span>
          </div>
        )}

        {item.features && item.features.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/60 font-bold block">
              Key Revision Highlights:
            </span>
            <ul className="space-y-1.5 text-xs text-white/80 font-sans">
              {item.features.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ocu-crimson mt-1.5 flex-shrink-0 group-hover:bg-ocu-gold transition-colors" />
                  <span className="text-[11px] leading-tight text-white/70">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3. Strict Conditional Button & Verification Area */}
      <div className="pt-6 mt-6 border-t border-white/5 space-y-2.5">
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

        {/* Normal Button Area (rendered when verification box is closed) */}
        {!showVerification && (
          <div>
            {/* If price == 0 or item IS unlocked: Render the normal green "READ STUDY NOTES (PDF)" button */}
            {isUnlocked ? (
              <button
                type="button"
                id={`btn-read-academy-${item.id}`}
                onClick={() => onRead(item)}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md flex items-center justify-center gap-2 hover:shadow-lg"
              >
                <FileText size={14} />
                <span>Read Study Notes (PDF)</span>
              </button>
            ) : (
              /* If price > 0 and NOT unlocked: Do NOT render READ button. Render "PAY ₹[Price]" button */
              <button
                type="button"
                id={`btn-pay-academy-${item.id}`}
                onClick={handlePayClick}
                className="w-full py-3 px-4 rounded-lg bg-ocu-crimson hover:bg-rose-600 text-white font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md flex items-center justify-center gap-2 hover:shadow-lg border border-rose-500/40"
              >
                <Lock size={14} />
                <span>PAY ₹{item.priceINR}</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Screenshot Verification UI (Replaces button area when PAY clicked) */}
        <AnimatePresence>
          {!isUnlocked && showVerification && (
            <motion.div
              id={`payment-verification-box-academy-${item.id}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-3.5 bg-neutral-900/95 border border-ocu-gold/30 rounded-lg flex flex-col gap-2.5 overflow-hidden text-left"
            >
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="font-mono text-[10px] uppercase font-bold text-ocu-gold flex items-center gap-1">
                  <Smartphone size={12} className="text-ocu-gold" />
                  UPI Payment: ₹{item.priceINR}
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
                  onClick={() => triggerUpiIntent(item.priceINR)}
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
                id={`btn-verify-payment-academy-${item.id}`}
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

        {/* Admin-Only Quick Download Link */}
        {isAdminLoggedIn && item.pdfUrl && (
          <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-emerald-400/90 px-1 border-t border-white/5 mt-1">
            <span className="flex items-center gap-1 text-white/50">
              <Lock size={10} className="text-amber-400" />
              <span>Admin Privilege</span>
            </span>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = item.pdfUrl!;
                link.download = item.pdfFileName || `${item.id}-notes.pdf`;
                link.click();
              }}
              className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer flex items-center gap-1 font-bold"
            >
              <Download size={11} />
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
