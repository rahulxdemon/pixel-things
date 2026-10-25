import { createFileRoute } from '@tanstack/react-router';
import { Pause, Play, RotateCcw, Maximize2, Minimize2, ArrowUpRight, Sun, Flower2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { PlaygroundScene, type PlaygroundControls } from '@/components/playground-scene';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';

const playbackSpeeds = [0.5, 1, 1.1, 1.2, 1.25, 1.3, 1.4, 1.5];

export const Route = createFileRoute('/')({ component: Index });
function Index() {
  const controls = useRef<PlaygroundControls>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [phase, setPhase] = useState('A little closer to the sky');
  const [expanded, setExpanded] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <main className={`little-world ${expanded ? 'expanded' : ''}`} data-testid="playground-page">
      <header className="world-header">
        <a className="brand" href="/" data-testid="playground-brand"><span className="brand-icon">✳</span><span data-testid="playground-brand-name">little worlds<span className="brand-dot">.</span></span></a>
        <span className="header-note" data-testid="playground-header-note">SMALL SCENES. SIMPLE JOYS.</span>
        <span className="edition" data-testid="playground-edition">№ 002 <span> / </span> AFTER SCHOOL</span>
      </header>
      <section className="scene-intro">
        <div className="eyebrow" data-testid="playground-eyebrow"><span /> A MOMENT, ON REPEAT</div>
        <h1 data-testid="playground-title">A little closer to the sky<span>.</span></h1>
        <p data-testid="playground-description">An empty playground, a familiar swing, and an afternoon all her own.</p>
      </section>
      <section className="scene-card" aria-label="Animated pixel playground with Shizuka on a swing, an empty second swing, and an unused seesaw" data-testid="playground-scene-card">
        <div className="scene-topline"><span className="scene-live" data-testid="playground-playing-state"><i className={playing ? '' : 'paused'} />{playing ? 'A LITTLE WORLD, ALIVE' : 'TAKING A LITTLE BREAK'}</span><span className="weather" data-testid="playground-weather"><Sun size={14} /> 24° · Always a good day</span></div>
        <PlaygroundScene controls={controls} onPhase={setPhase} onCount={setCount} />
        <div className="scene-bottomline"><span className="scene-location" data-testid="playground-location">SOMEWHERE CLOSE TO HOME</span><button className="expand-button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Exit expanded view' : 'Expand scene'} data-testid="playground-expand-btn">{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></div>
      </section>
      <div className="playback-bar">
        <div className="playback-controls"><button className="play-button" aria-label={playing ? 'Pause animation' : 'Play animation'} data-testid="playground-play-btn" onClick={() => { controls.current?.setPlaying(!playing); setPlaying(!playing); }}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}<span data-testid="playground-play-label">{playing ? 'Pause' : 'Play'}</span></button><button className="reset-button" data-testid="playground-reset-btn" aria-label="Restart scene" onClick={() => { controls.current?.reset(); setCount(0); }}><RotateCcw size={16} /></button><div className="control-divider" /><DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="speed-button" data-testid="playground-speed-btn" aria-label="Choose animation speed">
              <span data-testid="playground-speed-value">{speed}×</span><span className="speed-label" data-testid="playground-speed-label">speed ▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" aria-label="Animation speed" data-testid="playground-speed-menu">
            <DropdownMenuRadioGroup value={String(speed)} onValueChange={(value) => { const next = Number(value); setSpeed(next); controls.current?.setSpeed(next); }} data-testid="playground-speed-options">
              {playbackSpeeds.map((value, index) => (
                <DropdownMenuRadioItem key={value} value={String(value)} data-testid={`playground-speed-${index}-option`}>
                  <span data-testid={`playground-speed-${index}-label`}>{value}×</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu></div>
        <div className="phase" aria-live="polite"><span className="phase-dot" /><span data-testid="playground-phase">{phase}</span></div><span className="loop-label" data-testid="playground-loop-count">{String(count).padStart(2, '0')} SWINGS & COUNTING <span>↻</span></span>
      </div>
      <footer className="world-footer"><div className="dog-note"><span className="paw-icon"><Flower2 size={18} /></span><p data-testid="playground-dog-note">A little after-school daydream.<span>Pink skirts, quiet corners, and simple joys.</span></p></div><span className="made-note" data-testid="playground-made-note">Made of pixels & a little happiness <ArrowUpRight size={13} /></span></footer>
    </main>
  );
}
