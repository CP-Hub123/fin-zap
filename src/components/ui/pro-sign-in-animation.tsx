import React, { useEffect, useRef } from "react";

const ringSizes = [300, 372, 452, 542, 644, 758, 884, 1000];

const CSS = `
@keyframes floo-orbit{to{transform:rotate(360deg)}}
@keyframes floo-wave{0%{transform:scale(1);opacity:0}10%{opacity:.9}100%{transform:scale(3.3);opacity:0}}
@keyframes floo-rise{from{opacity:0;transform:translateY(12px)}}
.floo-portal{position:relative;isolation:isolate;overflow:hidden;--tx:0px;--ty:0px}
.floo-portal .floo-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;transform:translate(var(--tx),var(--ty))}
.floo-portal .glow{position:absolute;left:50%;top:50%;width:620px;height:620px;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,hsl(var(--primary)/.22),hsl(var(--primary)/.06) 45%,transparent 70%);filter:blur(20px)}
.floo-portal .rings{position:absolute;left:50%;top:50%;width:2000px;height:2000px;transform:translate(-50%,-50%)}
.floo-portal .rings circle{fill:none;transform-origin:1000px 1000px}
.floo-portal .base{stroke:hsl(var(--foreground)/.06);stroke-width:1}
.floo-portal .arc{stroke:url(#floo-arc-gradient);stroke-width:1.6;stroke-linecap:round;opacity:.75;animation:floo-orbit var(--duration) linear infinite}
.floo-portal .arc.reverse{animation-direction:reverse}
.floo-portal .wave{stroke:hsl(var(--primary)/.5);stroke-width:1.2;animation:floo-wave 7s ease-out infinite}
.floo-portal .wave-b{animation-delay:-3.5s}
.floo-portal.is-hovering .arc{opacity:1}
.floo-portal .floo-content{animation:floo-rise .7s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion:reduce){.floo-portal .arc,.floo-portal .wave,.floo-portal .floo-content{animation:none}}
`;

/** Fundo animado em "portal" (anéis orbitando + ondas + parallax) que envolve qualquer conteúdo. */
export const Component = ({ children, className = "", style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, px = 0, py = 0, tx = 0, ty = 0;
    const move = (e: PointerEvent) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; };
    const tick = () => {
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      el.style.setProperty("--tx", `${px * -14}px`);
      el.style.setProperty("--ty", `${py * -10}px`);
      frame = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", move);
    frame = requestAnimationFrame(tick);
    return () => { removeEventListener("pointermove", move); cancelAnimationFrame(frame); };
  }, []);

  return (
    <div ref={ref} className={`floo-portal ${className}`} style={style}>
      <style>{CSS}</style>
      <div className="floo-bg" aria-hidden="true">
        <div className="glow" />
        <svg className="rings" viewBox="0 0 2000 2000">
          <defs>
            <linearGradient id="floo-arc-gradient" gradientUnits="userSpaceOnUse" x1="300" y1="300" x2="1700" y2="1700">
              <stop stopColor="hsl(var(--primary))" />
              <stop offset=".55" stopColor="#7FA0FF" />
              <stop offset="1" stopColor="#4B64BF" />
            </linearGradient>
          </defs>
          <circle className="wave" cx="1000" cy="1000" r="300" />
          <circle className="wave wave-b" cx="1000" cy="1000" r="300" />
          {ringSizes.map((r, i) => {
            const len = 9 + (i % 3) * 5;
            return (
              <React.Fragment key={r}>
                <circle className="base" cx="1000" cy="1000" r={r} />
                <circle className={`arc ${i % 2 ? "reverse" : ""}`} cx="1000" cy="1000" r={r} pathLength={100}
                  strokeDasharray={`${len} ${100 - len}`}
                  style={{ ["--duration" as any]: `${38 + i * 12}s`, animationDelay: `${-i * 7.3}s` }} />
              </React.Fragment>
            );
          })}
        </svg>
      </div>
      <div className="floo-content w-full flex justify-center">{children}</div>
    </div>
  );
};

export default Component;
