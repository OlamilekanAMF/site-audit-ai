import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  targetR: number;
  targetG: number;
  targetB: number;
  alpha: number;
}

type ColorPalette = {
  base: [number, number, number];
  xShift: [number, number, number];
  yShift: [number, number, number];
  glow: [string, string];
};

const LIGHT_PALETTE: ColorPalette = {
  base: [30, 80, 180],
  xShift: [60, 30, 75],
  yShift: [40, 140, -40],
  glow: ["hsla(220, 70%, 55%, 0.12)", "hsla(165, 70%, 45%, 0.06)"],
};

const DARK_PALETTE: ColorPalette = {
  base: [80, 160, 255],
  xShift: [80, -40, -30],
  yShift: [-20, 60, 100],
  glow: ["hsla(220, 80%, 65%, 0.18)", "hsla(280, 60%, 60%, 0.08)"],
};

const HeroParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const paletteRef = useRef<ColorPalette>(LIGHT_PALETTE);
  const glowRef = useRef({ c1: LIGHT_PALETTE.glow[0], c2: LIGHT_PALETTE.glow[1] });
  const { resolvedTheme } = useTheme();

  const getTargetColor = useCallback((x: number, y: number, w: number, h: number, palette: ColorPalette) => {
    const nx = x / w;
    const ny = y / h;
    return {
      r: Math.floor(palette.base[0] + nx * palette.xShift[0] + ny * palette.yShift[0]),
      g: Math.floor(palette.base[1] + nx * palette.xShift[1] + ny * palette.yShift[1]),
      b: Math.floor(palette.base[2] + nx * palette.xShift[2] + ny * palette.yShift[2]),
    };
  }, []);

  // Smoothly transition palette when theme changes
  useEffect(() => {
    paletteRef.current = resolvedTheme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
    const target = paletteRef.current;
    glowRef.current = { c1: target.glow[0], c2: target.glow[1] };
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.offsetWidth * dpr;
      canvas.height = parent.offsetHeight * dpr;
      canvas.style.width = `${parent.offsetWidth}px`;
      canvas.style.height = `${parent.offsetHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(parent.offsetWidth, parent.offsetHeight);
    };

    const initParticles = (w: number, h: number) => {
      const count = Math.min(Math.floor((w * h) / 4000), 120);
      const palette = paletteRef.current;
      particlesRef.current = Array.from({ length: count }, () => {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const { r, g, b } = getTargetColor(x, y, w, h, palette);
        return {
          x, y, baseX: x, baseY: y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2.5 + 1,
          r, g, b, targetR: r, targetG: g, targetB: b,
          alpha: Math.random() * 0.5 + 0.3,
        };
      });
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const particles = particlesRef.current;
      const palette = paletteRef.current;
      const glow = glowRef.current;

      // Cursor glow
      if (mx > 0 && my > 0) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 250);
        grad.addColorStop(0, glow.c1);
        grad.addColorStop(0.4, glow.c2);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      const colorLerp = 0.04; // smooth transition speed

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse interaction
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = (1 - dist / 180) * 2;
          p.vx += (dx / dist) * force * 0.08;
          p.vy += (dy / dist) * force * 0.08;
        }

        // Spring + damping
        p.vx += (p.baseX - p.x) * 0.008;
        p.vy += (p.baseY - p.y) * 0.008;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;

        // Compute target color from current palette and lerp toward it
        const target = getTargetColor(p.x, p.y, w, h, palette);
        p.targetR = target.r;
        p.targetG = target.g;
        p.targetB = target.b;
        p.r = Math.round(lerp(p.r, p.targetR, colorLerp));
        p.g = Math.round(lerp(p.g, p.targetG, colorLerp));
        p.b = Math.round(lerp(p.b, p.targetB, colorLerp));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
        ctx.fill();

        // Connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const cdx = p.x - p2.x;
          const cdy = p.y - p2.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < 120) {
            const opacity = (1 - cdist / 120) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: 0, y: 0 };
    };

    resize();
    animate();

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
    };
  }, [getTargetColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
    />
  );
};

export default HeroParticles;
