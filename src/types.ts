export interface ComicVolume {
  id: string;
  volumeNumber: number;
  title: string;
  releaseStatus: 'Released' | 'Coming Soon' | 'Pre-Order' | 'Archived' | 'Draft';
  shortDescription: string;
  longDescription: string;
  price: number;
  pages: number;
  writer: string;
  artist: string;
  coverGradient: string; // high end visual placeholder
  releaseDate: string;
  categories?: string[];
  genres?: string[];
  tags?: string[];
  readingAge?: string;
  featured?: boolean;
  coverImage?: string;
  bannerImage?: string;
  previewImages?: string[];
  digitalFile?: string;
  
  // Extended fields for Comic Upload System
  series?: string;
  subtitle?: string;
  language?: string;
  isPremium?: boolean;
  publishedDate?: string;
  downloadsCount?: number;
  purchasesCount?: number;
  allowGiftAccess?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

export type ViewState = 'home' | 'comics' | 'admin';

export interface GiftCode {
  code: string;
  enabled: boolean;
  status: 'Unredeemed' | 'Redeemed';
  remainingUses: number;
  redeemedBy?: string;
  redeemedAt?: string;
  usageLimit?: number;
  expirationDate?: string;
}

export interface RedemptionHistory {
  id: string;
  code: string;
  redeemedAt: string;
  userEmail: string;
}

export interface Order {
  id: string;
  comicId: string;
  comicTitle: string;
  customerEmail: string;
  purchaseDate: string;
  price: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid' | 'Refunded';
}

export interface DiscountCoupon {
  id: string;
  code: string;
  discountPercentage: number;
  applyType: 'entire_store' | 'selected_comics' | 'selected_series';
  comicIds: string[];
  seriesIds: string[];
  minimumPurchase?: number;
  startDate: string;
  expiryDate: string;
  maxUses: number;
  usedCount: number;
  usesPerUser: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FreeComicCoupon {
  id: string;
  code: string;
  comicId: string;
  startDate: string;
  expiryDate: string;
  maxUses: number;
  usedCount: number;
  usesPerUser: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  couponCode: string;
  couponType: 'percentage' | 'free_comic';
  comicId?: string;
  userEmail: string;
  discountPercent: number;
  originalPrice: number;
  finalPrice: number;
  redeemedAt: string;
}

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  last_login: string;
  banned_until?: string | null;
}

export interface AcademyChapter {
  name: string;
  detail: string;
}

export interface AcademyResource {
  id: string;
  title: string;
  stream: string;
  badge: string;
  description: string;
  features: string[];
  chapters: AcademyChapter[];
  examTips: string[];
  docPages: number;
  pdfUrl?: string;
  pdfFileName?: string;
  tier: 'free' | 'paid';
  priceINR: number;
  updatedAt?: string;
}

export interface AcademySettings {
  heading: string;
  subheading?: string;
  updatedAt?: string;
}



