import { createFileRoute } from '@tanstack/react-router';
import { Pause, Play, RotateCcw, Maximize2, Minimize2, ArrowUpRight, Sun, PawPrint } from 'lucide-react';
import { useRef, useState } from 'react';
import { FetchScene, type SceneControls } from '@/components/fetch-scene';

export const Route = createFileRoute('/')({ component: Index });
function Index() {
  const controls = useRef<SceneControls>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [phase, setPhase] = useState('A little anticipation');
  const [expanded, setExpanded] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <main className={`little-world ${expanded ? 'expanded' : ''}`} data-testid="fetch-page">
      <header className="world-header">
        <a className="brand" href="/" data-testid="fetch-brand"><span className="brand-icon">✳</span><span data-testid="fetch-brand-name">little worlds<span className="brand-dot">.</span></span></a>
        <span className="header-note" data-testid="fetch-header-note">SMALL SCENES. SIMPLE JOYS.</span>
        <span className="edition" data-testid="fetch-edition">№ 001 <span> / </span> A GOOD AFTERNOON</span>
      </header>
      <section className="scene-intro">
        <div className="eyebrow" data-testid="fetch-eyebrow"><span /> A MOMENT, ON REPEAT</div>
        <h1 data-testid="fetch-title">Just one more throw<span>.</span></h1>
        <p data-testid="fetch-description">A boy, his best friend, and nowhere else to be.</p>
      </section>
      <section className="scene-card" aria-label="Animated pixel art of a boy playing fetch with a brown dog" data-testid="fetch-scene-card">
        <div className="scene-topline"><span className="scene-live" data-testid="fetch-playing-state"><i className={playing ? '' : 'paused'} />{playing ? 'A LITTLE WORLD, ALIVE' : 'TAKING A LITTLE BREAK'}</span><span className="weather" data-testid="fetch-weather"><Sun size={14} /> 24° · Always a good day</span></div>
        <FetchScene controls={controls} onPhase={setPhase} onCount={setCount} />
        <div className="scene-bottomline"><span className="scene-location" data-testid="fetch-location">SOMEWHERE CLOSE TO HOME</span><button className="expand-button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Exit expanded view' : 'Expand scene'} data-testid="fetch-expand-btn">{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></div>
      </section>
      <div className="playback-bar">
        <div className="playback-controls"><button className="play-button" aria-label={playing ? 'Pause animation' : 'Play animation'} data-testid="fetch-play-btn" onClick={() => { controls.current?.setPlaying(!playing); setPlaying(!playing); }}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}<span data-testid="fetch-play-label">{playing ? 'Pause' : 'Play'}</span></button><button className="reset-button" data-testid="fetch-reset-btn" aria-label="Restart scene" onClick={() => { controls.current?.reset(); setCount(0); }}><RotateCcw size={16} /></button><div className="control-divider" /><button className="speed-button" data-testid="fetch-speed-btn" aria-label="Change animation speed" onClick={() => { const next = speed === 1 ? 1.5 : speed === 1.5 ? 0.5 : 1; setSpeed(next); controls.current?.setSpeed(next); }}><span data-testid="fetch-speed-value">{speed}×</span><span className="speed-label">speed</span></button></div>
        <div className="phase" aria-live="polite"><span className="phase-dot" /><span data-testid="fetch-phase">{phase}</span></div><span className="loop-label" data-testid="fetch-loop-count">{String(count).padStart(2, '0')} FETCHES & COUNTING <span>↻</span></span>
      </div>
      <footer className="world-footer"><div className="dog-note"><span className="paw-icon"><PawPrint size={18} /></span><p data-testid="fetch-dog-note">No pedigree. All heart.<span>A little love letter to the Indian street dog.</span></p></div><span className="made-note" data-testid="fetch-made-note">Made of pixels & a little happiness <ArrowUpRight size={13} /></span></footer>
    </main>
  );
}
