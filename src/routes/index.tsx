import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { ArrowUpRight, Moon, Pause, Play, RotateCcw, Sun } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/')({ component: Index });

// Simplified coastlines keep the globe independent of external image services.
const land: number[][][] = [
  [[-168,70],[-145,72],[-130,65],[-125,55],[-110,50],[-100,50],[-95,55],[-80,50],[-65,50],[-60,45],[-75,35],[-82,25],[-97,18],[-105,23],[-115,30],[-125,40],[-135,55],[-160,60]],
  [[-82,12],[-75,8],[-65,10],[-52,4],[-48,-5],[-35,-10],[-40,-22],[-50,-30],[-55,-40],[-68,-55],[-75,-45],[-72,-30],[-80,-15]],
  [[-55,60],[-45,60],[-25,70],[-20,80],[-42,84],[-60,78],[-72,70]],
  [[-18,35],[-5,37],[10,36],[25,32],[33,22],[42,12],[50,10],[44,-12],[35,-20],[30,-30],[18,-35],[10,-30],[4,-20],[-5,-5],[-15,5],[-18,20]],
  [[-10,36],[-10,45],[-5,50],[5,55],[15,55],[20,60],[30,60],[35,70],[55,72],[70,70],[85,72],[100,70],[120,65],[145,60],[170,65],[180,58],[170,50],[155,48],[145,40],[135,35],[125,30],[120,20],[110,15],[105,5],[100,10],[95,20],[85,20],[78,8],[72,18],[60,25],[50,28],[45,40],[35,42],[30,35],[20,40],[10,38],[0,43]],
  [[112,-11],[125,-12],[136,-15],[145,-14],[153,-25],[150,-35],[138,-39],[125,-35],[114,-30]],
  [[47,-13],[50,-18],[49,-26],[44,-24]], [[130,31],[136,34],[140,40],[145,44],[142,34]], [[-8,50],[-5,58],[0,59],[2,52]],
  [[95,5],[105,3],[115,-5],[120,-8],[110,-9],[100,-3]], [[120,18],[125,14],[126,7],[122,5]], [[-180,-70],[-120,-72],[-60,-70],[0,-72],[60,-70],[120,-72],[180,-70],[180,-90],[-180,-90]],
];
function inside(lon: number, lat: number, polygon: number[][]) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
function Globe({ playing, resetKey, dark, characterSet }: { playing: boolean; resetKey: number; dark: boolean; characterSet: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const angle = useRef(0.35);
  useEffect(() => { angle.current = 0.35; }, [resetKey]);
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    let frame = 0; let previous = 0;
    const draw = (time: number) => {
      const rect = el.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * dpr); const height = Math.round(rect.height * dpr);
      if (el.width !== width || el.height !== height) { el.width = width; el.height = height; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
      if (playing && previous) angle.current += Math.min((time - previous) / 1000, 0.05) * 0.105;
      previous = time;
      const radius = Math.min(rect.width * .43, rect.height * .46, 270);
      const step = Math.max(5, radius / 49); const centerX = rect.width / 2; const centerY = rect.height / 2;
      ctx.font = `${step * 1.15}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const p = new Vector3();
      for (let y = -radius; y <= radius; y += step) for (let x = -radius; x <= radius; x += step) {
        const nx = x / radius; const ny = -y / radius; const rr = nx * nx + ny * ny;
        if (rr > 1) continue;
        const z = Math.sqrt(1 - rr);
        p.set(nx, ny, z).applyAxisAngle(new Vector3(1, 0, 0), -0.12).applyAxisAngle(new Vector3(0, 1, 0), angle.current);
        const lat = Math.asin(p.y) * 180 / Math.PI; const lon = Math.atan2(p.x, p.z) * 180 / Math.PI;
        const isLand = land.some(poly => inside(lon, lat, poly));
        const light = Math.max(0, Math.min(1, .48 + nx * -.22 + ny * .3 + z * .26));
        const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (!isLand && noise > .76 + z * .18) continue;
        const sets: Record<string, [string, string, string]> = { classic: ['▓▒+=*', '▒+=:.', '··.:'], soft: ['▒+=:.', '+=:..', '··..'], bold: ['▓▓▒+=', '▓▒+=:', '·.::'], symbols: ['@#$%&', '#$%&+', '··.:'] };
        const palette = sets[characterSet];
        const chars = isLand ? (light > .7 ? palette[0] : palette[1]) : palette[2];
        const char = chars[Math.min(chars.length - 1, Math.floor(noise * chars.length))];
        const alpha = isLand ? .45 + light * .48 : .18 + light * .22;
        ctx.fillStyle = dark ? `rgba(235,235,230,${alpha})` : `rgba(25,25,23,${alpha})`;
        ctx.fillText(char, centerX + x, centerY + y);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, [playing, dark, characterSet]);
  return <canvas ref={canvas} className="globe-canvas" aria-label="An ASCII rendering of the rotating Earth" data-testid="earth-globe-canvas" />;
}
function Index() {
  const [dark, setDark] = useState(true); const [playing, setPlaying] = useState(true); const [resetKey, setResetKey] = useState(0); const [characterSet, setCharacterSet] = useState('classic');
  return <main className={`app ${dark ? 'dark-mode' : 'light-mode'}`}>
    <header className="header"><a className="wordmark" href="/" data-testid="earth-home-link"><span className="brand-symbol">✳</span> EARTH<span className="brand-divider">/</span>ASCII</a><div className="header-right"><span className="header-caption" data-testid="earth-header-caption">A SMALL DIGITAL EXPERIMENT</span><button className="theme-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} data-testid="earth-theme-toggle">{dark ? <Sun size={16}/> : <Moon size={16}/>}<span>{dark ? 'LIGHT MODE' : 'DARK MODE'}</span></button></div></header>
    <section className="intro"><div className="eyebrow"><span className="status-dot"/> AN EXPLORATION IN CHARACTERS <span className="intro-number"> / 001</span></div><h1 data-testid="earth-title">A world made of <em>type.</em></h1><p data-testid="earth-description">One planet. Thousands of characters. Always in motion.</p></section>
    <section className="viewer" aria-label="Interactive Earth visualization"><div className="viewer-top"><span><i className={playing ? 'live-dot' : 'live-dot paused'}/><span data-testid="earth-motion-status">{playing ? 'LIVE RENDER' : 'PAUSED'}</span></span><span data-testid="earth-projection-label">ORTHOGRAPHIC PROJECTION</span></div><div className="globe-wrap"><Globe playing={playing} resetKey={resetKey} dark={dark} characterSet={characterSet}/><span className="crosshair crosshair-left">+</span><span className="crosshair crosshair-right">+</span></div><div className="viewer-bottom"><span>FIG. 01 <span className="muted"> / </span> PLANET EARTH</span><span>ASCII STUDY <span className="muted">©</span> 2026</span></div></section>
    <section className="control-bar"><div className="controls"><button className="play-button" onClick={() => setPlaying(!playing)} data-testid="earth-play-pause-btn">{playing ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}<span>{playing ? 'Pause rotation' : 'Resume rotation'}</span></button><button className="reset-button" onClick={() => setResetKey(v => v + 1)} data-testid="earth-reset-btn"><RotateCcw size={14}/><span>Reset view</span></button><div className="character-picker"><span data-testid="earth-character-set-label">CHARACTERS</span><Select value={characterSet} onValueChange={setCharacterSet}><SelectTrigger className="character-select" aria-label="Characters" data-testid="earth-character-set-select"><SelectValue /></SelectTrigger><SelectContent className={`character-select-content ${dark ? "character-select-dark" : "character-select-light"}`} position="popper"><SelectItem value="classic" data-testid="earth-character-set-classic">Classic</SelectItem><SelectItem value="soft" data-testid="earth-character-set-soft">Soft</SelectItem><SelectItem value="bold" data-testid="earth-character-set-bold">Bold</SelectItem><SelectItem value="symbols" data-testid="earth-character-set-symbols">Symbols</SelectItem></SelectContent></Select></div></div><div className="control-note"><span className="small-dot"/> ROTATING ON ITS AXIS <span className="control-line"/> <span>REAL-TIME RENDER</span></div></section>
    <footer className="footer"><div><span className="footer-label">A LITTLE PERSPECTIVE</span><p data-testid="earth-footer-copy">A familiar place, seen differently.</p></div><div className="footer-right">MADE OF DOTS, LINES & A LITTLE WONDER <ArrowUpRight size={14}/></div></footer>
  </main>;
}
