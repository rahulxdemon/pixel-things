import { createFileRoute } from '@tanstack/react-router';
import { Pause, Play, RotateCcw, Globe2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { CloudEarth, type EarthControls } from '@/components/cloud-earth';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';

export const Route = createFileRoute('/')({ component: Index });
function Index() {
  const controls = useRef<EarthControls>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  return <main className="earth-page" data-testid="earth-page">
    <header className="earth-header">
      <a href="/" className="earth-brand" data-testid="earth-brand"><Globe2 size={20} strokeWidth={1.3} /><span data-testid="earth-brand-name">little worlds.</span></a>
      <span className="earth-edition" data-testid="earth-edition">STUDY 03 — ATMOSPHERE</span>
    </header>
    <section className="earth-intro">
      <p className="earth-eyebrow" data-testid="earth-eyebrow">A PLANET MADE OF AIR</p>
      <h1 data-testid="earth-title">A world, softly.</h1>
      <p className="earth-description" data-testid="earth-description">Familiar shores. A different state of matter.</p>
    </section>
    <section className="earth-stage" aria-label="Rotating cloud Earth" data-testid="earth-stage"><CloudEarth controls={controls} /></section>
    <div className="earth-controls" role="group" aria-label="Globe playback" data-testid="earth-controls">
      <button type="button" aria-label={playing ? 'Pause rotation' : 'Resume rotation'} aria-pressed={!playing} data-testid="earth-play-btn" onClick={() => { controls.current?.setPlaying(!playing); setPlaying(!playing); }}>
        {playing ? <Pause size={14} /> : <Play size={14} />}<span data-testid="earth-play-label">{playing ? 'Pause' : 'Resume'}</span>
      </button>
      <span className="earth-control-divider" />
      <button type="button" aria-label="Restart globe rotation" data-testid="earth-reset-btn" onClick={() => controls.current?.reset()}><RotateCcw size={14} /></button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" aria-label="Choose rotation speed" data-testid="earth-speed-btn"><span data-testid="earth-speed-value">{speed}×</span></button></DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" data-testid="earth-speed-menu">
          <DropdownMenuRadioGroup value={String(speed)} onValueChange={value => { const next = Number(value); setSpeed(next); controls.current?.setSpeed(next); }} data-testid="earth-speed-options">
            {[.5, 1, 1.25, 1.5, 2].map((value, index) => <DropdownMenuRadioItem key={value} value={String(value)} data-testid={`earth-speed-${index}-option`}><span data-testid={`earth-speed-${index}-label`}>{value}×</span></DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <footer className="earth-footer"><span data-testid="earth-footer-caption">OCEAN BLUE · CLOUD WHITE · ALWAYS IN MOTION</span></footer>
  </main>;
}
