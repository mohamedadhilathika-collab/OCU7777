import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2, 
  ZoomIn, ZoomOut, RotateCcw, Play, Pause, Download, 
  ShieldCheck, Lock, AlertTriangle, Eye, BookOpen, Sparkles, 
  Zap, Orbit, Activity, Shield, Flame, Compass, HelpCircle, Info
} from 'lucide-react';
import { ComicVolume } from '../types';
import { supabase, isSupabaseConfigured, logSecurityEvent } from '../lib/supabase';

interface ComicReaderProps {
  comic: ComicVolume;
  onClose: () => void;
  userEmail?: string;
  isGiftAccess?: boolean;
  adminAccessCode?: string;
}

// Structuring visual comic components
interface ComicPanelData {
  gradient: string;
  illustrationType: 'gravity' | 'rift' | 'celestial' | 'clash' | 'cyber' | 'shield' | 'specter' | 'comet';
  description: string;
  soundEffect?: string;
  speech?: {
    speaker: string;
    text: string;
    role: 'hero' | 'villain' | 'narrator';
  }[];
}

interface ComicPageData {
  pageNumber: number;
  layout: 'single' | 'split-h' | 'split-v' | 'bento';
  panels: ComicPanelData[];
}

function generateFallbackPDF(title: string, numPages: number, userEmail?: string): Blob {
  const pageCount = numPages || 12;
  const objects: { id: number; offset: number }[] = [];
  let pdf = '%PDF-1.4\n';

  const pageIds: number[] = [];
  let nextId = 4;
  for (let i = 0; i < pageCount; i++) {
    pageIds.push(nextId);
    nextId += 2;
  }

  function writeObject(id: number, content: string) {
    objects.push({ id, offset: pdf.length });
    pdf += `${id} 0 obj\n${content}\nendobj\n`;
  }

  // Write Catalog (obj 1)
  writeObject(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  
  // Write Pages container (obj 2)
  writeObject(2, `<< /Type /Pages /Kids [ ${pageIds.map(id => `${id} 0 R`).join(' ')} ] /Count ${pageCount} >>`);
  
  // Write Font (obj 3)
  writeObject(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  // Write Pages and their streams
  for (let i = 0; i < pageCount; i++) {
    const pageId = pageIds[i];
    const contentId = pageId + 1;
    const pageNum = i + 1;

    // A beautiful sci-fi / comic styled text page stream
    const titleClean = title.replace(/[()]/g, '');
    const emailToUse = (userEmail || 'mohamedadhilathika@gmail.com').replace(/[()]/g, '');
    const streamContent = `BT
/F1 24 Tf
50 740 Td
(${titleClean}) Tj
/F1 12 Tf
0 -40 Td
(OFFICIAL OCU DIGITAL COMIC EDITION) Tj
/F1 14 Tf
0 -120 Td
(The Vanguard is currently tracking a threat in this quadrant.) Tj
0 -30 Td
(To safeguard classified materials, this high-fidelity digital) Tj
0 -25 Td
(reader fallback has been dynamically assembled.) Tj
0 -50 Td
(CLASSIFIED TRANSMISSION ACCESS PORT: ONLINE) Tj
0 -30 Td
(Reader Authenticated: ${emailToUse}) Tj
/F1 18 Tf
0 -180 Td
(PAGE ${pageNum} OF ${pageCount}) Tj
/F1 10 Tf
0 -100 Td
(C O S M I C   V O I D   S Y S T E M S) Tj
ET
`;

    const streamStr = `<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream`;
    
    writeObject(pageId, `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R >> >> /MediaBox [0 0 600 800] /Contents ${contentId} 0 R >>`);
    writeObject(contentId, streamStr);
  }

  // Write xref
  const startxref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (const obj of objects) {
    const offsetStr = String(obj.offset).padStart(10, '0');
    pdf += `${offsetStr} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${startxref}\n%%EOF\n`;

  // Convert to binary array
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

export default function ComicReader({ 
  comic, 
  onClose, 
  userEmail = 'mohamedadhilathika@gmail.com',
  isGiftAccess = false,
  adminAccessCode
}: ComicReaderProps) {
  
  // Stabilize onClose callback to prevent history popstate race conditions
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // DRM Protection States
  const [activeUser, setActiveUser] = useState<any>(null);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [watermarkTime, setWatermarkTime] = useState<Date>(new Date());
  const [watermarkConfig, setWatermarkConfig] = useState<{
    x: number;
    y: number;
    rotation: number;
    opacity: number;
    fontSize: string;
  }>({
    x: 20,
    y: 35,
    rotation: -30,
    opacity: 0.18,
    fontSize: 'text-xs',
  });
  
  const [showPrintWarning, setShowPrintWarning] = useState<boolean>(false);
  const [devToolsOpen, setDevToolsOpen] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);
  const [isOwnershipValid, setIsOwnershipValid] = useState<boolean>(true);
  const [signedUrl, setSignedUrl] = useState<string>('');

  // Sync Supabase Authenticated User Session
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setActiveUser({ id: 'LOCAL_DEV_USER', email: userEmail });
      setActiveProfile({ display_name: userEmail.split('@')[0] });
      return;
    }

    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setActiveUser(session.user);
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (profile) {
            setActiveProfile(profile);
          } else {
            setActiveProfile({ display_name: session.user.email?.split('@')[0] || 'Member' });
          }
        } else {
          setActiveUser({ id: 'SECURE_GUEST', email: userEmail || 'guest@domain.com' });
          setActiveProfile({ display_name: 'Guest Reader' });
        }
      } catch (err) {
        console.error('[DRM] Error syncing session inside reader:', err);
      }
    };

    syncSession();
  }, [userEmail]);

  // 1. Core States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [resumeNotification, setResumeNotification] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Admin access validation states
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState<boolean>(false);
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const actualAdminCode = adminAccessCode || localStorage.getItem('ocu_admin_access_code') || 'OCU-ADMIN-2026';
 
  // PDF Rendering States
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number>(comic.pages);
  const [pdfAspect, setPdfAspect] = useState<number>(0.666);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF Document with Caching, Streaming, and Progress
  useEffect(() => {
    let isCancelled = false;
    let loadingTask: any = null;

    async function loadPdfAndDoc() {
      setPdfError(null);
      setDownloadProgress(null);
      setPdfBlob(null);
      setPdfDoc(null);

      console.log('----------------------------------------------------');
      console.log('[DEBUG-PDF-READER] Opening Comic Reader with Advanced Stream & Cache Engine:', comic.id);
      console.log('[DEBUG-PDF-READER] Title:', comic.title);
      console.log('[DEBUG-PDF-READER] Original digitalFile path:', comic.digitalFile);
      console.log('----------------------------------------------------');

      try {
        if (!comic.digitalFile) {
          if (isCancelled) return;
          setPdfError('No PDF URL or storage path has been configured for this comic volume. Please upload a PDF book first.');
          return;
        }

        // 1. Resolve URL/Path
        let resolvedUrl = comic.digitalFile;
        let filePath = '';
        if (isSupabaseConfigured && !comic.digitalFile.startsWith('http') && !comic.digitalFile.startsWith('blob:')) {
          let storagePath = comic.digitalFile;
          if (!storagePath.includes('/')) {
            storagePath = `pdfs/${storagePath}`;
          }
          
          console.log('[DRM] Requesting 5-minute short-lived Signed URL for secure stream...');
          const { data: signedData, error: signedErr } = await supabase.storage
            .from('comics_assets')
            .createSignedUrl(storagePath, 300); // 5 minutes

          if (!signedErr && signedData?.signedUrl) {
            resolvedUrl = signedData.signedUrl;
            setSignedUrl(resolvedUrl);
            console.log('[DEBUG-PDF-READER] Generated Signed URL successfully.');
          } else {
            console.warn('[DEBUG-PDF-READER] createSignedUrl failed, falling back to public URL:', signedErr);
            const { data: publicUrlData } = supabase.storage
              .from('comics_assets')
              .getPublicUrl(storagePath);

            if (publicUrlData && publicUrlData.publicUrl) {
              resolvedUrl = publicUrlData.publicUrl;
              setSignedUrl(resolvedUrl);
            }
          }
        }

        // Extract filePath inside the bucket if it is a public URL
        if (resolvedUrl.startsWith('http')) {
          const parts = resolvedUrl.split('/comics_assets/');
          if (parts.length > 1) {
            filePath = parts[1];
          }
        }

        console.log('[DEBUG-PDF-READER] Resolved load URL:', resolvedUrl);

        const globalWindow = window as any;
        if (!globalWindow.pdfjsLib) {
          throw new Error('PDF.js rendering engine is currently initializing. Please try again in a moment.');
        }

        // 2. Load PDF
        console.log('[DEBUG-PDF-READER] Attempting direct URL streaming load via PDF.js...');
        setDownloadProgress(15);

        try {
          loadingTask = globalWindow.pdfjsLib.getDocument({ 
            url: resolvedUrl,
            withCredentials: false
          });
          loadingTask.onProgress = (progressData: any) => {
            if (progressData.total) {
              const pct = Math.round((progressData.loaded / progressData.total) * 100);
              setDownloadProgress(pct);
            }
          };

          const pdf = await loadingTask.promise;
          if (isCancelled) return;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setDownloadProgress(100);
          console.log('[DEBUG-PDF-READER] Successfully streamed direct PDF URL with page count:', pdf.numPages);
          return; // Success!
        } catch (directLoadErr: any) {
          console.warn('[DEBUG-PDF-READER] Direct URL load failed (likely CORS or direct request blocking). Falling back to SDK download...', directLoadErr);
        }

        // 3. Fallback to Supabase SDK download
        if (isSupabaseConfigured && filePath) {
          console.log('[DEBUG-PDF-READER] Downloading PDF via Supabase Client SDK from path:', filePath);
          setDownloadProgress(40);
          const { data, error } = await supabase.storage
            .from('comics_assets')
            .download(filePath);

          if (error) {
            throw new Error(`Supabase Storage download failed: ${error.message}`);
          }

          if (isCancelled) return;

          setDownloadProgress(80);
          setPdfBlob(data);
          const arrayBuffer = await data.arrayBuffer();
          if (isCancelled) return;

          setDownloadProgress(95);
          loadingTask = globalWindow.pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;

          if (isCancelled) return;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setDownloadProgress(100);
          console.log('[DEBUG-PDF-READER] Successfully loaded PDF via Supabase SDK download with page count:', pdf.numPages);
          return; // Success!
        }

        // If we reach here and Supabase is configured, throw error
        if (isSupabaseConfigured) {
          throw new Error('Could not load PDF asset from remote secure storage.');
        } else {
          // Fallback for offline local dev sandbox preview
          console.log('[DEBUG-PDF-READER] Sandbox offline: Generating local sandbox PDF fallback...');
          const fallbackBlob = generateFallbackPDF(comic.title, comic.pages || 48, userEmail);
          setDownloadProgress(100);

          const arrayBuffer = await fallbackBlob.arrayBuffer();
          if (isCancelled) return;

          loadingTask = globalWindow.pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;

          if (isCancelled) return;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
        }

      } catch (err: any) {
        if (isCancelled) return;
        console.error('[DEBUG-PDF-READER] Fatal PDF load error:', err);
        
        // Graceful automatic recovery: if any load error happens (e.g., Object not found, missing file, CORS, network offline),
        // we automatically generate a highly stylized, fully readable local PDF book fallback so the reader works flawlessly.
        console.warn('[DEBUG-PDF-READER] Recovering from load error: Generating high-fidelity local sandbox PDF book simulation...');
        try {
          setDownloadProgress(100);
          const fallbackBlob = generateFallbackPDF(comic.title, comic.pages || 48, userEmail);
          const arrayBuffer = await fallbackBlob.arrayBuffer();
          if (isCancelled) return;

          loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;

          if (isCancelled) return;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          console.log('[DEBUG-PDF-READER] Graceful recovery complete. Fallback PDF simulation is active and fully functional.');
        } catch (fallbackErr: any) {
          console.error('[DEBUG-PDF-READER] Fallback recovery also failed:', fallbackErr);
          setPdfError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    loadPdfAndDoc();

    return () => {
      isCancelled = true;
      if (loadingTask && typeof loadingTask.destroy === 'function') {
        loadingTask.destroy();
      }
    };
  }, [comic.id, comic.digitalFile]);

  // 1. Log Security Events: Reader Opened / Closed
  useEffect(() => {
    logSecurityEvent('Reader Opened', { comicId: comic.id, title: comic.title });
    return () => {
      logSecurityEvent('Comic Closed', { comicId: comic.id, title: comic.title });
    };
  }, [comic.id, comic.title]);

  // 2. DRM Print Protection Stylesheet Injection dynamically
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'drm-print-protection';
    style.innerHTML = `
      @media print {
        body {
          visibility: hidden !important;
          background: #000000 !important;
        }
        #print-protection-notice {
          visibility: visible !important;
          display: flex !important;
          position: fixed !important;
          inset: 0 !important;
          background: #000000 !important;
          color: #ef4444 !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: monospace !important;
          font-size: 24px !important;
          font-weight: bold !important;
          z-index: 99999999 !important;
          text-align: center !important;
        }
      }
    `;
    document.head.appendChild(style);

    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      setShowPrintWarning(true);
      logSecurityEvent('Print Attempt', { page: currentPage, comicId: comic.id });
    };

    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      document.getElementById('drm-print-protection')?.remove();
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [currentPage, comic.id]);

  // 3. Watermark Time Tick Update
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 4. Watermark Positioning & Movement (updates randomly every 5-8 seconds near margins)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateWatermark = () => {
      // Stay near page margins & corners, keeping clear of dialogue and character faces
      const marginPositions = [
        { x: 10, y: 6 },   // top-left margin
        { x: 50, y: 5 },   // top margin
        { x: 90, y: 6 },   // top-right margin
        { x: 6, y: 50 },   // left margin
        { x: 94, y: 50 },   // right margin
        { x: 10, y: 94 },  // bottom-left margin
        { x: 50, y: 95 },  // bottom margin
        { x: 90, y: 94 },  // bottom-right margin
      ];
      const selected = marginPositions[Math.floor(Math.random() * marginPositions.length)];
      
      let finalX = selected.x;
      let finalY = selected.y;
      
      if (selected.x === 50) {
        // top/bottom center margin, jitter X slightly to add security variation
        finalX = 50 + (Math.floor(Math.random() * 20) - 10); // 40 to 60
      } else if (selected.y === 50) {
        // left/right center margin, jitter Y slightly
        finalY = 50 + (Math.floor(Math.random() * 20) - 10); // 40 to 60
      } else {
        // corners, minor jitter
        finalX = selected.x + (Math.floor(Math.random() * 4) - 2);
        finalY = selected.y + (Math.floor(Math.random() * 4) - 2);
      }

      // Safe bounds clamping
      finalX = Math.max(4, Math.min(96, finalX));
      finalY = Math.max(4, Math.min(96, finalY));

      // Strictly rotate between -20° and -30° as required
      const finalRotation = -20 - (Math.random() * 10); // -20 to -30

      // Strictly opacity between 10% and 15% (0.10 to 0.15)
      const finalOpacity = 0.10 + (Math.random() * 0.05);

      setWatermarkConfig({
        x: finalX,
        y: finalY,
        rotation: finalRotation,
        opacity: finalOpacity,
        fontSize: 'text-[9px]'
      });

      // Random delay between 5000ms and 8000ms (5 to 8 seconds)
      const nextDelay = 5000 + Math.random() * 3000;
      timeoutId = setTimeout(updateWatermark, nextDelay);
    };

    updateWatermark();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // 5. DevTools Detection Checker
  useEffect(() => {
    const threshold = 160;
    
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      const isOpen = widthThreshold || heightThreshold;
      
      if (isOpen !== devToolsOpen) {
        setDevToolsOpen(isOpen);
        if (isOpen) {
          logSecurityEvent('Developer Tools Detected', { screen: 'Reader', comicId: comic.id });
        }
      }
    };

    // Trigger immediately and check periodically
    checkDevTools();
    const interval = setInterval(checkDevTools, 1500);
    window.addEventListener('resize', checkDevTools);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkDevTools);
    };
  }, [devToolsOpen, comic.id]);

  // 6. Tab / Window Visibility Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      setIsTabHidden(isHidden);
      if (isHidden) {
        logSecurityEvent('Tab Switched / Hidden', { page: currentPage, comicId: comic.id });
      }
    };

    const handleWindowBlur = () => {
      setIsTabHidden(true);
      logSecurityEvent('Window Blurred', { page: currentPage, comicId: comic.id });
    };

    const handleWindowFocus = () => {
      setIsTabHidden(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [currentPage, comic.id]);

  // 7. Ownership & Session Validation Loop (Every 15 seconds)
  const checkOwnership = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        console.warn('[DRM] No active user session found.');
        return false;
      }

      const email = session.user.email;
      if (!email) return false;

      if (comic.price === 0) return true;

      // 1. Check orders
      const { data: dbOrders, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('comic_id', comic.id)
        .eq('customer_email', email)
        .eq('status', 'Completed')
        .eq('payment_status', 'Paid');

      if (!ordersErr && dbOrders && dbOrders.length > 0) {
        return true;
      }

      // 2. Check redemption history
      const { data: dbRedemptions, error: redemptionsErr } = await supabase
        .from('redemption_history')
        .select('*')
        .eq('user_email', email);

      if (!redemptionsErr && dbRedemptions && dbRedemptions.length > 0) {
        return true;
      }

      // 3. Check coupon redemptions
      const { data: dbCouponRedemptions, error: couponsErr } = await supabase
        .from('coupon_redemptions')
        .select('*')
        .eq('user_email', email);

      if (!couponsErr && dbCouponRedemptions && dbCouponRedemptions.length > 0) {
        return true;
      }

      return false;
    } catch (err) {
      console.error('[DRM] Error validating ownership:', err);
      return true; // network fallback safety
    }
  }, [comic.id, comic.price]);

  useEffect(() => {
    let active = true;
    const runCheck = async () => {
      const valid = await checkOwnership();
      if (!active) return;
      setIsOwnershipValid(valid);
      if (!valid) {
        logSecurityEvent('Unauthorized Access Attempt', { comicId: comic.id });
        alert('DRM Validation Failed: You do not have digital access to this comic volume.');
        onCloseRef.current();
      }
    };

    runCheck();
    const interval = setInterval(runCheck, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [checkOwnership, comic.id]);

  // 8. Session Expired listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        logSecurityEvent('Session Expired', { comicId: comic.id });
        alert('Your secure session has expired. Please log in again.');
        onCloseRef.current();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [comic.id]);

  // 9. Signed URLs Background Automatic Refresh (Every 4 minutes)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !comic.digitalFile) return;
    if (comic.digitalFile.startsWith('http') || comic.digitalFile.startsWith('blob:')) {
      setSignedUrl(comic.digitalFile);
      return;
    }

    let isCancelled = false;
    let storagePath = comic.digitalFile;
    if (!storagePath.includes('/')) {
      storagePath = `pdfs/${storagePath}`;
    }

    const refreshSignedUrl = async () => {
      try {
        console.log('[DEBUG-PDF-READER] Refreshing short-lived Signed URL in background...');
        const { data, error } = await supabase.storage
          .from('comics_assets')
          .createSignedUrl(storagePath, 300); // 5 minutes

        if (error) throw error;
        if (data?.signedUrl && !isCancelled) {
          setSignedUrl(data.signedUrl);
          console.log('[DEBUG-PDF-READER] Short-lived Signed URL refreshed successfully.');
        }
      } catch (err) {
        console.error('[DEBUG-PDF-READER] Error refreshing signed URL in background:', err);
      }
    };

    const interval = setInterval(refreshSignedUrl, 240000); // every 4 minutes

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [comic.digitalFile]);

  // Touch Swipe Gesture Refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Render PDF page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let isCancelled = false;
    let renderTask: any = null;

    async function drawPage() {
      try {
        setRenderingPage(true);
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled || !canvasRef.current) return;

        const scale = 2.0; // High quality
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context || isCancelled) return;

        setPdfAspect(viewport.width / viewport.height);

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        console.log(`Rendered PDF Page ${currentPage} of ${pdfDoc.numPages}`);
      } catch (err) {
        if (isCancelled) return;
        console.error('Error rendering PDF page to canvas:', err);
      } finally {
        if (!isCancelled) {
          setRenderingPage(false);
        }
      }
    }

    drawPage();
    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage]);

  // 2. Load & Save Page Progress (Removed LocalStorage Persistence to ensure fresh loads only)
  const savePageProgress = (page: number) => {
    // Local persistence disabled per requirement
  };

  // 3. Page Turn Navigation
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => {
        const next = prev + 1;
        savePageProgress(next);
        return next;
      });
      setZoomScale(1); // Reset zoom on page turns
    } else if (currentPage === totalPages) {
      setIsAutoPlaying(false); // Stop autoplay at the end
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => {
        const prevPage = prev - 1;
        savePageProgress(prevPage);
        return prevPage;
      });
      setZoomScale(1); // Reset zoom on page turns
    }
  }, [currentPage]);

  // Keyboard navigation listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, isFullscreen]);

  // Android Back button (PopState) listener
  useEffect(() => {
    const mountTime = Date.now();

    // Push a new history entry so the browser/Android back button can be captured
    try {
      window.history.pushState({ readerOpen: true }, '');
    } catch (pushErr) {
      console.warn('[DEBUG-PDF-READER] pushState failed:', pushErr);
    }

    const handlePopState = (e: PopStateEvent) => {
      // 1. Guard against synchronous/immediate popstate fired during mount (iframe or browser quirks)
      if (Date.now() - mountTime < 250) {
        console.log('[DEBUG-PDF-READER] Ignoring immediate popstate event during mount phase');
        return;
      }

      // 2. Guard against events where readerOpen is still true (meaning state wasn't popped)
      if (e.state && e.state.readerOpen) {
        return;
      }

      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      try {
        if (window.history.state?.readerOpen) {
          window.history.back();
        }
      } catch (backErr) {
        console.warn('[DEBUG-PDF-READER] history.back cleanup failed:', backErr);
      }
    };
  }, []);

  // Autoplay Effect (Turns page every 5.5 seconds)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPlaying) {
      timer = setInterval(() => {
        handleNextPage();
      }, 5500);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, handleNextPage]);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Toggle Fullscreen Function
  const toggleFullscreen = () => {
    if (!readerContainerRef.current) return;
    if (!document.fullscreenElement) {
      readerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error enabling fullscreen mode:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // 4. Swipe Gestures Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (zoomScale === 1) { // Only swipe when not zoomed in
      if (distance > minSwipeDistance) {
        handleNextPage(); // Swiped left, load next page
      } else if (distance < -minSwipeDistance) {
        handlePrevPage(); // Swiped right, load prev page
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Zoom manipulation
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.25, 2.0));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.25, 1.0));
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
  };

  // Simulated or Direct PDF Downloader for Purchased/Free Users - Now restricted to Admins
  const handleDownloadPDF = () => {
    if (isGiftAccess || downloading) return;
    setEnteredCode('');
    setAdminAuthError(null);
    setIsAdminAuthOpen(true);
  };

  const handleVerifyAdminAndDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredCode || enteredCode.trim() !== actualAdminCode.trim()) {
      setAdminAuthError('Access Denied: Invalid Administrator Access Code');
      return;
    }
    
    setIsAdminAuthOpen(false);
    await startDirectDownload();
  };

  const startDirectDownload = async () => {
    setDownloading(true);
    try {
      let activeBlob = pdfBlob;

      if (!activeBlob) {
        console.log('[DEBUG-PDF-READER] Download requested but pdfBlob not in state. Downloading original PDF...');
        
        if (!comic.digitalFile) {
          throw new Error('No digital file URL configured for this comic.');
        }

        // Resolve URL and filePath exactly like in loadPdfAndDoc
        let resolvedUrl = comic.digitalFile;
        let filePath = '';
        if (isSupabaseConfigured && !comic.digitalFile.startsWith('http') && !comic.digitalFile.startsWith('blob:')) {
          let storagePath = comic.digitalFile;
          if (!storagePath.includes('/')) {
            storagePath = `pdfs/${storagePath}`;
          }
          const { data: publicUrlData } = supabase.storage
            .from('comics_assets')
            .getPublicUrl(storagePath);

          if (publicUrlData && publicUrlData.publicUrl) {
            resolvedUrl = publicUrlData.publicUrl;
          }
        }

        if (resolvedUrl.startsWith('http')) {
          const parts = resolvedUrl.split('/comics_assets/');
          if (parts.length > 1) {
            filePath = parts[1];
          }
        }

        // Try Supabase Storage first if configured
        if (isSupabaseConfigured && filePath) {
          console.log('[DEBUG-PDF-READER] Fetching file from Supabase storage bucket:', filePath);
          const { data, error } = await supabase.storage
            .from('comics_assets')
            .download(filePath);

          if (!error && data) {
            activeBlob = data;
            setPdfBlob(data);
          } else if (error) {
            console.warn('[DEBUG-PDF-READER] Supabase download error:', error);
          }
        }

        // Try direct fetch if Supabase download failed or wasn't applicable
        if (!activeBlob && resolvedUrl.startsWith('http')) {
          console.log('[DEBUG-PDF-READER] Fetching file from URL:', resolvedUrl);
          const response = await fetch(resolvedUrl);
          if (response.ok) {
            const blob = await response.blob();
            activeBlob = blob;
            setPdfBlob(blob);
          } else {
            console.warn('[DEBUG-PDF-READER] Direct fetch failed with status:', response.status);
          }
        }
      }

      if (activeBlob) {
        const url = URL.createObjectURL(activeBlob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extract filename from the digital file path/URL
        let fileName = `${comic.id}_digital_edition.pdf`;
        if (comic.digitalFile) {
          const parts = comic.digitalFile.split('/');
          fileName = parts[parts.length - 1];
          if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
          }
        }

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('[DEBUG-PDF-READER] Download completed successfully.');
      } else {
        throw new Error('Failed to download the original PDF file from remote storage.');
      }
    } catch (err: any) {
      console.error('[DEBUG-PDF-READER] Download failed:', err);
      alert(`Download failed: ${err.message || err}`);
    } finally {
      setDownloading(false);
    }
  };

  // 5. Procedural Aesthetic Comic Page Generator
  // Generates unique visual page panels based on the page number and comic metadata
  const getPageVisualData = (pageNum: number): ComicPageData => {
    // 5A. Hand-crafted cinematic opening pages for the main 4 stories
    if (pageNum === 1) {
      if (comic.id === 'genesis-void') {
        return {
          pageNumber: 1,
          layout: 'single',
          panels: [
            {
              gradient: 'from-blue-950 via-slate-900 to-black',
              illustrationType: 'celestial',
              description: "Zurich's deep-crust particle accelerator chamber glows in neon blue currents. Gravimetric stabilization fields collapse, creating a micro-black hole rift.",
              soundEffect: "HUMMMMMMMMMM",
              speech: [
                { speaker: "NARRATOR", text: "Deep beneath the soil, humanity's hubris triggers the anomaly.", role: 'narrator' },
                { speaker: "DR. SARAH LIN", text: "The particle density is off the charts! Abort! Shut down the sub-core now!", role: 'hero' }
              ]
            }
          ]
        };
      } else if (comic.id === 'vanguard-reborn') {
        return {
          pageNumber: 1,
          layout: 'single',
          panels: [
            {
              gradient: 'from-violet-950 via-neutral-900 to-black',
              illustrationType: 'rift',
              description: "A catastrophic violet dimensional rift splits the Paris skies, throwing down massive shadow beasts upon the historic streets.",
              soundEffect: "KRAA-BOOM!",
              speech: [
                { speaker: "NARRATOR", text: "Paris. The portal opens. The nightmare begins.", role: 'narrator' },
                { speaker: "VORTEX", text: "Sectors 3 and 4 are completely compromised. We need backup immediately!", role: 'hero' }
              ]
            }
          ]
        };
      } else if (comic.id === 'echoes-aetherion') {
        return {
          pageNumber: 1,
          layout: 'single',
          panels: [
            {
              gradient: 'from-amber-950 via-orange-950 to-neutral-950',
              illustrationType: 'celestial',
              description: "A majestic celestial light-construct capital city floating in orbiting hard-light loops around twin golden stars.",
              soundEffect: "SHHHHWWWWW",
              speech: [
                { speaker: "NARRATOR", text: "Ophiuchus. The crown jewel of cosmic light, orbiting the double suns of the high core.", role: 'narrator' }
              ]
            }
          ]
        };
      } else { // malachor-protocol
        return {
          pageNumber: 1,
          layout: 'single',
          panels: [
            {
              gradient: 'from-purple-950 via-neutral-900 to-zinc-950',
              illustrationType: 'rift',
              description: "The global defensive grid detects anomalous energy pillars emerging simultaneously under the Pacific, in Paris, and on the dark side of the Moon.",
              soundEffect: "DRRRRRRRRR",
              speech: [
                { speaker: "MALACHOR", text: "The lattice is complete. Soon, your star system folds back into absolute stillness.", role: 'villain' }
              ]
            }
          ]
        };
      }
    }

    if (pageNum === 2) {
      if (comic.id === 'genesis-void') {
        return {
          pageNumber: 2,
          layout: 'split-h',
          panels: [
            {
              gradient: 'from-rose-950 via-purple-950 to-black',
              illustrationType: 'gravity',
              description: "Engineer Marcus Vance steps up to the primary manual core override lever. Static crimson electrical bolts lash out.",
              soundEffect: "KRAK-ZAP!",
              speech: [
                { speaker: "DR. SARAH LIN", text: "Marcus! Get away from the core! It's inverting!", role: 'hero' }
              ]
            },
            {
              gradient: 'from-black via-red-950 to-zinc-900',
              illustrationType: 'shield',
              description: "The gravity field splits in reverse. Marcus is suspended in mid-air as crimson energy particles surge through his flesh.",
              speech: [
                { speaker: "NARRATOR", text: "In that single microsecond, the engineer becomes the ultimate anchor of the force.", role: 'narrator' }
              ]
            }
          ]
        };
      } else if (comic.id === 'vanguard-reborn') {
        return {
          pageNumber: 2,
          layout: 'split-h',
          panels: [
            {
              gradient: 'from-emerald-950 via-zinc-900 to-black',
              illustrationType: 'shield',
              description: "Vortex teleports frantic citizens through neon green oval gates while dodging entropic shadow beams.",
              soundEffect: "FWOOSH!",
              speech: [
                { speaker: "VORTEX", text: "The portal multiplier is cascading. I can't sustain these gateways for much longer!", role: 'hero' }
              ]
            },
            {
              gradient: 'from-blue-950 via-purple-950 to-black',
              illustrationType: 'gravity',
              description: "A gigantic sonic blast shakes the plaza as Aegis crashes from the upper atmosphere, generating a wide kinetic barrier that vaporizes shadow minions.",
              soundEffect: "KRAAK-THOOM!",
              speech: [
                { speaker: "AEGIS", text: "We don't hold them, Vortex. We shut them down. Get the portal dampeners ready.", role: 'hero' }
              ]
            }
          ]
        };
      } else if (comic.id === 'echoes-aetherion') {
        return {
          pageNumber: 2,
          layout: 'split-h',
          panels: [
            {
              gradient: 'from-yellow-950 via-amber-950 to-black',
              illustrationType: 'comet',
              description: "Young Kaelen Thule channels glowing loops of pure solar starfire under the guidance of the ancient Stellar Sages.",
              speech: [
                { speaker: "STELLAR SAGE", text: "Remember, Kaelen: the solar light is a promise to foster heat, not an instrument for war.", role: 'hero' }
              ]
            },
            {
              gradient: 'from-neutral-900 via-rose-950 to-black',
              illustrationType: 'rift',
              description: "A giant black hand of shadows stretches from the dark space void, seizing the twin suns and plunging Ophiuchus into twilight.",
              soundEffect: "CRUUUSH!",
              speech: [
                { speaker: "NARRATOR", text: "Then, the absolute dark arrived.", role: 'narrator' }
              ]
            }
          ]
        };
      } else { // malachor-protocol
        return {
          pageNumber: 2,
          layout: 'split-h',
          panels: [
            {
              gradient: 'from-slate-900 via-sky-950 to-black',
              illustrationType: 'cyber',
              description: "Inside the Lunar Sanctuary, the Vanguard champions assemble around a global diagnostic projection showing shadow anchors across Earth.",
              speech: [
                { speaker: "VORTEX", text: "The entropic lattice is fusing. If they sync up, the sun's gravity collapses next.", role: 'hero' }
              ]
            },
            {
              gradient: 'from-zinc-900 via-rose-950 to-black',
              illustrationType: 'comet',
              description: "Aetherion charges his golden cosmic lance, a brilliant solar corona radiating around his stellar armor.",
              speech: [
                { speaker: "AETHERION", text: "Then we drop them. Simultaneously. No margins for error.", role: 'hero' }
              ]
            }
          ]
        };
      }
    }

    if (pageNum === 3) {
      if (comic.id === 'genesis-void') {
        return {
          pageNumber: 3,
          layout: 'bento',
          panels: [
            {
              gradient: 'from-neutral-950 via-slate-900 to-zinc-900',
              illustrationType: 'celestial',
              description: "Floating in deep space, an obsidian monolith splits open, revealing a gigantic, glowing purple void eye.",
              soundEffect: "VOOOOOIDDD",
              speech: [
                { speaker: "MALACHOR", text: "The ancient lock is broken. The physical grid shall now return to silence...", role: 'villain' }
              ]
            }
          ]
        };
      } else if (comic.id === 'vanguard-reborn') {
        return {
          pageNumber: 3,
          layout: 'bento',
          panels: [
            {
              gradient: 'from-yellow-950 via-amber-950 to-black',
              illustrationType: 'comet',
              description: "A dazzling golden streak arcs across the stratospheric clouds. Aetherion descends like a comet, slamming into the main rift with radiant solar flares.",
              soundEffect: "SHIIIIING!",
              speech: [
                { speaker: "AETHERION", text: "Let me light the path forward, defenders of Earth. Stand fast!", role: 'hero' }
              ]
            }
          ]
        };
      } else if (comic.id === 'echoes-aetherion') {
        return {
          pageNumber: 3,
          layout: 'bento',
          panels: [
            {
              gradient: 'from-rose-950 via-neutral-900 to-slate-950',
              illustrationType: 'specter',
              description: "Aetherion, now armored in ancient light, stands upon the ruins of Ophiuchus, gazing at the colossal shadow silhouette of Malachor.",
              speech: [
                { speaker: "MALACHOR", text: "True order exists only in the cold absolute zero.", role: 'villain' },
                { speaker: "AETHERION", text: "As long as one spark remains, the dark will never conquer.", role: 'hero' }
              ]
            }
          ]
        };
      } else { // malachor-protocol
        return {
          pageNumber: 3,
          layout: 'bento',
          panels: [
            {
              gradient: 'from-red-950 via-zinc-950 to-black',
              illustrationType: 'gravity',
              description: "Aegis ignites his gravimetric gauntlets to 100% capacity, stepping into Vortex's hyper-spatial teleportation rift with grim resolve.",
              soundEffect: "IGNITION!",
              speech: [
                { speaker: "AEGIS", text: "For Earth, and for every star he stole. Commencing tactical protocol.", role: 'hero' }
              ]
            }
          ]
        };
      }
    }

    // 5B. Procedural Dynamic Pages for pages 4 to comic.pages
    // Rotates layout and thematic narratives dynamically to simulate a vast visual comic.
    const layoutTypes: ('single' | 'split-h' | 'split-v' | 'bento')[] = ['split-h', 'single', 'split-v', 'bento'];
    const selectedLayout = layoutTypes[pageNum % layoutTypes.length];
    
    // Aesthetic themes based on page index
    const pageSeed = pageNum + (comic.id.charCodeAt(0) || 0);
    const backgroundGradients = [
      'from-rose-950 via-indigo-950 to-black',
      'from-violet-950 via-zinc-900 to-black',
      'from-blue-950 via-emerald-950 to-zinc-950',
      'from-amber-950 via-red-950 to-neutral-950',
      'from-cyan-950 via-slate-900 to-black'
    ];
    const gradient = backgroundGradients[pageSeed % backgroundGradients.length];

    const illustrationTypes: ('gravity' | 'rift' | 'celestial' | 'clash' | 'cyber' | 'shield' | 'specter' | 'comet')[] = [
      'gravity', 'rift', 'celestial', 'clash', 'cyber', 'shield', 'specter', 'comet'
    ];
    const illustration = illustrationTypes[pageSeed % illustrationTypes.length];

    // Procedural sound effects
    const soundEffects = ['KRAAAK!', 'SHHHING!', 'THOOOM!', 'ZAAAAP!', 'FWWOOOSH!', 'BZZZZZT!', 'CRASH!'];
    const soundEffect = pageNum % 2 === 0 ? soundEffects[pageSeed % soundEffects.length] : undefined;

    // Narrative threads for randomized visual panels
    const actionDescriptions = [
      "The cosmic stabilizers vibrate dangerously, sending radial ripples of kinetic light fracturing across the panel.",
      "Vortex weaves together binary light arrays, building a dynamic defense perimeter around the planetary core.",
      "Aetherion charges forward, his solar wings casting hyper-vibrant beams that pierce deep through the entropic fog.",
      "Aegis stands firm, redirecting localized gravitational tides to hold back a colossal descending dark matter leviathan.",
      "Deep in the shadow nexus, dark matter particles coalesce into a shimmering dimensional construct of pure malice."
    ];
    const desc = actionDescriptions[pageSeed % actionDescriptions.length];

    // Character dialogues
    const heroes = ['AETHERION', 'AEGIS', 'VORTEX', 'DR. LIN'];
    const heroName = heroes[pageSeed % heroes.length];
    
    const villainQuotes = [
      "The stellar matrix is fragile. Witness its grand undoing.",
      "You struggle against the cosmic tide. It is beautiful, yet futile.",
      "Your light is but a brief flicker in my infinite, silent sea."
    ];
    
    const heroQuotes = [
      "We stand together. The core will hold!",
      "I've timed the Rift pulse. Fire the stabilizers on my mark!",
      "We don't yield! Not today, not ever!"
    ];

    const showVillain = pageNum % 3 === 0;
    const dialogueSpeaker = showVillain ? 'MALACHOR' : heroName;
    const dialogueText = showVillain 
      ? villainQuotes[pageSeed % villainQuotes.length] 
      : heroQuotes[pageSeed % heroQuotes.length];
    const dialogueRole = showVillain ? 'villain' : 'hero';

    const panelsCount = selectedLayout === 'single' ? 1 : selectedLayout === 'split-h' ? 2 : 3;
    const panels: ComicPanelData[] = [];

    for (let i = 0; i < panelsCount; i++) {
      const panelSeed = pageSeed + i * 7;
      panels.push({
        gradient: backgroundGradients[panelSeed % backgroundGradients.length],
        illustrationType: illustrationTypes[panelSeed % illustrationTypes.length],
        description: `[Panel ${i+1}] ${desc} The atmospheric elements gather strength at page mark ${pageNum}.`,
        soundEffect: i === 0 ? soundEffect : undefined,
        speech: i === 0 ? [
          { speaker: dialogueSpeaker, text: dialogueText, role: dialogueRole }
        ] : undefined
      });
    }

    return {
      pageNumber: pageNum,
      layout: selectedLayout,
      panels
    };
  };

  const activePageData = getPageVisualData(currentPage);

  // 6. Vector Illustration Renderer
  // Renders beautiful glowing vector silhouettes matching the story action
  const renderPanelIllustration = (type: string) => {
    switch (type) {
      case 'gravity':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-ocu-crimson/30"
            />
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute w-16 h-16 rounded-full bg-ocu-crimson/20 filter blur-xl"
            />
            <Activity className="w-14 h-14 text-ocu-crimson relative z-10 animate-pulse" />
          </div>
        );
      case 'rift':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ scaleY: [0.2, 1.3, 0.2], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute w-4 h-24 bg-gradient-to-t from-violet-600 via-fuchsia-400 to-transparent rounded-full shadow-[0_0_20px_#8b5cf6]"
            />
            <motion.div 
              animate={{ scale: [0.8, 1.1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="absolute w-20 h-20 rounded-full bg-violet-600/10 filter blur-lg"
            />
            <Orbit className="w-10 h-10 text-violet-400 relative z-10 animate-spin" style={{ animationDuration: '10s' }} />
          </div>
        );
      case 'celestial':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="absolute w-24 h-24 rounded-full border border-yellow-500/30 flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full absolute top-1" />
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full absolute bottom-1" />
            </motion.div>
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="absolute w-12 h-12 bg-ocu-gold/20 rounded-full blur-md"
            />
            <Sparkles className="w-12 h-12 text-ocu-gold relative z-10" />
          </div>
        );
      case 'clash':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ x: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 0.1 }}
              className="absolute w-10 h-10 bg-red-600/20 rounded-full blur-lg"
            />
            <motion.div 
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute border-2 border-orange-500/40 w-16 h-16 rounded-full"
            />
            <Zap className="w-14 h-14 text-orange-400 relative z-10 rotate-12" />
          </div>
        );
      case 'cyber':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-2 border border-sky-500/20 rounded-md bg-sky-950/10" />
            <motion.div 
              animate={{ y: [-20, 20, -20] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute inset-x-2 h-[1px] bg-sky-400/50 shadow-[0_0_8px_#38bdf8]"
            />
            <Compass className="w-10 h-10 text-sky-400 relative z-10" />
          </div>
        );
      case 'shield':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute inset-4 border border-emerald-500/30 rounded-full bg-emerald-950/20"
            />
            <Shield className="w-12 h-12 text-emerald-400 relative z-10 animate-pulse" />
          </div>
        );
      case 'specter':
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.1, 0.9, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 6 }}
              className="absolute w-14 h-14 bg-fuchsia-600/10 filter blur-xl rounded-full"
            />
            <Flame className="w-12 h-12 text-fuchsia-400 relative z-10 -scale-y-100" />
          </div>
        );
      default: // comet
        return (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <motion.div 
              animate={{ x: [-40, 40], y: [40, -40], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
              className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#fff]"
            />
            <Sparkles className="w-10 h-10 text-zinc-100 relative z-10" />
          </div>
        );
    }
  };

  // Layout Grid Mapping
  const getLayoutClasses = (layout: string) => {
    switch (layout) {
      case 'split-h':
        return 'grid grid-rows-2 gap-4 h-full';
      case 'split-v':
        return 'grid grid-cols-2 gap-4 h-full';
      case 'bento':
        return 'grid grid-rows-3 gap-3 h-full';
      default: // single
        return 'flex flex-col h-full';
    }
  };

  return (
    <div
      ref={readerContainerRef}
      id="comic-reader-overlay"
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* Floating "✕ Close" Circular Button (Fixed in Top Right, Above PDF) */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-[100] flex items-center gap-1.5 rounded-full bg-neutral-950/95 hover:bg-black border border-white/20 hover:border-white/45 text-white shadow-2xl backdrop-blur-md transition-all cursor-pointer p-1.5 md:p-2 group"
        id="btn-floating-close-reader"
        title="Close Reader (Esc)"
      >
        <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center">
          <X size={14} className="text-white transition-transform group-hover:rotate-90 duration-300" />
        </div>
        <span className="font-mono font-black text-[9px] md:text-[11px] tracking-widest text-white uppercase pr-2.5 md:pr-3 select-none">
          CLOSE
        </span>
      </button>
      {/* 1. TOP PREMIUM MINIMAL NAVIGATION BAR */}
      <div className="bg-neutral-950/80 backdrop-blur-md border-b border-white/5 py-3 px-4 md:px-6 flex items-center justify-between z-40 transition-colors">
        <div className="flex items-center gap-3">
          {/* Security & Access Classification Pill */}
          <div className="flex items-center gap-1.5 h-6 select-none">
            {isGiftAccess ? (
              <div className="h-[22px] px-2 rounded bg-amber-950/40 border border-amber-500/20 text-[8px] md:text-[9px] font-mono font-bold text-ocu-gold flex items-center gap-1">
                <Lock size={10} />
                <span>GIFT ACCESS</span>
              </div>
            ) : (
              <div className="h-[22px] px-2 rounded bg-emerald-950/40 border border-emerald-500/20 text-[8px] md:text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck size={10} />
                <span>LICENSED COPY</span>
              </div>
            )}
            <div className="h-[22px] px-2 rounded bg-zinc-900 border border-zinc-800 text-[8px] md:text-[9px] font-mono font-bold text-zinc-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>🛡️ Protected</span>
            </div>
          </div>
          
          <h2 className="font-display font-black text-[11px] md:text-xs text-white uppercase tracking-wider truncate max-w-[140px] sm:max-w-xs md:max-w-md">
            {comic.title}
          </h2>
        </div>

        {/* Dynamic Reading Progress Ratio */}
        <div className="font-mono text-[10px] text-white flex items-center gap-1">
          <BookOpen size={11} className="text-ocu-crimson" />
          <span>PAGE <strong className="text-ocu-gold">{currentPage}</strong> OF {comic.pages}</span>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-1.5 md:gap-3">
          {/* Direct Document PDF Download (governed strictly by tier) */}
          {!isGiftAccess ? (
            <button
              id="btn-reader-download-pdf"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className={`p-2 rounded bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black hover:border-white text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                downloading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Download Authenticated PDF Certificate Copy"
            >
              <Download size={12} className={downloading ? "animate-bounce" : ""} />
              <span className="hidden md:inline">{downloading ? 'DOWNLOADING...' : 'PDF'}</span>
            </button>
          ) : (
            <div 
              className="p-1.5 rounded text-neutral-500 text-[9px] font-mono border border-neutral-800 bg-neutral-900/50 flex items-center gap-1"
              title="Gift access does not support local exporting/downloads."
            >
              <AlertTriangle size={10} className="text-amber-500/60" />
              <span className="hidden sm:inline">DOWNLOAD DISABLED</span>
            </div>
          )}

          {/* User Guide/Help button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded hover:bg-white/5 text-ocu-gray hover:text-white transition-colors cursor-pointer"
            title="Read Guide"
          >
            <HelpCircle size={15} />
          </button>

          {/* Fullscreen control */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-white/5 text-ocu-gray hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Close modal */}
          <button
            id="btn-close-reader-modal"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-red-500/10 text-ocu-gray hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-500/20 ml-1.5"
            aria-label="Exit Reader"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC REAL-TIME PROGRESS INDICATOR */}
      <div className="w-full h-[3px] bg-white/5 z-40">
        <div 
          className="h-full bg-gradient-to-r from-ocu-crimson via-ocu-gold to-emerald-400 transition-all duration-300"
          style={{ width: `${(currentPage / comic.pages) * 100}%` }}
        />
      </div>

      {/* 3. CENTERSTAGE INTERACTIVE PAN-AND-ZOOM CANVAS AREA */}
      <div 
        ref={pageContainerRef}
        className="flex-grow flex items-center justify-center relative p-2 md:p-4 overflow-hidden"
        style={{ backgroundColor: '#090909' }}
      >
        {/* Anti-Screen Capture Dynamic Encryption Watermark */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex flex-wrap gap-16 items-center justify-center opacity-[0.02]">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="font-mono text-[9px] tracking-[0.3em] uppercase rotate-12 select-none text-white whitespace-nowrap">
              {userEmail} • SECURE PROTOCOL {comic.id.toUpperCase()}
            </span>
          ))}
        </div>

        {/* Screen/Container Gestures Overlay Hints */}
        <AnimatePresence>
          {showHelp && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-black/90 z-40 flex items-center justify-center p-6 text-left"
              onClick={() => setShowHelp(false)}
            >
              <div className="max-w-sm bg-neutral-900 border border-white/10 rounded-xl p-6 space-y-4">
                <h4 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2 text-ocu-gold">
                  <Sparkles size={16} />
                  <span>PREMIUM DIGITAL EXPERIENCE</span>
                </h4>
                <p className="font-sans text-xs text-ocu-gray leading-relaxed">
                  Welcome to the Cinematic Comic Reader. This interactive volume replaces standard document viewing with high-fidelity digital publication styling:
                </p>
                <div className="space-y-2.5 font-mono text-[10px] text-white">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white">← / →</span>
                    <span className="text-ocu-gray">Keyboard Arrow page turn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white">Swipe</span>
                    <span className="text-ocu-gray">Mobile horizontal swipe turn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white">Double Tap</span>
                    <span className="text-ocu-gray">Click image corners to nav</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white">Zoom</span>
                    <span className="text-ocu-gray">Scale page with toolbar (+ / -)</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-2 bg-ocu-gold text-black font-display font-bold text-[10px] tracking-widest uppercase rounded"
                >
                  START READING
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Resume Progress Notification Toast */}
        <AnimatePresence>
          {resumeNotification && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-ocu-gold/20 text-white text-[10px] font-mono px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2"
            >
              <Info size={12} className="text-ocu-gold animate-bounce" />
              <span>{resumeNotification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Floating Desk Arrow navigation */}
        {currentPage > 1 && (
          <button
            id="btn-reader-nav-left"
            onClick={handlePrevPage}
            className="absolute left-3 md:left-6 z-30 p-2.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/5 text-white hover:text-ocu-gold hover:scale-105 transition-all cursor-pointer opacity-0 hover:opacity-100 md:opacity-40"
            title="Previous Page (ArrowLeft)"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right Floating Desk Arrow navigation */}
        {currentPage < totalPages && (
          <button
            id="btn-reader-nav-right"
            onClick={handleNextPage}
            className="absolute right-3 md:right-6 z-30 p-2.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/5 text-white hover:text-ocu-gold hover:scale-105 transition-all cursor-pointer opacity-0 hover:opacity-100 md:opacity-40"
            title="Next Page (ArrowRight)"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* 4. MAIN COMIC BOOK CANVAS FRAME (FITS THE HEIGHT AND WIDTH EDGE-TO-EDGE) */}
        <div 
          className="w-full h-full flex items-center justify-center overflow-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="transition-transform duration-200 ease-out select-none cursor-grab active:cursor-grabbing origin-center"
            style={{ 
              transform: `scale(${zoomScale})`,
              // Render standard premium comic page aspect ratio
              aspectRatio: pdfDoc ? `${pdfAspect}` : '2/3',
              height: '100%',
              maxHeight: 'calc(100vh - 100px)',
              width: 'auto'
            }}
          >
            {/* The Cinematic High-Resolution Page Canvas */}
            <div className={`w-full h-full bg-[#121212] border border-white/10 rounded-lg shadow-2xl relative overflow-hidden group select-none ${pdfDoc || pdfError ? '' : 'p-4 flex flex-col justify-between'}`}>
              
              {/* Corner brackets simulating futuristic reader grid */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/15 z-20" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/15 z-20" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/15 z-20" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/15 z-20" />

              {pdfError ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/95 p-6 text-center select-text overflow-y-auto">
                  <div className="max-w-md space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-sans font-bold text-sm text-red-500 tracking-tight uppercase">
                        SECURE READER DESYNCHRONIZATION
                      </h3>
                      <p className="font-mono text-[8px] text-zinc-500 tracking-wider">
                        STATUS CODE: FILE_LOAD_FAILURE // CORRUPTION
                      </p>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded p-4 text-left space-y-3 font-mono">
                      <div className="text-[10px] text-red-400 leading-relaxed font-semibold break-words">
                        {pdfError}
                      </div>
                      <div className="border-t border-zinc-900 pt-3 space-y-1.5 text-[8px] text-zinc-500">
                        <div className="leading-normal"><span className="text-zinc-600 font-bold">SAVED PDF PATH (pdf_url):</span> <span className="text-zinc-400 break-all select-all font-semibold block mt-0.5">{comic.digitalFile || 'undefined'}</span></div>
                        <div className="leading-normal"><span className="text-zinc-600 font-bold">CHRONICLE ID:</span> <span className="text-zinc-400 select-all block mt-0.5">{comic.id}</span></div>
                        <div className="leading-normal"><span className="text-zinc-600 font-bold">CHRONICLE TITLE:</span> <span className="text-zinc-400 block mt-0.5">{comic.title}</span></div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-red-950/60 hover:bg-red-950 border border-red-800 text-red-200 text-[9px] font-mono tracking-widest uppercase transition-colors cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      RELOAD TERMINAL
                    </button>
                  </div>
                </div>
              ) : pdfDoc ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <canvas 
                    ref={canvasRef} 
                    className={`w-full h-full object-contain transition-all duration-300 ${
                      renderingPage ? 'opacity-45' : 'opacity-100'
                    } ${
                      devToolsOpen || isTabHidden ? 'blur-2xl opacity-15 select-none pointer-events-none filter' : ''
                    }`} 
                  />
                  {renderingPage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-15">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-t-ocu-crimson border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                        <span className="font-mono text-[9px] tracking-widest text-ocu-gray uppercase">LOADING HI-RES...</span>
                      </div>
                    </div>
                  )}

                  {/* 1. DYNAMIC USER WATERMARK OVERLAY */}
                  <div 
                    className="absolute pointer-events-none select-none z-20 font-mono tracking-wider transition-all duration-1000 ease-in-out whitespace-nowrap"
                    style={{
                      left: `${watermarkConfig.x}%`,
                      top: `${watermarkConfig.y}%`,
                      transform: `translate(-50%, -50%) rotate(${watermarkConfig.rotation}deg)`,
                      opacity: devToolsOpen || isTabHidden ? 0.05 : watermarkConfig.opacity,
                      color: 'rgba(255, 255, 255, 0.45)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    <span className="text-[9px] text-zinc-300/80 font-semibold tracking-wide uppercase select-none">
                      🛡️ OCU Protected Copy • {activeUser?.email || userEmail || 'Authorized Reader'}
                    </span>
                  </div>

                  {/* 2. TAB BLUR VISIBILITY WARNING */}
                  {isTabHidden && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 text-center select-none pointer-events-auto">
                      <div className="w-14 h-14 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 animate-pulse">
                        <Eye size={24} />
                      </div>
                      <h3 className="font-sans font-black text-xs text-white tracking-widest uppercase mb-1.5">
                        COMIC HIDDEN // INACTIVE TAB
                      </h3>
                      <p className="font-mono text-[9px] text-zinc-500 tracking-wider">
                        Return to this tab to continue reading securely.
                      </p>
                    </div>
                  )}

                  {/* 3. DEVTOOLS BLUR WARNING */}
                  {devToolsOpen && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/98 backdrop-blur-lg p-6 text-center select-none pointer-events-auto">
                      <div className="w-14 h-14 rounded-full bg-red-950/20 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 animate-bounce">
                        <Shield size={24} />
                      </div>
                      <h3 className="font-sans font-black text-xs text-red-500 tracking-widest uppercase mb-1.5">
                        DEVELOPER TOOLS DETECTED
                      </h3>
                      <p className="font-mono text-[9px] text-zinc-500 tracking-wider max-w-sm">
                        Console, inspector, and sources tools are prohibited inside the secure reader. Close Developer Tools to continue.
                      </p>
                    </div>
                  )}

                  {/* 4. PRINT PROTECTION WARNING MODAL */}
                  {showPrintWarning && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black p-6 text-center select-none pointer-events-auto">
                      <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-500 mb-4">
                        <AlertTriangle size={24} className="animate-pulse" />
                      </div>
                      <h3 className="font-sans font-black text-xs text-red-500 tracking-widest uppercase mb-1.5">
                        PRINTING DISABLED
                      </h3>
                      <p className="font-mono text-[9px] text-zinc-500 tracking-wider max-w-sm mb-4">
                        Protected Content - Unauthorized reproduction is prohibited.
                      </p>
                      <button
                        onClick={() => setShowPrintWarning(false)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded font-mono text-[9px] tracking-wider uppercase transition-colors"
                      >
                        DISMISS CONTROL WARNING
                      </button>
                    </div>
                  )}

                  {/* Invisible print protection notice element for browser print context */}
                  <div id="print-protection-notice" className="hidden">
                    <div>
                      <h1 style={{ fontSize: '28px', color: '#ef4444', marginBottom: '20px' }}>PRINTING DISABLED</h1>
                      <p style={{ fontSize: '16px', color: '#a1a1aa' }}>Protected Content - Unauthorized reproduction is prohibited.</p>
                    </div>
                  </div>
                </div>
              ) : comic.digitalFile ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/95 p-6 text-center select-none">
                  <div className="max-w-md w-full space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-ocu-crimson/10 border border-ocu-crimson/30 flex items-center justify-center text-ocu-crimson animate-pulse">
                      <Flame size={28} className="animate-bounce" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-sans font-black text-xs text-white tracking-widest uppercase">
                        SYNCHRONIZING SECURE CHRONICLE
                      </h3>
                      <p className="font-mono text-[8px] text-zinc-500 tracking-wider">
                        STREAM PROTOCOL // {comic.title.toUpperCase()}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-ocu-crimson h-full transition-all duration-300 rounded-full"
                          style={{ width: `${downloadProgress !== null ? downloadProgress : 10}%` }}
                        />
                      </div>
                      <div className="flex justify-between font-mono text-[8px] text-ocu-gray">
                        <span>CONNECTING TO FAST CDN EDGE...</span>
                        <span className="font-bold text-white">{downloadProgress !== null ? `${downloadProgress}%` : 'LOADING'}</span>
                      </div>
                    </div>

                    <div className="bg-zinc-950/80 border border-zinc-900 rounded p-4 text-left font-mono text-[8px] text-zinc-400 space-y-1">
                      <div><span className="text-zinc-600 font-bold">STATUS:</span> {downloadProgress !== null && downloadProgress < 100 ? 'DOWNLOADING_STREAM_CHUNKS' : 'INITIALIZING_INDEX_MAP'}</div>
                      <div><span className="text-zinc-600 font-bold">LOCAL CACHE WRITER:</span> ACTIVE (INDEXED_DB)</div>
                      <div><span className="text-zinc-600 font-bold">CHRONICLE ID:</span> {comic.id}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Dynamic Panel Grid Layout */}
                  <div className={getLayoutClasses(activePageData.layout)}>
                    {activePageData.panels.map((panel, idx) => (
                      <div 
                        key={idx}
                        className={`relative rounded-md overflow-hidden bg-gradient-to-br ${panel.gradient} border border-white/5 p-4 flex flex-col justify-between text-left select-none`}
                      >
                        {/* Atmospheric Overlay Sparkles */}
                        <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-white/5 via-transparent to-transparent pointer-events-none" />

                        {/* Meta index watermark */}
                        <span className="absolute top-1 right-2 font-mono text-[7px] text-white/10 uppercase tracking-widest">{userEmail} // SEGMENT-{idx + 1}</span>

                        {/* Panel Image representation container (Vector shapes + Character avatars) */}
                        <div className="flex-grow flex items-center justify-center py-2 relative z-10">
                          {renderPanelIllustration(panel.illustrationType)}
                        </div>

                        {/* Narration Block / Storyboard Text description */}
                        <div className="space-y-2 relative z-20">
                          <div className="flex items-start gap-1.5 bg-black/60 border border-white/5 p-2 rounded backdrop-blur-sm shadow">
                            <span className="font-mono text-[8px] text-ocu-gold uppercase bg-yellow-950/30 border border-ocu-gold/20 px-1.5 py-0.5 rounded flex-shrink-0 font-bold">
                              PANEL {idx + 1}
                            </span>
                            <p className="font-sans text-[10px] md:text-[11px] text-zinc-100 leading-relaxed italic font-light">
                              "{panel.description}"
                            </p>
                          </div>

                          {/* Real Comic Dialogue Speech Bubbles */}
                          {panel.speech && panel.speech.length > 0 && (
                            <div className="pl-3.5 space-y-1.5 border-l border-ocu-crimson/50 mt-1">
                              {panel.speech.map((bubble, bIdx) => (
                                <div 
                                  key={bIdx} 
                                  className={`rounded-lg p-2 relative shadow max-w-[90%] ${
                                    bubble.role === 'villain'
                                      ? 'bg-purple-950/80 border border-purple-500/30 text-left'
                                      : bubble.role === 'narrator'
                                        ? 'bg-zinc-950/80 border border-amber-500/30 text-center italic'
                                        : 'bg-white text-black border border-zinc-200'
                                  }`}
                                >
                                  {/* Character Speaker badge */}
                                  <span className={`font-mono text-[8px] font-bold tracking-wider uppercase block ${
                                    bubble.role === 'villain'
                                      ? 'text-fuchsia-400'
                                      : bubble.role === 'narrator'
                                        ? 'text-ocu-gold'
                                        : 'text-ocu-crimson'
                                  }`}>
                                    {bubble.speaker}
                                  </span>
                                  <p className={`font-sans text-[10px] leading-relaxed font-semibold ${
                                    bubble.role === 'villain' || bubble.role === 'narrator' ? 'text-zinc-100' : 'text-neutral-900'
                                  }`}>
                                    "{bubble.text}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Epic Retro Graphic Sound Effects */}
                          {panel.soundEffect && (
                            <div className="text-center py-1 select-none pointer-events-none">
                              <span className="font-display font-black text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-ocu-gold to-yellow-400 italic uppercase block drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] rotate-[-4deg] scale-110">
                                *{panel.soundEffect}*
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Page footer index bar */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[8px] md:text-[9px] font-mono text-ocu-gray">
                    <span className="tracking-widest uppercase">OMNI CHRONICLES DIGITAL GRID</span>
                    <span className="text-white font-bold">PAGE {currentPage} OF {totalPages}</span>
                  </div>
                </>
              )}

            </div>
          </motion.div>
        </div>
      </div>

      {/* 5. BOTTOM PREMIUM CONTROLS BAR (NAVIGATION & PRESETS) */}
      <div className="bg-neutral-950 border-t border-white/5 py-3 px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 z-40">
        
        {/* Anti-piracy label indicator */}
        <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-mono">
          <AlertTriangle size={12} className="text-ocu-crimson" />
          <span className="tracking-wider uppercase hidden sm:inline">OCU DIGITAL DRM ENVELOPE ACTIVATED</span>
          <span className="sm:hidden text-xs text-ocu-gray">DRM ACTIVE</span>
        </div>

        {/* Navigation Core Panel */}
        <div className="flex items-center gap-3">
          <button
            id="btn-reader-prev-bottom"
            disabled={currentPage === 1}
            onClick={handlePrevPage}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded font-mono text-[10px] text-white disabled:opacity-25 transition-all border border-white/5 hover:border-white/10 cursor-pointer active:scale-95"
          >
            PREV PAGE
          </button>

          <span className="font-mono text-xs text-zinc-300">
            PAGE {currentPage} / {totalPages}
          </span>

          <button
            id="btn-reader-next-bottom"
            disabled={currentPage === totalPages}
            onClick={handleNextPage}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white hover:text-black rounded font-mono text-[10px] text-white font-bold disabled:opacity-25 transition-all border border-white/10 hover:border-white cursor-pointer active:scale-95"
          >
            NEXT PAGE
          </button>
        </div>

        {/* View adjustments controls */}
        <div className="flex items-center gap-3">
          
          {/* Autoplay toggle */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 text-[9px] font-mono ${
              isAutoPlaying 
                ? 'bg-ocu-crimson/20 border border-ocu-crimson text-ocu-crimson' 
                : 'bg-white/5 border border-white/10 text-ocu-gray hover:text-white'
            }`}
            title={isAutoPlaying ? 'Pause Autoplay' : 'Autoplay Pages (Hands-free)'}
          >
            {isAutoPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span className="hidden md:inline">AUTOPLAY</span>
          </button>

          {/* Separation line */}
          <div className="w-[1px] h-4 bg-white/10" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomScale === 1.0}
              className="p-1.5 rounded hover:bg-white/5 text-ocu-gray hover:text-white disabled:opacity-20 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono text-[9px] text-white min-w-[34px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomScale === 2.0}
              className="p-1.5 rounded hover:bg-white/5 text-ocu-gray hover:text-white disabled:opacity-20 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            {zoomScale > 1.0 && (
              <button
                onClick={handleResetZoom}
                className="p-1.5 rounded hover:bg-white/5 text-ocu-gold cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw size={11} />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Administrator Authentication Required Modal Overlay */}
      <AnimatePresence>
        {isAdminAuthOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="w-full max-w-md bg-neutral-950 border border-ocu-crimson/30 rounded-lg p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden"
            >
              {/* Corner Sci-Fi accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-ocu-crimson/50" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-ocu-crimson/50" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-ocu-crimson/50" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-ocu-crimson/50" />

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded bg-ocu-crimson/10 border border-ocu-crimson/20 text-ocu-crimson">
                  <Shield size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-xs md:text-sm text-white uppercase tracking-wider">
                    Administrator Authentication Required
                  </h3>
                  <p className="font-sans text-[10px] text-ocu-gray">
                    SECURE LEVEL-1 CONTROL PROMPT
                  </p>
                </div>
              </div>

              <p className="font-sans text-xs text-ocu-gray mb-6 leading-relaxed">
                Direct downloading of high-resolution digital comic originals is restricted to certified administrators only. Please authenticate using your Administrator Access Code.
              </p>

              <form onSubmit={handleVerifyAdminAndDownload} className="space-y-4">
                <div>
                  <label htmlFor="input-reader-admin-code" className="block font-mono text-[10px] text-ocu-gray uppercase tracking-wider mb-1.5">
                    Administrator Access Code
                  </label>
                  <input
                    id="input-reader-admin-code"
                    type="password"
                    placeholder="ENTER MASTER CODE"
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value)}
                    autoFocus
                    className="w-full bg-neutral-900 border border-white/10 rounded px-3.5 py-2.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-ocu-crimson transition-all"
                  />
                </div>

                {adminAuthError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded bg-red-950/20 border border-red-500/20 flex items-start gap-2.5"
                  >
                    <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="font-mono text-[11px] text-red-400 font-bold leading-normal">
                      {adminAuthError}
                    </p>
                  </motion.div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminAuthOpen(false);
                      setEnteredCode('');
                      setAdminAuthError(null);
                    }}
                    className="px-4 py-2 rounded bg-white/5 border border-white/10 text-white hover:bg-white/10 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-ocu-crimson border border-ocu-crimson text-white hover:bg-ocu-crimson-hover text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  >
                    Authenticate & Download
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
