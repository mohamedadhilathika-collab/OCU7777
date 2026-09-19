import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Smartphone, Landmark, CheckCircle, Loader2, Sparkles, AlertCircle, ArrowLeft, Copy, Check, QrCode, RefreshCw, UploadCloud, Tag, Gift } from 'lucide-react';
import { ComicVolume, DiscountCoupon, FreeComicCoupon, CouponRedemption } from '../types';
import { supabase, saveCouponRedemption } from '../lib/supabase';
import { verifyUpiPaymentScreenshot } from '../lib/tesseractOcr';

interface PurchaseModalProps {
  comic: ComicVolume | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: any) => void;
  userEmail?: string;
}

type PaymentMethod = 'gpay' | 'upi';
type PaymentStage = 'selection' | 'awaiting' | 'verify' | 'failed' | 'success';

export default function PurchaseModal({ comic, isOpen, onClose, onOrderCreated, userEmail = 'mohamedadhilathika@gmail.com' }: PurchaseModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('gpay');
  const [upiId, setUpiId] = useState('');
  const [customerUpiId, setCustomerUpiId] = useState('');
  const [stage, setStage] = useState<PaymentStage>('selection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txId, setTxId] = useState('');
  const [copied, setCopied] = useState(false);

  // Verification-specific states
  const [paymentStartTime, setPaymentStartTime] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(comic ? comic.price : 0);

  // Sync comic price on open / change
  useEffect(() => {
    if (comic) {
      setFinalPrice(comic.price);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponCode('');
      setCouponError('');
      setCouponSuccess('');
    }
  }, [comic]);

  // Auto-reset copied state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!comic) return null;

  // Merchant configurations
  const MERCHANT_UPI_ID = 'mohamedadhilathika@okhdfcbank';

  // Construct standard UPI deep link URI using finalPrice
  const upiUri = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=OmniComic&am=${finalPrice}&cu=INR&tn=OmniComicPayment`;

  const handleScreenshotFile = (file: File) => {
    setVerificationError('');
    if (!file.type.startsWith('image/')) {
      setVerificationError('Invalid file type. Please upload an image screenshot (PNG/JPEG).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
    setScreenshotFile(file);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponSuccess('');
    setCouponLoading(true);

    const codeUpper = couponCode.toUpperCase().trim();

    try {
      // 1. Search in discount_coupons
      const { data: dcData, error: dcErr } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', codeUpper);

      if (dcErr) throw new Error(dcErr.message);

      if (dcData && dcData.length > 0) {
        const coupon = dcData[0];
        
        // Active status
        if (!coupon.active) {
          setCouponError('This coupon is currently inactive.');
          setCouponLoading(false);
          return;
        }

        // Date validity
        const todayStr = new Date().toISOString().split('T')[0];
        if (coupon.start_date > todayStr) {
          setCouponError('This coupon promotion has not started yet.');
          setCouponLoading(false);
          return;
        }
        if (coupon.expiry_date < todayStr) {
          setCouponError('This coupon has expired.');
          setCouponLoading(false);
          return;
        }

        // Usage limit
        if (Number(coupon.used_count || 0) >= Number(coupon.max_uses || 100)) {
          setCouponError('This coupon has reached its maximum usage limit.');
          setCouponLoading(false);
          return;
        }

        // Eligibility (comics)
        if (coupon.apply_type === 'selected_comics') {
          const comicIds = coupon.comic_ids || [];
          if (!comicIds.includes(comic.id)) {
            setCouponError('This coupon is not valid for this specific comic volume.');
            setCouponLoading(false);
            return;
          }
        } 
        // Eligibility (series)
        else if (coupon.apply_type === 'selected_series') {
          const seriesIds = coupon.series_ids || [];
          if (!comic.series || !seriesIds.includes(comic.series)) {
            setCouponError('This coupon is not valid for this comic series.');
            setCouponLoading(false);
            return;
          }
        }

        // Minimum Purchase amount
        if (coupon.minimum_purchase && Number(comic.price) < Number(coupon.minimum_purchase)) {
          setCouponError(`This coupon requires a minimum purchase amount of ₹${coupon.minimum_purchase}.`);
          setCouponLoading(false);
          return;
        }

        // Per-user limit
        const { count, error: countErr } = await supabase
          .from('coupon_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_code', codeUpper)
          .eq('user_email', userEmail);

        if (countErr) throw new Error(countErr.message);

        if (count !== null && count >= Number(coupon.uses_per_user || 1)) {
          setCouponError('You have already used this coupon code the maximum number of times.');
          setCouponLoading(false);
          return;
        }

        // Apply discount coupon
        const discount = Math.round(comic.price * (Number(coupon.discount_percentage) / 100));
        const finalVal = Math.max(0, comic.price - discount);

        setAppliedCoupon({
          id: coupon.id,
          code: coupon.code,
          type: 'percentage',
          discountPercent: Number(coupon.discount_percentage),
          applyType: coupon.apply_type
        });
        setDiscountAmount(discount);
        setFinalPrice(finalVal);
        setCouponSuccess(`Coupon Applied: ${coupon.discount_percentage}% discount!`);
        setCouponLoading(false);
        return;
      }

      // 2. Search in free_comic_coupons
      const { data: fcData, error: fcErr } = await supabase
        .from('free_comic_coupons')
        .select('*')
        .eq('code', codeUpper);

      if (fcErr) throw new Error(fcErr.message);

      if (fcData && fcData.length > 0) {
        const coupon = fcData[0];

        // Active
        if (!coupon.active) {
          setCouponError('This coupon is currently inactive.');
          setCouponLoading(false);
          return;
        }

        // Expiry
        const todayStr = new Date().toISOString().split('T')[0];
        if (coupon.start_date > todayStr) {
          setCouponError('This coupon promotion has not started yet.');
          setCouponLoading(false);
          return;
        }
        if (coupon.expiry_date < todayStr) {
          setCouponError('This coupon has expired.');
          setCouponLoading(false);
          return;
        }

        // Usage limit
        if (Number(coupon.used_count || 0) >= Number(coupon.max_uses || 100)) {
          setCouponError('This coupon has reached its maximum usage limit.');
          setCouponLoading(false);
          return;
        }

        // Comic Eligibility
        if (coupon.comic_id !== comic.id) {
          setCouponError('This coupon is only valid for a different comic volume.');
          setCouponLoading(false);
          return;
        }

        // Per-user limit
        const { count, error: countErr } = await supabase
          .from('coupon_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_code', codeUpper)
          .eq('user_email', userEmail);

        if (countErr) throw new Error(countErr.message);

        if (count !== null && count >= Number(coupon.uses_per_user || 1)) {
          setCouponError('You have already used this free coupon code.');
          setCouponLoading(false);
          return;
        }

        // Apply free comic coupon
        setAppliedCoupon({
          id: coupon.id,
          code: coupon.code,
          type: 'free_comic',
          comicId: coupon.comic_id
        });
        setDiscountAmount(comic.price);
        setFinalPrice(0);
        setCouponSuccess('Free Comic Code Valid! Tap Claim Comic below to permanently unlock.');
        setCouponLoading(false);
        return;
      }

      setCouponError('Invalid coupon code. Please try again.');
    } catch (err: any) {
      console.error('Error validating coupon:', err);
      setCouponError('System was unable to validate this coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setFinalPrice(comic.price);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  };

  const handleClaimFreeComic = async () => {
    setLoading(true);
    setCouponError('');

    try {
      // 1. Generate Order ID
      const orderId = `OCU-${Math.floor(100000 + Math.random() * 900000)}-FREE`;

      // 2. Record the redemption in Supabase
      if (appliedCoupon) {
        const redemption: CouponRedemption = {
          id: 'red_' + Math.random().toString(36).substr(2, 9),
          couponId: appliedCoupon.id,
          couponCode: appliedCoupon.code,
          couponType: 'free_comic',
          comicId: comic.id,
          userEmail: userEmail,
          discountPercent: 100,
          originalPrice: comic.price,
          finalPrice: 0,
          redeemedAt: new Date().toISOString()
        };

        await saveCouponRedemption(redemption);
      }

      // 3. Complete Order
      if (onOrderCreated) {
        onOrderCreated({
          id: orderId,
          comicId: comic.id,
          comicTitle: comic.title,
          customerEmail: userEmail,
          purchaseDate: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          price: 0,
          status: 'Completed',
          paymentStatus: 'Paid'
        });
      }

      setTxId(orderId);
      setStage('success');
    } catch (err: any) {
      console.error('Failed to claim free comic:', err);
      setCouponError('Unable to complete free claim processing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!screenshotFile && !screenshotBase64) {
      setVerificationError('Waiting for payment... Please upload your payment screenshot here.');
      return;
    }
    setLoading(true);
    setVerificationError('');

    try {
      // 1. Run Client-Side OCR Verification using Tesseract.js
      const targetImg = screenshotFile || screenshotBase64;
      const ocrResult = await verifyUpiPaymentScreenshot(
        targetImg,
        finalPrice,
        MERCHANT_UPI_ID
      );

      if (ocrResult.success) {
        // Successful verification! Create order registry
        const orderId = `OCU-${Math.floor(100000 + Math.random() * 900000)}-TX`;
        setTxId(orderId);

        // Record coupon redemption if any
        if (appliedCoupon) {
          try {
            const redemption: CouponRedemption = {
              id: 'red_' + Math.random().toString(36).substr(2, 9),
              couponId: appliedCoupon.id,
              couponCode: appliedCoupon.code,
              couponType: appliedCoupon.type,
              comicId: comic.id,
              userEmail: userEmail,
              discountPercent: appliedCoupon.discountPercent || 0,
              originalPrice: comic.price,
              finalPrice: finalPrice,
              redeemedAt: new Date().toISOString()
            };
            await saveCouponRedemption(redemption);
          } catch (redErr) {
            console.error('Error saving redemption after payment success:', redErr);
          }
        }

        // Mark comic as unlocked locally
        try {
          const stored = JSON.parse(localStorage.getItem('ocu_unlocked_comics') || '[]');
          if (!stored.includes(comic.id)) {
            stored.push(comic.id);
            localStorage.setItem('ocu_unlocked_comics', JSON.stringify(stored));
          }
        } catch (storageErr) {
          console.warn('Could not update localStorage unlocked comics:', storageErr);
        }

        if (onOrderCreated) {
          onOrderCreated({
            id: orderId,
            comicId: comic.id,
            comicTitle: comic.title,
            customerEmail: userEmail,
            purchaseDate: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
            price: finalPrice,
            status: 'Completed',
            paymentStatus: 'Paid'
          });
        }
        setStage('success');
      } else {
        setVerificationError('Verification failed. Please ensure the UPI ID and exact amount are clearly visible in the screenshot.');
      }
    } catch (err: any) {
      console.error('OCR Verification failed:', err);
      setVerificationError('Verification failed. Please ensure the UPI ID and exact amount are clearly visible in the screenshot.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (method === 'upi' && customerUpiId && !customerUpiId.includes('@')) {
      setError('Please enter a valid UPI ID (e.g., username@bank)');
      return;
    }

    // Record the checkout session start time securely
    const startTime = new Date().toISOString();
    setPaymentStartTime(startTime);
    console.log(`[OCU Payment Session] Created at ${startTime} for comic ${comic.id}`);

    // Attempt direct deep-link redirect to compatible UPI apps like Google Pay
    try {
      window.location.href = upiUri;
    } catch (err) {
      console.log('UPI application redirection not natively supported in this sandbox environment:', err);
    }

    // Transition to verification stage
    setStage('awaiting');
  };

  const handleConfirmSuccess = () => {
    // Redirect to screenshot verification screen rather than auto-unlocking
    setStage('verify');
    setVerificationError('');
  };

  const handleCancelPayment = () => {
    setStage('failed');
  };

  const resetState = () => {
    setMethod('gpay');
    setCustomerUpiId('');
    setStage('selection');
    setLoading(false);
    setError('');
    setCopied(false);
    setPaymentStartTime('');
    setScreenshotFile(null);
    setScreenshotBase64('');
    setVerificationError('');
    setIsDragging(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop Blur overlay */}
          <motion.div
            id="purchase-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : resetState}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            id="purchase-modal-body"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-3xl h-[100dvh] md:h-auto md:max-h-[85vh] bg-ocu-graphite border-0 md:border border-white/10 rounded-none md:rounded-xl overflow-hidden shadow-2xl z-10 text-left flex flex-col"
          >
            {/* Header close button */}
            {!loading && (
              <button
                id="btn-close-purchase-modal"
                onClick={resetState}
                className="absolute top-4 right-4 text-ocu-gray hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer z-30"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            )}

            {stage !== 'success' ? (
              <form onSubmit={handlePaymentSubmit} className="flex flex-col h-full flex-grow overflow-hidden">
                {/* Scrollable Content Area */}
                <div className="flex-grow overflow-y-auto p-0">
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    {/* Left side: Premium Book Summary */}
                    <div className="md:col-span-5 bg-black/40 p-6 md:p-8 border-r border-white/5 flex flex-col justify-between">
                      <div>
                        <span className="font-mono text-[9px] tracking-widest text-ocu-gold font-bold uppercase block mb-3">
                          CHECKOUT SUMMARY
                        </span>
                        
                        {/* Comic Cover Preview Mock */}
                        <div className={`aspect-[3/4] w-28 md:w-36 mx-auto rounded-md shadow-lg bg-gradient-to-br ${comic.coverGradient} p-4 flex flex-col justify-between mb-4 md:mb-6 border border-white/10 relative`}>
                          <span className="font-mono text-[8px] text-ocu-gold font-semibold">VOL. 0{comic.volumeNumber}</span>
                          <h4 className="font-display font-black text-xs text-white uppercase leading-none mt-auto">{comic.title}</h4>
                          {/* Spine detail */}
                          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/40 to-transparent" />
                        </div>

                        <h3 className="font-display font-bold text-lg md:text-xl text-white tracking-tight uppercase mb-1">
                          {comic.title}
                        </h3>
                        <p className="font-mono text-xs text-ocu-gray mb-4">
                          Volume {comic.volumeNumber} • {comic.pages} Pages
                        </p>
                      </div>

                      <div className="pt-6 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="font-sans text-xs text-ocu-gray">Subtotal</span>
                          <span className="font-mono text-sm text-white">₹{comic.price}</span>
                        </div>
                        {appliedCoupon && (
                          <div className="flex justify-between items-end text-emerald-400">
                            <span className="font-sans text-xs flex items-center gap-1">
                              <Tag size={12} />
                              Promo ({appliedCoupon.code})
                            </span>
                            <span className="font-mono text-sm font-bold">-₹{discountAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-end pb-2">
                          <span className="font-sans text-xs text-ocu-gray">Digital Tax</span>
                          <span className="font-mono text-sm text-white">₹0</span>
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-white/5">
                          <span className="font-display text-sm font-semibold text-white">Total Charge</span>
                          <span className="font-display font-black text-2xl text-ocu-gold">₹{finalPrice}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Payment Gateway Options & Portal */}
                    <div className="md:col-span-7 p-6 md:p-8 pb-12">
                      {stage === 'selection' && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="text-ocu-gold" size={18} />
                              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-white uppercase">
                                SECURE UPI PROTOCOLS
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={resetState}
                              className="text-[10px] font-mono text-ocu-gray hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              ← Back
                            </button>
                          </div>

                          {/* COUPON INPUT FIELD */}
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] font-bold tracking-widest text-ocu-gray uppercase flex items-center gap-1">
                                <Tag size={12} className="text-ocu-gold" />
                                PROMOTION / COUPON CODE
                              </span>
                              {appliedCoupon && (
                                <button
                                  type="button"
                                  onClick={handleRemoveCoupon}
                                  className="text-[9px] font-mono text-rose-400 hover:text-rose-300 uppercase underline cursor-pointer"
                                >
                                  Remove Code
                                </button>
                              )}
                            </div>

                            {!appliedCoupon ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="ENTER PROMO CODE"
                                  value={couponCode}
                                  onChange={(e) => setCouponCode(e.target.value)}
                                  className="flex-grow bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-xs uppercase text-white focus:outline-none focus:border-ocu-gold transition-all"
                                  disabled={couponLoading}
                                />
                                <button
                                  type="button"
                                  onClick={handleApplyCoupon}
                                  disabled={couponLoading || !couponCode.trim()}
                                  className="px-4 bg-gradient-to-r from-ocu-gold to-yellow-600 hover:brightness-110 disabled:opacity-50 text-black font-display font-bold text-xs tracking-wider uppercase rounded transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  {couponLoading ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    'Apply'
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/20 rounded px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {appliedCoupon.type === 'free_comic' ? (
                                    <Gift size={16} className="text-emerald-400" />
                                  ) : (
                                    <Tag size={16} className="text-emerald-400" />
                                  )}
                                  <span className="font-mono text-xs text-white uppercase font-bold">
                                    {appliedCoupon.code}
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase">
                                  {appliedCoupon.type === 'free_comic' ? '100% OFF (FREE)' : `${appliedCoupon.discountPercent}% OFF`}
                                </span>
                              </div>
                            )}

                            {couponError && (
                              <p className="font-mono text-[10px] text-rose-400 flex items-center gap-1">
                                <AlertCircle size={10} />
                                {couponError}
                              </p>
                            )}
                            {couponSuccess && (
                              <p className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={10} />
                                {couponSuccess}
                              </p>
                            )}
                          </div>

                          {appliedCoupon?.type === 'free_comic' ? (
                            <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-6 text-center space-y-4">
                              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto">
                                <Gift size={24} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-display font-bold text-base text-white uppercase">
                                  Free Comic Coupon Active!
                                </h4>
                                <p className="font-sans text-xs text-ocu-gray">
                                  You have entered a valid claim code for <span className="text-white font-semibold">"{comic.title}"</span>.
                                </p>
                              </div>
                              <p className="font-sans text-[11px] text-emerald-400">
                                Press the "Claim Comic" button below to instantly and permanently add this volume to your library.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-display font-bold text-lg text-white mb-4">
                                Select Payment Method
                              </h4>

                              {/* Method Selector Tabs */}
                              <div className="grid grid-cols-2 gap-2 mb-6">
                                {/* Google Pay */}
                                <button
                                  id="payment-tab-gpay"
                                  type="button"
                                  onClick={() => { setMethod('gpay'); setError(''); }}
                                  className={`py-3 px-2 rounded border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    method === 'gpay'
                                      ? 'bg-ocu-crimson/10 border-ocu-crimson text-white'
                                      : 'bg-white/[0.02] border-white/5 text-ocu-gray hover:text-white'
                                  }`}
                                >
                                  <Smartphone size={16} className={method === 'gpay' ? 'text-ocu-crimson' : 'text-current'} />
                                  <span className="font-display text-[10px] font-bold tracking-wider">Google Pay</span>
                                </button>

                                {/* UPI */}
                                <button
                                  id="payment-tab-upi"
                                  type="button"
                                  onClick={() => { setMethod('upi'); setError(''); }}
                                  className={`py-3 px-2 rounded border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    method === 'upi'
                                      ? 'bg-ocu-crimson/10 border-ocu-crimson text-white'
                                      : 'bg-white/[0.02] border-white/5 text-ocu-gray hover:text-white'
                                  }`}
                                >
                                  <Landmark size={16} className={method === 'upi' ? 'text-ocu-crimson' : 'text-current'} />
                                  <span className="font-display text-[10px] font-bold tracking-wider">UPI Payment</span>
                                </button>
                              </div>

                              {/* Payment Information display (Recipient, Currency, Payment Type) */}
                              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-1.5 text-[10px] font-mono mb-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-ocu-gray">Recipient</span>
                                  <span className="text-white font-semibold">{MERCHANT_UPI_ID}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-ocu-gray">Currency</span>
                                  <span className="text-white">Indian Rupee (₹)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-ocu-gray">Payment Type</span>
                                  <span className="text-ocu-gold font-semibold uppercase tracking-wider">Digital Comic Purchase</span>
                                </div>
                              </div>

                              {/* Method Specific Fields */}
                              <div className="min-h-[110px]">
                                {method === 'gpay' && (
                                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                                    <p className="font-sans text-xs text-ocu-gray leading-relaxed">
                                      Pay swiftly using your securely linked Google Pay credentials via UPI. A direct request will be dispatched to your compatible Google Pay application.
                                    </p>
                                    <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-ocu-gold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-ocu-gold animate-pulse" />
                                      <span>Linked: {userEmail}</span>
                                    </div>
                                  </div>
                                )}

                                {method === 'upi' && (
                                  <div className="space-y-3">
                                    <label className="block font-mono text-[10px] tracking-widest text-ocu-gray uppercase">
                                      ENTER YOUR UPI ID (OPTIONAL)
                                    </label>
                                    <input
                                      id="input-upi-id"
                                      type="text"
                                      placeholder="e.g., commander@okhdfcbank"
                                      value={customerUpiId}
                                      onChange={(e) => setCustomerUpiId(e.target.value)}
                                      className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-ocu-crimson transition-all placeholder-white/20"
                                    />
                                  </div>
                                )}

                                {/* Client Error Panel */}
                                {error && (
                                  <div className="mt-4 flex items-center gap-2 text-rose-400 bg-rose-950/20 border border-rose-500/20 px-3.5 py-2 rounded text-xs font-mono">
                                    <AlertCircle size={14} className="flex-shrink-0" />
                                    <span>{error}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {stage === 'awaiting' && (
                        <div className="space-y-6">
                          <div>
                            {/* Upper Header info */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="font-mono text-[9px] font-bold tracking-widest text-ocu-gold uppercase">
                                  AWAITING UPI CONFIRMATION
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setStage('selection')}
                                className="text-[10px] font-mono text-ocu-gray hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowLeft size={10} />
                                <span>← Back</span>
                              </button>
                            </div>

                            <h4 className="font-display font-bold text-lg text-white mb-2 uppercase">
                              Authorize App Payment
                            </h4>
                            <p className="font-sans text-[11px] text-ocu-gray leading-relaxed mb-4">
                              We have triggered a transaction request. If you are on a compatible mobile device, your UPI app (like Google Pay) should prompt you.
                            </p>

                            {/* QR Code section */}
                            <div className="flex flex-col sm:flex-row gap-4 bg-black/40 border border-white/5 rounded-lg p-4 mb-4 items-center">
                              <div className="relative p-2 bg-white rounded-lg flex-shrink-0">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiUri)}&color=000000&bgcolor=ffffff`}
                                  alt="UPI QR Code"
                                  className="w-[120px] h-[120px] block"
                                />
                                <div className="absolute inset-0 border border-white/10 rounded-lg pointer-events-none" />
                              </div>

                              <div className="flex-grow space-y-3 text-left w-full">
                                <div>
                                  <span className="block font-mono text-[8px] tracking-wider text-ocu-gray">RECIPIENT UPI ID</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-xs text-white break-all">{MERCHANT_UPI_ID}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(MERCHANT_UPI_ID);
                                        setCopied(true);
                                      }}
                                      className="text-ocu-gold hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
                                      title="Copy UPI ID"
                                    >
                                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-white/5">
                                  <span className="block font-mono text-[8px] tracking-wider text-ocu-gray">PAYMENT LINK</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(upiUri);
                                      setCopied(true);
                                    }}
                                    className="text-[10px] font-mono text-ocu-gold hover:underline mt-0.5 text-left break-all block"
                                  >
                                    {copied ? '✓ Copied deep link' : 'Copy standard UPI deep link'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Payment Information display (Recipient, Currency, Payment Type) */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-1.5 text-[10px] font-mono mb-4">
                              <div className="flex justify-between items-center">
                                <span className="text-ocu-gray">Recipient</span>
                                <span className="text-white font-semibold">{MERCHANT_UPI_ID}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-ocu-gray">Currency</span>
                                <span className="text-white">Indian Rupee (₹)</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-ocu-gray">Payment Type</span>
                                <span className="text-ocu-gold font-bold">Digital Comic Purchase</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {stage === 'verify' && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-emerald-400 uppercase">
                                TRANSACTION VERIFICATION CORE
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setStage('awaiting');
                                setVerificationError('');
                              }}
                              className="text-[10px] font-mono text-ocu-gray hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              ← Back to UPI QR
                            </button>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-display font-black text-lg text-white uppercase tracking-tight">
                              Verify Your Payment
                            </h4>
                            <p className="font-sans text-xs text-ocu-gray leading-relaxed">
                              To unlock <span className="text-white font-semibold">"{comic.title}"</span> instantly, please upload a screenshot of your successful UPI transaction receipt.
                            </p>

                            {/* Session Verification parameters */}
                            <div className="grid grid-cols-2 gap-3 bg-black/40 border border-white/5 rounded-lg p-3.5 font-mono text-[10.5px]">
                              <div>
                                <span className="text-ocu-gray uppercase text-[8.5px]">Selected Comic</span>
                                <span className="text-white block font-sans font-semibold mt-0.5 truncate">{comic.title}</span>
                              </div>
                              <div>
                                <span className="text-ocu-gray uppercase text-[8.5px]">Expected Amount</span>
                                <span className="text-ocu-gold block font-bold mt-0.5">₹{comic.price} INR</span>
                              </div>
                              <div className="col-span-2 pt-2 border-t border-white/5">
                                <span className="text-ocu-gray uppercase text-[8.5px]">Recipient Merchant</span>
                                <span className="text-white block mt-0.5 break-all">{MERCHANT_UPI_ID}</span>
                              </div>
                            </div>

                            {/* Drag & Drop Screenshot Uploader Area */}
                            <div className="space-y-2">
                              <span className="font-mono text-[9px] tracking-wider text-ocu-gray uppercase">Upload Payment Screenshot</span>
                              
                              <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsDragging(false);
                                  const file = e.dataTransfer.files?.[0];
                                  if (file && file.type.startsWith('image/')) {
                                    handleScreenshotFile(file);
                                  } else {
                                    setVerificationError('Please upload a valid image file (PNG/JPEG).');
                                  }
                                }}
                                onClick={() => document.getElementById('screenshot-file-input')?.click()}
                                className={`relative border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[160px] ${
                                  isDragging
                                    ? 'border-ocu-gold bg-ocu-gold/5'
                                    : screenshotBase64
                                      ? 'border-emerald-500/30 bg-emerald-950/10'
                                      : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                                }`}
                              >
                                <input
                                  id="screenshot-file-input"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleScreenshotFile(file);
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />

                                {screenshotBase64 ? (
                                  <div className="w-full flex flex-col sm:flex-row items-center gap-4 text-left z-0">
                                    <div className="w-20 h-20 rounded border border-white/10 overflow-hidden flex-shrink-0 bg-neutral-900 relative">
                                      <img
                                        src={screenshotBase64}
                                        alt="Screenshot Preview"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                      <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-semibold">
                                        Screenshot Loaded
                                      </span>
                                      <p className="font-mono text-xs text-white truncate mt-1.5 font-bold">
                                        {screenshotFile?.name}
                                      </p>
                                      <p className="font-sans text-[10px] text-ocu-gray">
                                        Size: {screenshotFile ? (screenshotFile.size / 1024).toFixed(1) : '0'} KB • Click or Drag to change
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2.5 z-0">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-ocu-gray mx-auto">
                                      <UploadCloud size={18} />
                                    </div>
                                    <div>
                                      <p className="font-sans text-xs text-white font-medium">
                                        Drag and drop your transaction screenshot here
                                      </p>
                                      <p className="font-sans text-[10px] text-ocu-gray mt-1">
                                        or <span className="text-ocu-gold hover:underline font-semibold">browse local files</span> (PNG, JPG, JPEG)
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Verification Feedback (Success / Error / Simulated Note) */}
                            {verificationError && (
                              <div className="flex flex-col gap-1.5 bg-rose-950/20 border border-rose-500/20 p-4 rounded-lg text-xs font-mono">
                                <div className="flex items-center gap-2 text-rose-400 font-bold">
                                  <AlertCircle size={14} className="flex-shrink-0" />
                                  <span>VERIFICATION FAILURE</span>
                                </div>
                                <p className="text-rose-300 font-sans leading-relaxed text-[11px] mt-1 pl-6">
                                  {verificationError}
                                </p>
                                <p className="text-ocu-gray text-[10px] pl-6 font-sans mt-2">
                                  You can try uploading another screenshot or contact the administrator if you believe this is an error.
                                </p>
                              </div>
                            )}

                            {/* Verified details view when success occurs */}
                            {stage === 'verify' && loading && (
                              <div className="bg-black/60 border border-white/5 rounded-lg p-4 font-mono text-[10px] space-y-2 animate-pulse">
                                <div className="flex items-center justify-between text-ocu-gold font-bold">
                                  <span>AI OCR SCANNER STATUS</span>
                                  <span className="flex items-center gap-1">
                                    <RefreshCw size={10} className="animate-spin" />
                                    ANALYZING...
                                  </span>
                                </div>
                                <div className="space-y-1 text-ocu-gray text-[9px]">
                                  <p>▸ Extracting payment recipient UPI address...</p>
                                  <p>▸ Matching transaction amount to ₹{comic.price}...</p>
                                  <p>▸ Verifying payment timestamp is within 5 minutes of checkout...</p>
                                  <p>▸ Checking image parameters for success signals...</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {stage === 'failed' && (
                        <div className="space-y-6">
                          <div>
                            {/* Upper Header info */}
                            <div className="flex items-center gap-2 mb-4">
                              <AlertCircle className="text-rose-400 animate-pulse" size={16} />
                              <span className="font-mono text-[9px] font-bold tracking-widest text-rose-400 uppercase">
                                TRANSACTION CANCELLED / FAILED
                              </span>
                            </div>

                            <h4 className="font-display font-bold text-lg text-white mb-2 uppercase">
                              Payment Failed
                            </h4>
                            
                            {/* The clear requested message */}
                            <div className="bg-rose-950/20 border border-rose-500/10 rounded-lg p-5 my-6 text-center">
                              <p className="font-sans text-sm text-rose-300 font-semibold leading-relaxed">
                                "Payment was cancelled or not completed."
                              </p>
                              <p className="font-sans text-xs text-ocu-gray mt-2">
                                The secure UPI gateway timed out, was rejected, or was manually terminated. Do not worry — no funds have been debited.
                              </p>
                            </div>

                            <p className="font-sans text-xs text-ocu-gray leading-relaxed mb-6">
                              If you experienced an error with Google Pay or your UPI app, you can easily go back to choose a different method or re-initiate the payment request.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fixed/Sticky Bottom Payment Action Bar */}
                {stage === 'selection' && (
                  <div className="w-full min-h-[72px] bg-black/95 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between z-30 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sticky bottom-0">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] tracking-widest text-ocu-gray uppercase">Total Amount</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display font-black text-xl md:text-2xl text-ocu-gold">₹{finalPrice}</span>
                        <span className="font-mono text-[9px] text-ocu-gray">INR</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        id="btn-cancel-checkout"
                        type="button"
                        onClick={resetState}
                        className="px-4 py-2.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-mono text-xs tracking-wider uppercase rounded transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>

                      {appliedCoupon?.type === 'free_comic' ? (
                        <button
                          id="btn-claim-free-comic"
                          type="button"
                          onClick={handleClaimFreeComic}
                          disabled={loading}
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 transition-all duration-300 font-display text-xs font-bold tracking-widest text-black uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 rounded font-semibold animate-pulse"
                        >
                          {loading ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-black" />
                              <span>CLAIMING...</span>
                            </>
                          ) : (
                            <span>Claim Comic</span>
                          )}
                        </button>
                      ) : (
                        <button
                          id="btn-proceed-to-pay"
                          type="submit"
                          disabled={loading}
                          className="px-6 py-2.5 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover hover:scale-[1.01] transition-all duration-300 font-display text-xs font-bold tracking-widest text-white uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ocu-crimson/20 rounded font-semibold"
                        >
                          {loading ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-white" />
                              <span>PROCESSING...</span>
                            </>
                          ) : (
                            <span>Proceed to Pay</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {stage === 'awaiting' && (
                  <div className="w-full min-h-[72px] bg-black/95 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between z-30 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sticky bottom-0">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] tracking-widest text-ocu-gray uppercase">Total Amount</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display font-black text-xl md:text-2xl text-ocu-gold">₹{finalPrice}</span>
                        <span className="font-mono text-[9px] text-ocu-gray">INR</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelPayment}
                        className="px-4 py-2.5 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-500/20 font-mono text-xs tracking-wider uppercase rounded transition-all cursor-pointer"
                      >
                        Cancel Payment
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSuccess}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-display text-xs font-bold tracking-widest uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20"
                      >
                        <span>Verify Payment</span>
                      </button>
                    </div>
                  </div>
                )}

                {stage === 'verify' && (
                  <div className="w-full min-h-[72px] bg-black/95 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between z-30 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sticky bottom-0">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] tracking-widest text-ocu-gray uppercase">Total Amount</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display font-black text-xl md:text-2xl text-ocu-gold">₹{finalPrice}</span>
                        <span className="font-mono text-[9px] text-ocu-gray">INR</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStage('awaiting');
                          setVerificationError('');
                        }}
                        disabled={loading}
                        className="px-4 py-2.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-mono text-xs tracking-wider uppercase rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyPayment}
                        disabled={loading || !screenshotBase64}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display text-xs font-bold tracking-widest uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>VERIFYING...</span>
                          </>
                        ) : (
                          <span>Verify Payment</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {stage === 'failed' && (
                  <div className="w-full min-h-[72px] bg-black/95 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between z-30 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sticky bottom-0">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] tracking-widest text-ocu-gray uppercase">Total Amount</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display font-black text-xl md:text-2xl text-ocu-gold">₹{finalPrice}</span>
                        <span className="font-mono text-[9px] text-ocu-gray">INR</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetState}
                        className="px-4 py-2.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-mono text-xs tracking-wider uppercase rounded transition-colors cursor-pointer"
                      >
                        Cancel & Close
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStage('selection'); setError(''); }}
                        className="px-5 py-2.5 bg-gradient-to-r from-ocu-crimson to-red-700 hover:brightness-110 text-white font-display text-xs font-bold tracking-widest uppercase rounded cursor-pointer transition-all"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              /* Success Receipt Display with Scroll wrapper */
              <div className="flex-grow overflow-y-auto p-0">
                <motion.div
                  id="purchase-success-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 md:p-12 text-center flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 scale-up-pulse">
                    <CheckCircle size={32} />
                  </div>

                  <h3 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight uppercase mb-2">
                    TRANSACTION COMPLETED
                  </h3>
                  <p className="font-mono text-xs text-ocu-gold tracking-widest uppercase mb-8 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    Access Granted • Volume Registered
                    <Sparkles size={12} />
                  </p>

                  {/* Ticket Receipt Container */}
                  <div className="w-full max-w-md bg-black/30 border border-white/10 rounded-lg p-6 text-left font-mono text-xs space-y-4 relative mb-8">
                    {/* Visual cutouts */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-ocu-graphite rounded-r-full border-r border-white/10 -ml-[1px]" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-ocu-graphite rounded-l-full border-l border-white/10 -mr-[1px]" />
                    
                    <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-ocu-gray">TRANSACTION ID</span>
                      <span className="text-white font-bold">{txId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ocu-gray">ITEM</span>
                      <span className="text-white font-semibold">OCU Vol. 0{comic.volumeNumber} ({comic.releaseStatus})</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-400">
                        <span className="text-emerald-400">COUPON APPLIED</span>
                        <span className="font-bold">{appliedCoupon.code}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-ocu-gray">TOTAL CHARGE</span>
                      <span className="text-white font-bold">₹{finalPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ocu-gray">GATEWAY VIA</span>
                      <span className="text-white uppercase font-bold">{appliedCoupon?.type === 'free_comic' ? 'CLAIM PROTOCOL' : `${method === 'gpay' ? 'Google Pay' : 'UPI'} DIRECT`}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-white/5">
                      <span className="text-ocu-gray">STATUS</span>
                      <span className="text-emerald-400 font-bold uppercase">SECURED & DELIVERED</span>
                    </div>
                  </div>

                  <p className="max-w-md font-sans text-xs text-ocu-gray leading-relaxed mb-8">
                    Your purchase was processed securely. A premium high-definition digital comic file has been dispatched to your universal reader feed.
                  </p>

                  <button
                    id="btn-return-from-purchase"
                    onClick={resetState}
                    className="px-8 py-3.5 bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 hover:border-white transition-all duration-300 font-display text-xs font-bold tracking-widest uppercase cursor-pointer"
                  >
                    Return to Universe Hub
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
