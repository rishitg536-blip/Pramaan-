import React, { useEffect, useRef, useState } from 'react';

export const CursorEffect: React.FC = () => {
  const lightRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const mousePos = useRef({ x: -200, y: -200 });
  const lightPos = useRef({ x: -200, y: -200 });
  const isVisibleRef = useRef(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
        lightPos.current.x = e.clientX;
        lightPos.current.y = e.clientY;
      }
    };

    const handleMouseLeave = () => {
      isVisibleRef.current = false;
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      isVisibleRef.current = true;
      setIsVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    const render = () => {
      // Smooth fluid lerp for the following light
      const ease = 0.16;
      lightPos.current.x += (mousePos.current.x - lightPos.current.x) * ease;
      lightPos.current.y += (mousePos.current.y - lightPos.current.y) * ease;

      if (lightRef.current) {
        lightRef.current.style.transform = `translate3d(${lightPos.current.x}px, ${lightPos.current.y}px, 0)`;
      }

      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={lightRef}
      className={`fixed top-0 left-0 pointer-events-none z-[99999] will-change-transform transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* Soft ambient following light glow */}
      <div
        className="w-[260px] h-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 226, 74, 0.22) 0%, rgba(255, 226, 74, 0.08) 35%, rgba(255, 226, 74, 0.02) 60%, transparent 75%)',
          filter: 'blur(8px)',
        }}
      />
      {/* Subtle warm center illumination */}
      <div
        className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 235, 120, 0.5) 0%, rgba(255, 226, 74, 0.15) 60%, transparent 100%)',
          filter: 'blur(3px)',
        }}
      />
    </div>
  );
};

