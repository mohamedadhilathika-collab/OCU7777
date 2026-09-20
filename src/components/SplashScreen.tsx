import React, { useState, useEffect } from 'react';
import './SplashScreen.css';

/**
 * Legendary Cinematic Splash Screen Component for Omni Comic PWA
 *
 * Plays a high-budget, dramatic 4.5-second GPU-accelerated entrance sequence:
 * - Locks document scrolling immediately on mount
 * - Reveals and power-pulses the Omega gradient emblem
 * - Dramatically expands typographic tracking for "OMNI COMIC UNIVERSAL HUB"
 * - Zooms and dissolves seamlessly into the application
 * - Unmounts completely from the DOM after 4500ms
 */
export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Immediately lock background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 4.5 seconds entrance sequence timer
    const timer = setTimeout(() => {
      setShowSplash(false);
      document.body.style.overflow = 'auto';
    }, 4500);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow || 'auto';
    };
  }, []);

  if (!showSplash) {
    return null;
  }

  return (
    <div
      id="omni-splash-screen"
      className="splash-screen-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Heavy Cinematic Ambient Aura */}
      <div className="splash-ambient-glow" aria-hidden="true" />

      {/* Main Branding Focus */}
      <div className="splash-content">
        {/* Omega-style Symbol with Red-to-Orange/Yellow Gradient */}
        <img
          id="splash-omega-logo"
          src="/omni-logo.svg"
          alt="Omni Comic Universal Emblem"
          className="splash-logo"
        />

        {/* Cinematic Tracking Title */}
        <h1
          id="splash-title-text"
          className="splash-title"
        >
          OMNI COMIC UNIVERSAL HUB
        </h1>
      </div>
    </div>
  );
}
