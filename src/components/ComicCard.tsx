import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Calendar, Layers, BookOpen } from 'lucide-react';
import { ComicVolume } from '../types';

interface ComicCardProps {
  key?: string | number;
  comic: ComicVolume;
  onBuy: (comic: ComicVolume) => void;
  hasDigitalAccess?: boolean;
  onRead?: (comic: ComicVolume) => void;
}

export default function ComicCard({ comic, onBuy, hasDigitalAccess = false, onRead }: ComicCardProps) {
  const isReleased = comic.releaseStatus === 'Released';

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
              isReleased
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/20'
                : 'text-ocu-gold bg-yellow-950/60 border-ocu-gold/20'
            }`}>
              {comic.releaseStatus.toUpperCase()}
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
        <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-widest text-ocu-gray uppercase">PRICE</span>
            <span className="font-display font-black text-xl text-white">
              {comic.price === 0 ? 'FREE' : `₹${comic.price}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 1. READ NOW BUTTON: always available for instant reading / preview with full dynamic attributes */}
            <button
              type="button"
              id={`btn-read-comic-${comic.id}`}
              data-action="read-comic"
              data-comic-id={comic.id}
              data-comic-file={comic.digitalFile || ''}
              data-file-url={comic.digitalFile || ''}
              onClick={handleReadClick}
              className={`btn-read-now px-3.5 py-2.5 rounded font-display text-xs font-bold tracking-widest uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                hasDigitalAccess
                  ? 'bg-gradient-to-r from-ocu-gold to-yellow-500 hover:brightness-110 text-black shadow-md shadow-ocu-gold/10'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:border-ocu-gold/50'
              }`}
              title={hasDigitalAccess ? 'Read Full Digital Comic' : 'Read Digital Edition / Preview'}
              aria-label={`Read ${comic.title} now`}
            >
              <BookOpen size={13} className={hasDigitalAccess ? 'text-black' : 'text-ocu-gold'} />
              <span>READ NOW</span>
            </button>

            {/* 2. BUY NOW BUTTON: only shown when the user does not yet own full digital access */}
            {!hasDigitalAccess && (
              <button
                type="button"
                id={`btn-buy-comic-${comic.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(comic);
                }}
                className="group px-3 py-2.5 rounded bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 hover:border-white transition-all duration-300 font-display text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 cursor-pointer active:scale-95"
                title={`Buy or Pre-Order ${comic.title}`}
                aria-label={`Buy ${comic.title}`}
              >
                <ShoppingCart size={13} className="text-ocu-crimson group-hover:text-black transition-colors" />
                <span>{isReleased ? 'Buy' : 'Pre-Order'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

