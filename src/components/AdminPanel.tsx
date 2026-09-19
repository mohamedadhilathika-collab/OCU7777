import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Key, Plus, Trash2, RotateCcw, Eye, ToggleLeft, ToggleRight, 
  Clock, CheckCircle, XCircle, Search, AlertTriangle, Sparkles, Check, 
  Database, Activity, Edit3, BookOpen, DollarSign, UploadCloud, Tag, 
  Calendar, Layers, Archive, CheckSquare, X, LogOut, Settings, Award,
  AlertCircle, Copy, GraduationCap,
  Ban, UserX, UserCheck, RefreshCw
} from 'lucide-react';
import { ComicVolume, GiftCode, RedemptionHistory, Order, DiscountCoupon, FreeComicCoupon, CouponRedemption, AcademyResource, UserProfile } from '../types';
import AcademyAdminTab from './AcademyAdminTab';
import { 
  saveComicInSupabase, 
  deleteComicFromSupabase, 
  saveGiftCodeInSupabase, 
  deleteGiftCodeFromSupabase, 
  uploadFileToSupabase,
  deleteFileFromSupabase,
  isSupabaseConfigured,
  getMissingTables,
  saveOrderInSupabase,
  deleteOrderFromSupabase,
  saveDiscountCoupon,
  deleteDiscountCoupon,
  saveFreeComicCoupon,
  deleteFreeComicCoupon,
  fetchAllUserProfiles,
  updateUserBan,
  isUserTemporarilyBanned
} from '../lib/supabase';

interface AdminPanelProps {
  comics: ComicVolume[];
  setComics: React.Dispatch<React.SetStateAction<ComicVolume[]>>;
  giftCodes: GiftCode[];
  setGiftCodes: React.Dispatch<React.SetStateAction<GiftCode[]>>;
  redemptionHistory: RedemptionHistory[];
  onToggleCode: (code: string) => void;
  onResetCode: (code: string) => void;
  onDeleteCode: (code: string) => void;
  onAddCode: (code: string) => void;
  onClearHistory: () => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  adminAccessCode: string;
  onChangeAccessCode: (newCode: string) => void;
  onLogout: () => void;
  onRefreshData?: () => Promise<void>;
  
  // Coupon Props
  discountCoupons: DiscountCoupon[];
  setDiscountCoupons: React.Dispatch<React.SetStateAction<DiscountCoupon[]>>;
  freeComicCoupons: FreeComicCoupon[];
  setFreeComicCoupons: React.Dispatch<React.SetStateAction<FreeComicCoupon[]>>;
  couponRedemptions: CouponRedemption[];
  setCouponRedemptions: React.Dispatch<React.SetStateAction<CouponRedemption[]>>;

  // Academy Props
  academyHeading: string;
  setAcademyHeading: React.Dispatch<React.SetStateAction<string>>;
  academyResources: AcademyResource[];
  setAcademyResources: React.Dispatch<React.SetStateAction<AcademyResource[]>>;
  onSaveAcademyHeading?: (heading: string) => Promise<void>;
  onSaveAcademyResource?: (resource: AcademyResource) => Promise<void>;
  onDeleteAcademyResource?: (resourceId: string, index?: number) => Promise<void>;
}

interface CinematicUploaderProps {
  label: string;
  accept: string;
  value: string;
  onChange: (fileName: string) => void;
  onFileLoaded?: (file: File) => void;
  icon: React.ComponentType<any>;
}

function CinematicUploader({ label, accept, value, onChange, onFileLoaded, icon: Icon }: CinematicUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleFile = (file: File) => {
    setProgress(0);
    setStatus('Reading file header...');
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setStatus('Encryption & hash verification completed!');
        clearInterval(interval);
        // Delay resetting progress representation slightly for premium feel
        setTimeout(() => {
          setProgress(null);
          onChange(file.name);
          onFileLoaded?.(file);
        }, 1000);
      } else {
        setProgress(currentProgress);
        if (currentProgress < 25) {
          setStatus('Streaming upload chunks...');
        } else if (currentProgress < 50) {
          setStatus('Scanning file for integrity & viruses...');
        } else if (currentProgress < 75) {
          setStatus('Applying DRM encryption envelope...');
        } else {
          setStatus('Finalizing cloud deployment...');
        }
      }
    }, 120);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="space-y-1.5 text-left">
      <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider">
        {label}
      </label>
      
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[120px] ${
          isDragging 
            ? 'border-ocu-gold bg-ocu-gold/5' 
            : value 
              ? 'border-emerald-500/30 bg-emerald-950/5' 
              : 'border-white/10 hover:border-white/20 bg-black/20'
        }`}
      >
        <input
          type="file"
          accept={accept}
          onChange={onSelectFile}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        
        {progress !== null ? (
          <div className="w-full space-y-3 z-0 px-4">
            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-ocu-gold uppercase tracking-wider">{status}</span>
              <span className="text-white font-bold">{progress}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-ocu-crimson to-ocu-gold transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 z-0">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-ocu-gray mx-auto">
              <Icon size={14} />
            </div>
            
            <p className="font-sans text-xs text-white">
              Drag & drop or <span className="text-ocu-gold hover:underline font-semibold">browse</span>
            </p>
            
            <p className="font-mono text-[8px] text-ocu-gray uppercase tracking-wider">
              {accept === '.pdf' ? 'PDF (HD delivery, up to 100MB)' : 'JPEG, PNG, WEBP'}
            </p>
          </div>
        )}

        {value && progress === null && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle size={10} />
            <span className="max-w-[140px] truncate">{value}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const sqlSetupCode = `-- COVEREIGN DATABASE INITIALIZATION SCHEMA
-- Paste this script into your Supabase SQL Editor (https://database.supabase.com) and click Run.

-- 1. Create comics table
CREATE TABLE IF NOT EXISTS public.comics (
    id TEXT PRIMARY KEY,
    volume_number INTEGER,
    title TEXT NOT NULL,
    release_status TEXT DEFAULT 'Draft',
    short_description TEXT,
    long_description TEXT,
    price NUMERIC DEFAULT 0,
    pages INTEGER DEFAULT 0,
    writer TEXT,
    artist TEXT,
    cover_gradient TEXT,
    release_date TEXT,
    categories TEXT[] DEFAULT '{}',
    genres TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    reading_age TEXT,
    featured BOOLEAN DEFAULT false,
    cover_image TEXT,
    banner_image TEXT,
    preview_images TEXT[] DEFAULT '{}',
    digital_file TEXT,
    series TEXT,
    subtitle TEXT,
    language TEXT DEFAULT 'English',
    is_premium BOOLEAN DEFAULT false,
    published_date TEXT,
    downloads_count INTEGER DEFAULT 0,
    purchases_count INTEGER DEFAULT 0,
    allow_gift_access BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TEXT
);

-- 2. Create gift_codes table
CREATE TABLE IF NOT EXISTS public.gift_codes (
    code TEXT PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'Unredeemed',
    remaining_uses INTEGER DEFAULT 1,
    usage_limit INTEGER DEFAULT 1,
    expiration_date TEXT,
    redeemed_by TEXT,
    redeemed_at TEXT
);

-- 3. Create redemption_history table
CREATE TABLE IF NOT EXISTS public.redemption_history (
    id TEXT PRIMARY KEY,
    code TEXT,
    user_email TEXT,
    redeemed_at TEXT
);

-- 4. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    comic_id TEXT,
    comic_title TEXT,
    customer_email TEXT,
    purchase_date TEXT,
    price NUMERIC,
    status TEXT DEFAULT 'Pending',
    payment_status TEXT DEFAULT 'Unpaid'
);

-- 5. Create admin_settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 6. Create promotions tables
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percentage NUMERIC NOT NULL,
    apply_type TEXT NOT NULL,
    comic_ids TEXT[] DEFAULT '{}',
    series_ids TEXT[] DEFAULT '{}',
    minimum_purchase NUMERIC,
    start_date TEXT,
    expiry_date TEXT,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    uses_per_user INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.free_comic_coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    comic_id TEXT NOT NULL,
    start_date TEXT,
    expiry_date TEXT,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    uses_per_user INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL,
    coupon_code TEXT NOT NULL,
    coupon_type TEXT NOT NULL,
    comic_id TEXT,
    user_email TEXT NOT NULL,
    discount_percent NUMERIC,
    original_price NUMERIC,
    final_price NUMERIC,
    redeemed_at TEXT
);

-- 9. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    last_login TEXT,
    banned_until TIMESTAMPTZ
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;

-- Seed initial admin access code
INSERT INTO public.admin_settings (key, value)
VALUES ('admin_access_code', 'OCU-ADMIN-2026')
ON CONFLICT (key) DO NOTHING;

-- Disable Row Level Security on public tables for seamless client interaction and offline seeding fallback
ALTER TABLE public.comics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_comic_coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you wish to keep Row Level Security (RLS) enabled, run these permissive public policies:
DROP POLICY IF EXISTS "Allow all public actions" ON public.comics;
CREATE POLICY "Allow all public actions" ON public.comics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.gift_codes;
CREATE POLICY "Allow all public actions" ON public.gift_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.redemption_history;
CREATE POLICY "Allow all public actions" ON public.redemption_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.orders;
CREATE POLICY "Allow all public actions" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.admin_settings;
CREATE POLICY "Allow all public actions" ON public.admin_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.discount_coupons;
CREATE POLICY "Allow all public actions" ON public.discount_coupons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.free_comic_coupons;
CREATE POLICY "Allow all public actions" ON public.free_comic_coupons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.coupon_redemptions;
CREATE POLICY "Allow all public actions" ON public.coupon_redemptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all public actions" ON public.profiles;
CREATE POLICY "Allow all public actions" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 6b. Academy Resources & Study Materials Table
CREATE TABLE IF NOT EXISTS public.academy_resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    stream TEXT,
    badge TEXT,
    description TEXT,
    features TEXT[] DEFAULT '{}',
    chapters JSONB DEFAULT '[]',
    exam_tips TEXT[] DEFAULT '{}',
    doc_pages INTEGER DEFAULT 40,
    pdf_url TEXT,
    pdf_file_name TEXT,
    tier TEXT DEFAULT 'free',
    price_inr NUMERIC DEFAULT 0,
    updated_at TEXT
);

ALTER TABLE public.academy_resources DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all public actions" ON public.academy_resources;
CREATE POLICY "Allow all public actions" ON public.academy_resources FOR ALL USING (true) WITH CHECK (true);

-- 7. Setup storage buckets (comics_assets & academy-materials)
DO $$
BEGIN
  -- Insert buckets if possible, ignore errors if restricted
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES 
      ('comics_assets', 'comics_assets', true),
      ('academy-materials', 'academy-materials', true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not insert storage bucket: %', SQLERRM;
  END;

  -- Create policies on storage.objects with exception handling for permission safety
  BEGIN
    DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
    CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT TO public USING (bucket_id IN ('comics_assets', 'academy-materials'));
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set up storage SELECT policy: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Public Insert Access" ON storage.objects;
    CREATE POLICY "Public Insert Access" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id IN ('comics_assets', 'academy-materials'));
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set up storage INSERT policy: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
    CREATE POLICY "Public Update Access" ON storage.objects FOR UPDATE TO public USING (bucket_id IN ('comics_assets', 'academy-materials'));
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set up storage UPDATE policy: %', SQLERRM;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
    CREATE POLICY "Public Delete Access" ON storage.objects FOR DELETE TO public USING (bucket_id IN ('comics_assets', 'academy-materials'));
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set up storage DELETE policy: %', SQLERRM;
  END;
END $$;

-- 8. Enable Realtime Replication on all synchronized tables (Required for live cross-device sync)
DO $$
DECLARE
  t_name TEXT;
  tables_to_add TEXT[] := ARRAY['comics', 'gift_codes', 'redemption_history', 'orders', 'admin_settings', 'discount_coupons', 'free_comic_coupons', 'coupon_redemptions', 'profiles', 'academy_resources'];
BEGIN
  FOREACH t_name IN ARRAY tables_to_add LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = t_name
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_publication p ON p.oid = pr.prpubid 
      JOIN pg_class c ON c.oid = pr.prrelid 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE p.pubname = 'supabase_realtime' 
      AND n.nspname = 'public' 
      AND c.relname = t_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t_name);
    END IF;
  END LOOP;
END $$;
`;

type AdminTab = 'comics' | 'academy' | 'vouchers' | 'orders' | 'promotions' | 'security' | 'trash';

export default function AdminPanel({
  comics,
  setComics,
  giftCodes,
  setGiftCodes,
  redemptionHistory,
  onToggleCode,
  onResetCode,
  onDeleteCode,
  onAddCode,
  onClearHistory,
  orders,
  setOrders,
  adminAccessCode,
  onChangeAccessCode,
  onLogout,
  onRefreshData,
  discountCoupons,
  setDiscountCoupons,
  freeComicCoupons,
  setFreeComicCoupons,
  couponRedemptions,
  setCouponRedemptions,
  academyHeading,
  setAcademyHeading,
  academyResources,
  setAcademyResources,
  onSaveAcademyHeading,
  onSaveAcademyResource,
  onDeleteAcademyResource
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('comics');
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Comic Trash / Delete States
  const [comicToDelete, setComicToDelete] = useState<ComicVolume | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showPermanentWarning, setShowPermanentWarning] = useState(false);

  // Comic CRUD States
  const [editingComic, setEditingComic] = useState<ComicVolume | null>(null);
  const [isAddingComic, setIsAddingComic] = useState(false);
  
  // Comic Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formVolume, setFormVolume] = useState<number>(1);
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formLongDesc, setFormLongDesc] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formPages, setFormPages] = useState<number>(48);
  const [formWriter, setFormWriter] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formReleaseDate, setFormReleaseDate] = useState('');
  const [formReleaseStatus, setFormReleaseStatus] = useState<ComicVolume['releaseStatus']>('Released');
  const [formCoverGradient, setFormCoverGradient] = useState('from-blue-900 via-purple-950 to-neutral-950');
  const [formCategories, setFormCategories] = useState('');
  const [formGenres, setFormGenres] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formReadingAge, setFormReadingAge] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formBannerImage, setFormBannerImage] = useState('');
  const [formPreviewImages, setFormPreviewImages] = useState('');
  const [formDigitalFile, setFormDigitalFile] = useState('');
  const [formSeries, setFormSeries] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formLanguage, setFormLanguage] = useState('English');
  const [formIsPremium, setFormIsPremium] = useState(true);
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);
  const [uploadedCoverFile, setUploadedCoverFile] = useState<File | null>(null);
  const [uploadedBannerFile, setUploadedBannerFile] = useState<File | null>(null);

  // Comic Form Status States
  const [comicFormError, setComicFormError] = useState<string | null>(null);
  const [comicFormSuccess, setComicFormSuccess] = useState<string | null>(null);
  const [dashboardSuccess, setDashboardSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Voucher Extended Form States
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherUsageLimit, setVoucherUsageLimit] = useState<number>(1);
  const [voucherExpiration, setVoucherExpiration] = useState('');
  const [voucherFeedback, setVoucherFeedback] = useState<string | null>(null);
  const [isAddingVoucher, setIsAddingVoucher] = useState(false);
  const [voucherSearch, setVoucherSearch] = useState('');

  // Voucher Editing States
  const [editingVoucher, setEditingVoucher] = useState<GiftCode | null>(null);

  // Orders Search & State
  const [orderSearch, setOrderSearch] = useState('');

  // Promotions & Coupon States
  const [promoActiveSubTab, setPromoActiveSubTab] = useState<'percentage' | 'free_comic' | 'redemptions' | 'analytics'>('percentage');
  const [promoSearch, setPromoSearch] = useState('');
  const [promoFilter, setPromoFilter] = useState<'all' | 'active' | 'expired' | 'disabled'>('all');
  const [isAddingDiscount, setIsAddingDiscount] = useState(false);
  const [isAddingFree, setIsAddingFree] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCoupon | null>(null);
  const [editingFree, setEditingFree] = useState<FreeComicCoupon | null>(null);

  // Discount Coupon Form Fields
  const [dcCode, setDcCode] = useState('');
  const [dcPercentage, setDcPercentage] = useState<number>(20);
  const [dcApplyType, setDcApplyType] = useState<'entire_store' | 'selected_comics' | 'selected_series'>('entire_store');
  const [dcComicIds, setDcComicIds] = useState<string[]>([]);
  const [dcSeriesIds, setDcSeriesIds] = useState<string[]>([]);
  const [dcMinimumPurchase, setDcMinimumPurchase] = useState('');
  const [dcStartDate, setDcStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dcExpiryDate, setDcExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [dcMaxUses, setDcMaxUses] = useState<number>(100);
  const [dcUsesPerUser, setDcUsesPerUser] = useState<number>(1);
  const [dcActive, setDcActive] = useState(true);

  // Free Comic Coupon Form Fields
  const [fcCode, setFcCode] = useState('');
  const [fcComicId, setFcComicId] = useState('');
  const [fcStartDate, setFcStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fcExpiryDate, setFcExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [fcMaxUses, setFcMaxUses] = useState<number>(100);
  const [fcUsesPerUser, setFcUsesPerUser] = useState<number>(1);
  const [fcActive, setFcActive] = useState(true);

  // Status & Feedback
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // User Profiles & Temporary Bans Management States
  const [profilesList, setProfilesList] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [banStatusFeedback, setBanStatusFeedback] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data = await fetchAllUserProfiles();
      setProfilesList(data);
    } catch (err) {
      console.error('Failed to load user profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleApplyBan = async (userId: string, hours: number) => {
    const banUntilDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const success = await updateUserBan(userId, banUntilDate);
    if (success) {
      setBanStatusFeedback(`Ban applied until ${new Date(banUntilDate).toLocaleString()}`);
      await loadProfiles();
      setTimeout(() => setBanStatusFeedback(null), 4000);
    } else {
      setBanStatusFeedback('Failed to update ban status in Supabase.');
    }
  };

  const handleLiftBan = async (userId: string) => {
    const success = await updateUserBan(userId, null);
    if (success) {
      setBanStatusFeedback('Ban lifted successfully.');
      await loadProfiles();
      setTimeout(() => setBanStatusFeedback(null), 4000);
    } else {
      setBanStatusFeedback('Failed to lift ban in Supabase.');
    }
  };

  // --- PROMOTIONS EVENT HANDLERS ---

  const showPromoFeedback = (type: 'success' | 'error', message: string) => {
    setPromoFeedback({ type, message });
    setTimeout(() => {
      setPromoFeedback(null);
    }, 4000);
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dcCode.trim()) {
      showPromoFeedback('error', 'Coupon code cannot be empty.');
      return;
    }
    if (dcPercentage <= 0 || dcPercentage > 100) {
      showPromoFeedback('error', 'Discount percentage must be between 1 and 100.');
      return;
    }

    setPromoLoading(true);
    const codeUpper = dcCode.toUpperCase().trim();
    const isNew = !editingDiscount;

    // Check code duplication (only if new)
    if (isNew && discountCoupons.some(c => c.code.toUpperCase() === codeUpper)) {
      showPromoFeedback('error', `A coupon with code "${codeUpper}" already exists.`);
      setPromoLoading(false);
      return;
    }

    const couponId = editingDiscount ? editingDiscount.id : 'dc_' + Math.random().toString(36).substr(2, 9);
    
    const newCoupon: DiscountCoupon = {
      id: couponId,
      code: codeUpper,
      discountPercentage: Number(dcPercentage),
      applyType: dcApplyType,
      comicIds: dcApplyType === 'selected_comics' ? dcComicIds : [],
      seriesIds: dcApplyType === 'selected_series' ? dcSeriesIds : [],
      minimumPurchase: dcMinimumPurchase ? Number(dcMinimumPurchase) : undefined,
      startDate: dcStartDate,
      expiryDate: dcExpiryDate,
      maxUses: Number(dcMaxUses),
      usedCount: editingDiscount ? editingDiscount.usedCount : 0,
      usesPerUser: Number(dcUsesPerUser),
      active: dcActive,
      createdAt: editingDiscount ? editingDiscount.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveDiscountCoupon(newCoupon);
      
      // Update local states immediately
      setDiscountCoupons(prev => {
        if (isNew) {
          return [newCoupon, ...prev];
        } else {
          return prev.map(c => c.id === couponId ? newCoupon : c);
        }
      });

      showPromoFeedback('success', `Percentage coupon "${codeUpper}" saved successfully.`);
      setIsAddingDiscount(false);
      setEditingDiscount(null);
      
      // Reset form fields
      setDcCode('');
      setDcPercentage(20);
      setDcApplyType('entire_store');
      setDcComicIds([]);
      setDcSeriesIds([]);
      setDcMinimumPurchase('');
    } catch (err: any) {
      showPromoFeedback('error', err.message || 'Failed to save percentage coupon.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSaveFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcCode.trim()) {
      showPromoFeedback('error', 'Coupon code cannot be empty.');
      return;
    }
    if (!fcComicId) {
      showPromoFeedback('error', 'Please select a comic to unlock.');
      return;
    }

    setPromoLoading(true);
    const codeUpper = fcCode.toUpperCase().trim();
    const isNew = !editingFree;

    if (isNew && freeComicCoupons.some(c => c.code.toUpperCase() === codeUpper)) {
      showPromoFeedback('error', `A coupon with code "${codeUpper}" already exists.`);
      setPromoLoading(false);
      return;
    }

    const couponId = editingFree ? editingFree.id : 'fc_' + Math.random().toString(36).substr(2, 9);
    
    const newCoupon: FreeComicCoupon = {
      id: couponId,
      code: codeUpper,
      comicId: fcComicId,
      startDate: fcStartDate,
      expiryDate: fcExpiryDate,
      maxUses: Number(fcMaxUses),
      usedCount: editingFree ? editingFree.usedCount : 0,
      usesPerUser: Number(fcUsesPerUser),
      active: fcActive,
      createdAt: editingFree ? editingFree.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveFreeComicCoupon(newCoupon);
      
      setFreeComicCoupons(prev => {
        if (isNew) {
          return [newCoupon, ...prev];
        } else {
          return prev.map(c => c.id === couponId ? newCoupon : c);
        }
      });

      showPromoFeedback('success', `Free comic coupon "${codeUpper}" saved successfully.`);
      setIsAddingFree(false);
      setEditingFree(null);
      
      setFcCode('');
      setFcComicId('');
    } catch (err: any) {
      showPromoFeedback('error', err.message || 'Failed to save free comic coupon.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleToggleDiscount = async (coupon: DiscountCoupon) => {
    setPromoLoading(true);
    const updated: DiscountCoupon = {
      ...coupon,
      active: !coupon.active,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveDiscountCoupon(updated);
      setDiscountCoupons(prev => prev.map(c => c.id === coupon.id ? updated : c));
      showPromoFeedback('success', `Coupon "${coupon.code}" is now ${updated.active ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      showPromoFeedback('error', err.message || 'Failed to toggle coupon status.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleToggleFree = async (coupon: FreeComicCoupon) => {
    setPromoLoading(true);
    const updated: FreeComicCoupon = {
      ...coupon,
      active: !coupon.active,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveFreeComicCoupon(updated);
      setFreeComicCoupons(prev => prev.map(c => c.id === coupon.id ? updated : c));
      showPromoFeedback('success', `Coupon "${coupon.code}" is now ${updated.active ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      showPromoFeedback('error', err.message || 'Failed to toggle coupon status.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleDeleteDiscountCoupon = async (couponId: string, code: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete percentage coupon "${code}"?`)) return;
    setPromoLoading(true);
    try {
      await deleteDiscountCoupon(couponId);
      setDiscountCoupons(prev => prev.filter(c => c.id !== couponId));
      showPromoFeedback('success', `Percentage coupon "${code}" deleted.`);
    } catch (err: any) {
      showPromoFeedback('error', err.message || 'Failed to delete coupon.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleDeleteFreeCoupon = async (couponId: string, code: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete free comic coupon "${code}"?`)) return;
    setPromoLoading(true);
    try {
      await deleteFreeComicCoupon(couponId);
      setFreeComicCoupons(prev => prev.filter(c => c.id !== couponId));
      showPromoFeedback('success', `Free comic coupon "${code}" deleted.`);
    } catch (err: any) {
      showPromoFeedback('error', err.message || 'Failed to delete coupon.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleStartEditDiscount = (coupon: DiscountCoupon) => {
    setEditingDiscount(coupon);
    setIsAddingDiscount(true);
    setDcCode(coupon.code);
    setDcPercentage(coupon.discountPercentage);
    setDcApplyType(coupon.applyType);
    setDcComicIds(coupon.comicIds);
    setDcSeriesIds(coupon.seriesIds);
    setDcMinimumPurchase(coupon.minimumPurchase ? String(coupon.minimumPurchase) : '');
    setDcStartDate(coupon.startDate);
    setDcExpiryDate(coupon.expiryDate);
    setDcMaxUses(coupon.maxUses);
    setDcUsesPerUser(coupon.usesPerUser);
    setDcActive(coupon.active);
  };

  const handleStartEditFree = (coupon: FreeComicCoupon) => {
    setEditingFree(coupon);
    setIsAddingFree(true);
    setFcCode(coupon.code);
    setFcComicId(coupon.comicId);
    setFcStartDate(coupon.startDate);
    setFcExpiryDate(coupon.expiryDate);
    setFcMaxUses(coupon.maxUses);
    setFcUsesPerUser(coupon.usesPerUser);
    setFcActive(coupon.active);
  };

  const handleDuplicateDiscountCoupon = (coupon: DiscountCoupon) => {
    setEditingDiscount(null);
    setIsAddingDiscount(true);
    setDcCode(coupon.code + '-COPY');
    setDcPercentage(coupon.discountPercentage);
    setDcApplyType(coupon.applyType);
    setDcComicIds(coupon.comicIds);
    setDcSeriesIds(coupon.seriesIds);
    setDcMinimumPurchase(coupon.minimumPurchase ? String(coupon.minimumPurchase) : '');
    setDcStartDate(coupon.startDate);
    setDcExpiryDate(coupon.expiryDate);
    setDcMaxUses(coupon.maxUses);
    setDcUsesPerUser(coupon.usesPerUser);
    setDcActive(coupon.active);
  };

  const handleDuplicateFreeCoupon = (coupon: FreeComicCoupon) => {
    setEditingFree(null);
    setIsAddingFree(true);
    setFcCode(coupon.code + '-COPY');
    setFcComicId(coupon.comicId);
    setFcStartDate(coupon.startDate);
    setFcExpiryDate(coupon.expiryDate);
    setFcMaxUses(coupon.maxUses);
    setFcUsesPerUser(coupon.usesPerUser);
    setFcActive(coupon.active);
  };

  // Security Form States
  const [currentCodeInput, setCurrentCodeInput] = useState('');
  const [newCodeInput, setNewCodeInput] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Open Form to Add Comic
  const openAddComicForm = () => {
    setComicFormError(null);
    setComicFormSuccess(null);
    setDashboardSuccess(null);
    setIsUploading(false);
    setUploadStatusText('');
    setEditingComic(null);
    setUploadedPDF(null);
    setUploadedCoverFile(null);
    setUploadedBannerFile(null);
    setFormTitle('');
    setFormVolume(comics.length + 1);
    setFormShortDesc('');
    setFormLongDesc('');
    setFormPrice(199);
    setFormPages(48);
    setFormWriter('Jonathan Hickman');
    setFormArtist('Esad Ribic');
    setFormReleaseDate('July 2026');
    setFormReleaseStatus('Released');
    setFormCoverGradient('from-blue-950 via-neutral-900 to-black');
    setFormCategories('Main, Sci-Fi');
    setFormGenres('Cosmic, Action');
    setFormTags('kinetic, singularity');
    setFormReadingAge('Teen (13+)');
    setFormFeatured(false);
    setFormCoverImage('');
    setFormBannerImage('');
    setFormPreviewImages('');
    setFormDigitalFile('ocu_digital_file_premium.pdf');
    setFormSeries('Omni Universe Mainline');
    setFormSubtitle('The Reckoning');
    setFormLanguage('English');
    setFormIsPremium(true);
    setIsAddingComic(true);
  };

  // Open Form to Edit Comic
  const openEditComicForm = (comic: ComicVolume) => {
    setComicFormError(null);
    setComicFormSuccess(null);
    setDashboardSuccess(null);
    setIsUploading(false);
    setUploadStatusText('');
    setEditingComic(comic);
    setUploadedPDF(null);
    setUploadedCoverFile(null);
    setUploadedBannerFile(null);
    setFormTitle(comic.title);
    setFormVolume(comic.volumeNumber);
    setFormShortDesc(comic.shortDescription);
    setFormLongDesc(comic.longDescription);
    setFormPrice(comic.price);
    setFormPages(comic.pages);
    setFormWriter(comic.writer);
    setFormArtist(comic.artist);
    setFormReleaseDate(comic.releaseDate);
    setFormReleaseStatus(comic.releaseStatus);
    setFormCoverGradient(comic.coverGradient);
    setFormCategories(comic.categories ? comic.categories.join(', ') : '');
    setFormGenres(comic.genres ? comic.genres.join(', ') : '');
    setFormTags(comic.tags ? comic.tags.join(', ') : '');
    setFormReadingAge(comic.readingAge || '');
    setFormFeatured(!!comic.featured);
    setFormCoverImage(comic.coverImage || '');
    setFormBannerImage(comic.bannerImage || '');
    setFormPreviewImages(comic.previewImages ? comic.previewImages.join(', ') : '');
    setFormDigitalFile(comic.digitalFile || '');
    setFormSeries(comic.series || '');
    setFormSubtitle(comic.subtitle || '');
    setFormLanguage(comic.language || 'English');
    setFormIsPremium(comic.isPremium !== undefined ? comic.isPremium : comic.price > 0);
    setIsAddingComic(true);
  };

  // Save with Local Offline Fallback has been migrated to standard Supabase save to maintain cloud-sync consistency across devices.
  const handleSaveWithLocalFallback = async () => {
    console.log('[DEBUG] Retrying cloud upload to Supabase via fallback action button...');
    const mockEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleComicSubmit(mockEvent);
  };

  // Submit Comic Form
  const handleComicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DEBUG-CREATE-VOLUME] >>> handleComicSubmit button handler CONNECTED and triggered! <<<');
    console.log('[DEBUG-CREATE-VOLUME] Initializing save function execution context...');
    
    setComicFormError(null);
    setComicFormSuccess(null);

    // 1. Verify Supabase Initialization & SDK Availability
    console.log('[DEBUG-CREATE-VOLUME] Step 1: Verifying Supabase SDK Initializations...');
    if (!isSupabaseConfigured) {
      console.warn('[DEBUG-CREATE-VOLUME] Supabase is not configured. Falling back to secure offline local state.');
    } else {
      console.log('[DEBUG-CREATE-VOLUME] Supabase client is configured and verified.');
    }

    // 2. Validate Required Fields & Input Integrity
    console.log('[DEBUG-CREATE-VOLUME] Step 2: Validating Form input fields...');
    if (!formTitle.trim()) {
      const errMsg = 'Comic Title is required.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }
    if (!formVolume || Number(formVolume) <= 0) {
      const errMsg = 'Volume Number must be a positive integer.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }
    if (!formShortDesc.trim()) {
      const errMsg = 'Short Description is required.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }
    if (formIsPremium && (!formPrice || Number(formPrice) <= 0)) {
      const errMsg = 'Price (₹ INR) must be greater than 0 for premium comics.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }
    if (!formWriter.trim()) {
      const errMsg = 'Writer name is required.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }
    if (!formArtist.trim()) {
      const errMsg = 'Artist name is required.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }
    if (!formReleaseDate.trim()) {
      const errMsg = 'Release Date text is required.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }

    // Cover Image is optional. If none is uploaded or provided in form, use a default OCU placeholder cover.
    let finalCoverUrl = formCoverImage;
    if (!editingComic && !uploadedCoverFile && !formCoverImage) {
      console.log('[DEBUG-CREATE-VOLUME] No cover image uploaded. Using default OCU placeholder cover.');
      finalCoverUrl = 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=600&auto=format&fit=crop';
    }

    // Comic PDF Validation remains mandatory
    if (!editingComic && !uploadedPDF && !formDigitalFile) {
      const errMsg = 'Please select or upload a Comic PDF Book.';
      console.warn('[DEBUG-CREATE-VOLUME] Validation warning:', errMsg);
      setComicFormError(errMsg);
      alert(`Validation Warning: ${errMsg}`);
      return;
    }

    console.log('[DEBUG-CREATE-VOLUME] Inputs are valid. Moving to asset upload / connection testing...');

    // Begin upload progress
    setIsUploading(true);
    setUploadStatusText('Preparing secure file payload...');

    const comicId = editingComic ? editingComic.id : formTitle.toLowerCase().replace(/\s+/g, '-');
    console.log(`[DEBUG-CREATE-VOLUME] Formulated ID for document: "${comicId}"`);
    
    let finalBannerUrl = formBannerImage;
    let finalPdfUrl = formDigitalFile;

    // 3. Upload Files or convert to local blob URLs
    try {
      if (isSupabaseConfigured) {
        if (uploadedCoverFile) {
          console.log('[DEBUG-CREATE-VOLUME] Uploading Cover File:', uploadedCoverFile.name, `(${uploadedCoverFile.size} bytes)`);
          setUploadStatusText('Uploading cover image: 0%...');
          finalCoverUrl = await uploadFileToSupabase(
            'covers',
            `${comicId}_cover.jpg`,
            uploadedCoverFile,
            (pct) => setUploadStatusText(`Uploading cover image: ${pct}%...`)
          );
          console.log('[DEBUG-CREATE-VOLUME] Cover Image uploaded successfully! URL:', finalCoverUrl);
          setFormCoverImage(finalCoverUrl);
        }
        
        if (uploadedBannerFile) {
          console.log('[DEBUG-CREATE-VOLUME] Uploading Banner File:', uploadedBannerFile.name, `(${uploadedBannerFile.size} bytes)`);
          setUploadStatusText('Uploading banner image: 0%...');
          finalBannerUrl = await uploadFileToSupabase(
            'banners',
            `${comicId}_banner.jpg`,
            uploadedBannerFile,
            (pct) => setUploadStatusText(`Uploading banner image: ${pct}%...`)
          );
          console.log('[DEBUG-CREATE-VOLUME] Banner Image uploaded successfully! URL:', finalBannerUrl);
          setFormBannerImage(finalBannerUrl);
        }

        if (uploadedPDF) {
          console.log('[DEBUG-CREATE-VOLUME] Uploading PDF E-book:', uploadedPDF.name, `(${uploadedPDF.size} bytes)`);
          setUploadStatusText('Uploading comic PDF book: 0%...');
          finalPdfUrl = await uploadFileToSupabase(
            'pdfs',
            `${comicId}.pdf`,
            uploadedPDF,
            (pct) => setUploadStatusText(`Uploading comic PDF book: ${pct}%...`)
          );
          console.log('[DEBUG-CREATE-VOLUME] PDF Book uploaded successfully! URL:', finalPdfUrl);
          setFormDigitalFile(finalPdfUrl);
        }
      } else {
        // Fallback to local Object URL for sandbox/preview testing
        console.log('[DEBUG-CREATE-VOLUME] Sandbox fallback: Creating local object URLs for assets...');
        if (uploadedCoverFile) {
          finalCoverUrl = URL.createObjectURL(uploadedCoverFile);
          console.log('[DEBUG-CREATE-VOLUME] Cover Image fallback URL created:', finalCoverUrl);
          setFormCoverImage(finalCoverUrl);
        }
        if (uploadedBannerFile) {
          finalBannerUrl = URL.createObjectURL(uploadedBannerFile);
          console.log('[DEBUG-CREATE-VOLUME] Banner Image fallback URL created:', finalBannerUrl);
          setFormBannerImage(finalBannerUrl);
        }
        if (uploadedPDF) {
          finalPdfUrl = URL.createObjectURL(uploadedPDF);
          console.log('[DEBUG-CREATE-VOLUME] PDF Book fallback URL created:', finalPdfUrl);
          setFormDigitalFile(finalPdfUrl);
        }
      }
    } catch (uploadErr: any) {
      console.error('[DEBUG-CREATE-VOLUME] Storage upload execution failed:', uploadErr);
      let verboseMessage = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      const errorDialogMsg = `[STORAGE FAILURE] Asset Upload Failed!\n\nError details: ${verboseMessage}\n\nPlease check your storage permissions and configuration.`;
      setComicFormError(`Asset Upload Failed: ${verboseMessage}`);
      alert(errorDialogMsg);
      setIsUploading(false);
      return;
    }

    // Fallback: If no banner image, default to cover image URL
    const resolvedBannerUrl = finalBannerUrl || finalCoverUrl;

    const parsedComic: ComicVolume = {
      ...(editingComic || {}),
      id: comicId,
      title: formTitle,
      volumeNumber: Number(formVolume),
      shortDescription: formShortDesc,
      longDescription: formLongDesc,
      price: formIsPremium ? Number(formPrice) : 0,
      pages: Number(formPages),
      writer: formWriter,
      artist: formArtist,
      releaseDate: formReleaseDate,
      releaseStatus: formReleaseStatus,
      coverGradient: formCoverGradient,
      categories: formCategories.split(',').map(s => s.trim()).filter(Boolean),
      genres: formGenres.split(',').map(s => s.trim()).filter(Boolean),
      tags: formTags.split(',').map(s => s.trim()).filter(Boolean),
      readingAge: formReadingAge,
      featured: formFeatured,
      coverImage: finalCoverUrl,
      bannerImage: resolvedBannerUrl,
      previewImages: formPreviewImages.split(',').map(s => s.trim()).filter(Boolean),
      digitalFile: finalPdfUrl,
      series: formSeries,
      subtitle: formSubtitle,
      language: formLanguage,
      isPremium: formIsPremium,
    };

    // 5. Save comic record
    if (isSupabaseConfigured) {
      console.log('[DEBUG-CREATE-VOLUME] Step 5: Invoking saveComicInSupabase for document payload...', parsedComic);
      setUploadStatusText('Writing immutable comic volume record to Supabase...');
      try {
        await saveComicInSupabase(parsedComic);
        console.log(`[DEBUG-CREATE-VOLUME] Document successfully written to Supabase for id: ${comicId}!`);
        if (onRefreshData) {
          await onRefreshData();
        }
      } catch (saveErr: any) {
        console.error('[DEBUG-CREATE-VOLUME] Supabase save operation failed:', saveErr);
        const verboseMessage = saveErr instanceof Error ? saveErr.message : String(saveErr);
        alert(`[Supabase Save Failure]\n\nFailed to save the comic volume record in Supabase.\n\nError: ${verboseMessage}`);
        setIsUploading(false);
        return;
      }
    } else {
      console.log('[DEBUG-CREATE-VOLUME] Step 5: Saved comic in-memory (Supabase offline preview):', parsedComic);
      let updatedComics: ComicVolume[];
      if (editingComic) {
        updatedComics = comics.map(c => c.id === editingComic.id ? parsedComic : c);
      } else {
        updatedComics = [...comics, parsedComic];
      }
      setComics(updatedComics);
    }

    // Show success banner & notification
    console.log('[DEBUG-CREATE-VOLUME] Save process COMPLETED successfully!');
    setDashboardSuccess(editingComic ? `Successfully updated "${formTitle}"!` : 'Volume Created Successfully');

    setUploadedPDF(null);
    setUploadedCoverFile(null);
    setUploadedBannerFile(null);

    // Reset state & close dialog immediately
    setIsUploading(false);
    setIsAddingComic(false);
    setEditingComic(null);
    setComicFormSuccess(null);
    console.log('[DEBUG-CREATE-VOLUME] Modal reset and form closed.');

    // Auto-fade dashboard success banner after 4 seconds
    setTimeout(() => {
      setDashboardSuccess(null);
    }, 4000);
  };

  // Move Comic to Trash
  const handleMoveToTrash = async (comic: ComicVolume) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const updatedComic = {
      ...comic,
      isDeleted: true,
      deletedAt: timestamp
    };
    if (isSupabaseConfigured) {
      try {
        await saveComicInSupabase(updatedComic);
        if (onRefreshData) {
          await onRefreshData();
        }
      } catch (err) {
        console.error('Error moving to trash in Supabase:', err);
        alert(`Error moving to trash: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      const updated = comics.map(c => c.id === comic.id ? updatedComic : c);
      setComics(updated);
    }
    
    setShowDeleteWarning(false);
    setShowPermanentWarning(false);
    setComicToDelete(null);
  };

  // Restore Comic from Trash
  const handleRestoreComic = async (comic: ComicVolume) => {
    const updatedComic = {
      ...comic,
      isDeleted: false,
      deletedAt: undefined
    };
    if (isSupabaseConfigured) {
      try {
        await saveComicInSupabase(updatedComic);
        if (onRefreshData) {
          await onRefreshData();
        }
      } catch (err) {
        console.error('Error restoring comic in Supabase:', err);
        alert(`Error restoring comic: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      const updated = comics.map(c => c.id === comic.id ? updatedComic : c);
      setComics(updated);
    }
  };

  // Confirm and Permanently Delete Comic
  const handleConfirmPermanentDelete = async (comic: ComicVolume) => {
    if (isSupabaseConfigured) {
      try {
        await deleteComicFromSupabase(comic.id);
        if (onRefreshData) {
          await onRefreshData();
        }
      } catch (err) {
        console.error('Error deleting comic from Supabase:', err);
        alert(`Error deleting comic: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      const updated = comics.filter(c => c.id !== comic.id);
      setComics(updated);
    }
    setShowDeleteWarning(false);
    setShowPermanentWarning(false);
    setComicToDelete(null);
  };

  // Change Comic Release Status (Publish, Archive, Unpublish)
  const setComicStatus = async (id: string, status: ComicVolume['releaseStatus']) => {
    const comic = comics.find(c => c.id === id);
    if (comic) {
      const updatedComic = { ...comic, releaseStatus: status };
      if (isSupabaseConfigured) {
        try {
          await saveComicInSupabase(updatedComic);
          if (onRefreshData) {
            await onRefreshData();
          }
        } catch (err) {
          console.error('Error updating status in Supabase:', err);
          alert(`Error updating status: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        const updated = comics.map(c => c.id === id ? updatedComic : c);
        setComics(updated);
      }
    }
  };

  // Toggle Featured
  const toggleFeaturedComic = async (id: string) => {
    const comic = comics.find(c => c.id === id);
    if (comic) {
      const updatedComic = { ...comic, featured: !comic.featured };
      if (isSupabaseConfigured) {
        try {
          await saveComicInSupabase(updatedComic);
          if (onRefreshData) {
            await onRefreshData();
          }
        } catch (err) {
          console.error('Error updating featured in Supabase:', err);
          alert(`Error updating featured: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        const updated = comics.map(c => c.id === id ? updatedComic : c);
        setComics(updated);
      }
    }
  };

  // Voucher Submit
  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = voucherCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (editingVoucher) {
      // Edit existing
      const originalCode = editingVoucher.code;
      const updatedVoucher: GiftCode = {
        ...editingVoucher,
        code: cleanCode,
        remainingUses: Number(voucherUsageLimit),
        usageLimit: Number(voucherUsageLimit),
        expirationDate: voucherExpiration || undefined
      };

      try {
        if (originalCode !== cleanCode) {
          await deleteGiftCodeFromSupabase(originalCode);
        }
        await saveGiftCodeInSupabase(updatedVoucher);
      } catch (err) {
        console.error('Error updating voucher in Supabase:', err);
      }

      const updated = giftCodes.map(c => {
        if (c.code === originalCode) {
          return updatedVoucher;
        }
        return c;
      });
      setGiftCodes(updated);
      setEditingVoucher(null);
    } else {
      // Add new
      if (giftCodes.some(c => c.code === cleanCode)) {
        setVoucherFeedback('Voucher code already exists.');
        return;
      }
      const newCode: GiftCode = {
        code: cleanCode,
        enabled: true,
        status: 'Unredeemed',
        remainingUses: Number(voucherUsageLimit),
        usageLimit: Number(voucherUsageLimit),
        expirationDate: voucherExpiration || undefined
      };
      
      try {
        await saveGiftCodeInSupabase(newCode);
      } catch (err) {
        console.error('Error saving new voucher in Supabase:', err);
      }
      
      const updated = [newCode, ...giftCodes];
      setGiftCodes(updated);
    }

    setVoucherCode('');
    setVoucherUsageLimit(1);
    setVoucherExpiration('');
    setVoucherFeedback(null);
    setIsAddingVoucher(false);
  };

  // Generate Coupon Code
  const generateRandomCoupon = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVoucherCode(`OCU-GIFT-${p1}-${p2}`);
  };

  // Order Actions
  const handleOrderStatus = async (orderId: string, status: Order['status']) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, status };
    const updated = orders.map(o => o.id === orderId ? updatedOrder : o);
    setOrders(updated);
    try {
      await saveOrderInSupabase(updatedOrder);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Error updating order status in Supabase:', err);
    }
  };

  const handleOrderPaymentStatus = async (orderId: string, status: Order['paymentStatus']) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, paymentStatus: status };
    const updated = orders.map(o => o.id === orderId ? updatedOrder : o);
    setOrders(updated);
    try {
      await saveOrderInSupabase(updatedOrder);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Error updating order payment status in Supabase:', err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Delete this purchase record permanently?')) {
      const updated = orders.filter(o => o.id !== orderId);
      setOrders(updated);
      try {
        await deleteOrderFromSupabase(orderId);
        if (onRefreshData) {
          await onRefreshData();
        }
      } catch (err) {
        console.error('Error deleting order from Supabase:', err);
      }
    }
  };

  // Change Admin Access Code
  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (currentCodeInput !== adminAccessCode) {
      setSecurityError('Current access code is incorrect.');
      return;
    }

    if (newCodeInput.trim().length < 6) {
      setSecurityError('New access code must be at least 6 characters.');
      return;
    }

    onChangeAccessCode(newCodeInput.trim());
    setSecuritySuccess('Administrator access code updated successfully!');
    setCurrentCodeInput('');
    setNewCodeInput('');
  };

  // Filter and search logic for coupons
  const availableSeries = Array.from(new Set(comics.map(c => c.series).filter(Boolean))) as string[];

  const filteredDiscountCoupons = discountCoupons.filter(coupon => {
    // Filter
    if (promoFilter === 'active' && (!coupon.active || new Date(coupon.expiryDate) < new Date())) return false;
    if (promoFilter === 'expired' && new Date(coupon.expiryDate) >= new Date()) return false;
    if (promoFilter === 'disabled' && coupon.active) return false;
    
    // Search
    if (promoSearch) {
      const s = promoSearch.toLowerCase();
      const codeMatch = coupon.code.toLowerCase().includes(s);
      const applyTypeMatch = coupon.applyType.toLowerCase().includes(s);
      const seriesMatch = coupon.seriesIds.some(sid => sid.toLowerCase().includes(s));
      const comicMatch = coupon.comicIds.some(cid => {
        const comic = comics.find(c => c.id === cid);
        return comic?.title.toLowerCase().includes(s);
      });
      return codeMatch || applyTypeMatch || seriesMatch || comicMatch;
    }
    return true;
  });

  const filteredFreeCoupons = freeComicCoupons.filter(coupon => {
    if (promoFilter === 'active' && (!coupon.active || new Date(coupon.expiryDate) < new Date())) return false;
    if (promoFilter === 'expired' && new Date(coupon.expiryDate) >= new Date()) return false;
    if (promoFilter === 'disabled' && coupon.active) return false;

    if (promoSearch) {
      const s = promoSearch.toLowerCase();
      const codeMatch = coupon.code.toLowerCase().includes(s);
      const comic = comics.find(c => c.id === coupon.comicId);
      const comicMatch = comic?.title.toLowerCase().includes(s) || false;
      return codeMatch || comicMatch;
    }
    return true;
  });

  const filteredRedemptions = couponRedemptions.filter(red => {
    if (promoSearch) {
      const s = promoSearch.toLowerCase();
      const codeMatch = red.couponCode.toLowerCase().includes(s);
      const emailMatch = red.userEmail.toLowerCase().includes(s);
      const comic = comics.find(c => c.id === red.comicId);
      const comicMatch = comic?.title.toLowerCase().includes(s) || false;
      const typeMatch = red.couponType.toLowerCase().includes(s);
      return codeMatch || emailMatch || comicMatch || typeMatch;
    }
    return true;
  });

  return (
    <div id="ocu-admin-panel" className="w-full text-white text-left space-y-8 select-none">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocu-crimson to-ocu-gold p-[1px] flex items-center justify-center shadow-lg shadow-ocu-crimson/10">
            <div className="w-full h-full bg-black rounded-xl flex items-center justify-center text-ocu-gold">
              <Shield size={24} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.2em] text-ocu-gold font-bold uppercase">
                COVEREIGN COMMAND CENTER
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="font-display font-black text-3xl md:text-4xl text-white uppercase tracking-tight">
              COMIC MANAGEMENT HUB
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden sm:block font-mono text-[10px] text-ocu-gray bg-white/5 border border-white/5 px-4 py-2.5 rounded-lg">
            🔐 Session: <span className="text-emerald-400 font-bold uppercase">Authorized Admin</span>
          </p>
          <button
            id="btn-admin-logout"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-lg text-xs font-display font-semibold uppercase tracking-wider cursor-pointer transition-all"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Database Schema Setup Notification */}
      {isSupabaseConfigured && getMissingTables().length > 0 && (
        <div className="p-6 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-1" size={20} />
            <div className="space-y-1">
              <h3 className="font-display font-bold text-base text-amber-300">
                Supabase Tables Missing in Schema Cache
              </h3>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                We detected that some required tables are missing from your Supabase project:{" "}
                <span className="font-mono bg-black/40 px-2 py-0.5 rounded text-amber-400 text-[11px] font-semibold text-wrap break-all">
                  {getMissingTables().join(', ')}
                </span>
                . The application is running using local fallback data. To fully enable device-synchronized and persistent data, you must provision these tables.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowSqlSetup(!showSqlSetup)}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              {showSqlSetup ? 'Hide SQL Script' : 'Show SQL Setup Script'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sqlSetupCode);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2000);
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-black font-semibold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {copiedSql ? <Check size={14} className="text-black" /> : <Copy size={14} className="text-black" />}
              <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          {showSqlSetup && (
            <div className="relative mt-3 rounded-lg overflow-hidden border border-amber-500/10 bg-black/60 font-mono text-xs text-amber-100/90 shadow-inner">
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500/70 bg-amber-500/10 px-2 py-1 rounded">
                  PostgreSQL
                </span>
              </div>
              <pre className="p-5 overflow-x-auto max-h-[350px] leading-relaxed select-text whitespace-pre">
                {sqlSetupCode}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-1">
        {[
          { id: 'comics', label: 'Comics Catalog', icon: BookOpen },
          { id: 'academy', label: 'Academy Management', icon: GraduationCap },
          { id: 'vouchers', label: 'Vouchers & DRM', icon: Key },
          { id: 'orders', label: 'Order Registry', icon: CheckSquare },
          { id: 'promotions', label: 'Promotions', icon: Tag },
          { id: 'security', label: 'Security Node', icon: Settings },
          { id: 'trash', label: 'Trash Bin', icon: Trash2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id as AdminTab);
                setIsAddingComic(false);
                setIsAddingVoucher(false);
              }}
              className={`relative px-5 py-3 rounded-t-lg font-display font-medium text-xs tracking-wider uppercase transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                isActive ? 'text-white bg-white/[0.04] border-b-2 border-ocu-crimson' : 'text-ocu-gray hover:text-white'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-ocu-crimson' : 'text-current'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Workspace */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {/* COMICS CATALOG TAB */}
          {activeTab === 'comics' && (
            <motion.div
              key="tab-comics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!isAddingComic ? (
                <div className="space-y-6">
                  {/* Title and Add New button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display font-bold text-xl text-white uppercase tracking-wider">
                        MANAGE COMIC BOOKS
                      </h2>
                      <p className="font-sans text-xs text-ocu-gray">Create, edit, delete, publish, and manage digital comic assets</p>
                    </div>
                    <button
                      id="btn-add-new-comic"
                      onClick={openAddComicForm}
                      className="px-5 py-2.5 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover hover:brightness-110 text-white rounded-lg text-xs font-display font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-ocu-crimson/25 transition-all"
                    >
                      <Plus size={16} />
                      <span>ADD NEW COMIC</span>
                    </button>
                  </div>

                  {dashboardSuccess && (
                    <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg animate-fadeIn text-xs">
                      <CheckCircle size={16} className="shrink-0" />
                      <span className="font-sans font-medium">{dashboardSuccess}</span>
                    </div>
                  )}

                  {/* Grid list of Comics for Admin */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {comics.filter(c => !c.isDeleted).map((comic) => (
                      <div 
                        key={comic.id} 
                        className={`bg-ocu-graphite border rounded-xl overflow-hidden p-5 space-y-4 hover:border-white/10 transition-all flex flex-col justify-between ${
                          comic.releaseStatus === 'Archived' ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Book mini-visual cover representation */}
                          <div className={`aspect-[3/4] w-20 rounded-md shadow bg-gradient-to-br ${comic.coverGradient} p-2 flex flex-col justify-between border border-white/5 relative`}>
                            <span className="font-mono text-[7px] text-ocu-gold font-semibold">VOL. {comic.volumeNumber}</span>
                            <h4 className="font-display font-black text-[9px] text-white uppercase leading-none mt-auto">{comic.title}</h4>
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/40 to-transparent" />
                          </div>

                          <div className="flex-1 space-y-1.5 text-left">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono tracking-widest uppercase ${
                                comic.releaseStatus === 'Released' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' :
                                comic.releaseStatus === 'Pre-Order' ? 'bg-yellow-950/40 text-ocu-gold border border-ocu-gold/10' :
                                comic.releaseStatus === 'Archived' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                                'bg-sky-950/40 text-sky-400 border border-sky-500/10'
                              }`}>
                                {comic.releaseStatus}
                              </span>
                              {comic.featured && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-950/40 text-purple-400 border border-purple-500/10 rounded text-[8px] font-mono tracking-widest uppercase">
                                  <Award size={8} /> FEATURED
                                </span>
                              )}
                            </div>

                            <h3 className="font-display font-bold text-lg text-white leading-tight uppercase">
                              {comic.title}
                            </h3>
                            <p className="font-mono text-[10px] text-ocu-gray">
                              Vol. {comic.volumeNumber} • {comic.pages} Pages • {comic.price === 0 ? 'FREE' : `₹${comic.price}`}
                            </p>
                            <p className="font-sans text-[11px] text-ocu-gray line-clamp-2 leading-relaxed">
                              {comic.shortDescription}
                            </p>
                          </div>
                        </div>

                        {/* Controls bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5 pt-4">
                          <div className="flex items-center gap-1 text-[10px] font-mono text-ocu-gray">
                            <span>Price:</span>
                            <strong className="text-white">{comic.price === 0 ? 'FREE' : `₹${comic.price}`}</strong>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Toggle Publish / Unpublish / Archive */}
                            {comic.releaseStatus !== 'Released' ? (
                              <button
                                onClick={() => setComicStatus(comic.id, 'Released')}
                                className="px-2.5 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                                title="Publish and release this comic catalog"
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                onClick={() => setComicStatus(comic.id, 'Coming Soon')}
                                className="px-2.5 py-1.5 bg-yellow-950/20 hover:bg-yellow-950/40 border border-yellow-500/20 text-ocu-gold rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                                title="Unpublish to Coming Soon"
                              >
                                Unpublish
                              </button>
                            )}

                            {comic.releaseStatus !== 'Archived' ? (
                              <button
                                onClick={() => setComicStatus(comic.id, 'Archived')}
                                className="px-2.5 py-1.5 bg-zinc-950/20 hover:bg-zinc-900/40 border border-zinc-700/20 text-zinc-400 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                                title="Archive Comic"
                              >
                                Archive
                              </button>
                            ) : (
                              <button
                                onClick={() => setComicStatus(comic.id, 'Released')}
                                className="px-2.5 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                                title="Restore from Archive"
                              >
                                Restore
                              </button>
                            )}

                            {/* Feature Toggle */}
                            <button
                              onClick={() => toggleFeaturedComic(comic.id)}
                              className={`px-2 py-1.5 border rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                comic.featured 
                                  ? 'bg-purple-950/20 border-purple-500/20 text-purple-400' 
                                  : 'bg-white/5 border-white/5 text-ocu-gray hover:text-white'
                              }`}
                              title="Toggle Featured Spot"
                            >
                              ★
                            </button>

                            {/* Edit */}
                            <button
                              id={`btn-edit-comic-${comic.id}`}
                              onClick={() => openEditComicForm(comic)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 cursor-pointer transition-all flex items-center gap-1 text-[10px] font-mono font-bold uppercase"
                              title="Edit comic details"
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>

                            {/* Delete */}
                            <button
                              id={`btn-delete-comic-${comic.id}`}
                              onClick={() => {
                                setComicToDelete(comic);
                                setShowDeleteWarning(true);
                              }}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-rose-950/25"
                              title="Delete comic"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Add / Edit Form */
                <form onSubmit={handleComicSubmit} className="bg-ocu-graphite border border-white/10 rounded-xl p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                        {editingComic ? `EDIT: ${editingComic.title}` : 'ADD NEW DIGITAL COMIC VOLUME'}
                      </h3>
                      <p className="font-sans text-xs text-ocu-gray">Provide metadata, asset references, and set price variables</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingComic(false)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-full cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* FORM ALERTS */}
                  {comicFormError && (
                    <div className="flex flex-col gap-3 bg-rose-950/40 border border-rose-500/20 text-rose-400 p-4 rounded-lg animate-fadeIn text-xs">
                      <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="shrink-0 animate-pulse text-rose-500" />
                        <span className="font-sans font-medium">{comicFormError}</span>
                      </div>
                      {(comicFormError.includes('Upload') || comicFormError.includes('Asset Upload Failed') || comicFormError.includes('timed out')) && (
                        <div className="mt-2 pt-2.5 border-t border-rose-500/20 flex flex-col gap-2">
                          <p className="text-[10px] text-zinc-400 font-sans leading-normal">
                            Firebase Storage upload timed out or is disabled. You can bypass cloud storage uploads and save this volume using the local browser cache (IndexedDB) instead. The PDF will be fully readable on this browser.
                          </p>
                          <div>
                            <button
                              type="button"
                              onClick={handleSaveWithLocalFallback}
                              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase rounded font-bold cursor-pointer transition-colors"
                            >
                              Bypass & Save with Local Offline Fallback
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {comicFormSuccess && (
                    <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg animate-fadeIn text-xs">
                      <CheckCircle size={16} className="shrink-0" />
                      <span className="font-sans font-medium">{comicFormSuccess}</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="flex flex-col gap-2 bg-blue-950/40 border border-blue-500/20 text-blue-400 p-4 rounded-lg animate-fadeIn text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="font-sans font-medium">{uploadStatusText || 'Uploading assets & saving volume...'}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Details Column (8 cols) */}
                    <div className="md:col-span-8 space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Comic Title *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., The Cosmic Sentinel"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Subtitle</label>
                          <input
                            type="text"
                            placeholder="e.g., The Reckoning"
                            value={formSubtitle}
                            onChange={(e) => setFormSubtitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Volume Number *</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={formVolume}
                            onChange={(e) => setFormVolume(Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Series</label>
                          <input
                            type="text"
                            placeholder="e.g., Omni Universe Mainline"
                            value={formSeries}
                            onChange={(e) => setFormSeries(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Language</label>
                          <input
                            type="text"
                            placeholder="e.g., English"
                            value={formLanguage}
                            onChange={(e) => setFormLanguage(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-mono text-[10px] text-ocu-gray uppercase">Short Description * (Catalog Display)</label>
                        <input
                          type="text"
                          required
                          placeholder="Provide a succinct summary of this volume..."
                          value={formShortDesc}
                          onChange={(e) => setFormShortDesc(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-mono text-[10px] text-ocu-gray uppercase">Full Description (Product Details page)</label>
                        <textarea
                          rows={4}
                          placeholder="Provide deep immersive synopsis paragraphs describing this volume..."
                          value={formLongDesc}
                          onChange={(e) => setFormLongDesc(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Categories (Comma-separated)</label>
                          <input
                            type="text"
                            placeholder="Main, Sci-Fi, Void"
                            value={formCategories}
                            onChange={(e) => setFormCategories(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Genres (Comma-separated)</label>
                          <input
                            type="text"
                            placeholder="Action, Cosmic, Mystery"
                            value={formGenres}
                            onChange={(e) => setFormGenres(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Tags (Comma-separated)</label>
                          <input
                            type="text"
                            placeholder="singularity, aegis"
                            value={formTags}
                            onChange={(e) => setFormTags(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Writer</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Jonathan Hickman"
                            value={formWriter}
                            onChange={(e) => setFormWriter(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Artist</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Esad Ribic"
                            value={formArtist}
                            onChange={(e) => setFormArtist(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Release Date Text</label>
                          <input
                            type="text"
                            required
                            placeholder="September 2026"
                            value={formReleaseDate}
                            onChange={(e) => setFormReleaseDate(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[10px] text-ocu-gray uppercase">Age Rating</label>
                          <input
                            type="text"
                            placeholder="Teen (13+)"
                            value={formReadingAge}
                            onChange={(e) => setFormReadingAge(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-sans text-xs text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>
                      </div>

                    </div>

                    {/* Assets & Pricing Side (4 cols) */}
                    <div className="md:col-span-4 space-y-5 bg-black/20 border border-white/5 rounded-xl p-5">
                      <span className="font-mono text-[10px] text-ocu-gold font-bold uppercase tracking-wider block border-b border-white/5 pb-2">
                        ASSETS, PRICING & STATUS
                      </span>

                      {/* Free / Premium Toggle */}
                      <div className="space-y-2">
                        <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider">Access Model</label>
                        <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setFormIsPremium(false);
                            }}
                            className={`py-1.5 text-[10px] font-mono font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
                              !formIsPremium 
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 shadow' 
                                : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            Free Tier
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormIsPremium(true);
                              if (formPrice === 0) setFormPrice(199);
                            }}
                            className={`py-1.5 text-[10px] font-mono font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
                              formIsPremium 
                                ? 'bg-ocu-crimson text-white border border-rose-500/20 shadow' 
                                : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            Premium (Buy)
                          </button>
                        </div>
                      </div>

                      {/* Pricing Nodes */}
                      {formIsPremium && (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="space-y-1.5">
                            <label className="block font-mono text-[10px] text-ocu-gray uppercase">Comic Retail Price (INR)</label>
                            <div className="relative">
                              <div className="absolute left-3.5 top-2.5 text-ocu-gray font-sans text-xs">
                                ₹
                              </div>
                              <input
                                type="number"
                                required={formIsPremium}
                                min="1"
                                value={formPrice === 0 ? '' : formPrice}
                                onChange={(e) => setFormPrice(Number(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded pl-8 pr-3.5 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>
                          </div>

                          {/* Pricing Quick Presets */}
                          <div className="grid grid-cols-4 gap-1">
                            {[149, 199, 249, 299].map((pricePreset) => (
                              <button
                                key={pricePreset}
                                type="button"
                                onClick={() => setFormPrice(pricePreset)}
                                className={`px-1 py-1.5 border text-[9px] font-mono rounded text-center transition-all cursor-pointer ${
                                  formPrice === pricePreset
                                    ? 'bg-ocu-gold/10 border-ocu-gold text-ocu-gold'
                                    : 'bg-white/5 border-white/5 text-ocu-gray hover:text-white'
                                }`}
                              >
                                ₹{pricePreset}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Release Status */}
                      <div className="space-y-1.5">
                        <label className="block font-mono text-[10px] text-ocu-gray uppercase">Release Status</label>
                        <select
                          value={formReleaseStatus}
                          onChange={(e) => setFormReleaseStatus(e.target.value as ComicVolume['releaseStatus'])}
                          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson cursor-pointer"
                        >
                          <option value="Released" className="bg-ocu-graphite">Released (Live)</option>
                          <option value="Coming Soon" className="bg-ocu-graphite">Coming Soon</option>
                          <option value="Pre-Order" className="bg-ocu-graphite">Pre-Order</option>
                          <option value="Draft" className="bg-ocu-graphite">Draft</option>
                          <option value="Archived" className="bg-ocu-graphite">Archived</option>
                        </select>
                      </div>

                      {/* Cover Gradient styling preset */}
                      <div className="space-y-1.5">
                        <label className="block font-mono text-[10px] text-ocu-gray uppercase">Cover Gradient Accent</label>
                        <input
                          type="text"
                          required
                          placeholder="from-blue-900 via-purple-950 to-neutral-950"
                          value={formCoverGradient}
                          onChange={(e) => setFormCoverGradient(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson"
                        />
                      </div>

                      {/* Asset Custom Drag & Drop Fields */}
                      <div className="space-y-4 pt-2 border-t border-white/5">
                        <span className="font-mono text-[9px] text-ocu-gray font-bold block uppercase tracking-wider mb-2">Comic Media & PDF Files</span>

                        <CinematicUploader
                          label="Cover Image *"
                          accept="image/*"
                          value={formCoverImage}
                          onChange={setFormCoverImage}
                          onFileLoaded={setUploadedCoverFile}
                          icon={UploadCloud}
                        />

                        <CinematicUploader
                          label="Banner/Hero Image *"
                          accept="image/*"
                          value={formBannerImage}
                          onChange={setFormBannerImage}
                          onFileLoaded={setUploadedBannerFile}
                          icon={UploadCloud}
                        />

                        <CinematicUploader
                          label="Comic PDF Book * (Digital Delivery)"
                          accept=".pdf"
                          value={formDigitalFile}
                          onChange={setFormDigitalFile}
                          onFileLoaded={(file) => {
                            const fileSizeMB = file.size / (1024 * 1024);
                            if (fileSizeMB > 100) {
                              alert(`[FILE TOO LARGE]\nThis PDF file is ${fileSizeMB.toFixed(1)} MB, which exceeds the maximum limit of 100 MB. Please optimize or choose a smaller file.`);
                              setUploadedPDF(null);
                              setFormDigitalFile('');
                              return;
                            } else if (fileSizeMB > 25) {
                              alert(`Large PDFs may load more slowly on mobile networks. Consider optimizing the file for better performance.`);
                            }

                            setUploadedPDF(file);
                            const globalWindow = window as any;
                            if (globalWindow.pdfjsLib) {
                              const reader = new FileReader();
                              reader.onload = async (ev) => {
                                try {
                                  const typedarray = new Uint8Array(ev.target?.result as ArrayBuffer);
                                  const pdf = await globalWindow.pdfjsLib.getDocument({ data: typedarray }).promise;
                                  setFormPages(pdf.numPages);
                                  console.log("Automatically parsed PDF pages count:", pdf.numPages);
                                } catch (err) {
                                  console.error("Error reading PDF page count:", err);
                                }
                              };
                              reader.readAsArrayBuffer(file);
                            }
                          }}
                          icon={BookOpen}
                        />

                        {uploadedPDF && (
                          <div className="bg-black/60 border border-white/5 rounded-lg p-3 flex items-center justify-between font-mono text-[10px] mt-2">
                            <div className="space-y-0.5">
                              <div className="text-white font-bold uppercase">PDF Optimization Profile</div>
                              <div className="text-zinc-500 text-[8px] uppercase">
                                FILE SIZE: {(uploadedPDF.size / (1024 * 1024)).toFixed(2)} MB // STATUS: ORIGINAL QUALITY
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                alert(`[PDF COMPRESSION ENGINE ACTIVE]\n\nOptional compression profile applied. The system will optimize embed quality on-the-fly if needed during client rendering.`);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-ocu-gold hover:text-ocu-gold transition-colors text-white text-[8px] uppercase font-bold"
                            >
                              COMPRESS PDF
                            </button>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="block font-mono text-[9px] text-neutral-500 uppercase">Optional: Preview Pages (comma-separated)</label>
                          <input
                            type="text"
                            placeholder="e.g., p1.jpg, p2.jpg, p3.jpg"
                            value={formPreviewImages}
                            onChange={(e) => setFormPreviewImages(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white focus:outline-none focus:border-ocu-crimson"
                          />
                        </div>
                      </div>

                      {/* Featured Checkbox */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <input
                          id="form-featured-checkbox"
                          type="checkbox"
                          checked={formFeatured}
                          onChange={(e) => setFormFeatured(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 accent-ocu-crimson cursor-pointer"
                        />
                        <label htmlFor="form-featured-checkbox" className="font-mono text-[10px] text-white uppercase font-bold cursor-pointer select-none">
                          FEATURE THIS VOLUME ON HOME
                        </label>
                      </div>

                    </div>
                  </div>

                  {/* Submission and Cancel Button */}
                  <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-6">
                    <button
                      type="button"
                      onClick={() => setIsAddingComic(false)}
                      disabled={isUploading}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-display font-bold tracking-widest uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-save-comic"
                      type="submit"
                      disabled={isUploading}
                      className="px-6 py-3 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover hover:brightness-110 text-white rounded-lg text-xs font-display font-bold tracking-widest uppercase cursor-pointer shadow-lg shadow-ocu-crimson/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isUploading && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                      <span>{isUploading ? 'SAVING...' : (editingComic ? 'SAVE CHANGES' : 'CREATE VOLUME')}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* ACADEMY MANAGEMENT TAB */}
          {activeTab === 'academy' && (
            <AcademyAdminTab
              academyHeading={academyHeading}
              setAcademyHeading={setAcademyHeading}
              academyResources={academyResources}
              setAcademyResources={setAcademyResources}
              onSaveHeading={onSaveAcademyHeading}
              onSaveResource={onSaveAcademyResource}
              onDeleteResource={onDeleteAcademyResource}
            />
          )}

          {/* VOUCHERS & DRM TAB */}
          {activeTab === 'vouchers' && (
            <motion.div
              key="tab-vouchers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              
              {/* Voucher manager (8 cols) */}
              <div className="lg:col-span-8 bg-ocu-graphite border border-white/5 rounded-xl p-6 space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                      VOUCHER SYSTEM & DRM
                    </h2>
                    <p className="font-sans text-xs text-ocu-gray">Control redemption keys, modify remaining uses, and set limits</p>
                  </div>

                  <button
                    id="btn-admin-add-voucher-toggle"
                    onClick={() => {
                      setEditingVoucher(null);
                      setVoucherCode('');
                      setVoucherUsageLimit(1);
                      setVoucherExpiration('');
                      setIsAddingVoucher(!isAddingVoucher);
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-mono border border-white/5 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{isAddingVoucher ? 'HIDE FORM' : 'ADD NEW KEY'}</span>
                  </button>
                </div>

                {/* Add/Edit Voucher panel */}
                <AnimatePresence>
                  {isAddingVoucher && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleVoucherSubmit} className="bg-black/30 border border-white/10 rounded-lg p-5 space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-ocu-gold font-bold">
                            {editingVoucher ? `EDITING KEY: ${editingVoucher.code}` : 'GENERATE DRM PROTOCOL KEY'}
                          </span>
                          {!editingVoucher && (
                            <button
                              type="button"
                              onClick={generateRandomCoupon}
                              className="text-[10px] font-mono text-ocu-gray hover:text-white flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles size={11} className="text-ocu-gold" />
                              <span>Random Code</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="block font-mono text-[9px] text-ocu-gray uppercase">Voucher Code</label>
                            <input
                              type="text"
                              required
                              placeholder="OCU-GIFT-XXXX-XXXX"
                              value={voucherCode}
                              onChange={(e) => setVoucherCode(e.target.value)}
                              disabled={!!editingVoucher}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson tracking-wider uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block font-mono text-[9px] text-ocu-gray uppercase">Usage Limit (Quota)</label>
                            <input
                              type="number"
                              required
                              min={1}
                              value={voucherUsageLimit}
                              onChange={(e) => setVoucherUsageLimit(Number(e.target.value))}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block font-mono text-[9px] text-ocu-gray uppercase">Expiration Date</label>
                            <input
                              type="text"
                              placeholder="e.g., 2026-12-31"
                              value={voucherExpiration}
                              onChange={(e) => setVoucherExpiration(e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingVoucher(false)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded text-xs font-mono cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-ocu-crimson hover:bg-ocu-crimson-hover rounded text-xs font-display font-bold tracking-wider text-white uppercase cursor-pointer"
                          >
                            {editingVoucher ? 'SAVE CHANGES' : 'REGISTER VOUCHER'}
                          </button>
                        </div>

                        {voucherFeedback && (
                          <p className="text-xs font-mono text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle size={12} />
                            <span>{voucherFeedback}</span>
                          </p>
                        )}
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toolbar / Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search database codes..."
                    value={voucherSearch}
                    onChange={(e) => setVoucherSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded px-4 py-2.5 pl-10 font-mono text-xs text-white focus:outline-none"
                  />
                  <div className="absolute left-3.5 top-3.5 text-neutral-600">
                    <Search size={12} />
                  </div>
                </div>

                {/* Voucher Table */}
                <div className="overflow-x-auto border border-white/5 rounded-lg bg-black/20">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="bg-white/5 text-ocu-gray font-bold tracking-wider uppercase border-b border-white/5">
                        <th className="py-3 px-4 text-[10px]">Access Key</th>
                        <th className="py-3 px-4 text-[10px]">Status</th>
                        <th className="py-3 px-4 text-[10px]">Quota Limit</th>
                        <th className="py-3 px-4 text-[10px]">Expiration</th>
                        <th className="py-3 px-4 text-right text-[10px]">Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftCodes
                        .filter(c => c.code.toUpperCase().includes(voucherSearch.toUpperCase()))
                        .map((codeObj) => (
                          <tr
                            key={codeObj.code}
                            className={`border-b border-white/5 hover:bg-white/2 transition-colors ${
                              !codeObj.enabled ? 'opacity-40' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 font-bold text-white tracking-wide">
                              {codeObj.code}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                codeObj.status === 'Redeemed'
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10'
                                  : 'bg-yellow-950/40 text-ocu-gold border border-ocu-gold/10'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${
                                  codeObj.status === 'Redeemed' ? 'bg-emerald-400' : 'bg-ocu-gold'
                                }`} />
                                {codeObj.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold">
                              {codeObj.remainingUses} Uses
                            </td>
                            <td className="py-3.5 px-4 text-neutral-400">
                              {codeObj.expirationDate || 'Never'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                {/* Toggle Enable / Disable */}
                                <button
                                  onClick={() => onToggleCode(codeObj.code)}
                                  className="p-1 text-ocu-gray hover:text-white transition-colors cursor-pointer"
                                  title={codeObj.enabled ? "Disable Code" : "Enable Code"}
                                >
                                  {codeObj.enabled ? (
                                    <ToggleRight size={18} className="text-emerald-400" />
                                  ) : (
                                    <ToggleLeft size={18} className="text-neutral-500" />
                                  )}
                                </button>

                                {/* Edit Code Details */}
                                <button
                                  onClick={() => {
                                    setEditingVoucher(codeObj);
                                    setVoucherCode(codeObj.code);
                                    setVoucherUsageLimit(codeObj.remainingUses);
                                    setVoucherExpiration(codeObj.expirationDate || '');
                                    setIsAddingVoucher(true);
                                  }}
                                  className="p-1 text-ocu-gray hover:text-white cursor-pointer"
                                  title="Edit code details"
                                >
                                  <Edit3 size={14} />
                                </button>

                                {/* Reset Code */}
                                <button
                                  onClick={() => onResetCode(codeObj.code)}
                                  disabled={codeObj.status === 'Unredeemed'}
                                  className="p-1 text-ocu-gray hover:text-white disabled:opacity-20 cursor-pointer"
                                  title="Reset redeemed status"
                                >
                                  <RotateCcw size={14} />
                                </button>

                                {/* Delete Code */}
                                <button
                                  onClick={() => onDeleteCode(codeObj.code)}
                                  className="p-1 text-ocu-gray hover:text-rose-400 cursor-pointer"
                                  title="Delete coupon"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Redemption timeline side (4 cols) */}
              <div className="lg:col-span-4 bg-ocu-graphite border border-white/5 rounded-xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2 text-ocu-gold">
                      <Activity size={16} />
                      <h3 className="font-display font-bold text-sm uppercase tracking-wider">
                        REDEMPTION LOGS
                      </h3>
                    </div>
                    {redemptionHistory.length > 0 && (
                      <button
                        onClick={onClearHistory}
                        className="text-[9px] font-mono text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        CLEAR HISTORY
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {redemptionHistory.length === 0 ? (
                      <div className="py-12 text-center space-y-3">
                        <Clock size={24} className="mx-auto text-neutral-600" />
                        <p className="text-xs font-mono text-neutral-500 text-center leading-normal">
                          Redemption history is completely clear.
                        </p>
                      </div>
                    ) : (
                      redemptionHistory.map((history) => (
                        <div 
                          key={history.id} 
                          className="p-3.5 bg-black/30 border border-white/5 rounded-lg space-y-2 text-left"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-emerald-400">REDEEM SUCCESS</span>
                            <span className="text-[9px] text-neutral-500">{history.redeemedAt}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="font-mono text-[11px] text-white">
                              Voucher: <strong className="text-ocu-gold">{history.code}</strong>
                            </p>
                            <p className="font-sans text-[11px] text-ocu-gray">
                              Assigned: <strong className="text-white">{history.userEmail}</strong>
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-black/30 border border-white/5 p-4 rounded-lg">
                  <span className="text-[10px] font-mono text-ocu-gray uppercase block tracking-wider">Quota Management</span>
                  <p className="text-[10px] font-sans text-neutral-500 pt-1 leading-normal">
                    Usage limits dictate how many separate users can redeem a single key before depletion occurs.
                  </p>
                </div>

              </div>

            </motion.div>
          )}

          {/* ORDER REGISTRY TAB */}
          {activeTab === 'orders' && (
            <motion.div
              key="tab-orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display font-bold text-xl text-white uppercase tracking-wider">
                  CUSTOMER PURCHASE REGISTRY
                </h2>
                <p className="font-sans text-xs text-ocu-gray">Monitor customer checkout logs, update order delivery statuses, and handle transactions</p>
              </div>

              {/* Toolbar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search orders by transaction ID, customer email or item title..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded px-4 py-2.5 pl-10 font-mono text-xs text-white focus:outline-none"
                />
                <div className="absolute left-3.5 top-3.5 text-neutral-600">
                  <Search size={12} />
                </div>
              </div>

              {/* Order Data table */}
              <div className="overflow-x-auto border border-white/5 rounded-lg bg-black/20">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-white/5 text-ocu-gray font-bold tracking-wider uppercase border-b border-white/5">
                      <th className="py-3 px-4 text-[10px]">Transaction ID</th>
                      <th className="py-3 px-4 text-[10px]">Customer</th>
                      <th className="py-3 px-4 text-[10px]">Comic Title</th>
                      <th className="py-3 px-4 text-[10px]">Price Paid</th>
                      <th className="py-3 px-4 text-[10px]">Delivery Status</th>
                      <th className="py-3 px-4 text-[10px]">Payment Status</th>
                      <th className="py-3 px-4 text-right text-[10px]">Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(o => 
                        o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        o.comicTitle.toLowerCase().includes(orderSearch.toLowerCase())
                      )
                      .map((order) => (
                        <tr key={order.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">{order.id}</td>
                          <td className="py-3.5 px-4 text-neutral-300">{order.customerEmail}</td>
                          <td className="py-3.5 px-4 text-ocu-gold">{order.comicTitle}</td>
                          <td className="py-3.5 px-4 font-bold">${order.price.toFixed(2)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${
                              order.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' :
                              order.status === 'Cancelled' ? 'bg-rose-950/40 text-rose-400 border border-rose-500/10' :
                              'bg-yellow-950/40 text-ocu-gold border border-ocu-gold/10'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${
                              order.paymentStatus === 'Paid' ? 'bg-emerald-950/40 text-emerald-400' :
                              order.paymentStatus === 'Refunded' ? 'bg-rose-950/40 text-rose-400' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {order.status !== 'Completed' && (
                                <button
                                  onClick={() => handleOrderStatus(order.id, 'Completed')}
                                  className="px-2 py-1 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono cursor-pointer transition-colors"
                                  title="Mark Delivery Completed"
                                >
                                  Complete
                                </button>
                              )}
                              
                              {order.status !== 'Cancelled' && (
                                <button
                                  onClick={() => {
                                    handleOrderStatus(order.id, 'Cancelled');
                                    handleOrderPaymentStatus(order.id, 'Refunded');
                                  }}
                                  className="px-2 py-1 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/20 text-rose-400 rounded text-[9px] font-mono cursor-pointer transition-colors"
                                  title="Cancel and Refund Order"
                                >
                                  Cancel
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-1 text-ocu-gray hover:text-rose-400 cursor-pointer"
                                title="Delete Order Log"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* PROMOTIONS & CAMPAIGNS TAB */}
          {activeTab === 'promotions' && (
            <motion.div
              key="tab-promotions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Feedback Alert banner */}
              {promoFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-lg border flex items-start gap-3 shadow-lg ${
                    promoFeedback.type === 'success' 
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-950/20 border-red-500/20 text-red-400'
                  }`}
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider">
                      {promoFeedback.type === 'success' ? 'SYSTEM OK' : 'EXECUTION EXCEPTION'}
                    </h4>
                    <p className="font-sans text-xs mt-1">{promoFeedback.message}</p>
                  </div>
                </motion.div>
              )}

              {/* Promo Tabs Menu & Creation buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ocu-graphite border border-white/5 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'percentage', label: 'Percentage Coupons', icon: Tag },
                    { id: 'free_comic', label: 'Free Comic Coupons', icon: Award },
                    { id: 'redemptions', label: 'Redemption History', icon: Clock },
                    { id: 'analytics', label: 'Analytics Node', icon: Activity }
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = promoActiveSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setPromoActiveSubTab(tab.id as any);
                          setIsAddingDiscount(false);
                          setIsAddingFree(false);
                          setEditingDiscount(null);
                          setEditingFree(null);
                        }}
                        className={`px-4 py-2.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                          isActive 
                            ? 'bg-ocu-crimson text-white shadow-md shadow-ocu-crimson/15' 
                            : 'bg-neutral-900/60 text-ocu-gray hover:text-white border border-white/5'
                        }`}
                      >
                        <TabIcon size={12} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Create Coupon Buttons */}
                <div className="flex items-center gap-3">
                  {promoActiveSubTab === 'percentage' && !isAddingDiscount && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingDiscount(true);
                        setEditingDiscount(null);
                        setDcCode('');
                        setDcPercentage(20);
                        setDcApplyType('entire_store');
                        setDcComicIds([]);
                        setDcSeriesIds([]);
                        setDcMinimumPurchase('');
                        setDcActive(true);
                      }}
                      className="px-4 py-2.5 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer border border-ocu-crimson shadow-md"
                    >
                      <Plus size={12} />
                      <span>Create Discount</span>
                    </button>
                  )}

                  {promoActiveSubTab === 'free_comic' && !isAddingFree && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingFree(true);
                        setEditingFree(null);
                        setFcCode('');
                        setFcComicId(comics[0]?.id || '');
                        setFcActive(true);
                      }}
                      className="px-4 py-2.5 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer border border-ocu-crimson shadow-md"
                    >
                      <Plus size={12} />
                      <span>Create Free Coupon</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub tab contents */}
              <AnimatePresence mode="wait">
                
                {/* 1. PERCENTAGE COUPONS TAB */}
                {promoActiveSubTab === 'percentage' && (
                  <motion.div
                    key="subtab-percentage"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-6"
                  >
                    {/* Add/Edit Discount Form Overlay/Section */}
                    {isAddingDiscount && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-ocu-graphite border border-white/5 rounded-xl p-6"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                          <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                            <Tag size={16} className="text-ocu-crimson" />
                            <span>{editingDiscount ? `Edit Coupon: ${editingDiscount.code}` : 'Create Percentage Discount Coupon'}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingDiscount(false);
                              setEditingDiscount(null);
                            }}
                            className="text-ocu-gray hover:text-white transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveDiscount} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Code */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Coupon Code
                              </label>
                              <input
                                type="text"
                                value={dcCode}
                                onChange={e => setDcCode(e.target.value)}
                                placeholder="e.g. OCU10, ALPHA50"
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Percentage */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Discount Percentage (%)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={dcPercentage}
                                onChange={e => setDcPercentage(Number(e.target.value))}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Min Purchase */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Minimum Purchase Amount (₹, optional)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={dcMinimumPurchase}
                                onChange={e => setDcMinimumPurchase(e.target.value)}
                                placeholder="None"
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Apply To selection */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Apply Target
                              </label>
                              <select
                                value={dcApplyType}
                                onChange={e => setDcApplyType(e.target.value as any)}
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              >
                                <option value="entire_store">Entire Store (All Comics)</option>
                                <option value="selected_comics">Selected Comics</option>
                                <option value="selected_series">Selected Series</option>
                              </select>
                            </div>

                            {/* Start Date */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={dcStartDate}
                                onChange={e => setDcStartDate(e.target.value)}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Expiry Date */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Expiry Date
                              </label>
                              <input
                                type="date"
                                value={dcExpiryDate}
                                onChange={e => setDcExpiryDate(e.target.value)}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Max Total Uses */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Maximum Total Uses
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={dcMaxUses}
                                onChange={e => setDcMaxUses(Number(e.target.value))}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Max Uses Per User */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Maximum Uses Per User
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={dcUsesPerUser}
                                onChange={e => setDcUsesPerUser(Number(e.target.value))}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Active Status Toggle */}
                            <div className="flex flex-col justify-end pb-2">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-white">
                                <button
                                  type="button"
                                  onClick={() => setDcActive(!dcActive)}
                                  className="text-ocu-crimson focus:outline-none transition-colors"
                                >
                                  {dcActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-neutral-600" />}
                                </button>
                                <span className="font-mono text-[10px] uppercase tracking-wider">
                                  {dcActive ? 'Active / Enabled' : 'Inactive / Disabled'}
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Dynamic targets checklists */}
                          {dcApplyType === 'selected_comics' && (
                            <div className="space-y-2">
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider">
                                Choose Comics Eligible for Discount ({dcComicIds.length} Selected)
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-white/5 rounded-lg bg-neutral-950 p-4 max-h-[160px] overflow-y-auto">
                                {comics.map(comic => (
                                  <label key={comic.id} className="flex items-center gap-2 text-xs text-ocu-gray hover:text-white cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={dcComicIds.includes(comic.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setDcComicIds([...dcComicIds, comic.id]);
                                        } else {
                                          setDcComicIds(dcComicIds.filter(id => id !== comic.id));
                                        }
                                      }}
                                      className="rounded border-white/10 bg-neutral-900 text-ocu-crimson focus:ring-0 w-3.5 h-3.5"
                                    />
                                    <span className="truncate">{comic.title} (Vol. {comic.volumeNumber})</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {dcApplyType === 'selected_series' && (
                            <div className="space-y-2">
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider">
                                Choose Comic Series Eligible for Discount ({dcSeriesIds.length} Selected)
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-white/5 rounded-lg bg-neutral-950 p-4 max-h-[160px] overflow-y-auto">
                                {Array.from(new Set(comics.map(c => c.series).filter(Boolean))).map(series => (
                                  <label key={series} className="flex items-center gap-2 text-xs text-ocu-gray hover:text-white cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={dcSeriesIds.includes(series as string)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setDcSeriesIds([...dcSeriesIds, series as string]);
                                        } else {
                                          setDcSeriesIds(dcSeriesIds.filter(s => s !== series));
                                        }
                                      }}
                                      className="rounded border-white/10 bg-neutral-900 text-ocu-crimson focus:ring-0 w-3.5 h-3.5"
                                    />
                                    <span className="truncate">{series}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Submit buttons */}
                          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingDiscount(false);
                                setEditingDiscount(null);
                              }}
                              className="px-4 py-2 rounded bg-neutral-900 border border-white/10 text-white hover:bg-neutral-800 text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={promoLoading}
                              className="px-5 py-2 rounded bg-ocu-crimson text-white hover:bg-ocu-crimson-hover text-[10px] font-mono font-bold uppercase tracking-wider border border-ocu-crimson transition-all flex items-center gap-2"
                            >
                              {promoLoading && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                              <span>{editingDiscount ? 'Update Coupon' : 'Create Coupon'}</span>
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    {/* Filter and search bar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Search box */}
                      <div className="md:col-span-8 relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocu-gray" />
                        <input
                          type="text"
                          placeholder="Search percentage coupons by code, comic series, or title..."
                          value={promoSearch}
                          onChange={e => setPromoSearch(e.target.value)}
                          className="w-full bg-ocu-graphite border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-ocu-crimson/50"
                        />
                      </div>
                      
                      {/* Filter select */}
                      <div className="md:col-span-4">
                        <select
                          value={promoFilter}
                          onChange={e => setPromoFilter(e.target.value as any)}
                          className="w-full bg-ocu-graphite border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-ocu-crimson/50"
                        >
                          <option value="all">All Statuses</option>
                          <option value="active">Active Only</option>
                          <option value="expired">Expired Only</option>
                          <option value="disabled">Disabled Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Table List of percentage coupons */}
                    <div className="bg-ocu-graphite border border-white/5 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-black/20 text-ocu-gray font-mono text-[9px] uppercase tracking-wider">
                              <th className="py-3.5 px-6 font-bold">Code</th>
                              <th className="py-3.5 px-6 font-bold">Discount</th>
                              <th className="py-3.5 px-6 font-bold">Apply Scope</th>
                              <th className="py-3.5 px-6 font-bold">Start / End Dates</th>
                              <th className="py-3.5 px-6 font-bold text-center">Usage Count</th>
                              <th className="py-3.5 px-6 font-bold text-center">Status</th>
                              <th className="py-3.5 px-6 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {filteredDiscountCoupons.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-ocu-gray font-sans text-xs">
                                  No percentage coupons found matching criteria.
                                </td>
                              </tr>
                            ) : (
                              filteredDiscountCoupons.map(coupon => {
                                const isExpired = new Date(coupon.expiryDate) < new Date();
                                return (
                                  <tr key={coupon.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-6 font-mono text-xs font-black text-amber-400 tracking-wider">
                                      {coupon.code}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs font-bold text-white">
                                      {coupon.discountPercentage}% OFF
                                    </td>
                                    <td className="py-4 px-6 font-sans text-xs text-white">
                                      {coupon.applyType === 'entire_store' && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                          Entire Store
                                        </span>
                                      )}
                                      {coupon.applyType === 'selected_comics' && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                                          {coupon.comicIds.length} Selected Comics
                                        </span>
                                      )}
                                      {coupon.applyType === 'selected_series' && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                                          Series: {coupon.seriesIds.join(', ')}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-[10px] text-ocu-gray">
                                      {coupon.startDate} to {coupon.expiryDate}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-center text-white">
                                      {coupon.usedCount} / {coupon.maxUses}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      {isExpired ? (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                                          Expired
                                        </span>
                                      ) : coupon.active ? (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                          Active
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 bg-neutral-500/10 px-2 py-0.5 rounded">
                                          Disabled
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                      <div className="flex items-center justify-end gap-2.5">
                                        {/* Toggle status */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleDiscount(coupon)}
                                          title={coupon.active ? 'Disable Coupon' : 'Enable Coupon'}
                                          className="text-ocu-gray hover:text-white transition-colors"
                                        >
                                          {coupon.active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                                        </button>

                                        {/* Edit */}
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditDiscount(coupon)}
                                          title="Edit Coupon"
                                          className="text-ocu-gray hover:text-white transition-colors p-1"
                                        >
                                          <Edit3 size={13} />
                                        </button>

                                        {/* Duplicate */}
                                        <button
                                          type="button"
                                          onClick={() => handleDuplicateDiscountCoupon(coupon)}
                                          title="Duplicate Coupon"
                                          className="text-ocu-gray hover:text-white transition-colors p-1"
                                        >
                                          <Copy size={13} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDiscountCoupon(coupon.id, coupon.code)}
                                          title="Delete Coupon"
                                          className="text-ocu-gray hover:text-red-500 transition-colors p-1"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. FREE COMIC COUPONS TAB */}
                {promoActiveSubTab === 'free_comic' && (
                  <motion.div
                    key="subtab-free"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-6"
                  >
                    {/* Add/Edit Free Comic Coupon Form */}
                    {isAddingFree && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-ocu-graphite border border-white/5 rounded-xl p-6"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                          <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                            <Award size={16} className="text-ocu-crimson" />
                            <span>{editingFree ? `Edit Free Coupon: ${editingFree.code}` : 'Create Free Comic Coupon'}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingFree(false);
                              setEditingFree(null);
                            }}
                            className="text-ocu-gray hover:text-white transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveFree} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Code */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Coupon Code
                              </label>
                              <input
                                type="text"
                                value={fcCode}
                                onChange={e => setFcCode(e.target.value)}
                                placeholder="e.g. FREEALPHA, WELCOMEBOOK"
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Comic Selector */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Target Comic Volume to Unlock
                              </label>
                              <select
                                value={fcComicId}
                                onChange={e => setFcComicId(e.target.value)}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              >
                                <option value="">Select Comic...</option>
                                {comics.map(c => (
                                  <option key={c.id} value={c.id}>{c.title} (Volume {c.volumeNumber})</option>
                                ))}
                              </select>
                            </div>

                            {/* Start Date */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={fcStartDate}
                                onChange={e => setFcStartDate(e.target.value)}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Expiry Date */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Expiry Date
                              </label>
                              <input
                                type="date"
                                value={fcExpiryDate}
                                onChange={e => setFcExpiryDate(e.target.value)}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Max Total Uses */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Maximum Total Uses
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={fcMaxUses}
                                onChange={e => setFcMaxUses(Number(e.target.value))}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Max Uses Per User */}
                            <div>
                              <label className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-2">
                                Maximum Uses Per User
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={fcUsesPerUser}
                                onChange={e => setFcUsesPerUser(Number(e.target.value))}
                                required
                                className="w-full bg-neutral-900 border border-white/10 rounded px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ocu-crimson"
                              />
                            </div>

                            {/* Active Toggle */}
                            <div className="flex flex-col justify-end pb-2">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-white">
                                <button
                                  type="button"
                                  onClick={() => setFcActive(!fcActive)}
                                  className="text-ocu-crimson focus:outline-none transition-colors"
                                >
                                  {fcActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-neutral-600" />}
                                </button>
                                <span className="font-mono text-[10px] uppercase tracking-wider">
                                  {fcActive ? 'Active / Enabled' : 'Inactive / Disabled'}
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Submit buttons */}
                          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingFree(false);
                                setEditingFree(null);
                              }}
                              className="px-4 py-2 rounded bg-neutral-900 border border-white/10 text-white hover:bg-neutral-800 text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={promoLoading}
                              className="px-5 py-2 rounded bg-ocu-crimson text-white hover:bg-ocu-crimson-hover text-[10px] font-mono font-bold uppercase tracking-wider border border-ocu-crimson transition-all flex items-center gap-2"
                            >
                              {promoLoading && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                              <span>{editingFree ? 'Update Coupon' : 'Create Coupon'}</span>
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    {/* Filter and search bar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Search box */}
                      <div className="md:col-span-8 relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocu-gray" />
                        <input
                          type="text"
                          placeholder="Search free coupons by code or target comic volume..."
                          value={promoSearch}
                          onChange={e => setPromoSearch(e.target.value)}
                          className="w-full bg-ocu-graphite border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-ocu-crimson/50"
                        />
                      </div>
                      
                      {/* Filter select */}
                      <div className="md:col-span-4">
                        <select
                          value={promoFilter}
                          onChange={e => setPromoFilter(e.target.value as any)}
                          className="w-full bg-ocu-graphite border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-ocu-crimson/50"
                        >
                          <option value="all">All Statuses</option>
                          <option value="active">Active Only</option>
                          <option value="expired">Expired Only</option>
                          <option value="disabled">Disabled Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Table List of free comic coupons */}
                    <div className="bg-ocu-graphite border border-white/5 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-black/20 text-ocu-gray font-mono text-[9px] uppercase tracking-wider">
                              <th className="py-3.5 px-6 font-bold">Code</th>
                              <th className="py-3.5 px-6 font-bold">Unlocked Comic</th>
                              <th className="py-3.5 px-6 font-bold">Start / End Dates</th>
                              <th className="py-3.5 px-6 font-bold text-center">Usage Count</th>
                              <th className="py-3.5 px-6 font-bold text-center">Status</th>
                              <th className="py-3.5 px-6 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {filteredFreeCoupons.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-ocu-gray font-sans text-xs">
                                  No free comic coupons found matching criteria.
                                </td>
                              </tr>
                            ) : (
                              filteredFreeCoupons.map(coupon => {
                                const isExpired = new Date(coupon.expiryDate) < new Date();
                                const targetComic = comics.find(c => c.id === coupon.comicId);
                                return (
                                  <tr key={coupon.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-6 font-mono text-xs font-black text-amber-400 tracking-wider">
                                      {coupon.code}
                                    </td>
                                    <td className="py-4 px-6 font-sans text-xs text-white font-bold">
                                      {targetComic ? `${targetComic.title} (Volume ${targetComic.volumeNumber})` : 'Unknown Comic'}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-[10px] text-ocu-gray">
                                      {coupon.startDate} to {coupon.expiryDate}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-center text-white">
                                      {coupon.usedCount} / {coupon.maxUses}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      {isExpired ? (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                                          Expired
                                        </span>
                                      ) : coupon.active ? (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                          Active
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 bg-neutral-500/10 px-2 py-0.5 rounded">
                                          Disabled
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                      <div className="flex items-center justify-end gap-2.5">
                                        {/* Toggle status */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleFree(coupon)}
                                          title={coupon.active ? 'Disable Coupon' : 'Enable Coupon'}
                                          className="text-ocu-gray hover:text-white transition-colors animate-fade"
                                        >
                                          {coupon.active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                                        </button>

                                        {/* Edit */}
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditFree(coupon)}
                                          title="Edit Coupon"
                                          className="text-ocu-gray hover:text-white transition-colors p-1"
                                        >
                                          <Edit3 size={13} />
                                        </button>

                                        {/* Duplicate */}
                                        <button
                                          type="button"
                                          onClick={() => handleDuplicateFreeCoupon(coupon)}
                                          title="Duplicate Coupon"
                                          className="text-ocu-gray hover:text-white transition-colors p-1"
                                        >
                                          <Copy size={13} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteFreeCoupon(coupon.id, coupon.code)}
                                          title="Delete Coupon"
                                          className="text-ocu-gray hover:text-red-500 transition-colors p-1"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. COUPON REDEMPTION HISTORY TAB */}
                {promoActiveSubTab === 'redemptions' && (
                  <motion.div
                    key="subtab-redemptions"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-6"
                  >
                    {/* Search bar */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocu-gray" />
                      <input
                        type="text"
                        placeholder="Search redemption history by coupon code, user email, comic name, or type..."
                        value={promoSearch}
                        onChange={e => setPromoSearch(e.target.value)}
                        className="w-full bg-ocu-graphite border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-ocu-crimson/50"
                      />
                    </div>

                    {/* Redemptions Table list */}
                    <div className="bg-ocu-graphite border border-white/5 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-black/20 text-ocu-gray font-mono text-[9px] uppercase tracking-wider">
                              <th className="py-3.5 px-6 font-bold">Redeemed At</th>
                              <th className="py-3.5 px-6 font-bold">Coupon Code</th>
                              <th className="py-3.5 px-6 font-bold">User Email</th>
                              <th className="py-3.5 px-6 font-bold">Unlocked Comic</th>
                              <th className="py-3.5 px-6 font-bold">Type</th>
                              <th className="py-3.5 px-6 font-bold text-right">Orig Price</th>
                              <th className="py-3.5 px-6 font-bold text-right">Final Paid</th>
                              <th className="py-3.5 px-6 font-bold text-right">Discount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {filteredRedemptions.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-ocu-gray font-sans text-xs">
                                  No coupon redemptions found in logs.
                                </td>
                              </tr>
                            ) : (
                              filteredRedemptions.map(log => {
                                const unlockedComic = comics.find(c => c.id === log.comicId);
                                return (
                                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-6 font-mono text-[10px] text-ocu-gray">
                                      {new Date(log.redeemedAt).toLocaleString()}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs font-black text-amber-400">
                                      {log.couponCode}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-white">
                                      {log.userEmail}
                                    </td>
                                    <td className="py-4 px-6 font-sans text-xs text-white">
                                      {unlockedComic ? `${unlockedComic.title} (Volume ${unlockedComic.volumeNumber})` : 'All Cart Items'}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-[10px]">
                                      {log.couponType === 'free_comic' ? (
                                        <span className="text-[9px] uppercase font-bold tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                                          Free Comic
                                        </span>
                                      ) : (
                                        <span className="text-[9px] uppercase font-bold tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                                          Percentage
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-right text-ocu-gray">
                                      ₹{log.originalPrice}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-right text-white font-bold">
                                      ₹{log.finalPrice}
                                    </td>
                                    <td className="py-4 px-6 font-mono text-xs text-right text-emerald-400">
                                      {log.couponType === 'free_comic' ? '100% (FREE)' : `${log.discountPercent}% OFF`}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. ANALYTICS TAB */}
                {promoActiveSubTab === 'analytics' && (
                  <motion.div
                    key="subtab-analytics"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-6"
                  >
                    {/* Bento Grid Analytics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Total Coupons */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Total Coupons</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-black text-3xl text-white">
                            {discountCoupons.length + freeComicCoupons.length}
                          </span>
                        </div>
                      </div>

                      {/* Active Coupons */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Active Coupons</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-black text-3xl text-emerald-400">
                            {discountCoupons.filter(c => c.active && new Date(c.expiryDate) >= new Date()).length + 
                             freeComicCoupons.filter(c => c.active && new Date(c.expiryDate) >= new Date()).length}
                          </span>
                        </div>
                      </div>

                      {/* Expired Coupons */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-red-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-red-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Expired Coupons</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-black text-3xl text-red-500">
                            {discountCoupons.filter(c => new Date(c.expiryDate) < new Date()).length + 
                             freeComicCoupons.filter(c => new Date(c.expiryDate) < new Date()).length}
                          </span>
                        </div>
                      </div>

                      {/* Total Redemptions */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-sky-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-sky-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Total Redemptions</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-black text-3xl text-sky-400">
                            {couponRedemptions.length}
                          </span>
                        </div>
                      </div>

                      {/* Revenue Saved */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Revenue Saved</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-black text-3xl text-emerald-400">
                            ₹{couponRedemptions.reduce((acc, r) => acc + (r.originalPrice - r.finalPrice), 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Free Comics Claimed */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-purple-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Free Comics Claimed</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-black text-3xl text-purple-400">
                            {couponRedemptions.filter(r => r.couponType === 'free_comic').length}
                          </span>
                        </div>
                      </div>

                      {/* Most Used Coupon */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Most Used Coupon</span>
                        <div className="flex flex-col gap-1.5 pt-1">
                          {(() => {
                            const usageMap: { [code: string]: number } = {};
                            couponRedemptions.forEach(r => {
                              usageMap[r.couponCode] = (usageMap[r.couponCode] || 0) + 1;
                            });
                            let mostUsedCode = 'N/A';
                            let mostUsedCount = 0;
                            Object.entries(usageMap).forEach(([code, count]) => {
                              if (count > mostUsedCount) {
                                mostUsedCount = count;
                                mostUsedCode = code;
                              }
                            });
                            return (
                              <>
                                <span className="font-mono text-xs font-black text-amber-400 tracking-wider block">{mostUsedCode}</span>
                                <span className="text-[10px] text-ocu-gray block">{mostUsedCount} Total Redemptions</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Highest Revenue Coupon */}
                      <div className="bg-ocu-graphite border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full pointer-events-none" />
                        <span className="text-[10px] font-mono text-ocu-gray uppercase tracking-widest block mb-2">Highest Value Coupon</span>
                        <div className="flex flex-col gap-1.5 pt-1">
                          {(() => {
                            const revenueMap: { [code: string]: number } = {};
                            couponRedemptions.forEach(r => {
                              const saved = r.originalPrice - r.finalPrice;
                              revenueMap[r.couponCode] = (revenueMap[r.couponCode] || 0) + saved;
                            });
                            let highestRevCode = 'N/A';
                            let highestRevAmount = 0;
                            Object.entries(revenueMap).forEach(([code, amount]) => {
                              if (amount > highestRevAmount) {
                                highestRevAmount = amount;
                                highestRevCode = code;
                              }
                            });
                            return (
                              <>
                                <span className="font-mono text-xs font-black text-emerald-400 tracking-wider block">{highestRevCode}</span>
                                <span className="text-[10px] text-ocu-gray block">₹{highestRevAmount.toFixed(2)} Revenue Saved</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}

          {/* SECURITY NODE TAB */}
          {activeTab === 'security' && (
            <motion.div
              key="tab-security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto bg-ocu-graphite border border-white/5 rounded-xl p-8 space-y-6"
            >
              <div>
                <h2 className="font-display font-bold text-xl text-white uppercase tracking-wider">
                  SECURITY KEY PROTOCOLS
                </h2>
                <p className="font-sans text-xs text-ocu-gray">Maintain security integrity. Rotate system-wide administrator security codes</p>
              </div>

              <form onSubmit={handleSecuritySubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label htmlFor="input-security-current" className="block font-mono text-[10px] text-ocu-gray uppercase">Current Access Code</label>
                  <input
                    id="input-security-current"
                    type="password"
                    required
                    placeholder="Enter current master code"
                    value={currentCodeInput}
                    onChange={(e) => setCurrentCodeInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label htmlFor="input-security-new" className="block font-mono text-[10px] text-ocu-gray uppercase">New Access Master Code</label>
                  <input
                    id="input-security-new"
                    type="password"
                    required
                    placeholder="Enter new strong master code"
                    value={newCodeInput}
                    onChange={(e) => setNewCodeInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded px-3.5 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-ocu-crimson"
                  />
                </div>

                {securityError && (
                  <p className="text-xs font-mono text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{securityError}</span>
                  </p>
                )}

                {securitySuccess && (
                  <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    <span>{securitySuccess}</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover hover:brightness-110 text-white font-display text-xs font-bold tracking-widest uppercase rounded cursor-pointer transition-all shadow-lg shadow-ocu-crimson/20"
                >
                  ROTATE SECURITY KEYS
                </button>
              </form>

              <div className="bg-black/30 border border-white/5 p-4 rounded-lg text-left text-xs text-neutral-400 space-y-2">
                <strong className="text-white block font-mono text-[10px] uppercase text-ocu-gold">🔐 Security Warning</strong>
                <p className="font-sans leading-relaxed text-[11px]">
                  Rotating keys updates the access credential required for secure control. If forgotten, you will need to re-initialize your local storage sequence to restore default settings. Keep this master code highly confidential.
                </p>
              </div>

              {/* Supabase Database and RLS Troubleshooting Section */}
              <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-lg text-left text-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="text-amber-400 shrink-0" size={16} />
                  <strong className="text-amber-300 font-display font-bold uppercase tracking-wider text-xs">🛠️ Database & RLS Troubleshooting</strong>
                </div>
                <p className="font-sans leading-relaxed text-amber-200/80 text-[11px]">
                  If you encounter <strong>Row-Level Security (RLS)</strong> errors (such as <em>"new row violates row-level security policy"</em> when saving/editing discount coupons or catalog files), you must copy and execute the database setup script in your Supabase SQL Editor. This script ensures all tables exist, disables RLS for smooth client interaction (or creates permissive policies), and configures real-time replication.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSqlSetup(!showSqlSetup)}
                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 rounded text-xs font-semibold cursor-pointer transition-all"
                  >
                    {showSqlSetup ? 'Hide SQL Script' : 'Show SQL Setup Script'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(sqlSetupCode);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-black font-semibold rounded text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    {copiedSql ? <Check size={14} className="text-black" /> : <Copy size={14} className="text-black" />}
                    <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
                  </button>
                </div>

                {showSqlSetup && (
                  <div className="relative mt-3 rounded overflow-hidden border border-amber-500/10 bg-black/50 font-mono text-[11px] text-amber-100/90 shadow-inner">
                    <pre className="p-4 overflow-x-auto max-h-[300px] leading-relaxed select-text whitespace-pre">
                      {sqlSetupCode}
                    </pre>
                  </div>
                )}
              </div>

              {/* User Ban Management Section */}
              <div className="bg-red-950/20 border border-red-500/20 p-5 rounded-lg text-left text-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ban className="text-red-400 shrink-0" size={18} />
                    <div>
                      <strong className="text-white font-display font-bold uppercase tracking-wider text-xs block">
                        TEMPORARY BAN & USER SUSPENSION CONTROLS
                      </strong>
                      <p className="font-sans text-[11px] text-red-200/70">
                        Administer temporary bans via Supabase. Banned users are instantly kicked via Realtime and prevented from logging in.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadProfiles}
                    disabled={loadingProfiles}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded text-[11px] font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <RefreshCw size={12} className={loadingProfiles ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                {banStatusFeedback && (
                  <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-mono">
                    {banStatusFeedback}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-ocu-gray" size={14} />
                    <input
                      type="text"
                      placeholder="Search users by email or name..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded pl-9 pr-3 py-2 font-mono text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {loadingProfiles && profilesList.length === 0 ? (
                    <div className="py-6 text-center text-ocu-gray font-mono text-xs">
                      Loading user accounts...
                    </div>
                  ) : profilesList.length === 0 ? (
                    <div className="py-6 text-center text-neutral-400 font-mono text-xs bg-black/20 rounded border border-white/5">
                      No user profiles found in Supabase public.profiles table.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {profilesList
                        .filter(p => {
                          if (!userSearchQuery.trim()) return true;
                          const q = userSearchQuery.toLowerCase();
                          return (p.email && p.email.toLowerCase().includes(q)) || 
                                 (p.display_name && p.display_name.toLowerCase().includes(q)) ||
                                 (p.user_id && p.user_id.toLowerCase().includes(q));
                        })
                        .map((p) => {
                          const isBanned = isUserTemporarilyBanned(p.banned_until);
                          return (
                            <div 
                              key={p.user_id} 
                              className={`p-3 rounded-lg border text-left transition-all ${
                                isBanned 
                                  ? 'bg-red-950/40 border-red-500/40 ring-1 ring-red-500/20' 
                                  : 'bg-black/40 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white text-xs">
                                      {p.display_name || 'Anonymous User'}
                                    </span>
                                    {isBanned ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                                        <Ban size={10} /> BANNED
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        ACTIVE
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-[11px] text-neutral-400">
                                    {p.email || 'No email provided'}
                                  </div>
                                  {isBanned && p.banned_until && (
                                    <div className="font-mono text-[10px] text-red-400">
                                      Suspended until: {new Date(p.banned_until).toLocaleString()}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                  {isBanned ? (
                                    <button
                                      type="button"
                                      onClick={() => handleLiftBan(p.user_id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-[10px] font-bold uppercase transition-all cursor-pointer shadow"
                                    >
                                      Lift Ban
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        title="Ban for 1 hour"
                                        onClick={() => handleApplyBan(p.user_id, 1)}
                                        className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 rounded font-mono text-[10px] transition-all cursor-pointer"
                                      >
                                        +1 Hour
                                      </button>
                                      <button
                                        type="button"
                                        title="Ban for 24 hours"
                                        onClick={() => handleApplyBan(p.user_id, 24)}
                                        className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 rounded font-mono text-[10px] transition-all cursor-pointer"
                                      >
                                        +24 Hours
                                      </button>
                                      <button
                                        type="button"
                                        title="Ban for 7 days"
                                        onClick={() => handleApplyBan(p.user_id, 168)}
                                        className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 rounded font-mono text-[10px] transition-all cursor-pointer"
                                      >
                                        +7 Days
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* TRASH BIN TAB */}
          {activeTab === 'trash' && (
            <motion.div
              key="tab-trash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              <div>
                <h2 className="font-display font-bold text-xl text-white uppercase tracking-wider">
                  ADMINISTRATOR TRASH BIN
                </h2>
                <p className="font-sans text-xs text-ocu-gray">Review deleted comics, restore them to active publication, or permanently scrub files</p>
              </div>

              {/* Grid list of Deleted Comics in Trash */}
              {comics.filter(c => c.isDeleted).length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-ocu-gray mx-auto">
                    <Trash2 size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-sm text-white uppercase">Trash Bin is Empty</h4>
                    <p className="font-sans text-xs text-ocu-gray">No digital volumes are currently marked for deletion.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {comics.filter(c => c.isDeleted).map((comic) => (
                    <div 
                      key={comic.id} 
                      className="bg-ocu-graphite border border-white/10 hover:border-white/15 rounded-xl overflow-hidden p-5 space-y-4 transition-all flex flex-col justify-between"
                    >
                      <div className="flex gap-4">
                        {/* Comic Cover Mini visual */}
                        <div className={`aspect-[3/4] w-20 rounded-md shadow bg-gradient-to-br ${comic.coverGradient} p-2 flex flex-col justify-between border border-white/5 relative shrink-0`}>
                          <span className="font-mono text-[7px] text-ocu-gold font-semibold">VOL. {comic.volumeNumber}</span>
                          <h4 className="font-display font-black text-[9px] text-white uppercase leading-none mt-auto">{comic.title}</h4>
                          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/40 to-transparent" />
                        </div>

                        <div className="flex-1 space-y-1.5 text-left min-w-0">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono tracking-widest uppercase bg-rose-950/40 text-rose-400 border border-rose-500/10">
                            TRASHED
                          </span>

                          <h3 className="font-display font-bold text-lg text-white leading-tight uppercase truncate">
                            {comic.title}
                          </h3>
                          <p className="font-mono text-[10px] text-ocu-gray">
                            Vol. {comic.volumeNumber} • {comic.pages} Pages • ₹{comic.price}
                          </p>
                          {comic.deletedAt && (
                            <p className="font-mono text-[9px] text-rose-400/80 bg-rose-950/20 border border-rose-500/10 px-2 py-1 rounded inline-block">
                              Deleted: {comic.deletedAt}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Trash Actions Bar */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-4">
                        <span className="font-mono text-[9px] text-ocu-gray">STATUS PRESERVED</span>
                        
                        <div className="flex items-center gap-2">
                          {/* Restore Comic */}
                          <button
                            onClick={() => handleRestoreComic(comic)}
                            className="px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                            title="Restore comic to catalog"
                          >
                            <RotateCcw size={10} />
                            <span>Restore</span>
                          </button>

                          {/* Permanently Delete */}
                          <button
                            onClick={() => {
                              setComicToDelete(comic);
                              setShowDeleteWarning(true);
                            }}
                            className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/20 text-rose-400 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                            title="Delete comic permanently from database"
                          >
                            <Trash2 size={10} />
                            <span>Permanently Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteWarning && comicToDelete && (() => {
        const hasPurchases = orders.some(o => o.comicId === comicToDelete.id && o.status === 'Completed' && o.paymentStatus === 'Paid');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowDeleteWarning(false);
                setShowPermanentWarning(false);
                setComicToDelete(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-ocu-graphite border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 p-6 space-y-6 text-left"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 rounded-lg bg-rose-950/40 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">
                    Delete Comic
                  </h3>
                  <span className="font-mono text-[9px] text-rose-400 font-bold uppercase tracking-widest block">
                    {comicToDelete.title}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-sans text-xs text-ocu-gray leading-relaxed">
                  Are you sure you want to delete this comic?
                </p>

                {hasPurchases && (
                  <div className="space-y-2 bg-rose-950/30 border border-rose-500/20 p-3.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold font-mono text-[10px] tracking-wider uppercase">
                      <AlertCircle size={12} />
                      <span>Warning</span>
                    </div>
                    <p className="font-sans text-xs text-rose-300 leading-relaxed">
                      This comic has customer purchases. Deleting it permanently may prevent future downloads.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className={`aspect-[3/4] w-12 rounded bg-gradient-to-br ${comicToDelete.coverGradient} p-1.5 flex flex-col justify-between border border-white/5 relative shrink-0`}>
                    <span className="font-mono text-[5px] text-ocu-gold font-semibold">VOL. {comicToDelete.volumeNumber}</span>
                    <span className="font-display font-black text-[6px] text-white uppercase leading-none mt-auto truncate">{comicToDelete.title}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left justify-center flex flex-col">
                    <span className="font-display font-bold text-xs text-white truncate uppercase">{comicToDelete.title}</span>
                    <span className="font-mono text-[9px] text-ocu-gray">Vol. {comicToDelete.volumeNumber} • ₹{comicToDelete.price}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteWarning(false);
                    setShowPermanentWarning(false);
                    setComicToDelete(null);
                  }}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 bg-white/5 text-white font-mono text-[10px] tracking-wider uppercase rounded cursor-pointer"
                >
                  Cancel
                </button>
                
                {!comicToDelete.isDeleted && (
                  <button
                    type="button"
                    onClick={() => handleMoveToTrash(comicToDelete)}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:brightness-110 text-white font-display text-[10px] font-bold tracking-wider uppercase rounded cursor-pointer"
                  >
                    Move to Trash
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleConfirmPermanentDelete(comicToDelete)}
                  className="px-4 py-2 bg-gradient-to-r from-rose-700 to-rose-600 hover:brightness-110 text-white font-display text-[10px] font-bold tracking-wider uppercase rounded cursor-pointer"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

    </div>
  );
}
