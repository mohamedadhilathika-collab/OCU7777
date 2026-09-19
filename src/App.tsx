import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, BookOpen, Compass, ShoppingCart, 
  Tv, Volume2, VolumeX, Sparkles, AlertCircle, AlertTriangle, HelpCircle, ArrowUpRight, Check, Star, Lock,
  GraduationCap, FileText, Calculator, Download, X, IndianRupee
} from 'lucide-react';
import { ViewState, ComicVolume, GiftCode, RedemptionHistory, Order, DiscountCoupon, FreeComicCoupon, CouponRedemption, AcademyResource } from './types';
import { OCU_COMICS, INITIAL_GIFT_CODES, INITIAL_ACADEMY_RESOURCES, INITIAL_ACADEMY_SETTINGS } from './data';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import { 
  fetchComics, 
  fetchGiftCodes, 
  fetchOrders, 
  fetchRedemptionHistory,
  saveOrderInSupabase,
  saveGiftCodeInSupabase,
  saveRedemptionHistoryInSupabase,
  clearRedemptionHistoryInSupabase,
  deleteGiftCodeFromSupabase,
  fetchAdminAccessCode,
  updateAdminAccessCode,
  isSupabaseConfigured,
  supabase,
  initializeSupabaseConfig,
  fetchDiscountCoupons,
  fetchFreeComicCoupons,
  fetchCouponRedemptions,
  upsertUserProfile,
  UserProfile,
  checkUserBanStatus,
  isUserTemporarilyBanned,
  fetchAcademyResourcesFromSupabase,
  fetchAcademySettingsFromSupabase,
  saveAcademyResourceInSupabase,
  saveAcademySettingsInSupabase,
  deleteAcademyResourceFromSupabase,
  getOrCreateDeviceId,
  syncDeviceToProfile,
  isDeviceBannedInDatabase,
  isAccountBannedInDatabase
} from './lib/supabase';
import {
  fetchAcademyResources,
  fetchAcademySettings,
  saveAcademySettingsInFirestore,
  saveAcademyResourceInFirestore,
  deleteAcademyResourceFromFirestore
} from './lib/firebase';
import Hero from './components/Hero';
import ComicCard from './components/ComicCard';
import PurchaseModal from './components/PurchaseModal';
import GiftCodeRedeemer from './components/GiftCodeRedeemer';
import AdminPanel from './components/AdminPanel';
import ComicReader from './components/ComicReader';
import AdminLoginModal from './components/AdminLoginModal';
import AcademyPdfReader from './components/AcademyPdfReader';
import AcademyCard from './components/AcademyCard';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [selectedAcademyResource, setSelectedAcademyResource] = useState<AcademyResource | null>(null);
  const [readingAcademyResource, setReadingAcademyResource] = useState<AcademyResource | null>(null);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  // Dynamic Academy Management States
  const [academyHeading, setAcademyHeading] = useState<string>(() => {
    return localStorage.getItem('ocu_academy_heading') || INITIAL_ACADEMY_SETTINGS.heading;
  });
  const [academyResources, setAcademyResources] = useState<AcademyResource[]>(() => {
    try {
      const cached = localStorage.getItem('ocu_academy_resources');
      const isInitialized = localStorage.getItem('ocu_academy_initialized');
      if (cached !== null && isInitialized) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_ACADEMY_RESOURCES;
  });
  const [selectedComic, setSelectedComic] = useState<ComicVolume | null>(null);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [activeThreatIndex, setActiveThreatIndex] = useState(0);

  // Security & Authentication States: Explicitly false by default on every new session/login
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Helper to strictly clear all administrator flags and state across memory, localStorage, and sessionStorage
  const clearAdminState = useCallback(() => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('ocu_admin_logged_in');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('admin');
    sessionStorage.removeItem('ocu_admin_logged_in');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('admin');
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('ocu-admin-auth-change', { detail: { isAdmin: false } }));
  }, []);

  const [adminAccessCode, setAdminAccessCode] = useState<string>(() => {
    return localStorage.getItem('ocu_admin_access_code') || 'OCU-ADMIN-2026';
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isConfigInitialized, setIsConfigInitialized] = useState(false);

  // User Authentication & Profile States
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('ocu_guest_mode') === 'true';
  });
  const [banError, setBanError] = useState<string | null>(null);
  const [isDeviceBlacklisted, setIsDeviceBlacklisted] = useState<boolean>(false);
  const [permanentAccountBanError, setPermanentAccountBanError] = useState<string | null>(null);

  // Synchronized Comics Catalog & Purchase Registries
  const [comics, setComics] = useState<ComicVolume[]>([]);

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

  const [orders, setOrders] = useState<Order[]>([]);

  // Gift Code & DRM States
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);

  const [redemptionHistory, setRedemptionHistory] = useState<RedemptionHistory[]>([]);

  const [activeRedeemedCode, setActiveRedeemedCode] = useState<string | null>(null);

  // Coupons & Promotions States
  const [discountCoupons, setDiscountCoupons] = useState<DiscountCoupon[]>([]);
  const [freeComicCoupons, setFreeComicCoupons] = useState<FreeComicCoupon[]>([]);
  const [couponRedemptions, setCouponRedemptions] = useState<CouponRedemption[]>([]);

  const [readingComic, setReadingComic] = useState<ComicVolume | null>(null);
  const [lastComicsScrollPos, setLastComicsScrollPos] = useState<number>(0);

  // Toast feedback and missing file fallback alerts
  interface ToastNotice {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title?: string;
  }
  const [toastNotice, setToastNotice] = useState<ToastNotice | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToastNotice({ id, message, type, title });
    setTimeout(() => {
      setToastNotice(prev => (prev?.id === id ? null : prev));
    }, 5000);
  }, []);

  // Track scroll position on the Comics Catalog view
  useEffect(() => {
    const handleScroll = () => {
      if (view === 'comics' && !readingComic) {
        setLastComicsScrollPos(window.scrollY);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [view, readingComic]);

  // Function Implementation: openComicReader & viewComic for interactive reading and external triggers
  const openComicReader = useCallback((comicOrId: ComicVolume | string, fileUrl?: string) => {
    let targetComic: ComicVolume | undefined;

    if (typeof comicOrId === 'string') {
      const trimmedId = comicOrId.trim();
      targetComic = comics.find(c => c.id === trimmedId) || OCU_COMICS.find(c => c.id === trimmedId);
      if (!targetComic) {
        targetComic = {
          id: trimmedId,
          volumeNumber: 1,
          title: trimmedId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          releaseStatus: 'Released',
          shortDescription: 'Digital edition reader preview.',
          longDescription: 'Digital edition reader preview.',
          price: 0,
          pages: 48,
          writer: 'Omni Comic Universe',
          artist: 'OCU Studios',
          coverGradient: 'from-blue-950 to-black',
          releaseDate: '2026',
          digitalFile: fileUrl || ''
        };
      }
    } else {
      targetComic = { ...comicOrId };
    }

    if (fileUrl && (!targetComic.digitalFile || targetComic.digitalFile.trim() === '')) {
      targetComic.digitalFile = fileUrl;
    }

    // Strict Paywall Access Control:
    // If price > 0 and item is not unlocked, block direct access and do not render reader!
    const isUnlocked = 
      targetComic.price === 0 ||
      Boolean(activeRedeemedCode) ||
      orders.some(o => o.comicId === targetComic!.id && o.customerEmail === user?.email && o.status === 'Completed' && o.paymentStatus === 'Paid') ||
      (() => {
        try {
          const stored = JSON.parse(localStorage.getItem('ocu_unlocked_comics') || '[]');
          return Array.isArray(stored) && stored.includes(targetComic!.id);
        } catch {
          return false;
        }
      })();

    if (targetComic.price > 0 && !isUnlocked) {
      console.warn(`[Paywall Blocked] "${targetComic.title}" requires payment of ₹${targetComic.price}.`);
      showToast(
        `"${targetComic.title}" requires payment of ₹${targetComic.price}. Please click "PAY ₹${targetComic.price}" to unlock.`,
        'warning',
        'Material Locked'
      );
      return;
    }

    // Error Handling: Fallback UI toast message and console log if comic file URL is missing or null
    const hasValidFile = Boolean(targetComic.digitalFile && targetComic.digitalFile.trim() !== '');

    if (!hasValidFile) {
      console.warn(`[Comic Reader] Comic file URL is missing or null for comic ID: "${targetComic.id}", Title: "${targetComic.title}". Loading interactive preview simulation.`);
      showToast(
        `Digital comic file URL is missing or pending upload for "${targetComic.title}". Launching interactive reader preview...`,
        'warning',
        'Comic File Notice'
      );
    } else {
      console.log(`[Comic Reader] Loading associated comic file into viewer interface for "${targetComic.title}":`, targetComic.digitalFile);
    }

    if (view === 'comics') {
      setLastComicsScrollPos(window.scrollY);
    }

    setReadingComic(targetComic);
  }, [comics, view, showToast, orders, user, activeRedeemedCode]);

  const viewComic = openComicReader;
  const handleReadComic = openComicReader;

  // Dynamic Rendering Support: Attach globally to window and set up delegated click event listener
  useEffect(() => {
    (window as any).openComicReader = openComicReader;
    (window as any).viewComic = viewComic;

    const handleDelegatedReadClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        '[data-action="read-comic"], [id^="btn-read-comic-"], .btn-read-now'
      ) as HTMLElement | null;

      if (!target) return;

      if ((e as any).__comicReadHandled) return;
      (e as any).__comicReadHandled = true;

      const comicId = target.getAttribute('data-comic-id') || target.id?.replace('btn-read-comic-', '');
      const fileUrl = target.getAttribute('data-comic-file') || target.getAttribute('data-file-url') || undefined;

      console.log('[Delegated Click] "READ NOW" clicked for comic ID:', comicId, 'File URL:', fileUrl);

      if (comicId) {
        openComicReader(comicId, fileUrl || undefined);
      }
    };

    document.addEventListener('click', handleDelegatedReadClick, true);
    return () => {
      document.removeEventListener('click', handleDelegatedReadClick, true);
      delete (window as any).openComicReader;
      delete (window as any).viewComic;
    };
  }, [openComicReader, viewComic]);

  // Load live, device-synced data from Supabase on mount and listen to realtime updates
  const loadSupabaseData = useCallback(async () => {
    try {
      console.log('Fetching live synchronized comics from Supabase...');
      const [
        supabaseComics, 
        supabaseGiftCodes, 
        supabaseOrders, 
        supabaseHistory, 
        supabaseAdminCode,
        supabaseDiscountCoupons,
        supabaseFreeCoupons,
        supabaseRedemptions
      ] = await Promise.all([
        fetchComics(),
        fetchGiftCodes(),
        fetchOrders(),
        fetchRedemptionHistory(),
        fetchAdminAccessCode(),
        fetchDiscountCoupons(),
        fetchFreeComicCoupons(),
        fetchCouponRedemptions()
      ]);
      
      setComics(supabaseComics);
      setGiftCodes(supabaseGiftCodes);
      setOrders(supabaseOrders);
      setRedemptionHistory(supabaseHistory);
      setAdminAccessCode(supabaseAdminCode);
      setDiscountCoupons(supabaseDiscountCoupons);
      setFreeComicCoupons(supabaseFreeCoupons);
      setCouponRedemptions(supabaseRedemptions);

      // Dynamically restore active redeemed session from live database history
      const currentUserSession = (isSupabaseConfigured && supabase) ? (await supabase.auth.getSession()).data.session : null;
      const currentUserEmail = currentUserSession?.user?.email || '';

      if (supabaseHistory && supabaseHistory.length > 0 && currentUserEmail) {
        // Filter history by current user email to avoid other browser session crossovers
        const userHistory = supabaseHistory.filter(h => h.userEmail === currentUserEmail);
        if (userHistory.length > 0) {
          const latestCode = userHistory[0].code;
          const codeObj = supabaseGiftCodes.find(c => c.code === latestCode);
          if (codeObj && codeObj.enabled) {
            setActiveRedeemedCode(latestCode);
          } else {
            setActiveRedeemedCode(null);
          }
        } else {
          setActiveRedeemedCode(null);
        }
      } else {
        setActiveRedeemedCode(null);
      }

      console.log('Synchronized comics loaded from Supabase!');
    } catch (err) {
      console.error('Failed to load initial data from Supabase:', err);
    }
  }, []);

  // Fetch Academy settings and materials from Supabase
  const loadAcademyData = useCallback(async () => {
    try {
      const [cloudSettings, cloudResources] = await Promise.all([
        fetchAcademySettingsFromSupabase(),
        fetchAcademyResourcesFromSupabase()
      ]);
      if (cloudSettings && cloudSettings.heading) {
        setAcademyHeading(cloudSettings.heading);
        localStorage.setItem('ocu_academy_heading', cloudSettings.heading);
      }
      if (cloudResources && Array.isArray(cloudResources)) {
        const isLocallyInitialized = localStorage.getItem('ocu_academy_initialized');
        if (!isLocallyInitialized || cloudResources.length > 0) {
          setAcademyResources(cloudResources);
          localStorage.setItem('ocu_academy_resources', JSON.stringify(cloudResources));
        }
      }
    } catch (err) {
      console.warn('Academy data load from Supabase/cache note:', err);
    }
  }, []);

  // Academy management handlers
  const handleSaveAcademyHeading = async (newHeading: string) => {
    setAcademyHeading(newHeading);
    localStorage.setItem('ocu_academy_heading', newHeading);
    try {
      await saveAcademySettingsInSupabase({ heading: newHeading });
    } catch (err) {
      console.warn('Could not sync academy heading to Supabase:', err);
    }
  };

  const handleSaveAcademyResource = async (resource: AcademyResource) => {
    setAcademyResources(prev => {
      const idx = prev.findIndex(r => r.id === resource.id);
      const updated = idx >= 0 ? prev.map(r => r.id === resource.id ? resource : r) : [...prev, resource];
      try {
        localStorage.setItem('ocu_academy_resources', JSON.stringify(updated));
        localStorage.setItem('ocu_academy_initialized', 'true');
      } catch {}
      return updated;
    });
    try {
      await saveAcademyResourceInSupabase(resource);
    } catch (err) {
      console.warn('Could not sync academy resource to Supabase:', err);
    }
  };

  const handleDeleteAcademyResource = async (resourceId: string, index?: number) => {
    setAcademyResources(prev => {
      const updated = prev.filter((r, idx) => r.id !== resourceId && (index === undefined || idx !== index));
      try {
        localStorage.setItem('ocu_academy_resources', JSON.stringify(updated));
        localStorage.setItem('ocu_academy_initialized', 'true');
      } catch (err) {
        console.warn('LocalStorage save failed:', err);
      }
      return updated;
    });
    try {
      await deleteAcademyResourceFromSupabase(resourceId);
    } catch (err) {
      console.warn('Could not delete academy resource from Supabase:', err);
    }
  };

  useEffect(() => {
    async function init() {
      await initializeSupabaseConfig();
      setIsConfigInitialized(true);
      await loadSupabaseData();
      await loadAcademyData();
    }
    init();
  }, [loadSupabaseData, loadAcademyData]);

  // Handle User Profile sync and state change subscriptions
  useEffect(() => {
    if (!isConfigInitialized || !isSupabaseConfigured || !supabase) return;

    // Force clear any stale admin state on initial session verification
    clearAdminState();

    // Check current session on load (Requirement 4: Persistent Block on Refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentDeviceId = getOrCreateDeviceId();
      const isDevBanned = await isDeviceBannedInDatabase(currentDeviceId);
      if (isDevBanned) {
        setIsDeviceBlacklisted(true);
        return;
      }

      if (session?.user) {
        const u = session.user;
        syncDeviceToProfile(u.id, u.email, currentDeviceId).catch(console.error);

        const isAccBanned = await isAccountBannedInDatabase(u.id, u.email);
        if (isAccBanned) {
          console.warn('[Security] User is permanently banned on initial session check. Logging out...');
          await supabase.auth.signOut();
          clearAdminState();
          setUser(null);
          setUserProfile(null);
          setIsGuest(false);
          setPermanentAccountBanError('SECURITY ALERT: Your account has been permanently banned for violating the Terms of Service.');
          return;
        }

        const banCheck = await checkUserBanStatus(u.id, u.user_metadata);
        if (banCheck.isBanned) {
          console.warn('[Security] User is temporarily banned on initial session check. Logging out...');
          await supabase.auth.signOut();
          clearAdminState();
          setUser(null);
          setUserProfile(null);
          setIsGuest(false);
          const untilStr = banCheck.bannedUntil 
            ? ` Access is suspended until ${new Date(banCheck.bannedUntil).toLocaleString()}.`
            : '';
          setBanError(`You are banned temporarily.${untilStr}`);
          return;
        }

        const profile = {
          user_id: u.id,
          email: u.email || '',
          display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Unknown User',
          avatar_url: u.user_metadata?.avatar_url || '',
          device_id: currentDeviceId,
          last_login: new Date().toISOString()
        };
        setUser(u);
        setUserProfile(profile);
        setIsGuest(false);
        setBanError(null);
        upsertUserProfile(profile).catch(console.error);
        loadSupabaseData();
      }
    });

    // Set up Auth State Changes (Requirement 4: Persistent block on auth state changes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session?.user?.email);

      const currentDeviceId = getOrCreateDeviceId();
      const isDevBanned = await isDeviceBannedInDatabase(currentDeviceId);
      if (isDevBanned) {
        setIsDeviceBlacklisted(true);
        return;
      }

      // Force admin state to false on every fresh login, sign-in, token refresh, or sign-out event
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        clearAdminState();
      }

      if (session?.user) {
        const u = session.user;
        syncDeviceToProfile(u.id, u.email, currentDeviceId).catch(console.error);

        const isAccBanned = await isAccountBannedInDatabase(u.id, u.email);
        if (isAccBanned) {
          console.warn('[Security] User is permanently banned on auth event. Logging out...');
          await supabase.auth.signOut();
          clearAdminState();
          setUser(null);
          setUserProfile(null);
          setIsGuest(false);
          setPermanentAccountBanError('SECURITY ALERT: Your account has been permanently banned for violating the Terms of Service.');
          return;
        }

        const banCheck = await checkUserBanStatus(u.id, u.user_metadata);
        if (banCheck.isBanned) {
          console.warn('[Security] User is temporarily banned on auth event. Logging out...');
          await supabase.auth.signOut();
          clearAdminState();
          setUser(null);
          setUserProfile(null);
          setIsGuest(false);
          const untilStr = banCheck.bannedUntil 
            ? ` Access is suspended until ${new Date(banCheck.bannedUntil).toLocaleString()}.`
            : '';
          setBanError(`You are banned temporarily.${untilStr}`);
          return;
        }

        const profile = {
          user_id: u.id,
          email: u.email || '',
          display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Unknown User',
          avatar_url: u.user_metadata?.avatar_url || '',
          device_id: currentDeviceId,
          last_login: new Date().toISOString()
        };
        setUser(u);
        setUserProfile(profile);
        setIsGuest(false);
        setBanError(null);
        try {
          await upsertUserProfile(profile);
        } catch (err) {
          console.error("Failed to upsert profile:", err);
        }
        loadSupabaseData();
      } else {
        clearAdminState();
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigInitialized, loadSupabaseData, clearAdminState]);

  // REQUIREMENT 3: Immediate Kicking (Realtime)
  // Set up a Supabase Realtime subscription listening to updates on the current active user's row in the profiles table.
  // If the admin updates the banned_until field to a future date while user is active, automatically force a logout,
  // route them back to the login screen, and show "You are banned temporarily."
  useEffect(() => {
    if (!isConfigInitialized || !isSupabaseConfigured || !supabase || !user?.id) return;

    const currentUserId = user.id;
    console.log(`[Realtime Ban Monitor] Subscribing to profiles updates for active user: ${currentUserId}`);

    const banChannel = supabase
      .channel(`active_user_ban_watch_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          console.log('⚡ [Realtime Ban Monitor] Profile change detected for active user:', payload);
          const updated = payload.new as any;
          if (updated && updated.is_banned === true) {
            console.warn('⚡ [Realtime Ban Monitor] User account permanently banned in real-time! Kicking immediately...');
            await supabase.auth.signOut();
            clearAdminState();
            setUser(null);
            setUserProfile(null);
            setIsGuest(false);
            setPermanentAccountBanError('SECURITY ALERT: Your account has been permanently banned for violating the Terms of Service.');
            setView('home');
            return;
          }
          if (updated && updated.banned_until && isUserTemporarilyBanned(updated.banned_until)) {
            console.warn('⚡ [Realtime Ban Monitor] User has been banned in real-time by admin! Kicking immediately...');
            await supabase.auth.signOut();
            clearAdminState();
            setUser(null);
            setUserProfile(null);
            setIsGuest(false);
            const banUntilStr = new Date(updated.banned_until).toLocaleString();
            setBanError(`You are banned temporarily. Access is suspended until ${banUntilStr}.`);
            setView('home');
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime Ban Monitor] Channel status:`, status);
      });

    return () => {
      supabase.removeChannel(banChannel);
    };
  }, [isConfigInitialized, user?.id, clearAdminState]);

  // Realtime Device Ban Monitor: Listen for blacklisted devices
  useEffect(() => {
    if (!isConfigInitialized || !isSupabaseConfigured || !supabase) return;

    const currentDeviceId = getOrCreateDeviceId();

    const deviceBanChannel = supabase
      .channel('realtime_device_blacklist_monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'banned_devices',
        },
        (payload) => {
          const inserted = payload.new as any;
          if (inserted && inserted.device_id === currentDeviceId) {
            console.warn('⚡ [Realtime Device Blacklist] Device match detected! Freezing app...');
            setIsDeviceBlacklisted(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deviceBanChannel);
    };
  }, [isConfigInitialized]);

  // Top-Level Security Interceptor (The Gatekeeper)
  // Runs on initial mount, route/view changes, and auth state
  useEffect(() => {
    let isCancelled = false;

    async function runSecurityGatekeeper() {
      const currentDeviceId = getOrCreateDeviceId();

      // 1. Un-bypassable Device Ban check
      try {
        const isDeviceBanned = await isDeviceBannedInDatabase(currentDeviceId);
        if (!isCancelled && isDeviceBanned) {
          setIsDeviceBlacklisted(true);
          return;
        }
      } catch (err) {
        console.warn('[Gatekeeper] Device ban check note:', err);
      }

      // 2. Account Ban Enforcement for current user
      if (user?.id || user?.email) {
        try {
          const isAccBanned = await isAccountBannedInDatabase(user.id, user.email);
          if (!isCancelled && isAccBanned) {
            console.warn('[Gatekeeper] Active account is banned. Terminating session...');
            if (isSupabaseConfigured && supabase) {
              await supabase.auth.signOut();
            }
            clearAdminState();
            setUser(null);
            setUserProfile(null);
            setIsGuest(false);
            setPermanentAccountBanError('SECURITY ALERT: Your account has been permanently banned for violating the Terms of Service.');
            return;
          }
        } catch (err) {
          console.warn('[Gatekeeper] Account ban check note:', err);
        }
      }
    }

    runSecurityGatekeeper();

    return () => {
      isCancelled = true;
    };
  }, [view, user, clearAdminState]);

  const handleUserLogout = async () => {
    // 1. Explicitly clear all admin-related states and storage flags
    clearAdminState();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("SignOut error:", err);
      }
    }
    setUser(null);
    setUserProfile(null);
    setIsGuest(false);
    setBanError(null);
    localStorage.removeItem('ocu_guest_mode');
    setView('home');
  };

  useEffect(() => {
    if (!isConfigInitialized) return;

    if (isSupabaseConfigured && supabase) {
      // Set up realtime channel subscription for all public schema table updates
      const channel = supabase
        .channel('realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          console.log('⚡ Realtime database change detected! Synchronizing local state with Supabase...');
          loadSupabaseData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigInitialized, loadSupabaseData]);

  // Simulated live cosmic anomalies list
  const activeThreats = [
    { location: 'Paris Outpost', sector: 'Sub-Sector 4A', status: 'Rift Stabilized', hazardLevel: 'High' },
    { location: 'Metropolis Core', sector: 'Sector Earth-01', status: 'Gravitational Wave Detected', hazardLevel: 'Medium' },
    { location: 'Ophiuchus Remnants', sector: 'Void Grid-9', status: 'Entropy Collapse Ongoing', hazardLevel: 'Cataclysmic' },
    { location: 'Lunar Sanctum', sector: 'Sector Sol-IV', status: 'Perimeter Integrity: 100%', hazardLevel: 'Minimal' }
  ];

  useEffect(() => {
    // Stagger threats monitor updates
    const interval = setInterval(() => {
      setActiveThreatIndex((prev) => (prev + 1) % activeThreats.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleBuyComic = (comic: ComicVolume) => {
    if (!user) {
      setIsGuest(false);
      localStorage.removeItem('ocu_guest_mode');
      return;
    }
    setSelectedComic(comic);
    setIsPurchaseOpen(true);
  };

  const handleOrderCreated = async (newOrder: Order) => {
    try {
      await saveOrderInSupabase(newOrder);
      console.log('Successfully saved purchase order to Supabase:', newOrder.id);
      setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
      await loadSupabaseData();
    } catch (err) {
      console.error('Failed to save purchase order to Supabase:', err);
    }
  };

  const handleUnlockComic = async (comic: ComicVolume) => {
    const customerEmail = user?.email || 'mohamedadhilathika@gmail.com';
    const newOrder: Order = {
      id: `OCU-${Math.floor(100000 + Math.random() * 900000)}-UPI`,
      comicId: comic.id,
      comicTitle: comic.title,
      customerEmail: customerEmail,
      purchaseDate: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      price: comic.price,
      status: 'Completed',
      paymentStatus: 'Paid'
    };
    await handleOrderCreated(newOrder);
  };

  const handleUnlockAcademyResource = async (resource: AcademyResource) => {
    const customerEmail = user?.email || 'mohamedadhilathika@gmail.com';
    const newOrder: Order = {
      id: `OCU-${Math.floor(100000 + Math.random() * 900000)}-ACAD`,
      comicId: resource.id,
      comicTitle: resource.title,
      customerEmail: customerEmail,
      purchaseDate: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      price: resource.priceINR,
      status: 'Completed',
      paymentStatus: 'Paid'
    };
    await handleOrderCreated(newOrder);
  };

  const isAcademyResourceUnlocked = (res: AcademyResource) => {
    if (!res.priceINR || res.priceINR === 0 || res.tier !== 'paid') return true;
    if (isAdminLoggedIn) return true;
    try {
      const stored = JSON.parse(localStorage.getItem('ocu_unlocked_academy') || '[]');
      if (Array.isArray(stored) && stored.includes(res.id)) return true;
    } catch {}
    return orders.some(o => o.comicId === res.id && o.customerEmail === user?.email && o.status === 'Completed' && o.paymentStatus === 'Paid');
  };

  const handleReadAcademyResource = (res: AcademyResource) => {
    if (!isAcademyResourceUnlocked(res)) {
      showToast(
        `"${res.title}" requires payment of ₹${res.priceINR}. Please click "PAY ₹${res.priceINR}" to unlock.`,
        'warning',
        'Material Locked'
      );
      return;
    }
    setReadingAcademyResource(res);
  };

  // Gift System Event Handlers
  const handleRedeemAttempt = async (code: string) => {
    if (!user) {
      return { success: false, message: 'Authentication required. Please log in to redeem gift codes.' };
    }

    const foundCode = giftCodes.find((c) => c.code === code);
    if (!foundCode) {
      return { success: false, message: 'Invalid gift code. Please verify and try again.' };
    }
    if (!foundCode.enabled) {
      return { success: false, message: 'This gift code has been deactivated by the administrator.' };
    }
    if (foundCode.status === 'Redeemed') {
      return { success: false, message: 'This gift code has already been redeemed.' };
    }

    // Process successful redemption
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const updatedCode = {
      ...foundCode,
      status: 'Redeemed' as const,
      remainingUses: 0,
      redeemedBy: user.email || 'unknown_user',
      redeemedAt: timestamp,
    };

    const newHistoryItem: RedemptionHistory = {
      id: Math.random().toString(36).substring(2, 9),
      code: code,
      redeemedAt: timestamp,
      userEmail: user.email || 'unknown_user',
    };

    try {
      await saveGiftCodeInSupabase(updatedCode);
      await saveRedemptionHistoryInSupabase(newHistoryItem);
      await loadSupabaseData();
    } catch (err) {
      console.error('Error saving redemption state to Supabase:', err);
    }

    const updatedCodes = giftCodes.map((c) => c.code === code ? updatedCode : c);
    const updatedHistory = [newHistoryItem, ...redemptionHistory];

    setGiftCodes(updatedCodes);
    setRedemptionHistory(updatedHistory);
    setActiveRedeemedCode(code);

    return { success: true, message: 'Voucher verified! All digital comic volumes have been decrypted.' };
  };

  const handleToggleCode = async (code: string) => {
    const found = giftCodes.find((c) => c.code === code);
    if (!found) return;
    const updatedCode = { ...found, enabled: !found.enabled };

    try {
      await saveGiftCodeInSupabase(updatedCode);
      await loadSupabaseData();
    } catch (err) {
      console.error('Error toggling voucher in Supabase:', err);
    }
  };

  const handleResetCode = async (code: string) => {
    const found = giftCodes.find((c) => c.code === code);
    if (!found) return;
    const updatedCode = {
      ...found,
      status: 'Unredeemed' as const,
      remainingUses: 1,
      redeemedBy: undefined,
      redeemedAt: undefined,
    };

    try {
      await saveGiftCodeInSupabase(updatedCode);
      await loadSupabaseData();
    } catch (err) {
      console.error('Error resetting voucher in Supabase:', err);
    }

    // Also strip from active redeemed session if it matches
    if (activeRedeemedCode === code) {
      setActiveRedeemedCode(null);
    }
  };

  const handleDeleteCode = async (code: string) => {
    try {
      await deleteGiftCodeFromSupabase(code);
      await loadSupabaseData();
    } catch (err) {
      console.error('Error deleting voucher from Supabase:', err);
    }

    if (activeRedeemedCode === code) {
      setActiveRedeemedCode(null);
    }
  };

  const handleAddCode = async (code: string) => {
    const newCode: GiftCode = {
      code,
      enabled: true,
      status: 'Unredeemed',
      remainingUses: 1,
    };

    try {
      await saveGiftCodeInSupabase(newCode);
      await loadSupabaseData();
    } catch (err) {
      console.error('Error saving new voucher to Supabase:', err);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearRedemptionHistoryInSupabase();
      await loadSupabaseData();
    } catch (err) {
      console.error('Error clearing redemption history in Supabase:', err);
    }
  };

  const handleResetSession = () => {
    setActiveRedeemedCode(null);
  };


  // Module 4: Device Ban Enforcement (Un-bypassable)
  if (isDeviceBlacklisted) {
    return (
      <div 
        id="device-blacklist-freeze-screen"
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 999999, 
          background: 'black', 
          color: 'red', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          padding: '24px',
          fontFamily: 'monospace'
        }}
      >
        <div style={{ maxWidth: '650px', lineHeight: '1.6' }}>
          <p style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            DEVICE BLACKLISTED: This device has been permanently banned from accessing Omni Comic Universal Hub due to severe Terms of Service violations. Access denied.
          </p>
        </div>
      </div>
    );
  }

  // Module 4: Account Ban Enforcement
  if (permanentAccountBanError) {
    return (
      <div 
        id="account-ban-security-screen"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'black',
          color: 'red',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          fontFamily: 'monospace'
        }}
      >
        <div style={{ maxWidth: '650px', lineHeight: '1.6' }}>
          <p style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.05em', color: '#ff4d4d' }}>
            SECURITY ALERT: Your account has been permanently banned for violating the Terms of Service.
          </p>
        </div>
      </div>
    );
  }

  if (!isConfigInitialized) {
    return (
      <div className="min-h-screen bg-ocu-dark flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocu-gold"></div>
        <span className="font-mono text-xs text-ocu-gray mt-4 tracking-widest">INITIALIZING SECURE ARCHIVE...</span>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <LoginPage 
        initialError={banError}
        onLoginSuccess={(u, profile) => {
          // Explicitly force admin state to false on every user login
          clearAdminState();
          setBanError(null);
          setUser(u);
          setUserProfile(profile);
          setIsGuest(false);
          setView('home');
        }}
        onContinueAsGuest={() => {
          // Explicitly force admin state to false on guest access
          clearAdminState();
          setBanError(null);
          setIsGuest(true);
          localStorage.setItem('ocu_guest_mode', 'true');
          setView('home');
        }}
      />
    );
  }

  return (
    <div id="ocu-root-app" className="relative min-h-screen bg-ocu-dark font-sans text-white overflow-hidden selection:bg-ocu-crimson selection:text-white">
      
      {/* Premium Sticky Navigation */}
      <Header 
        currentView={view} 
        setView={setView} 
        isAdminLoggedIn={isAdminLoggedIn} 
        onOpenAdminLogin={() => setIsLoginModalOpen(true)} 
        user={user}
        userProfile={userProfile}
        onLogout={handleUserLogout}
      />

      {/* Main Container */}
      <main id="ocu-main-content">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="view-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-0"
            >
              {/* Cinematic full-screen hero banner */}
              <Hero 
                onExploreComics={() => {
                  setView('comics');
                  setTimeout(() => {
                    document.getElementById('comics-catalog-top')?.scrollIntoView({ behavior: 'smooth' });
                  }, 200);
                }} 
                onExploreUniverse={() => {
                  const element = document.getElementById('universe-overview');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }} 
              />

              {/* 2. Bento Grid Overview Panel */}
              <section
                id="universe-overview"
                className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 space-y-16"
              >
                {/* Visual Label */}
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-3">
                  <span className="font-mono text-[10px] tracking-[0.3em] text-ocu-crimson font-bold uppercase">
                    SYSTEM OVERVIEW // GRANTED ACCESS
                  </span>
                  <h2 className="font-display font-black text-3xl md:text-5xl text-white uppercase tracking-tight">
                    THE UNIVERSE HUB
                  </h2>
                  <p className="font-sans text-sm text-ocu-gray font-light">
                    Monitor tactical defense telemetry, access study blueprints, and explore official comic release grids directly from the central command core.
                  </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Comic Volume Bento Piece (8 cols) */}
                  <div className="md:col-span-8 bg-ocu-graphite border border-white/10 rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-white/20 transition-all duration-300">
                    <div className="sm:w-1/2 p-8 flex flex-col justify-between text-left">
                      <div className="space-y-4">
                        <span className="font-mono text-[9px] tracking-widest text-ocu-gold font-bold uppercase bg-yellow-950/20 border border-ocu-gold/15 px-2 py-0.5 rounded inline-block">
                          LATEST VOL. RELEASE
                        </span>
                        <h4 className="font-display font-black text-2xl text-white uppercase tracking-tight">
                          THE MALACHOR PROTOCOL
                        </h4>
                        <p className="font-sans text-xs text-ocu-gray font-light leading-relaxed">
                          The absolute climax of Phase One. Malachor projects black hole anchors across Earth’s lines. The Vanguard gathers for an ultimate multi-front counterstrike.
                        </p>
                        <div className="flex items-center gap-4 font-mono text-[10px] text-white/50">
                          <span>VOL. 04</span>
                          <span>•</span>
                          <span>80 PAGES</span>
                          <span>•</span>
                          <span>$29.99</span>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <button
                          id="bento-btn-purchase-malachor"
                          onClick={() => {
                            const malachorComic = comics.find(c => c.id === 'malachor-protocol') || comics.find(c => c.volumeNumber === 4) || OCU_COMICS[3];
                            handleBuyComic(malachorComic);
                          }}
                          className="w-full py-2.5 bg-white text-black font-display text-[10px] font-black tracking-widest uppercase rounded cursor-pointer hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart size={11} />
                          <span>PRE-ORDER NOW</span>
                        </button>
                      </div>
                    </div>

                    {/* Book mockup cover preview */}
                    <div className="sm:w-1/2 bg-gradient-to-br from-violet-950 via-indigo-950 to-neutral-950 p-8 flex items-center justify-center border-t sm:border-t-0 sm:border-l border-white/5">
                      <div className="w-40 aspect-[3/4] bg-neutral-950 rounded-lg shadow-2xl border border-white/15 p-5 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-violet-900/40 via-transparent to-transparent" />
                        <span className="font-mono text-[9px] text-ocu-gold font-semibold">VOL. 04</span>
                        <div>
                          <p className="font-mono text-[8px] text-white/40 tracking-wider">COMING SEPT 2026</p>
                          <h5 className="font-display font-black text-sm text-white uppercase mt-0.5">THE MALACHOR PROTOCOL</h5>
                        </div>
                        {/* Spine cover */}
                        <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/50 to-transparent" />
                      </div>
                    </div>
                  </div>

                  {/* Simulated Space Incursions Radar / Live Monitor (4 cols) */}
                  <div className="md:col-span-4 bg-ocu-graphite border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-mono text-[9px] tracking-widest font-bold text-white uppercase">
                            ACTIVE RADAR SECURE
                          </span>
                        </div>
                        <span className="font-mono text-[8px] text-ocu-gray">SYSTEM_ON</span>
                      </div>

                      <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight border-b border-white/5 pb-2">
                        SECTOR REPORTS
                      </h3>

                      {/* Displaying active rolling threat data */}
                      <div className="bg-black/35 rounded-lg p-4 font-mono text-[11px] space-y-3 border border-white/5 relative overflow-hidden min-h-[140px]">
                        <div className="absolute inset-x-0 h-[1px] bg-emerald-500/10 top-1/2" />
                        
                        <div className="flex justify-between text-white/40 text-[9px]">
                          <span>LOCATION SEC</span>
                          <span>HAZARD</span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-white font-bold uppercase truncate">{activeThreats[activeThreatIndex].location}</p>
                          <p className="text-ocu-gray text-[10px]">{activeThreats[activeThreatIndex].sector}</p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-ocu-gold">{activeThreats[activeThreatIndex].status}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            activeThreats[activeThreatIndex].hazardLevel === 'Cataclysmic' || activeThreats[activeThreatIndex].hazardLevel === 'High'
                              ? 'text-rose-400 bg-rose-950/30 border border-rose-500/20'
                              : 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20'
                          }`}>
                            {activeThreats[activeThreatIndex].hazardLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="font-mono text-[9px] text-ocu-gray text-center tracking-widest mt-4">
                      📡 SATELLITE DISPATCH FEED • UPDATING LIVE
                    </p>
                  </div>

                </div>
              </section>

              {/* 3. Immersive Audio Ambient Toggle Theater section */}
              <section id="ambient-theater" className="bg-neutral-950 border-t border-b border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-ocu-gold">
                      <Tv size={24} />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-white uppercase tracking-wide">
                        Ambient Space Frequency Toggle
                      </h4>
                      <p className="font-sans text-xs text-ocu-gray">
                        Trigger a low-frequency cosmic synthesizer signal to intensify your database exploration.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* CSS animated audio wave visualizer */}
                    {isAmbientPlaying && (
                      <div className="flex items-end gap-1 h-6">
                        {[1.0, 0.6, 0.9, 0.4, 0.8, 0.5, 0.7].map((h, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [`${h * 4}px`, `${h * 24}px`, `${h * 4}px`] }}
                            transition={{ repeat: Infinity, duration: 1.2 + i * 0.1, ease: 'easeInOut' }}
                            className="w-[3px] bg-gradient-to-t from-ocu-crimson to-ocu-gold rounded-full"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      id="btn-toggle-soundtrack"
                      onClick={() => setIsAmbientPlaying(!isAmbientPlaying)}
                      className={`px-5 py-2.5 rounded font-display text-xs font-bold tracking-widest uppercase transition-all cursor-pointer flex items-center gap-2 ${
                        isAmbientPlaying
                          ? 'bg-ocu-crimson text-white crimson-glow'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      }`}
                    >
                      {isAmbientPlaying ? (
                        <>
                          <Volume2 size={13} />
                          <span>AMBIENCE ON</span>
                        </>
                      ) : (
                        <>
                          <VolumeX size={13} className="text-ocu-gray" />
                          <span>AMBIENCE OFF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* 4. Latest Comic Strip horizontal overview */}
              <section id="catalog-comics" className="max-w-7xl mx-auto px-6 py-24 text-left space-y-12 scroll-mt-24">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="font-mono text-[9px] tracking-widest text-ocu-gold uppercase font-bold">OCU COMIC ARCHIVE</span>
                    <h3 className="font-display font-black text-2xl md:text-3xl text-white uppercase tracking-tight mt-1">
                      FEATURED VOLUMES
                    </h3>
                  </div>
                  <button
                    id="btn-view-all-comics-hub"
                    onClick={() => {
                      setView('comics');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group flex items-center gap-1.5 text-xs text-white hover:text-ocu-gold font-mono transition-all uppercase cursor-pointer"
                  >
                    <span>BROWSE THE CATALOGUE</span>
                    <ArrowUpRight size={14} className="text-ocu-crimson group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {comics.filter(c => c.releaseStatus !== 'Archived' && c.releaseStatus !== 'Draft' && !c.isDeleted).slice(0, 3).map((comic) => (
                    <ComicCard 
                      key={comic.id} 
                      comic={comic} 
                      onBuy={handleBuyComic} 
                      onUnlockComic={handleUnlockComic}
                      userEmail={user?.email || 'mohamedadhilathika@gmail.com'}
                      hasDigitalAccess={!!activeRedeemedCode || comic.price === 0 || orders.some(o => o.comicId === comic.id && o.customerEmail === user?.email && o.status === 'Completed' && o.paymentStatus === 'Paid')}
                      onRead={handleReadComic}
                      showToast={showToast}
                    />
                  ))}
                </div>
              </section>

              {/* 5. OCU ACADEMY SECTION */}
              <section
                id="catalog-academy"
                className="max-w-7xl mx-auto px-6 py-24 text-left border-t border-white/5 space-y-12 scroll-mt-24"
              >
                {/* Legacy Anchor support */}
                <div id="ocu-academy" className="scroll-mt-24" />
                {/* Header with bold styling, badges, and dynamic custom heading */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="text-ocu-gold" size={20} />
                      <span className="font-mono text-[10px] tracking-[0.3em] text-ocu-gold font-bold uppercase">
                        ACADEMIC HUB // STATE BOARD REVISION
                      </span>
                    </div>
                    <h2 className="font-display font-black text-3xl md:text-5xl text-white uppercase tracking-tight">
                      {academyHeading || 'OCU ACADEMY'}
                    </h2>
                    <p className="font-sans text-sm text-ocu-gray max-w-2xl font-light leading-relaxed">
                      High-yield revision blueprints, chapter-by-chapter breakdowns, solved question sets, and student study kits tailored for 11th-Grade state board academic excellence.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
                      <Check size={13} />
                      <span>2026 Board Edition</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 font-mono text-xs">
                      <BookOpen size={13} className="text-ocu-gold" />
                      <span>Verified Curricula</span>
                    </span>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {academyResources.map((item) => (
                    <AcademyCard
                      key={item.id}
                      item={item}
                      isAdminLoggedIn={isAdminLoggedIn}
                      isUnlockedGlobally={orders.some(o => o.comicId === item.id && o.customerEmail === user?.email && o.status === 'Completed' && o.paymentStatus === 'Paid')}
                      onRead={handleReadAcademyResource}
                      onUnlock={handleUnlockAcademyResource}
                      userEmail={user?.email || 'mohamedadhilathika@gmail.com'}
                      showToast={showToast}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* Comics view */}
          {view === 'comics' && (
            <motion.div
              key="view-comics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="max-w-7xl mx-auto px-6 py-32 space-y-12"
            >
              <div id="comics-catalog-top" className="text-center max-w-2xl mx-auto space-y-3">
                <span className="font-mono text-[10px] tracking-[0.3em] text-ocu-gold font-bold uppercase">
                  PUBLISHED & PRE-ORDER SCHEMAS
                </span>
                <h2 className="font-display font-black text-3xl md:text-5xl text-white uppercase tracking-tight">
                  COMIC CATALOGUE
                </h2>
                <p className="font-sans text-sm text-ocu-gray font-light">
                  Follow the expanding release roadmap of the Omni Comic Universe. Safely secure copies of released comic volumes or lock in early pre-orders.
                </p>
              </div>

              {/* Gift Voucher Entry Widget */}
              <div className="max-w-3xl mx-auto">
                <GiftCodeRedeemer 
                  onRedeemSuccess={(code) => {}} 
                  activeRedeemedCode={activeRedeemedCode} 
                  giftCodes={giftCodes} 
                  onRedeemAttempt={handleRedeemAttempt} 
                  onResetSession={handleResetSession}
                />
              </div>

              {/* Comprehensive grid of volumes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                {comics.filter(c => c.releaseStatus !== 'Archived' && c.releaseStatus !== 'Draft' && !c.isDeleted).map((comic) => (
                  <ComicCard 
                    key={comic.id} 
                    comic={comic} 
                    onBuy={handleBuyComic} 
                    onUnlockComic={handleUnlockComic}
                    userEmail={user?.email || 'mohamedadhilathika@gmail.com'}
                    hasDigitalAccess={!!activeRedeemedCode || comic.price === 0 || orders.some(o => o.comicId === comic.id && o.customerEmail === user?.email && o.status === 'Completed' && o.paymentStatus === 'Paid')}
                    onRead={handleReadComic}
                    showToast={showToast}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Secure Command/Admin view */}
          {view === 'admin' && isAdminLoggedIn && (
            <motion.div
              key="view-admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="max-w-7xl mx-auto px-6 py-32"
            >
              <AdminPanel
                comics={comics}
                setComics={setComics}
                giftCodes={giftCodes}
                setGiftCodes={setGiftCodes}
                redemptionHistory={redemptionHistory}
                onToggleCode={handleToggleCode}
                onResetCode={handleResetCode}
                onDeleteCode={handleDeleteCode}
                onAddCode={handleAddCode}
                onClearHistory={handleClearHistory}
                orders={orders}
                setOrders={setOrders}
                adminAccessCode={adminAccessCode}
                onChangeAccessCode={(newCode) => {
                  setAdminAccessCode(newCode);
                  localStorage.setItem('ocu_admin_access_code', newCode);
                }}
                onLogout={() => {
                  clearAdminState();
                  setView('home');
                }}
                onRefreshData={loadSupabaseData}
                discountCoupons={discountCoupons}
                setDiscountCoupons={setDiscountCoupons}
                freeComicCoupons={freeComicCoupons}
                setFreeComicCoupons={setFreeComicCoupons}
                couponRedemptions={couponRedemptions}
                setCouponRedemptions={setCouponRedemptions}
                academyHeading={academyHeading}
                setAcademyHeading={setAcademyHeading}
                academyResources={academyResources}
                setAcademyResources={setAcademyResources}
                onSaveAcademyHeading={handleSaveAcademyHeading}
                onSaveAcademyResource={handleSaveAcademyResource}
                onDeleteAcademyResource={handleDeleteAcademyResource}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Checkout / Purchasing Modal */}
      <PurchaseModal 
        comic={selectedComic} 
        isOpen={isPurchaseOpen} 
        onClose={() => setIsPurchaseOpen(false)} 
        onOrderCreated={handleOrderCreated}
        userEmail={user?.email || ''}
      />

      {/* Immersive Protected Comic Reader Modal */}
      <AnimatePresence>
        {readingComic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 overflow-hidden"
          >
            <ComicReader 
              comic={readingComic} 
              onClose={(reason) => {
                console.log('Reader closed triggered by: ', reason || 'Unspecified manual close');
                setReadingComic(null);
                setView('comics');
                setTimeout(() => {
                  window.scrollTo({ top: lastComicsScrollPos, behavior: 'instant' });
                }, 50);
              }} 
              userEmail={user?.email || ''}
              isGiftAccess={!!activeRedeemedCode && !orders.some(o => o.comicId === readingComic.id && o.customerEmail === user?.email && o.status === 'Completed' && o.paymentStatus === 'Paid')}
              adminAccessCode={adminAccessCode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated OCU Academy Secure PDF Reader */}
      <AnimatePresence>
        {readingAcademyResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 overflow-hidden"
          >
            <AcademyPdfReader
              pdfUrl={readingAcademyResource.pdfUrl}
              resource={readingAcademyResource}
              onClose={(reason) => {
                console.log('[ACADEMY-PDF-READER] Closed by:', reason || 'User action');
                setReadingAcademyResource(null);
              }}
              isAdmin={isAdminLoggedIn}
              userEmail={user?.email || (isGuest ? 'Guest Student' : 'Student')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Admin Login dialog */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('ocu_admin_logged_in', 'true');
          sessionStorage.setItem('isAdmin', 'true');
          localStorage.setItem('ocu_admin_logged_in', 'true');
          localStorage.setItem('isAdmin', 'true');
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('ocu-admin-auth-change', { detail: { isAdmin: true } }));
          setView('admin');
        }}
        adminAccessCode={adminAccessCode}
      />

      {/* OCU Academy Interactive Notes Modal */}
      <AnimatePresence>
        {selectedAcademyResource && (
          <motion.div
            id="ocu-academy-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedAcademyResource(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-[#0f0f18] border border-white/15 rounded-2xl p-6 sm:p-8 text-left shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[9px] tracking-wider text-ocu-gold uppercase font-bold bg-ocu-gold/10 border border-ocu-gold/20 px-2 py-0.5 rounded">
                      {selectedAcademyResource.badge}
                    </span>
                    {selectedAcademyResource.tier === 'paid' && selectedAcademyResource.priceINR > 0 ? (
                      <span className="font-mono text-[9px] tracking-wider text-amber-400 font-bold uppercase bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-0.5">
                        ₹{selectedAcademyResource.priceINR}
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] tracking-wider text-emerald-400 font-bold uppercase bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                        FREE TIER
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-white/50">
                      • {selectedAcademyResource.docPages || 40} Pages
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-tight">
                    {selectedAcademyResource.title}
                  </h3>
                  <p className="font-mono text-xs text-ocu-gold mt-0.5">
                    {selectedAcademyResource.stream}
                  </p>
                </div>
                <button
                  id="btn-close-academy-modal"
                  onClick={() => setSelectedAcademyResource(null)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-ocu-gray hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Description */}
              <p className="font-sans text-xs text-ocu-gray leading-relaxed">
                {selectedAcademyResource.description}
              </p>

              {/* PDF Document Status */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-emerald-300 font-mono min-w-0">
                  <FileText size={16} className="text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0 truncate">
                    <p className="font-bold text-white text-xs truncate">{selectedAcademyResource.pdfFileName || 'Verified Syllabus PDF Kit'}</p>
                    <p className="text-[10px] text-emerald-400/80">Classroom DRM Protected Academic Reader</p>
                  </div>
                </div>
                {isAcademyResourceUnlocked(selectedAcademyResource) ? (
                  <button
                    id="btn-modal-open-reader"
                    onClick={() => {
                      const res = selectedAcademyResource;
                      setSelectedAcademyResource(null);
                      setReadingAcademyResource(res);
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors flex-shrink-0"
                  >
                    <BookOpen size={12} />
                    <span>Open Reader</span>
                  </button>
                ) : (
                  <button
                    id="btn-modal-open-reader"
                    onClick={() => {
                      const res = selectedAcademyResource;
                      const price = res.priceINR;
                      window.location.href = `upi://pay?pa=mohamedadhilathika@okhdfcbank&pn=OmniComic&am=${price}&cu=INR`;
                      setSelectedAcademyResource(null);
                      setTimeout(() => {
                        const payBtn = document.getElementById(`btn-pay-academy-${res.id}`);
                        if (payBtn) {
                          payBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          payBtn.click();
                        }
                      }, 300);
                    }}
                    className="px-3 py-1.5 rounded bg-ocu-crimson hover:bg-rose-600 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors flex-shrink-0"
                  >
                    <Lock size={12} />
                    <span>PAY ₹{selectedAcademyResource.priceINR}</span>
                  </button>
                )}
              </div>

              {/* Units & Syllabus Breakdown */}
              <div className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-widest text-white font-bold flex items-center gap-2">
                  <FileText size={14} className="text-ocu-crimson" />
                  <span>Syllabus Units & Key Coverage</span>
                </h4>
                <div className="space-y-2.5">
                  {selectedAcademyResource.chapters.map((ch, idx) => (
                    <div key={idx} className="p-3.5 bg-black/40 border border-white/5 rounded-lg space-y-1">
                      <p className="font-display font-bold text-xs text-white uppercase tracking-wide">
                        {ch.name}
                      </p>
                      <p className="font-sans text-[11px] text-white/60 leading-relaxed">
                        {ch.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* High-Scoring Board Exam Tips */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-ocu-gold/20 space-y-2">
                <h4 className="font-mono text-[11px] uppercase tracking-wider text-ocu-gold font-bold flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>State Board Examiner Insights:</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-white/80 font-sans">
                  {selectedAcademyResource.examTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check size={13} className="text-ocu-gold mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] leading-relaxed text-white/70">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
                <div className="font-mono text-[10px] text-white/40">
                  {selectedAcademyResource.tier === 'paid' && selectedAcademyResource.priceINR > 0 
                    ? `PREMIUM SYLLABUS KIT • ₹${selectedAcademyResource.priceINR}` 
                    : 'FREE DIGITAL REVISION ASSET • ACCREDITED'}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {isAcademyResourceUnlocked(selectedAcademyResource) ? (
                    <button
                      id="btn-open-academy-reader-from-modal"
                      onClick={() => {
                        const res = selectedAcademyResource;
                        setSelectedAcademyResource(null);
                        setReadingAcademyResource(res);
                      }}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      <BookOpen size={14} />
                      <span>Open in Secure Reader</span>
                    </button>
                  ) : (
                    <button
                      id="btn-modal-pay-academy"
                      onClick={() => {
                        const res = selectedAcademyResource;
                        const price = res.priceINR;
                        window.location.href = `upi://pay?pa=mohamedadhilathika@okhdfcbank&pn=OmniComic&am=${price}&cu=INR`;
                        setSelectedAcademyResource(null);
                        setTimeout(() => {
                          const payBtn = document.getElementById(`btn-pay-academy-${res.id}`);
                          if (payBtn) {
                            payBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            payBtn.click();
                          }
                        }, 300);
                      }}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-ocu-crimson hover:bg-rose-600 text-white font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Lock size={14} />
                      <span>PAY ₹{selectedAcademyResource.priceINR}</span>
                    </button>
                  )}

                  {/* Admin-Only Direct Download Button */}
                  {isAdminLoggedIn && selectedAcademyResource.pdfUrl && (
                    <button
                      id="btn-admin-modal-download"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedAcademyResource.pdfUrl!;
                        link.download = selectedAcademyResource.pdfFileName || `${selectedAcademyResource.id}-notes.pdf`;
                        link.click();
                      }}
                      className="px-4 py-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Admin Privilege: Unrestricted PDF Download"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Admin Download</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedAcademyResource(null)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-display font-medium text-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instant Notification Toast */}
      <AnimatePresence>
        {downloadNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#141420] border border-emerald-500/40 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Check size={14} className="text-emerald-400" />
            <span>{downloadNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <footer id="ocu-footer" className="relative bg-black border-t border-white/5 py-16 text-left z-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* Logo brand info */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-gradient-to-r from-ocu-crimson to-ocu-gold p-[1px]">
                <div className="w-full h-full bg-black rounded-md flex items-center justify-center font-display font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-ocu-crimson to-ocu-gold">
                  Ω
                </div>
              </div>
              <span className="font-display font-black text-base tracking-widest text-white leading-none">
                OMNI COMIC UNIVERSE
              </span>
            </div>
            <p className="font-sans text-xs text-ocu-gray font-light leading-relaxed">
              The official portal to the OCU cinematic and book publication roadmap. Experience top-tier entertainment literature crafted for cosmic visionaries.
            </p>
            <button
              id="btn-trigger-admin-portal"
              onClick={() => setIsLoginModalOpen(true)}
              className="font-mono text-[9px] text-ocu-gray hover:text-ocu-gold transition-colors flex items-center gap-1 cursor-pointer"
            >
              CLASSIFIED ACCESS SYSTEM // V.1.0.42_PROD 🔑
            </button>
          </div>

          {/* Quick links */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="font-mono text-[10px] tracking-widest text-white uppercase font-bold">DIRECTORY ARCHIVES</h5>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => setView('home')} className="text-xs text-ocu-gray hover:text-white transition-colors hover:underline text-left cursor-pointer">Universe Overview</button>
              <button onClick={() => setView('comics')} className="text-xs text-ocu-gray hover:text-white transition-colors hover:underline text-left cursor-pointer">Released Comic Catalogs</button>
              <a 
                href="#ocu-academy" 
                onClick={(e) => {
                  if (view !== 'home') {
                    e.preventDefault();
                    setView('home');
                    setTimeout(() => {
                      document.getElementById('ocu-academy')?.scrollIntoView({ behavior: 'smooth' });
                    }, 150);
                  }
                }} 
                className="text-xs text-ocu-gold hover:text-white transition-colors hover:underline text-left cursor-pointer flex items-center gap-1"
              >
                <span>OCU Academy Notes (11th Grade)</span>
              </a>
            </div>
          </div>

          {/* Copyright, legal disclaimer nodes */}
          <div className="md:col-span-5 space-y-4">
            <h5 className="font-mono text-[10px] tracking-widest text-white uppercase font-bold">LEGAL CLASSIFICATION & PROTOCOLS</h5>
            <p className="font-sans text-[11px] text-ocu-gray font-light leading-relaxed">
              © 2026 Omni Comic Universe (OCU) Inc. All trademarks, fictional names, timelines, planetary maps, and creative artwork descriptions remain intellectual properties of the sovereign organization. No replication permitted.
            </p>
            <div className="flex items-center gap-3 pt-2 text-ocu-gold font-mono text-[9px]">
              <span className="flex items-center gap-1.5 border border-ocu-gold/15 bg-yellow-950/10 px-2 py-0.5 rounded">
                <Check size={10} /> SECURE PROTOCOLS ACTIVE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
              <span>STABILITY CLASSIFICATION: CLEAR</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Fallback & Feedback Toast Alert System */}
      <AnimatePresence>
        {toastNotice && (
          <motion.div
            key={toastNotice.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`fixed top-20 right-6 z-[99999] max-w-md p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 text-left ${
              toastNotice.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/50'
                : toastNotice.type === 'error'
                  ? 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-950/50'
                  : toastNotice.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                    : 'bg-zinc-900/90 border-white/20 text-white shadow-black/50'
            }`}
            role="alert"
          >
            {toastNotice.type === 'warning' && <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />}
            {toastNotice.type === 'error' && <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />}
            {toastNotice.type === 'success' && <Check className="text-emerald-400 shrink-0 mt-0.5" size={18} />}
            {toastNotice.type === 'info' && <BookOpen className="text-ocu-gold shrink-0 mt-0.5" size={18} />}

            <div className="flex-grow space-y-0.5">
              {toastNotice.title && (
                <p className="font-display font-bold text-xs uppercase tracking-wider">
                  {toastNotice.title}
                </p>
              )}
              <p className="font-sans text-xs leading-relaxed opacity-90">
                {toastNotice.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToastNotice(null)}
              className="text-white/60 hover:text-white p-1 rounded transition-colors cursor-pointer shrink-0"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
