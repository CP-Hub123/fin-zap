"use client";

import * as React from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, LayoutGrid, Moon, Ruler, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kind = "dashboard" | "inbox" | "calendar" | "editor" | "insights";
export interface LensShot {
  id: string;
  title: string;
  blurb: string;
  tag: string;
  kind?: Kind;
  screen?: string;
  /** A domain-specific preview without exposing live user data. */
  preview?: React.ReactNode;
}
export interface LensReelProps {
  items: LensShot[];
  title?: string;
  defaultIndex?: number;
  theme?: "system" | "light" | "dark";
  onChange?: (index: number) => void;
  className?: string;
  /** Allows parent onboarding navigation to select the same slide. */
  selectedIndex?: number;
}
type R = [number, number, number, number, "p" | "b" | "t" | "c" | "a" | "o"];
const W = 300, H = 190;
const rows = (n: number, f: (i: number) => R[]) => Array.from({ length: n }, (_, i) => f(i)).flat();
const SKETCH: Record<Kind, R[]> = {
  dashboard: [[0,0,52,190,"p"],[64,12,120,10,"t"],[236,10,52,16,"c"],[64,36,70,44,"p"],[142,36,70,44,"p"],[220,36,68,44,"a"],[70,128,14,50,"b"],[92,112,14,66,"b"],[114,132,14,46,"b"],[136,100,14,78,"b"],[158,120,14,58,"b"],[180,94,14,84,"b"],[210,92,78,86,"p"],[220,104,50,6,"t"],[220,118,38,6,"t"],[220,132,56,6,"t"],[10,14,32,8,"t"],[10,34,32,6,"t"],[10,48,32,6,"t"],[10,62,32,6,"t"]],
  inbox: rows(5, i => [[16,14+i*34,268,28,"p"],[26,24+i*34,8,8,"c"],[44,21+i*34,110,6,"t"],[44,32+i*34,170,5,"t"],...(i%2===0 ? [[244,22+i*34,30,10,"a"]] as R[] : [])]),
  calendar: [[16,10,100,12,"t"],[236,8,48,16,"c"],...rows(28,i=>[[16+(i%7)*38,36+Math.floor(i/7)*35,34,30,"p"]]),[92,71,34,30,"a"],[130,106,72,30,"c"],[206,141,34,30,"a"]],
  editor: [[16,10,268,20,"p"],[28,44,150,14,"t"],[28,70,150,6,"t"],[28,84,132,6,"t"],[28,98,160,6,"t"],[28,112,110,6,"t"],[196,64,80,74,"a"],[28,150,66,24,"c"],[104,150,66,24,"p"],[200,150,76,6,"t"]],
  insights: [[16,14,120,12,"t"],[16,40,120,130,"p"],[76,105,44,44,"o"],[150,40,134,36,"p"],[150,84,134,36,"p"],[150,128,134,42,"p"],[160,52,60,6,"t"],[160,96,80,6,"t"],[160,140,50,6,"t"],[236,134,40,24,"b"]],
};

function Sketch({ item, wire }: { item: LensShot; wire: boolean }) {
  const id = React.useId().replace(/:/g, "");
  if (!wire && item.preview) return <div className="lens-preview absolute inset-0 flex items-center justify-center bg-card p-3">{item.preview}</div>;
  const kind = item.kind ?? "dashboard";
  return <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="none">
    <rect width={W} height={H} fill={wire ? "hsl(var(--card))" : "hsl(var(--muted))"} />
    {!wire && item.screen && <image href={item.screen} width={W} height={H} preserveAspectRatio="xMidYMid slice" />}
    {wire && <><defs><pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="hsl(var(--primary))" opacity="0.16" strokeWidth="0.5" /></pattern></defs><rect width={W} height={H} fill={`url(#${id})`} /></>}
    {!(item.screen && !wire) && SKETCH[kind].map(([x,y,w,h,t],i) => {
      if (wire) return <g key={i} stroke="hsl(var(--primary))">
        {t === "o" ? <circle cx={x} cy={y} r={w} fill="none" strokeDasharray="3 2" strokeWidth="0.8" /> : <rect x={x} y={y} width={w} height={h} rx={t === "t" ? 1 : 3} fill="none" strokeDasharray="3 2" strokeWidth="0.8" />}
        {w>=26 && h>=9 && t!=="o" && <text x={x+3} y={y+8} fontSize="6" fontFamily="ui-monospace,monospace" stroke="none" fill="hsl(var(--primary))">{w}x{h}</text>}
        {t==="o" && <text x={x-10} y={y+2} fontSize="6" stroke="none" fill="hsl(var(--primary))">r{w}</text>}
      </g>;
      if (t==="o") return <g key={i}><circle cx={x} cy={y} r={w} fill="none" strokeWidth="14" stroke="hsl(var(--border))" /><circle cx={x} cy={y} r={w} fill="none" strokeWidth="14" strokeDasharray="170 400" transform={`rotate(-90 ${x} ${y})`} stroke="hsl(var(--primary))" /></g>;
      const fill = t==="p" ? "hsl(var(--card))" : t==="t" ? "hsl(var(--muted-foreground))" : t==="a" ? "hsl(var(--finzap-green) / .22)" : "hsl(var(--primary))";
      return <rect key={i} x={x} y={y} width={w} height={h} rx={t==="t"?3:t==="b"?2:6} fill={fill} opacity={t==="t"?.4:1} stroke={t==="p"?"hsl(var(--border))":"none"} strokeWidth="1" />;
    })}
  </svg>;
}

function Slide({ item, i, pos, w, reduce, active, full }: { item: LensShot; i: number; pos: MotionValue<number>; w: number; reduce: boolean; active: boolean; full: boolean }) {
  const d = useTransform(pos,p=>i-p);
  const x = useTransform(d,v=>reduce?v*(w+16):Math.sign(v)*Math.min(Math.abs(v),1)*w*.66+Math.max(0,Math.abs(v)-1)*w*.22*Math.sign(v));
  const rotateY = useTransform(d,v=>reduce?0:Math.max(-1.3,Math.min(1.3,v))*-42);
  const scale = useTransform(d,v=>reduce?1:1-Math.min(Math.abs(v),2)*.13);
  const z = useTransform(d,v=>reduce?0:-Math.min(Math.abs(v),2)*140);
  const opacity = useTransform(d,v=>Math.max(0,1-Math.abs(v)*(reduce?1:.4)));
  const zi = useTransform(d,v=>100-Math.round(Math.abs(v)*10));
  const lx = useSpring(useMotionValue(w/2),{stiffness:380,damping:32});
  const ly = useSpring(useMotionValue(70),{stiffness:380,damping:32});
  const lr = useMotionValue(0), mag = useMotionValue(1.2);
  const h = w*H/W;
  React.useEffect(()=>{
    if(full){lx.set(w/2);ly.set(h/2);}
    const a = animate(lr,full?Math.hypot(w,h)/2+12:0,reduce?{duration:0}:{type:"spring",stiffness:160,damping:22});
    const b = animate(mag,full?1:1.2,{duration:reduce?0:.4});
    return ()=>{a.stop();b.stop();};
  },[full,lr,mag,w,h,lx,ly,reduce]);
  const clip = useMotionTemplate`circle(${lr}px at ${lx}px ${ly}px)`;
  const origin = useMotionTemplate`${lx}px ${ly}px`;
  const ringX = useTransform(()=>lx.get()-lr.get()), ringY = useTransform(()=>ly.get()-lr.get());
  const ringS = useTransform(lr,r=>r*2), ringO = useTransform(lr,r=>r>w*.9||r<4?0:1);
  const move = (e: React.PointerEvent)=>{
    if(!active||full||reduce||e.pointerType!=="mouse"||e.buttons)return;
    const b=e.currentTarget.getBoundingClientRect(); lx.set(e.clientX-b.left);ly.set(e.clientY-b.top);
    if(lr.get()<50)animate(lr,58,{type:"spring",stiffness:300,damping:18});
  };
  return <motion.li aria-hidden={!active} aria-roledescription="slide" aria-label={item.title} className="absolute left-1/2 top-3 list-none" style={{width:w,marginLeft:-w/2,x,rotateY,scale,z,opacity,zIndex:zi,transformStyle:"preserve-3d"}}>
    <div onPointerMove={move} onPointerLeave={()=>{if(!full)animate(lr,0,{duration:reduce?0:.25});}} className={cn("lens-screen relative overflow-hidden rounded-lg border border-border bg-card",active&&!full&&!reduce&&"[@media(hover:hover)]:cursor-none")} style={{height:h}}>
      <Sketch item={item} wire={false} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{clipPath:clip,WebkitClipPath:clip}}><motion.div className="absolute inset-0" style={{scale:mag,transformOrigin:origin}}><Sketch item={item} wire /></motion.div></motion.div>
      <motion.div aria-hidden="true" className="lens-ring pointer-events-none absolute left-0 top-0 rounded-full border-2 border-primary" style={{x:ringX,y:ringY,width:ringS,height:ringS,opacity:ringO}} />
    </div>
  </motion.li>;
}

function useDark(theme: "system" | "light" | "dark") {
  const [override,setOverride]=React.useState<boolean|null>(null);
  const [system,setSystem]=React.useState(false);
  React.useEffect(()=>{
    const m=window.matchMedia("(prefers-color-scheme: dark)"); setSystem(m.matches);
    const f=(e:MediaQueryListEvent)=>setSystem(e.matches);m.addEventListener("change",f);return()=>m.removeEventListener("change",f);
  },[]);
  return [override ?? (theme==="system"?system:theme==="dark"),setOverride] as const;
}

export function LensReel({items,title="Conheça o FinZap",defaultIndex=0,theme="system",onChange,className,selectedIndex}:LensReelProps) {
  const reduce=Boolean(useReducedMotion());
  const [dark,setDark]=useDark(theme);
  const wrap=React.useRef<HTMLDivElement>(null);
  const [w,setW]=React.useState(300);
  const clamp=React.useCallback((n:number)=>Math.max(0,Math.min(Math.max(0,items.length-1),n)),[items.length]);
  const [internalIndex,setIndex]=React.useState(()=>clamp(defaultIndex));
  const index=clamp(selectedIndex??internalIndex);
  const [full,setFull]=React.useState(false),[overview,setOverview]=React.useState(false);
  const overviewRef=React.useRef<HTMLDivElement>(null),overviewBtnRef=React.useRef<HTMLButtonElement>(null);
  const pos=useMotionValue(index);
  const [grabbing,setGrabbing]=React.useState(false);
  const down=React.useRef<{x:number;p:number;t:number;v:number}|null>(null);
  React.useEffect(()=>{if(overview)overviewRef.current?.focus();},[overview]);
  const closeOverview=React.useCallback(()=>{setOverview(false);overviewBtnRef.current?.focus();},[]);
  React.useEffect(()=>{
    const el=wrap.current;if(!el)return;
    const f=()=>setW(Math.max(120,Math.min(320,el.offsetWidth-48)));
    const ro=new ResizeObserver(f);ro.observe(el);f();return()=>ro.disconnect();
  },[]);
  React.useEffect(()=>{
    const a=animate(pos,index,reduce?{duration:0}:{type:"spring",stiffness:150,damping:18});return()=>a.stop();
  },[index,pos,reduce]);
  const goTo=React.useCallback((n:number,velocity=0)=>{
    const target=clamp(n);setIndex(target);onChange?.(target);
    animate(pos,target,reduce?{duration:0}:{type:"spring",stiffness:150,damping:18,velocity});
  },[clamp,onChange,pos,reduce]);
  const onDown=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    e.currentTarget.setPointerCapture(e.pointerId);pos.stop();down.current={x:e.clientX,p:pos.get(),t:performance.now(),v:0};setGrabbing(true);
  };
  const onMove=(e:React.PointerEvent)=>{
    const d=down.current;if(!d)return;
    const next=d.p-(e.clientX-d.x)/(w*.66),now=performance.now();
    d.v=(next-pos.get())/Math.max(1,now-d.t)*1000;d.t=now;
    pos.set(Math.max(-.4,Math.min(items.length-.6,next)));
  };
  const onUp=()=>{const d=down.current;down.current=null;setGrabbing(false);if(d)goTo(Math.round(pos.get()+d.v*.12),d.v);};
  const key=(e:React.KeyboardEvent)=>{
    if(e.key==="ArrowRight"){e.preventDefault();goTo(index+1);}else if(e.key==="ArrowLeft"){e.preventDefault();goTo(index-1);}
    else if(e.key==="Home"){e.preventDefault();goTo(0);}else if(e.key==="End"){e.preventDefault();goTo(items.length-1);}
    else if(e.key.toLowerCase()==="b")setFull(v=>!v);
  };
  const cur=items[index];
  if(!cur)return null;
  const btn="size-11 shrink-0 rounded-full p-0";
  return <section aria-roledescription="carousel" aria-label={title} className={cn(dark&&"dark","lens-reel relative w-full overflow-hidden bg-background text-foreground",className)}>
    <div className="relative flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex gap-1.5">
        <Button ref={overviewBtnRef} type="button" variant={overview?"default":"outline"} aria-label="Ver todas as telas" title="Ver todas as telas" aria-pressed={overview} onClick={()=>setOverview(v=>!v)} className={btn}><LayoutGrid aria-hidden="true" /></Button>
        <Button type="button" variant={full?"default":"outline"} aria-label="Ver estrutura" title="Ver estrutura" aria-pressed={full} onClick={()=>setFull(v=>!v)} className={btn}><Ruler aria-hidden="true" /></Button>
        <Button type="button" variant="outline" aria-pressed={dark} aria-label={dark?"Ativar tema claro":"Ativar tema escuro"} title={dark?"Ativar tema claro":"Ativar tema escuro"} onClick={()=>setDark(!dark)} className={btn}>{dark?<Sun aria-hidden="true" />:<Moon aria-hidden="true" />}</Button>
      </div>
    </div>
    <div className="relative">
      <div className={cn(overview&&"invisible")} {...(overview ? { inert: "" } : {})}>
        <div ref={wrap} tabIndex={0} role="group" aria-label="Telas do FinZap" onKeyDown={key} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={()=>{down.current=null;setGrabbing(false);goTo(index);}} className={cn("relative mt-3 touch-pan-y select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",grabbing?"cursor-grabbing":"cursor-grab")} style={{perspective:1000,height:w*H/W+28}}>
          <ul className="relative h-full" style={{transformStyle:"preserve-3d"}}>{items.map((item,i)=><Slide key={item.id} item={item} i={i} pos={pos} w={w} reduce={reduce} active={i===index} full={full} />)}</ul>
        </div>
        <div className="relative mt-2 flex items-start gap-2">
          <Button type="button" variant="outline" className={btn} aria-label="Tela anterior" disabled={index===0} onClick={()=>goTo(index-1)}><ChevronLeft aria-hidden="true" /></Button>
          <div className="min-w-0 flex-1 text-center" aria-live="polite">
            <span className="text-xs font-medium text-primary">{cur.tag}</span>
            <p className="text-sm font-semibold">{cur.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{cur.blurb}</p>
          </div>
          <Button type="button" variant="outline" className={btn} aria-label="Próxima tela" disabled={index===items.length-1} onClick={()=>goTo(index+1)}><ChevronRight aria-hidden="true" /></Button>
        </div>
        <div className="relative mt-2 flex justify-center">{items.map((item,i)=><Button key={item.id} type="button" variant="ghost" aria-label={`Tela ${i+1} de ${items.length}`} aria-current={i===index?"true":undefined} onClick={()=>goTo(i)} className="h-11 min-w-0 max-w-11 flex-1 p-0"><motion.span className={cn("block h-1.5 rounded-full",i===index?"bg-primary":"bg-border")} animate={{width:i===index?18:6}} transition={reduce?{duration:0}:{type:"spring",stiffness:400,damping:22}} /></Button>)}</div>
      </div>
      {overview&&<div ref={overviewRef} tabIndex={-1} role="group" aria-label="Todas as telas do FinZap" onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();closeOverview();}}} className="absolute inset-0 z-20 overflow-y-auto rounded-lg border border-border bg-background p-2 outline-none">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{items.map((item,i)=><Button key={item.id} type="button" variant="outline" onClick={()=>{goTo(i);closeOverview();}} aria-current={i===index?"true":undefined} className={cn("block h-auto overflow-hidden whitespace-normal rounded-lg p-0 text-left",i===index&&"border-primary ring-2 ring-primary/30")}>
          <div className="relative aspect-[300/190] w-full overflow-hidden"><Sketch item={item} wire={false} /></div>
          <div className="border-t border-border bg-card px-2.5 py-2"><span className="block text-xs font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{i+1}/{items.length}</span></div>
        </Button>)}</div>
      </div>}
    </div>
  </section>;
}