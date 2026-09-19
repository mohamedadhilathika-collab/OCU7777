import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, 
  Maximize2, Minimize2, ShieldCheck, 
  GraduationCap, BookOpen, AlertCircle
} from 'lucide-react';
import { AcademyResource } from '../types';

export interface AcademyPdfReaderProps {
  pdfUrl?: string | null;
  resource?: AcademyResource | null;
  onClose: (reason?: string) => void;
  isAdmin?: boolean;
  userEmail?: string;
}

export default function AcademyPdfReader({
  pdfUrl,
  resource,
  onClose,
  userEmail = 'Student'
}: AcademyPdfReaderProps) {
  // Resolve Target Supabase Cloud PDF URL
  const targetPdfUrl = (pdfUrl || resource?.pdfUrl || '').trim();

  // Viewer State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(resource?.docPages || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(targetPdfUrl));
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isMissingOrFailed, setIsMissingOrFailed] = useState<boolean>(!targetPdfUrl);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);

  // Canvas & DOM References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // 1. Fetch & Load Cloud PDF from Supabase Storage
  useEffect(() => {
    let isCancelled = false;
    let loadingTask: any = null;

    if (!targetPdfUrl) {
      setIsMissingOrFailed(true);
      setIsLoading(false);
      return;
    }

    async function loadCloudPdf() {
      setIsLoading(true);
      setIsMissingOrFailed(false);

      try {
        const globalWin = window as any;

        // Fetch PDF from remote Supabase public URL
        const resp = await fetch(targetPdfUrl, { mode: 'cors' });
        if (!resp.ok) {
          throw new Error(`HTTP error ${resp.status}`);
        }

        const arrayBuffer = await resp.arrayBuffer();
        if (isCancelled) return;

        // Verify PDF.js is present
        if (globalWin.pdfjsLib) {
          loadingTask = globalWin.pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          if (isCancelled) return;

          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setIsLoading(false);
        } else {
          // If PDF.js library isn't loaded, fallback to secure iframe embed
          setUseIframeFallback(true);
          setIsLoading(false);
        }
      } catch (fetchErr) {
        console.error('[ACADEMY-PDF-READER] Failed to load PDF from cloud server:', fetchErr);
        if (!isCancelled) {
          setIsMissingOrFailed(true);
          setIsLoading(false);
        }
      }
    }

    loadCloudPdf();

    return () => {
      isCancelled = true;
      if (loadingTask && typeof loadingTask.destroy === 'function') {
        loadingTask.destroy();
      }
    };
  }, [targetPdfUrl]);

  // 2. Render Single Page to Canvas with DRM & High Resolution
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || useIframeFallback || isMissingOrFailed) return;
    let isCancelled = false;
    let renderTask: any = null;

    async function renderPage() {
      try {
        setRenderingPage(true);
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled || !canvasRef.current) return;

        const baseScale = 2.0; // Crisp high-DPI rendering
        const scale = baseScale * zoomLevel;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context || isCancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
      } catch (renderErr: any) {
        if (isCancelled) return;
        if (renderErr?.name !== 'RenderingCancelledException') {
          console.error('[ACADEMY-PDF-READER] Canvas render error:', renderErr);
        }
      } finally {
        if (!isCancelled) {
          setRenderingPage(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoomLevel, useIframeFallback, isMissingOrFailed]);

  // 3. DRM Security: Disable right-click, keyboard copy/save, drag, and print
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'academy-reader-drm-style';
    styleEl.innerHTML = `
      @media print {
        body {
          display: none !important;
          visibility: hidden !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+S, Cmd+S, Ctrl+P, Cmd+P, Ctrl+U
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Arrow navigation
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose('Escape key pressed');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.getElementById('academy-reader-drm-style')?.remove();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [totalPages, currentPage, isFullscreen, onClose]);

  // Navigation handlers
  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Touch Swipe for mobile student devices
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (fsErr) {
      console.warn('[ACADEMY-PDF-READER] Fullscreen toggle error:', fsErr);
    }
  };

  const title = resource?.title || 'Academy Study Material';
  const badge = resource?.badge || 'Official Syllabus';
  const stream = resource?.stream || 'Classroom Stream';

  return (
    <div
      ref={containerRef}
      id="academy-pdf-reader-container"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      className="fixed inset-0 z-50 bg-[#07070c] text-white flex flex-col select-none overflow-hidden"
    >
      {/* 1. TOP SECURE NAVIGATION & VIEW-ONLY CONTROL BAR */}
      <header className="h-16 px-4 sm:px-6 bg-[#0c0c14]/95 border-b border-white/10 flex items-center justify-between gap-3 flex-shrink-0 z-20 backdrop-blur-md">
        {/* Left: Material Info & View-Only Accreditation Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm">
            <GraduationCap size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ocu-gold font-bold px-1.5 py-0.2 bg-ocu-gold/10 border border-ocu-gold/20 rounded">
                {badge}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                <ShieldCheck size={10} />
                <span>View-Only DRM Protected</span>
              </span>
            </div>
            <h2 className="font-display font-bold text-sm sm:text-base text-white uppercase tracking-tight truncate">
              {title}
            </h2>
          </div>
        </div>

        {/* Center: Pagination & Zoom Controls (Hidden if missing or failed) */}
        {!isMissingOrFailed && !isLoading && (
          <div className="hidden md:flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg shadow-inner">
            <button
              id="btn-academy-reader-prev"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              className="p-1 text-ocu-gray hover:text-white disabled:opacity-30 disabled:hover:text-ocu-gray transition-colors cursor-pointer"
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font-mono text-xs text-white/90 min-w-[80px] text-center font-medium">
              Page {currentPage} / {totalPages}
            </span>

            <button
              id="btn-academy-reader-next"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1 text-ocu-gray hover:text-white disabled:opacity-30 disabled:hover:text-ocu-gray transition-colors cursor-pointer"
              title="Next Page (Right Arrow)"
            >
              <ChevronRight size={16} />
            </button>

            <div className="w-[1px] h-4 bg-white/15 mx-1" />

            {/* Zoom controls */}
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.75, +(prev - 0.15).toFixed(2)))}
              disabled={zoomLevel <= 0.75}
              className="p-1 text-ocu-gray hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="font-mono text-[11px] text-ocu-gold w-10 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(2.0, +(prev + 0.15).toFixed(2)))}
              disabled={zoomLevel >= 2.0}
              className="p-1 text-ocu-gray hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => setZoomLevel(1.0)}
              className="p-1 text-ocu-gray hover:text-white transition-colors cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        )}

        {/* Right Actions: Fullscreen & Close (Strictly View-Only: No Download Button) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Fullscreen Button */}
          <button
            id="btn-toggle-academy-fullscreen"
            onClick={toggleFullscreen}
            className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-ocu-gray hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Exit Modal Button */}
          <button
            id="btn-close-academy-pdf-reader"
            onClick={() => onClose('Close button clicked')}
            className="p-2 rounded-md bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-300 hover:text-white transition-colors cursor-pointer ml-1"
            title="Close Academy Viewer (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* 2. MAIN VIEWER VIEWPORT */}
      <div 
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 relative overflow-auto custom-scrollbar flex items-center justify-center p-2 sm:p-6 bg-[#07070c]"
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#07070c]/90 backdrop-blur-sm space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                <BookOpen size={20} />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-display font-bold text-sm text-white uppercase tracking-wider">
                Connecting to Secure Cloud Document Stream
              </p>
              <p className="font-mono text-xs text-ocu-gold">
                Synchronizing verified reader canvas...
              </p>
            </div>
          </div>
        )}

        {/* SPECIFICATION 4: Fallback UI when URL is null, empty, or fetch fails */}
        {isMissingOrFailed && !isLoading && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-auto bg-black/60 border border-white/10 rounded-2xl shadow-2xl z-30 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertCircle size={28} />
            </div>
            <div className="text-white font-medium text-base font-sans leading-relaxed">
              No PDF file found on server. Please contact an admin.
            </div>
            <button
              type="button"
              id="btn-close-missing-pdf"
              onClick={() => onClose('No PDF file found on server')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-mono text-xs cursor-pointer transition-all"
            >
              Close Viewer
            </button>
          </div>
        )}

        {/* SECURE PDF CANVAS (Completely hidden if missing or failed) */}
        {!isLoading && !isMissingOrFailed && (
          useIframeFallback ? (
            <div className="w-full h-full max-w-5xl rounded-lg overflow-hidden border border-white/10 shadow-2xl">
              <iframe
                src={`${targetPdfUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title={title}
              />
            </div>
          ) : (
            <div className="relative flex flex-col items-center justify-center max-w-full max-h-full">
              <div 
                className="relative shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/10 rounded-sm bg-white overflow-hidden transition-all duration-200"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
              >
                <canvas
                  ref={canvasRef}
                  id="academy-pdf-canvas"
                  className={`max-w-[90vw] max-h-[75vh] object-contain transition-opacity duration-200 ${
                    renderingPage ? 'opacity-40' : 'opacity-100'
                  }`}
                />

                {renderingPage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[0.5px]">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* 3. BOTTOM MOBILE PAGINATION BAR */}
      {!isMissingOrFailed && !isLoading && (
        <footer className="h-14 px-4 sm:px-6 bg-[#0c0c14] border-t border-white/10 flex items-center justify-between gap-2 flex-shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[10px] text-white/50 truncate hidden sm:inline">
              Discipline: <span className="text-white/80">{stream}</span>
            </span>
            <span className="font-mono text-[10px] text-white/40">
              • {totalPages} Pages Total
            </span>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              className="px-2.5 py-1 rounded bg-white/5 disabled:opacity-30 text-white font-mono text-xs flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span className="font-mono text-xs text-ocu-gold font-bold">
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoading}
              className="px-2.5 py-1 rounded bg-white/5 disabled:opacity-30 text-white font-mono text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-white/40">
            <span>View-Only Mode • Use arrow keys or swipe to navigate pages</span>
          </div>
        </footer>
      )}
    </div>
  );
}
