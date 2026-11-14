import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

const PALETTE = [
  '#ffcc00', // yellow
  '#00f0ff', // cyan
  '#ff2d55', // pink
  '#10b981', // green
  '#a855f7', // purple
];

export const CursorEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Position state (for outer trailing reticle)
  const mousePos = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const particles = useRef<Particle[]>([]);
  const lastMoveTime = useRef(Date.now());
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Disable on touch devices or reduced motion
    if (typeof window === 'undefined') return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      setIsVisible(true);
      lastMoveTime.current = Date.now();

      // Check if hovering over interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = Boolean(
          target.closest('button, a, input, textarea, select, label, [role="button"], .neo-btn, .neo-card')
        );
        setIsHovered(interactive);
      }

      // Spawn 1-2 glowing trail particles on movement
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.4 + 0.4;
        particles.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 2,
          color,
          alpha: 0.85,
          decay: Math.random() * 0.035 + 0.025,
        });
      }

      // Limit max particles
      if (particles.current.length > 60) {
        particles.current.splice(0, particles.current.length - 60);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth lerp for outer reticle
      const ease = 0.22;
      trailPos.current.x += (mousePos.current.x - trailPos.current.x) * ease;
      trailPos.current.y += (mousePos.current.y - trailPos.current.y) * ease;

      // Update & draw particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size *= 0.96;

        if (p.alpha <= 0 || p.size < 0.5) {
          particles.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        // Draw brutalist diamond/square micro-spark
        ctx.beginPath();
        ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.fill();
        ctx.restore();
      }

      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Particle Canvas Trail */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[99998]"
        style={{ width: '100vw', height: '100vh' }}
      />

      {/* Trailing Outer Reticle Target */}
      <div
        className="fixed pointer-events-none z-[99999] transition-[transform,width,height,background-color,border-color] duration-150 ease-out will-change-transform flex items-center justify-center"
        style={{
          left: `${trailPos.current.x}px`,
          top: `${trailPos.current.y}px`,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.75 : isHovered ? 1.5 : 1})`,
          width: isHovered ? '44px' : '28px',
          height: isHovered ? '44px' : '28px',
        }}
      >
        <div
          className={`w-full h-full rounded-full border-2 transition-all duration-150 relative ${
            isHovered
              ? 'border-yellow bg-yellow/20 shadow-[0_0_15px_rgba(255,204,0,0.6)]'
              : 'border-ink/80 bg-ink/5 shadow-[0_0_8px_rgba(0,0,0,0.15)]'
          }`}
        >
          {/* Technical crosshairs ticks on the reticle */}
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-ink" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-ink" />
          <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-0.5 bg-ink" />
          <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-0.5 bg-ink" />
        </div>
      </div>

      {/* Immediate Sharp Center Dot */}
      <div
        className="fixed pointer-events-none z-[99999] w-2 h-2 rounded-full will-change-transform"
        style={{
          left: `${mousePos.current.x}px`,
          top: `${mousePos.current.y}px`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: isHovered ? '#ffcc00' : '#0a0a0a',
          boxShadow: isHovered
            ? '0 0 8px #ffcc00, 0 0 2px #000'
            : '0 0 4px rgba(0,0,0,0.5)',
        }}
      />
    </>
  );
};

