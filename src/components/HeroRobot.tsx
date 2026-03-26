import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const HeroRobot = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [blinkState, setBlinkState] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 150, damping: 20 });

  // Eye tracking - map mouse position to eye movement
  const eyeX = useTransform(smoothX, [-200, 200], [-6, 6]);
  const eyeY = useTransform(smoothY, [-200, 200], [-4, 4]);

  // Antenna sway
  const antennaRotate = useTransform(smoothX, [-200, 200], [-8, 8]);

  // Body tilt
  const bodyRotateY = useTransform(smoothX, [-300, 300], [-5, 5]);
  const bodyRotateX = useTransform(smoothY, [-300, 300], [3, -3]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Blinking
  useEffect(() => {
    const blink = () => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-48 h-56 md:w-56 md:h-64 pointer-events-auto cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          rotateY: bodyRotateY,
          rotateX: bodyRotateX,
          perspective: 800,
        }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{ background: "hsl(var(--primary) / 0.15)" }}
          animate={{
            scale: isHovered ? 1.3 : 1,
            opacity: isHovered ? 0.3 : 0.15,
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Antenna */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 -top-2 flex flex-col items-center z-10"
          style={{ rotate: antennaRotate }}
        >
          <motion.div
            className="w-3 h-3 rounded-full mb-0.5"
            style={{ background: "hsl(var(--accent))" }}
            animate={{
              boxShadow: isHovered
                ? "0 0 16px 4px hsl(var(--accent) / 0.6)"
                : "0 0 8px 2px hsl(var(--accent) / 0.3)",
              scale: isHovered ? 1.2 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
          <div
            className="w-0.5 h-6"
            style={{ background: "hsl(var(--muted-foreground) / 0.4)" }}
          />
        </motion.div>

        {/* Head */}
        <motion.div
          className="absolute top-6 left-1/2 -translate-x-1/2 w-36 h-32 md:w-44 md:h-36 rounded-3xl border-2 flex flex-col items-center justify-center gap-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
            borderColor: "hsl(var(--border))",
            boxShadow: "0 8px 32px hsl(var(--primary) / 0.1), inset 0 1px 0 hsl(var(--card))",
          }}
          animate={{
            y: isHovered ? -4 : 0,
            borderColor: isHovered ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Visor / screen area */}
          <div
            className="w-28 h-14 md:w-32 md:h-16 rounded-2xl flex items-center justify-center gap-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.15) 100%)",
              border: "1px solid hsl(var(--primary) / 0.2)",
            }}
          >
            {/* Scan line effect */}
            <motion.div
              className="absolute inset-x-0 h-px"
              style={{ background: "hsl(var(--primary) / 0.3)" }}
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Left eye */}
            <motion.div className="relative w-5 h-5 md:w-6 md:h-6">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "hsl(var(--primary) / 0.2)" }}
              />
              <motion.div
                className="absolute w-3 h-3 md:w-3.5 md:h-3.5 rounded-full top-1/2 left-1/2"
                style={{
                  background: "hsl(var(--primary))",
                  x: eyeX,
                  y: eyeY,
                  translateX: "-50%",
                  translateY: "-50%",
                  scaleY: blinkState ? 0.1 : 1,
                }}
                animate={{
                  boxShadow: isHovered
                    ? "0 0 12px 3px hsl(var(--primary) / 0.5)"
                    : "0 0 6px 1px hsl(var(--primary) / 0.3)",
                }}
                transition={{ duration: 0.15 }}
              />
            </motion.div>

            {/* Right eye */}
            <motion.div className="relative w-5 h-5 md:w-6 md:h-6">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "hsl(var(--primary) / 0.2)" }}
              />
              <motion.div
                className="absolute w-3 h-3 md:w-3.5 md:h-3.5 rounded-full top-1/2 left-1/2"
                style={{
                  background: "hsl(var(--primary))",
                  x: eyeX,
                  y: eyeY,
                  translateX: "-50%",
                  translateY: "-50%",
                  scaleY: blinkState ? 0.1 : 1,
                }}
                animate={{
                  boxShadow: isHovered
                    ? "0 0 12px 3px hsl(var(--primary) / 0.5)"
                    : "0 0 6px 1px hsl(var(--primary) / 0.3)",
                }}
                transition={{ duration: 0.15 }}
              />
            </motion.div>
          </div>

          {/* Mouth */}
          <motion.div
            className="flex items-center gap-0.5"
            animate={{
              gap: isHovered ? "3px" : "2px",
            }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{ background: "hsl(var(--accent))" }}
                animate={{
                  width: isHovered ? 4 : 3,
                  height: isHovered
                    ? [4, 8 + Math.sin(i * 1.2) * 6, 4]
                    : 3,
                }}
                transition={{
                  duration: 0.6,
                  repeat: isHovered ? Infinity : 0,
                  delay: i * 0.08,
                }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Ears */}
        {[-1, 1].map((side) => (
          <motion.div
            key={side}
            className="absolute top-14 w-4 h-8 rounded-full"
            style={{
              [side === -1 ? "left" : "right"]: "2px",
              background: "hsl(var(--muted))",
              border: "1.5px solid hsl(var(--border))",
            }}
            animate={{
              background: isHovered
                ? "hsl(var(--primary) / 0.15)"
                : "hsl(var(--muted))",
            }}
          />
        ))}

        {/* Body */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-12 md:w-28 md:h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
            border: "1.5px solid hsl(var(--border))",
          }}
        >
          {/* Chest indicator */}
          <motion.div
            className="w-4 h-4 rounded-full"
            style={{ border: "2px solid hsl(var(--primary) / 0.4)" }}
            animate={{
              background: isHovered
                ? ["hsl(var(--primary) / 0.2)", "hsl(var(--primary) / 0.6)", "hsl(var(--primary) / 0.2)"]
                : "hsl(var(--primary) / 0.2)",
              boxShadow: isHovered
                ? ["0 0 0px hsl(var(--primary) / 0)", "0 0 12px hsl(var(--primary) / 0.4)", "0 0 0px hsl(var(--primary) / 0)"]
                : "0 0 0px hsl(var(--primary) / 0)",
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>

        {/* Floating particles around robot */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: i % 2 === 0 ? "hsl(var(--primary) / 0.5)" : "hsl(var(--accent) / 0.5)",
              left: `${20 + i * 20}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -12, 0],
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default HeroRobot;
