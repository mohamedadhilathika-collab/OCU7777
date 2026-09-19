/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { ComicVolume, GiftCode, RedemptionHistory, Order, DiscountCoupon, FreeComicCoupon, CouponRedemption, AcademyResource, AcademySettings } from '../types';
import { OCU_COMICS, INITIAL_GIFT_CODES, INITIAL_ACADEMY_RESOURCES, INITIAL_ACADEMY_SETTINGS } from '../data';

export let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const missingTablesSet = new Set<string>();
export const missingColumnsSet = new Set<string>();

export function getMissingTables(): string[] {
  return Array.from(missingTablesSet);
}

export function addMissingTable(tableName: string) {
  missingTablesSet.add(tableName);
}

export function getMissingColumns(): string[] {
  return Array.from(missingColumnsSet);
}

export function addMissingColumn(colName: string) {
  missingColumnsSet.add(colName);
}

// Initialize Supabase Client
export let supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export async function initializeSupabaseConfig() {
  if (isSupabaseConfigured && supabase) return;
  try {
    const res = await fetch('/api/supabase-config');
    if (res.ok) {
      const config = await res.json();
      if (config.supabaseUrl && config.supabaseAnonKey) {
        supabaseUrl = config.supabaseUrl;
        supabaseAnonKey = config.supabaseAnonKey;
        isSupabaseConfigured = true;
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('⚡ Dynamic Supabase Client initialized successfully at runtime!');
      }
    }
  } catch (err) {
    console.error('Failed to initialize dynamic Supabase client:', err);
  }
}

// Fallback warning log
if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase is not fully configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your AI Studio secrets / environment variables. The application will fall back to static local data.'
  );
}

// ----------------- DATA MAPPERS -----------------

function mapComicToDB(c: ComicVolume): any {
  return {
    id: c.id,
    volume_number: c.volumeNumber,
    title: c.title,
    release_status: c.releaseStatus,
    short_description: c.shortDescription,
    long_description: c.longDescription,
    price: c.price,
    pages: c.pages,
    writer: c.writer,
    artist: c.artist,
    cover_gradient: c.coverGradient,
    release_date: c.releaseDate,
    categories: c.categories || [],
    genres: c.genres || [],
    tags: c.tags || [],
    reading_age: c.readingAge || '',
    featured: c.featured || false,
    cover_image: c.coverImage || '',
    banner_image: c.bannerImage || '',
    preview_images: c.previewImages || [],
    digital_file: c.digitalFile || '',
    series: c.series || '',
    subtitle: c.subtitle || '',
    language: c.language || '',
    is_premium: c.isPremium || false,
    published_date: c.publishedDate || '',
    downloads_count: c.downloadsCount || 0,
    purchases_count: c.purchasesCount || 0,
    allow_gift_access: c.allowGiftAccess ?? true,
    is_deleted: c.isDeleted || false,
    deleted_at: c.deletedAt || ''
  };
}

function mapComicFromDB(row: any): ComicVolume {
  return {
    id: row.id,
    volumeNumber: row.volume_number ?? 1,
    title: row.title,
    releaseStatus: row.release_status || 'Draft',
    shortDescription: row.short_description || '',
    longDescription: row.long_description || '',
    price: row.price ? Number(row.price) : 0,
    pages: row.pages ?? 0,
    writer: row.writer || '',
    artist: row.artist || '',
    coverGradient: row.cover_gradient || 'from-neutral-900 to-black',
    releaseDate: row.release_date || '',
    categories: row.categories || [],
    genres: row.genres || [],
    tags: row.tags || [],
    readingAge: row.reading_age || '',
    featured: row.featured ?? false,
    coverImage: row.cover_image || '',
    bannerImage: row.banner_image || '',
    previewImages: row.preview_images || [],
    digitalFile: row.digital_file || '',
    series: row.series || '',
    subtitle: row.subtitle || '',
    language: row.language || '',
    isPremium: row.is_premium ?? false,
    publishedDate: row.published_date || '',
    downloadsCount: row.downloads_count ?? 0,
    purchasesCount: row.purchases_count ?? 0,
    allowGiftAccess: row.allow_gift_access ?? true,
    isDeleted: row.is_deleted ?? false,
    deletedAt: row.deleted_at || ''
  };
}

function mapGiftCodeToDB(g: GiftCode): any {
  return {
    code: g.code,
    enabled: g.enabled,
    status: g.status,
    remaining_uses: g.remainingUses,
    usage_limit: g.usageLimit || 1,
    expiration_date: g.expirationDate || '',
    redeemed_by: g.redeemedBy || '',
    redeemed_at: g.redeemedAt || ''
  };
}

function mapGiftCodeFromDB(row: any): GiftCode {
  return {
    code: row.code,
    enabled: row.enabled ?? true,
    status: row.status || 'Unredeemed',
    remainingUses: row.remaining_uses ?? 1,
    usageLimit: row.usage_limit ?? 1,
    expirationDate: row.expiration_date || '',
    redeemedBy: row.redeemed_by || '',
    redeemedAt: row.redeemed_at || ''
  };
}

function mapRedemptionHistoryToDB(h: RedemptionHistory): any {
  return {
    id: h.id,
    code: h.code,
    user_email: h.userEmail,
    redeemed_at: h.redeemedAt
  };
}

function mapRedemptionHistoryFromDB(row: any): RedemptionHistory {
  return {
    id: row.id,
    code: row.code,
    userEmail: row.user_email,
    redeemedAt: row.redeemed_at
  };
}

function mapOrderToDB(o: Order): any {
  return {
    id: o.id,
    comic_id: o.comicId,
    comic_title: o.comicTitle,
    customer_email: o.customerEmail,
    purchase_date: o.purchaseDate,
    price: o.price,
    status: o.status,
    payment_status: o.paymentStatus
  };
}

function mapOrderFromDB(row: any): Order {
  return {
    id: row.id,
    comicId: row.comic_id,
    comicTitle: row.comic_title,
    customerEmail: row.customer_email,
    purchaseDate: row.purchase_date,
    price: row.price ? Number(row.price) : 0,
    status: row.status || 'Pending',
    paymentStatus: row.payment_status || 'Unpaid'
  };
}

// ----------------- COMICS SERVICE -----------------

export async function fetchComics(): Promise<ComicVolume[]> {
  if (!isSupabaseConfigured) {
    return OCU_COMICS.sort((a, b) => a.volumeNumber - b.volumeNumber);
  }

  try {
    const { data, error } = await supabase
      .from('comics')
      .select('*')
      .order('volume_number', { ascending: true });

    if (error) {
      // If table doesn't exist or other error, fallback safely
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "comics" does not exist')) {
        addMissingTable('comics');
        console.warn('Supabase comics table is not yet provisioned. Falling back to local offline comics: ' + error.message);
      } else {
        console.error('Supabase error fetching comics:', error.message);
      }
      return OCU_COMICS;
    }

    if (!data || data.length === 0) {
      console.log('Comics table is empty. Seeding Supabase with default comics catalog...');
      const rowsToInsert = OCU_COMICS.map(mapComicToDB);
      const { error: seedError } = await supabase
        .from('comics')
        .insert(rowsToInsert);

      if (seedError) {
        console.warn('Failed to seed default comics (Row-Level Security or permissions may restrict this):', seedError.message);
      }
      return OCU_COMICS.sort((a, b) => a.volumeNumber - b.volumeNumber);
    }

    return data.map(mapComicFromDB);
  } catch (err) {
    console.error('Unexpected error fetching comics from Supabase:', err);
    return OCU_COMICS;
  }
}

export async function saveComicInSupabase(comic: ComicVolume): Promise<void> {
  if (!isSupabaseConfigured) return;

  const dbRow = mapComicToDB(comic);
  const { error } = await supabase
    .from('comics')
    .upsert(dbRow);

  if (error) {
    console.error(`Error saving comic ${comic.id} in Supabase:`, error.message);
    throw new Error(error.message);
  }
}

export async function deleteComicFromSupabase(comicId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('comics')
    .delete()
    .eq('id', comicId);

  if (error) {
    console.error(`Error deleting comic ${comicId} from Supabase:`, error.message);
    throw new Error(error.message);
  }
}

// ----------------- GIFT CODES SERVICE -----------------

export async function fetchGiftCodes(): Promise<GiftCode[]> {
  if (!isSupabaseConfigured) {
    return INITIAL_GIFT_CODES;
  }

  try {
    const { data, error } = await supabase
      .from('gift_codes')
      .select('*');

    if (error) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "gift_codes" does not exist')) {
        addMissingTable('gift_codes');
        console.warn('Supabase gift_codes table is not yet provisioned. Falling back to local offline gift codes: ' + error.message);
      } else {
        console.error('Supabase error fetching gift codes:', error.message);
      }
      return INITIAL_GIFT_CODES;
    }

    if (!data || data.length === 0) {
      console.log('Gift codes table is empty. Seeding Supabase with initial gift codes...');
      const rowsToInsert = INITIAL_GIFT_CODES.map(mapGiftCodeToDB);
      const { error: seedError } = await supabase
        .from('gift_codes')
        .insert(rowsToInsert);

      if (seedError) {
        console.warn('Failed to seed initial gift codes (Row-Level Security or permissions may restrict this):', seedError.message);
      }
      return INITIAL_GIFT_CODES;
    }

    return data.map(mapGiftCodeFromDB);
  } catch (err) {
    console.error('Unexpected error fetching gift codes from Supabase:', err);
    return INITIAL_GIFT_CODES;
  }
}

export async function saveGiftCodeInSupabase(giftCode: GiftCode): Promise<void> {
  if (!isSupabaseConfigured) return;

  const dbRow = mapGiftCodeToDB(giftCode);
  const { error } = await supabase
    .from('gift_codes')
    .upsert(dbRow);

  if (error) {
    console.error(`Error saving gift code ${giftCode.code} in Supabase:`, error.message);
    throw new Error(error.message);
  }
}

export async function deleteGiftCodeFromSupabase(code: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('gift_codes')
    .delete()
    .eq('code', code);

  if (error) {
    console.error(`Error deleting gift code ${code} from Supabase:`, error.message);
    throw new Error(error.message);
  }
}

// ----------------- REDEMPTION HISTORY SERVICE -----------------

export async function fetchRedemptionHistory(): Promise<RedemptionHistory[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('redemption_history')
      .select('*')
      .order('redeemed_at', { ascending: false });

    if (error) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "redemption_history" does not exist')) {
        addMissingTable('redemption_history');
        console.warn('Supabase redemption_history table is not yet provisioned. Falling back to local offline redemption history: ' + error.message);
      } else {
        console.error('Supabase error fetching redemption history:', error.message);
      }
      return [];
    }

    return (data || []).map(mapRedemptionHistoryFromDB);
  } catch (err) {
    console.error('Unexpected error fetching redemption history:', err);
    return [];
  }
}

export async function saveRedemptionHistoryInSupabase(item: RedemptionHistory): Promise<void> {
  if (!isSupabaseConfigured) return;

  const dbRow = mapRedemptionHistoryToDB(item);
  const { error } = await supabase
    .from('redemption_history')
    .insert(dbRow);

  if (error) {
    console.error('Error saving redemption history in Supabase:', error.message);
    throw new Error(error.message);
  }
}

export async function clearRedemptionHistoryInSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('redemption_history')
    .delete()
    .neq('id', ''); // Delete all rows

  if (error) {
    console.error('Error clearing redemption history:', error.message);
    throw new Error(error.message);
  }
}

// ----------------- ORDERS SERVICE -----------------

const INITIAL_ORDERS: Order[] = [
  {
    id: 'OCU-182930-TX',
    comicId: 'genesis-void',
    comicTitle: 'Genesis of the Void',
    customerEmail: 'mohamedadhilathika@gmail.com',
    purchaseDate: '2026-07-01 14:32 UTC',
    price: 149,
    status: 'Completed',
    paymentStatus: 'Paid'
  },
  {
    id: 'OCU-984210-TX',
    comicId: 'vanguard-reborn',
    comicTitle: 'Vanguard Reborn',
    customerEmail: 'vanguard_fan_99@vanguard.org',
    purchaseDate: '2026-07-04 10:15 UTC',
    price: 199,
    status: 'Pending',
    paymentStatus: 'Paid'
  },
  {
    id: 'OCU-374182-TX',
    comicId: 'echoes-aetherion',
    comicTitle: 'Echoes of Aetherion',
    customerEmail: 'starlord_retro@nebula.com',
    purchaseDate: '2026-07-06 21:05 UTC',
    price: 249,
    status: 'Cancelled',
    paymentStatus: 'Refunded'
  }
];

export async function fetchOrders(): Promise<Order[]> {
  if (!isSupabaseConfigured) {
    return INITIAL_ORDERS;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('purchase_date', { ascending: false });

    if (error) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "orders" does not exist')) {
        addMissingTable('orders');
        console.warn('Supabase orders table is not yet provisioned. Falling back to local offline orders: ' + error.message);
      } else {
        console.error('Supabase error fetching orders:', error.message);
      }
      return INITIAL_ORDERS;
    }

    if (!data || data.length === 0) {
      console.log('Orders table is empty. Seeding Supabase with default orders...');
      const rowsToInsert = INITIAL_ORDERS.map(mapOrderToDB);
      const { error: seedError } = await supabase
        .from('orders')
        .insert(rowsToInsert);

      if (seedError) {
        console.warn('Failed to seed orders (Row-Level Security or permissions may restrict this):', seedError.message);
      }
      return INITIAL_ORDERS;
    }

    return data.map(mapOrderFromDB);
  } catch (err) {
    console.error('Unexpected error fetching orders from Supabase:', err);
    return INITIAL_ORDERS;
  }
}

export async function saveOrderInSupabase(order: Order): Promise<void> {
  if (!isSupabaseConfigured) return;

  const dbRow = mapOrderToDB(order);
  const { error } = await supabase
    .from('orders')
    .upsert(dbRow);

  if (error) {
    console.error(`Error saving order ${order.id} in Supabase:`, error.message);
    throw new Error(error.message);
  }
}

export async function deleteOrderFromSupabase(orderId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) {
    console.error(`Error deleting order ${orderId} from Supabase:`, error.message);
    throw new Error(error.message);
  }
}

// ----------------- ADMIN DATA SERVICE -----------------

export async function fetchAdminAccessCode(): Promise<string> {
  if (!isSupabaseConfigured) {
    return 'OCU-ADMIN-2026';
  }

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'admin_access_code')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found, seed it
        await supabase.from('admin_settings').upsert({ key: 'admin_access_code', value: 'OCU-ADMIN-2026' });
        return 'OCU-ADMIN-2026';
      }
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "admin_settings" does not exist')) {
        addMissingTable('admin_settings');
        console.warn('Supabase admin_settings table is not yet provisioned. Falling back to local offline admin settings: ' + error.message);
      } else {
        console.error('Error fetching admin settings:', error.message);
      }
      return 'OCU-ADMIN-2026';
    }

    return data?.value || 'OCU-ADMIN-2026';
  } catch (err) {
    console.error('Error in fetchAdminAccessCode:', err);
    return 'OCU-ADMIN-2026';
  }
}

export async function updateAdminAccessCode(newCode: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key: 'admin_access_code', value: newCode });

  if (error) {
    console.error('Error updating admin access code in Supabase:', error.message);
    throw new Error(error.message);
  }
}

// ----------------- STORAGE SERVICE -----------------

/**
 * Uploads a file to Supabase Storage inside the "comics_assets" bucket
 */
export async function uploadFileToSupabase(
  folder: string,
  fileName: string,
  file: Blob | File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet.');
  }

  const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${folder}/${cleanFileName}`;

  // Make sure the bucket exists or create public access to "comics_assets"
  const { error: uploadError } = await supabase.storage
    .from('comics_assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      ...(onProgress && {
        onUploadProgress: (progress) => {
          if (progress.total) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            onProgress(percentage);
          }
        },
      }),
    });

  if (uploadError) {
    console.error('Supabase storage upload error details:', uploadError);
    const details = (uploadError as any).details || '';
    const hint = (uploadError as any).hint || '';
    const errorMsg = [
      uploadError.message,
      details ? `Details: ${details}` : null,
      hint ? `Hint: ${hint}` : null
    ].filter(Boolean).join(' | ');
    throw new Error(errorMsg || JSON.stringify(uploadError));
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('comics_assets')
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Could not retrieve public URL for uploaded file.');
  }

  return publicUrlData.publicUrl;
}

export async function deleteFileFromSupabase(url: string): Promise<void> {
  if (!isSupabaseConfigured || !url) return;

  try {
    // Extract file path from public URL
    // Public URL format: https://[project].supabase.co/storage/v1/object/public/comics_assets/[filePath]
    if (!url.includes('/storage/v1/object/public/comics_assets/')) return;
    const filePath = url.split('/storage/v1/object/public/comics_assets/')[1];

    if (!filePath) return;

    const { error } = await supabase.storage
      .from('comics_assets')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete file from Supabase storage:', error.message);
    }
  } catch (err) {
    console.error('Failed to parse and delete file from Supabase:', err);
  }
}

// ----------------- COUPONS & PROMOTIONS SERVICE -----------------

// 1. Discount Coupons Mappers
function mapDiscountCouponFromDB(row: any): DiscountCoupon {
  return {
    id: row.id,
    code: row.code,
    discountPercentage: Number(row.discount_percentage),
    applyType: row.apply_type,
    comicIds: Array.isArray(row.comic_ids) ? row.comic_ids : [],
    seriesIds: Array.isArray(row.series_ids) ? row.series_ids : [],
    minimumPurchase: row.minimum_purchase ? Number(row.minimum_purchase) : undefined,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    maxUses: Number(row.max_uses),
    usedCount: Number(row.used_count || 0),
    usesPerUser: Number(row.uses_per_user),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDiscountCouponToDB(coupon: DiscountCoupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    discount_percentage: coupon.discountPercentage,
    apply_type: coupon.applyType,
    comic_ids: coupon.comicIds,
    series_ids: coupon.seriesIds,
    minimum_purchase: coupon.minimumPurchase || null,
    start_date: coupon.startDate,
    expiry_date: coupon.expiryDate,
    max_uses: coupon.maxUses,
    used_count: coupon.usedCount,
    uses_per_user: coupon.usesPerUser,
    active: coupon.active,
    created_at: coupon.createdAt,
    updated_at: coupon.updatedAt
  };
}

// 2. Free Comic Coupons Mappers
function mapFreeComicCouponFromDB(row: any): FreeComicCoupon {
  return {
    id: row.id,
    code: row.code,
    comicId: row.comic_id,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    maxUses: Number(row.max_uses),
    usedCount: Number(row.used_count || 0),
    usesPerUser: Number(row.uses_per_user),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFreeComicCouponToDB(coupon: FreeComicCoupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    comic_id: coupon.comicId,
    start_date: coupon.startDate,
    expiry_date: coupon.expiryDate,
    max_uses: coupon.maxUses,
    used_count: coupon.usedCount,
    uses_per_user: coupon.usesPerUser,
    active: coupon.active,
    created_at: coupon.createdAt,
    updated_at: coupon.updatedAt
  };
}

// 3. Coupon Redemptions Mappers
function mapCouponRedemptionFromDB(row: any): CouponRedemption {
  return {
    id: row.id,
    couponId: row.coupon_id,
    couponCode: row.coupon_code || '',
    couponType: row.coupon_type as 'percentage' | 'free_comic',
    comicId: row.comic_id || undefined,
    userEmail: row.user_email,
    discountPercent: Number(row.discount_percent || 0),
    originalPrice: Number(row.original_price || 0),
    finalPrice: Number(row.final_price || 0),
    redeemedAt: row.redeemed_at
  };
}

function mapCouponRedemptionToDB(redemption: CouponRedemption) {
  return {
    id: redemption.id,
    coupon_id: redemption.couponId,
    coupon_code: redemption.couponCode,
    coupon_type: redemption.couponType,
    comic_id: redemption.comicId || null,
    user_email: redemption.userEmail,
    discount_percent: redemption.discountPercent,
    original_price: redemption.originalPrice,
    final_price: redemption.finalPrice,
    redeemed_at: redemption.redeemedAt
  };
}

// --- Database CRUD operations for coupons ---

export async function fetchDiscountCoupons(): Promise<DiscountCoupon[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "discount_coupons" does not exist') || error.message?.includes('cache')) {
        addMissingTable('discount_coupons');
      } else {
        console.error('Error fetching discount coupons:', error.message);
      }
      return [];
    }
    return (data || []).map(mapDiscountCouponFromDB);
  } catch (err) {
    console.error('Unexpected error fetching discount coupons:', err);
    return [];
  }
}

export async function saveDiscountCoupon(coupon: DiscountCoupon): Promise<void> {
  if (!isSupabaseConfigured) return;
  const dbRow = mapDiscountCouponToDB(coupon);
  const { error } = await supabase
    .from('discount_coupons')
    .upsert(dbRow);

  if (error) {
    console.error(`Error saving discount coupon ${coupon.code}:`, error.message);
    throw new Error(error.message);
  }
}

export async function deleteDiscountCoupon(couponId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('discount_coupons')
    .delete()
    .eq('id', couponId);

  if (error) {
    console.error(`Error deleting discount coupon ${couponId}:`, error.message);
    throw new Error(error.message);
  }
}

export async function fetchFreeComicCoupons(): Promise<FreeComicCoupon[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('free_comic_coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "free_comic_coupons" does not exist') || error.message?.includes('cache')) {
        addMissingTable('free_comic_coupons');
      } else {
        console.error('Error fetching free comic coupons:', error.message);
      }
      return [];
    }
    return (data || []).map(mapFreeComicCouponFromDB);
  } catch (err) {
    console.error('Unexpected error fetching free comic coupons:', err);
    return [];
  }
}

export async function saveFreeComicCoupon(coupon: FreeComicCoupon): Promise<void> {
  if (!isSupabaseConfigured) return;
  const dbRow = mapFreeComicCouponToDB(coupon);
  const { error } = await supabase
    .from('free_comic_coupons')
    .upsert(dbRow);

  if (error) {
    console.error(`Error saving free comic coupon ${coupon.code}:`, error.message);
    throw new Error(error.message);
  }
}

export async function deleteFreeComicCoupon(couponId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('free_comic_coupons')
    .delete()
    .eq('id', couponId);

  if (error) {
    console.error(`Error deleting free comic coupon ${couponId}:`, error.message);
    throw new Error(error.message);
  }
}

export async function fetchCouponRedemptions(): Promise<CouponRedemption[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('coupon_redemptions')
      .select('*')
      .order('redeemed_at', { ascending: false });

    if (error) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('does not exist') || error.message?.includes('relation "coupon_redemptions" does not exist') || error.message?.includes('cache')) {
        addMissingTable('coupon_redemptions');
      } else {
        console.error('Error fetching coupon redemptions:', error.message);
      }
      return [];
    }
    return (data || []).map(mapCouponRedemptionFromDB);
  } catch (err) {
    console.error('Unexpected error fetching coupon redemptions:', err);
    return [];
  }
}

export async function saveCouponRedemption(redemption: CouponRedemption): Promise<void> {
  if (!isSupabaseConfigured) return;
  const dbRow = mapCouponRedemptionToDB(redemption);
  const { error } = await supabase
    .from('coupon_redemptions')
    .insert([dbRow]);

  if (error) {
    console.error(`Error saving coupon redemption:`, error.message);
    throw new Error(error.message);
  }

  // Increment the corresponding coupon's used_count dynamically in the database
  try {
    if (redemption.couponType === 'percentage') {
      const { data: coupons, error: fetchErr } = await supabase
        .from('discount_coupons')
        .select('used_count')
        .eq('id', redemption.couponId);
      
      if (!fetchErr && coupons && coupons.length > 0) {
        const currentCount = Number(coupons[0].used_count || 0);
        await supabase
          .from('discount_coupons')
          .update({ used_count: currentCount + 1 })
          .eq('id', redemption.couponId);
      }
    } else {
      const { data: coupons, error: fetchErr } = await supabase
        .from('free_comic_coupons')
        .select('used_count')
        .eq('id', redemption.couponId);
      
      if (!fetchErr && coupons && coupons.length > 0) {
        const currentCount = Number(coupons[0].used_count || 0);
        await supabase
          .from('free_comic_coupons')
          .update({ used_count: currentCount + 1 })
          .eq('id', redemption.couponId);
      }
    }
  } catch (updateErr) {
    console.error('Error updating coupon used_count:', updateErr);
  }
}

// ----------------- USER PROFILES & BAN SERVICE -----------------

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  last_login: string;
  banned_until?: string | null;
}

/**
 * Checks whether a given timestamp represents an active, ongoing ban.
 * Returns true if banned_until is a valid date strictly in the future.
 */
export function isUserTemporarilyBanned(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  const banDate = new Date(bannedUntil);
  if (isNaN(banDate.getTime())) return false;
  return Date.now() < banDate.getTime();
}

/**
 * Tracks whether the remote Supabase profiles table lacks the banned_until column.
 * When true, we avoid sending queries with banned_until to prevent schema cache errors.
 */
export let isBannedUntilColumnMissing = false;

/**
 * Retrieves the persistent map of banned user timestamps.
 * Backed by Supabase admin_settings table and synchronized with localStorage.
 */
export async function getBannedUsersMap(): Promise<Record<string, string>> {
  let map: Record<string, string> = {};
  try {
    const cached = localStorage.getItem('ocu_banned_users');
    if (cached) {
      map = JSON.parse(cached);
    }
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'ocu_banned_users')
        .maybeSingle();

      if (data?.value) {
        try {
          const remoteMap = JSON.parse(data.value);
          map = { ...map, ...remoteMap };
          localStorage.setItem('ocu_banned_users', JSON.stringify(map));
        } catch {}
      }
    } catch {}
  }
  return map;
}

/**
 * Persists the banned user map to localStorage and Supabase admin_settings.
 */
export async function setBannedUsersMap(map: Record<string, string>): Promise<void> {
  try {
    localStorage.setItem('ocu_banned_users', JSON.stringify(map));
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('admin_settings')
        .upsert({ key: 'ocu_banned_users', value: JSON.stringify(map) }, { onConflict: 'key' });
    } catch (err) {
      console.warn('Fallback: Failed to write banned users map to admin_settings:', err);
    }
  }
}

/**
 * Fetches the user profile row from Supabase profiles table,
 * merged with fallback ban data if banned_until is missing from profiles.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user profile from Supabase:', error.message);
      return null;
    }

    if (!data) return null;

    const profile = { ...(data as UserProfile) };
    if (!profile.banned_until) {
      const bannedMap = await getBannedUsersMap();
      if (bannedMap[userId]) {
        profile.banned_until = bannedMap[userId];
      }
    }
    return profile;
  } catch (err) {
    console.warn('Failed to fetch user profile:', err);
    return null;
  }
}

/**
 * Queries the user's profile and metadata to verify if the user is currently banned.
 * If banned_until is in the future, returns { isBanned: true, bannedUntil }.
 */
export async function checkUserBanStatus(
  userId: string,
  userMetadata?: any
): Promise<{ isBanned: boolean; bannedUntil: string | null }> {
  // 1. Check Supabase profiles table
  const profile = await fetchUserProfile(userId);
  if (profile?.banned_until && isUserTemporarilyBanned(profile.banned_until)) {
    return { isBanned: true, bannedUntil: profile.banned_until };
  }

  // 2. Check persistent fallback ban store (admin_settings + localStorage)
  try {
    const bannedMap = await getBannedUsersMap();
    if (bannedMap[userId] && isUserTemporarilyBanned(bannedMap[userId])) {
      return { isBanned: true, bannedUntil: bannedMap[userId] };
    }
  } catch {}

  // 3. Check auth user metadata fallback
  if (userMetadata?.banned_until && isUserTemporarilyBanned(userMetadata.banned_until)) {
    return { isBanned: true, bannedUntil: userMetadata.banned_until };
  }

  return { isBanned: false, bannedUntil: null };
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const upsertPayload: Record<string, any> = {
    user_id: profile.user_id,
    email: profile.email,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    last_login: profile.last_login
  };

  // Only attach banned_until if explicitly defined and column is not known to be missing
  if (profile.banned_until !== undefined && !isBannedUntilColumnMissing) {
    upsertPayload.banned_until = profile.banned_until;
  }

  let { error } = await supabase
    .from('profiles')
    .upsert(upsertPayload, { onConflict: 'user_id' });

  // If column banned_until is missing from schema cache, retry payload without it
  if (error && (error.message?.includes('banned_until') || error.message?.includes('schema cache') || error.code === 'PGRST204')) {
    isBannedUntilColumnMissing = true;
    addMissingTable('profiles (column: banned_until)');
    addMissingColumn('profiles.banned_until');
    delete upsertPayload.banned_until;
    const retry = await supabase
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'user_id' });
    error = retry.error;
  }

  if (error) {
    console.error('Error upserting user profile in Supabase:', error.message);
    if (error.message?.includes('Could not find the table') || error.message?.includes('relation "profiles" does not exist')) {
      addMissingTable('profiles');
    }
  }
}

/**
 * Fetches all registered user profiles (for administrative oversight),
 * merging fallback ban state from admin_settings/localStorage.
 */
export async function fetchAllUserProfiles(): Promise<UserProfile[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('last_login', { ascending: false });

    if (error) {
      console.warn('Error fetching all user profiles:', error.message);
      return [];
    }

    const profiles = (data as UserProfile[]) || [];
    const bannedMap = await getBannedUsersMap();
    return profiles.map((p) => {
      if (!p.banned_until && bannedMap[p.user_id]) {
        return { ...p, banned_until: bannedMap[p.user_id] };
      }
      return p;
    });
  } catch (err) {
    console.warn('Failed to fetch user profiles:', err);
    return [];
  }
}

/**
 * Updates the banned_until timestamp for a specific user.
 * Pass an ISO string for a future timestamp to enforce a ban, or null to lift a ban.
 * Gracefully handles missing banned_until column in Supabase profiles by applying the ban
 * via persistent admin_settings and localStorage.
 */
export async function updateUserBan(userId: string, bannedUntil: string | null): Promise<boolean> {
  if (!userId) return false;

  // 1. Always update our persistent fallback ban store (admin_settings + localStorage)
  let fallbackUpdated = false;
  try {
    const map = await getBannedUsersMap();
    if (bannedUntil) {
      map[userId] = bannedUntil;
    } else {
      delete map[userId];
    }
    await setBannedUsersMap(map);
    fallbackUpdated = true;
  } catch (storeErr) {
    console.warn('Failed to update local/admin_settings ban map:', storeErr);
  }

  if (!isSupabaseConfigured || !supabase) {
    return fallbackUpdated;
  }

  // 2. If the column is already known to be missing, avoid query to prevent schema cache errors
  if (isBannedUntilColumnMissing) {
    return fallbackUpdated;
  }

  // 3. Attempt direct update on Supabase profiles table
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ banned_until: bannedUntil })
      .eq('user_id', userId);

    if (error) {
      const isMissingCol = 
        error.message?.includes('banned_until') || 
        error.message?.includes('schema cache') || 
        error.code === 'PGRST204';

      if (isMissingCol) {
        isBannedUntilColumnMissing = true;
        addMissingTable('profiles (column: banned_until)');
        addMissingColumn('profiles.banned_until');
        console.warn(
          `[Supabase Notice] Column 'banned_until' is not present in 'profiles' table schema cache. ` +
          `The user ban was securely recorded in persistent settings and enforced immediately. ` +
          `To add the column to the database, run: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;`
        );
        // Return true because the ban was successfully recorded and will be actively enforced
        return true;
      }

      console.warn('Notice updating profiles table for user ban in Supabase:', error.message);
      return fallbackUpdated;
    }

    return true;
  } catch (err) {
    console.warn('Failed to update profiles table for user ban:', err);
    return fallbackUpdated;
  }
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  user_email: string;
  user_id: string;
  metadata: any;
  timestamp: string;
}

export async function logSecurityEvent(eventType: string, metadata: any = {}) {
  const timestamp = new Date().toISOString();
  
  let userEmail = 'Guest';
  let userId = 'Guest';
  
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userEmail = session.user.email || 'unknown';
        userId = session.user.id || 'unknown';
      }
    } catch (e) {
      console.warn('[DRM] Error fetching user session for security logs:', e);
    }
  }

  const logEntry = {
    id: Math.random().toString(36).substring(2, 9),
    event_type: eventType,
    user_email: userEmail,
    user_id: userId,
    metadata,
    timestamp
  };

  console.log(`[DRM-SECURITY-EVENT] [${timestamp}] ${eventType} - User: ${userEmail} (${userId}) - Metadata:`, metadata);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert([{
          id: logEntry.id,
          event_type: logEntry.event_type,
          user_email: logEntry.user_email,
          user_id: logEntry.user_id,
          metadata: typeof logEntry.metadata === 'object' ? JSON.stringify(logEntry.metadata) : String(logEntry.metadata),
          timestamp: logEntry.timestamp
        }]);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('Could not find the table') || error.message?.includes('relation "security_events" does not exist')) {
          addMissingTable('security_events');
        }
        console.warn('[DRM] Failed to log security event to Supabase, falling back to local registry:', error.message);
      }
    } catch (dbErr) {
      console.warn('[DRM] Network error writing security log to database:', dbErr);
    }
  }

  try {
    const localLogs = JSON.parse(localStorage.getItem('ocu_security_logs') || '[]');
    localLogs.unshift(logEntry);
    localStorage.setItem('ocu_security_logs', JSON.stringify(localLogs.slice(0, 100)));
  } catch (err) {
    console.error('[DRM] Failed to save security event locally:', err);
  }
}

// ----------------- OCU ACADEMY SUPABASE STORAGE & DATABASE PIPELINE -----------------

/**
 * Uploads an Academy study material PDF to the Supabase Storage bucket 'academy-materials'.
 * Returns the public URL of the uploaded document.
 */
export async function uploadAcademyPdfToSupabase(
  fileName: string,
  file: Blob | File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present.');
  }

  const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from('academy-materials')
    .upload(cleanFileName, file, {
      cacheControl: '3600',
      upsert: true,
      ...(onProgress && {
        onUploadProgress: (progress) => {
          if (progress.total) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            onProgress(percentage);
          }
        },
      }),
    });

  if (uploadError) {
    console.error('Supabase storage upload error details for academy-materials:', uploadError);
    throw new Error(uploadError.message || 'Failed to upload PDF file to academy-materials storage bucket');
  }

  // Retrieve public URL from Supabase Storage
  const { data: publicUrlData } = supabase.storage
    .from('academy-materials')
    .getPublicUrl(cleanFileName);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Could not retrieve public URL for uploaded academy PDF.');
  }

  return publicUrlData.publicUrl;
}

function mapAcademyResourceToDB(r: AcademyResource): any {
  return {
    id: r.id,
    title: r.title,
    stream: r.stream || '',
    badge: r.badge || '',
    description: r.description || '',
    features: Array.isArray(r.features) ? r.features : [],
    chapters: JSON.stringify(r.chapters || []),
    exam_tips: Array.isArray(r.examTips) ? r.examTips : [],
    doc_pages: Number(r.docPages) || 40,
    pdf_url: r.pdfUrl || null,
    pdf_file_name: r.pdfFileName || null,
    tier: r.tier || 'free',
    price_inr: Number(r.priceINR) || 0,
    updated_at: r.updatedAt || new Date().toISOString()
  };
}

function mapAcademyResourceFromDB(row: any): AcademyResource {
  let parsedChapters: any[] = [];
  try {
    if (typeof row.chapters === 'string') {
      parsedChapters = JSON.parse(row.chapters);
    } else if (Array.isArray(row.chapters)) {
      parsedChapters = row.chapters;
    }
  } catch {}

  return {
    id: row.id,
    title: row.title,
    stream: row.stream || '',
    badge: row.badge || '',
    description: row.description || '',
    features: Array.isArray(row.features) ? row.features : [],
    chapters: parsedChapters,
    examTips: Array.isArray(row.exam_tips) ? row.exam_tips : [],
    docPages: Number(row.doc_pages) || 40,
    pdfUrl: row.pdf_url || '',
    pdfFileName: row.pdf_file_name || '',
    tier: row.tier === 'paid' ? 'paid' : 'free',
    priceINR: row.price_inr ? Number(row.price_inr) : 0,
    updatedAt: row.updated_at || ''
  };
}

/**
 * Fetches Academy study resources from Supabase public.academy_resources table.
 */
export async function fetchAcademyResourcesFromSupabase(): Promise<AcademyResource[]> {
  if (!isSupabaseConfigured || !supabase) {
    return INITIAL_ACADEMY_RESOURCES;
  }

  try {
    const { data, error } = await supabase
      .from('academy_resources')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('relation "academy_resources" does not exist')) {
        addMissingTable('academy_resources');
        console.warn('Supabase academy_resources table is not yet provisioned. Falling back to default list: ' + error.message);
      } else {
        console.error('Supabase error fetching academy_resources:', error.message);
      }
      return INITIAL_ACADEMY_RESOURCES;
    }

    if (!data || data.length === 0) {
      console.log('Academy resources table is empty in Supabase. Seeding default catalog...');
      const rowsToInsert = INITIAL_ACADEMY_RESOURCES.map(mapAcademyResourceToDB);
      const { error: seedError } = await supabase
        .from('academy_resources')
        .insert(rowsToInsert);

      if (seedError) {
        console.warn('Notice seeding default academy resources in Supabase:', seedError.message);
      }
      return INITIAL_ACADEMY_RESOURCES;
    }

    return data.map(mapAcademyResourceFromDB);
  } catch (err) {
    console.error('Unexpected error fetching academy resources from Supabase:', err);
    return INITIAL_ACADEMY_RESOURCES;
  }
}

/**
 * Saves or updates an Academy resource in Supabase academy_resources table.
 */
export async function saveAcademyResourceInSupabase(resource: AcademyResource): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const dbRow = mapAcademyResourceToDB(resource);
  const { error } = await supabase
    .from('academy_resources')
    .upsert(dbRow, { onConflict: 'id' });

  if (error) {
    console.error(`Error saving academy resource ${resource.id} in Supabase:`, error.message);
    if (error.message?.includes('Could not find the table') || error.message?.includes('relation "academy_resources" does not exist')) {
      addMissingTable('academy_resources');
    }
    throw new Error(error.message);
  }
}

/**
 * Directly updates or inserts the public PDF URL and filename for an Academy resource row in Supabase.
 */
export async function updateAcademyResourcePdfInSupabase(
  resourceId: string,
  pdfUrl: string,
  pdfFileName?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('academy_resources')
    .update({
      pdf_url: pdfUrl,
      pdf_file_name: pdfFileName || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', resourceId);

  if (error) {
    console.error(`Error updating PDF URL for academy resource ${resourceId} in Supabase:`, error.message);
    if (error.message?.includes('Could not find the table') || error.message?.includes('relation "academy_resources" does not exist')) {
      addMissingTable('academy_resources');
    }
    throw new Error(error.message);
  }
}

/**
 * Deletes an Academy resource from Supabase.
 */
export async function deleteAcademyResourceFromSupabase(resourceId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('academy_resources')
    .delete()
    .eq('id', resourceId);

  if (error) {
    console.error(`Error deleting academy resource ${resourceId} from Supabase:`, error.message);
    throw new Error(error.message);
  }
}

/**
 * Fetches Academy heading and configuration settings from Supabase.
 */
export async function fetchAcademySettingsFromSupabase(): Promise<AcademySettings> {
  if (!isSupabaseConfigured || !supabase) {
    return INITIAL_ACADEMY_SETTINGS;
  }

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'ocu_academy_settings')
      .maybeSingle();

    if (error || !data) {
      return INITIAL_ACADEMY_SETTINGS;
    }

    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return {
      heading: parsed?.heading || INITIAL_ACADEMY_SETTINGS.heading,
      subheading: parsed?.subheading || INITIAL_ACADEMY_SETTINGS.subheading,
      updatedAt: parsed?.updatedAt
    };
  } catch (err) {
    console.warn('Error fetching academy settings from Supabase:', err);
    return INITIAL_ACADEMY_SETTINGS;
  }
}

/**
 * Saves Academy heading and configuration settings in Supabase.
 */
export async function saveAcademySettingsInSupabase(settings: AcademySettings): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const payload = {
    key: 'ocu_academy_settings',
    value: JSON.stringify(settings)
  };

  const { error } = await supabase
    .from('admin_settings')
    .upsert(payload, { onConflict: 'key' });

  if (error) {
    console.error('Error saving academy settings in Supabase:', error.message);
    throw new Error(error.message);
  }
}



