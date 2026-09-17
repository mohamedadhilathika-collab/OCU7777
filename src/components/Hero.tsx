import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Eye, ShieldAlert, ArrowDown } from 'lucide-react';
import { ViewState } from '../types';

interface HeroProps {
  onExploreComics: () => void;
  onExploreUniverse: () => void;
}

export default function Hero({ onExploreComics, onExploreUniverse }: HeroProps) {
  const scrollToNextSection = () => {
    const nextSec = document.getElementById('universe-overview');
    if (nextSec) {
      nextSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="cinematic-hero-section"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-ocu-dark select-none"
    >
      {/* 1. Cinematic Background Artwork Placeholder with Luxury Cosmic Styling */}
      <div 
        id="hero-artwork-placeholder"
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[2000ms]"
        style={{
          backgroundImage: 'none', // Easily replaced with e.g. url("/hero-banner.jpg")
        }}
      >
        {/* Dynamic generative CSS fallback artwork */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-indigo-950/40 via-neutral-950 to-ocu-dark" />
        
        {/* Interactive glowing energy clusters */}
        <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-ocu-crimson/10 rounded-full blur-[140px] animate-pulse duration-[8s]" />
        <div className="absolute bottom-[15%] right-[25%] w-[400px] h-[400px] bg-ocu-gold/5 rounded-full blur-[120px] animate-pulse duration-[12s]" />

        {/* Ambient starfield / cosmic grid */}
        <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* 2. Sleek Dark Vignette Layer for maximum depth and contrast */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-ocu-dark via-transparent to-ocu-dark/50" />
      <div className="absolute inset-0 z-10 bg-radial-gradient(from_center,_rgba(0,0,0,0)_20%,_rgba(5,5,5,0.95)_100%)" style={{ pointerEvents: 'none' }} />

      {/* 3. Hero Content Container */}
      <div className="relative z-20 max-w-5xl mx-auto px-6 text-center pt-24 pb-12 flex flex-col items-center justify-center min-h-screen">
        
        {/* Top Mini-Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-8 backdrop-blur-md"
        >
          <span className="w-2 h-2 rounded-full bg-ocu-crimson animate-ping" />
          <span className="font-mono text-[10px] tracking-[0.25em] text-ocu-gray uppercase font-bold">
            PHASE ONE INTERACTIVE MATRIX
          </span>
        </motion.div>

        {/* Cinematic Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-black text-5xl md:text-8xl tracking-tight leading-none text-white mb-6 select-none uppercase"
        >
          <span className="text-stroke-premium block md:inline">ENTER THE</span>{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-ocu-gray">
            OMNI COMIC
          </span>{' '}
          <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-ocu-crimson via-red-500 to-ocu-gold animate-shimmer">
            UNIVERSE
          </span>
        </motion.h1>

        {/* Short Emotional Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-2xl font-sans text-base md:text-lg text-ocu-gray font-light leading-relaxed mb-12"
        >
          A cinematic odyssey woven across infinite planes. Follow the sovereign protectors
          of Earth as they stand against ancient cosmic singularities seeking to plunge reality
          back into the primordial quiet.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center mb-16"
        >
          {/* Read Comics Button */}
          <button
            id="hero-btn-read-comics"
            onClick={onExploreComics}
            className="group w-full sm:w-auto px-8 py-4 rounded bg-gradient-to-r from-ocu-crimson to-ocu-crimson-hover hover:scale-[1.02] transition-all duration-300 font-display text-sm font-bold tracking-widest text-white uppercase flex items-center justify-center gap-2 cursor-pointer crimson-glow hover:brightness-110 active:scale-95"
          >
            <Sparkles size={16} />
            <span>Read Comics</span>
          </button>

          {/* Explore the Universe Button */}
          <button
            id="hero-btn-explore-universe"
            onClick={onExploreUniverse}
            className="group w-full sm:w-auto px-8 py-4 rounded bg-transparent border border-white/20 hover:border-white/50 hover:bg-white/[0.03] transition-all duration-300 font-display text-sm font-bold tracking-widest text-white uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Eye size={16} className="text-ocu-gold transition-colors duration-300 group-hover:text-white" />
            <span>Explore Universe</span>
          </button>
        </motion.div>

        {/* Smooth Scroll Indicator */}
        <motion.button
          id="hero-scroll-indicator"
          onClick={scrollToNextSection}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-ocu-gray hover:text-white transition-colors cursor-pointer"
        >
          <span className="font-mono text-[9px] tracking-widest uppercase">
            SCROLL TO COMMENCE
          </span>
          <ArrowDown size={14} className="animate-bounce" />
        </motion.button>

      </div>
    </section>
  );
}
