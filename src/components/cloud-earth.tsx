import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';

export interface EarthControls {
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
}
interface Props { controls: RefObject<EarthControls | null> }
type Ring = [number, number][];
interface LandCollection {
  features: { geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] } }[];
}

// Natural Earth 1:110m land polygons, public domain. See public/earth-land.README.md.
async function makeLandTexture(signal: AbortSignal) {
  const response = await fetch(`${import.meta.env.BASE_URL}earth-land.geojson`, { signal });
  if (!response.ok) throw new Error('Unable to load continent outlines');
  const data: LandCollection = await response.json();
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  for (const feature of data.features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const rings of polygons) {
      // Wrapped copies keep island groups continuous across the date line.
      for (const offset of [-360, 0, 360]) {
        context.beginPath();
        for (const ring of rings) {
          let previousLongitude = ring[0][0];
          ring.forEach(([longitude, latitude], index) => {
            while (longitude - previousLongitude > 180) longitude -= 360;
            while (longitude - previousLongitude < -180) longitude += 360;
            previousLongitude = longitude;
            const x = (longitude + offset + 180) / 360 * canvas.width;
            const y = (90 - latitude) / 180 * canvas.height;
            if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
          });
          context.closePath();
        }
        context.fill('evenodd');
      }
    }
  }
  const soft = document.createElement('canvas'); soft.width = canvas.width; soft.height = canvas.height;
  const blurred = soft.getContext('2d');
  if (!blurred) throw new Error('Canvas is unavailable');
  blurred.fillStyle = '#000'; blurred.fillRect(0, 0, soft.width, soft.height);
  blurred.filter = 'blur(5px)';
  for (const x of [-canvas.width, 0, canvas.width]) blurred.drawImage(canvas, x, 0);
  const texture = new THREE.CanvasTexture(soft);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uLand;
  uniform float uTime;
  uniform float uAspect;
  const float PI = 3.14159265359;
  float hash(vec3 p) {
    p = fract(p * .3183099 + vec3(.11, .23, .37));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                   mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                   mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float value = 0.0, amplitude = .55;
    for (int i = 0; i < 4; i++) {
      value += noise(p) * amplitude;
      p = p * 2.03 + vec3(7.1, 3.2, 5.6);
      amplitude *= .48;
    }
    return value;
  }
  vec2 geography(vec3 n) {
    return vec2(atan(n.x, n.z)/(2.0*PI)+.5, asin(clamp(n.y,-1.0,1.0))/PI+.5);
  }
  vec3 flowingDomain(vec3 p, float time) {
    // Large, continuous folds produce slow liquid motion, not granular cloud noise.
    p += .42*vec3(sin(p.y*1.35+time*.23),
                  sin(p.z*1.15-time*.19),
                  sin(p.x*1.25+time*.16));
    float twist = .55*sin(p.y*.9-time*.14);
    p.xz = mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*p.xz;
    return p;
  }
  void main() {
    vec2 p = (vUv-.5)*2.0*vec2(uAspect,1.0)/(min(1.0,uAspect)*.78*.60);
    float radius = length(p);
    if (radius > 1.15) discard;
    float z = sqrt(max(0.0, 1.0-dot(p,p)));
    vec3 surface = normalize(vec3(p,z));
    // A small axial tilt; geographic coordinates rotate while the silhouette stays round.
    float tilt = -.13;
    vec3 tilted = vec3(cos(tilt)*surface.x-sin(tilt)*surface.y,
                       sin(tilt)*surface.x+cos(tilt)*surface.y,surface.z);
    float rotation = .30 + uTime*.075;
    vec3 earth = vec3(cos(rotation)*tilted.x+sin(rotation)*tilted.z,
                      tilted.y,-sin(rotation)*tilted.x+cos(rotation)*tilted.z);
    vec3 drift = vec3(uTime*.025, -uTime*.017, uTime*.012);
    float billow = fbm(earth*5.0+drift);
    vec3 flow = flowingDomain(earth*2.0,uTime);
    vec3 displacement = vec3(sin(flow.y+uTime*.12),
                             sin(flow.z-uTime*.10),
                             sin(flow.x+uTime*.08));
    // Geography remains anchored to the rotating globe; only small eddies bend it.
    vec2 uv = geography(normalize(earth+displacement*.018));
    float land = texture2D(uLand, uv).r;
    // Soft shoulders around the main cloud masses keep coastlines recognizable.
    float fringe = (texture2D(uLand,uv+vec2(.004,0)).r + texture2D(uLand,uv-vec2(.004,0)).r
                  + texture2D(uLand,uv+vec2(0,.007)).r + texture2D(uLand,uv-vec2(0,.007)).r)*.25;
    float continent = smoothstep(.035,.82,land);
    // Broad white folds travel through every continent, like a gently moving orb.
    // A continuous white foundation prevents isolated blue holes in the land.
    float fold = sin(flow.y*1.7+flow.x*.55+flow.z*.35
                    +1.25*sin(flow.x*1.1-flow.z*.7+uTime*.18)-uTime*.26);
    float swell = sin(flow.x*.8-flow.y*.55+flow.z*1.2+uTime*.13);
    float flowingWhite = .58+.42*smoothstep(-.85,.65,fold+swell*.24);
    float cloud = max(continent*flowingWhite,fringe*.10);
    float light = .94+.07*dot(surface,normalize(vec3(-.45,.65,1.0)));
    vec3 ocean = vec3(.405,.625,.855)*light;
    ocean += vec3(.018,.026,.035)*(billow-.45);
    ocean = mix(ocean,vec3(.65,.81,.93),pow(1.0-z,3.0)*.13);
    // Pure white is the moving medium; its smoothly varying depth reveals blue.
    vec3 color = mix(ocean,vec3(1.0),cloud);
    // A translucent, noisy boundary, not a hard sphere rim or a solid halo.
    float edgeNoise = fbm(vec3(p*7.0,uTime*.035));
    float edge = 1.0 + (edgeNoise-.5)*.035;
    float alpha = 1.0-smoothstep(edge-.055,edge+.045,radius);
    float mist = (1.0-smoothstep(.99,1.115,radius))*smoothstep(.94,1.025,radius);
    alpha = clamp(alpha+mist*(.12+.16*edgeNoise),0.0,1.0);
    gl_FragColor = vec4(color,alpha);
  }
`;

export function CloudEarth({ controls }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    const abort = new AbortController();
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch { setStatus('error'); return; }
    renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'A rotating soft blue Earth with white cloud-shaped continents and a drifting translucent atmosphere');
    canvas.setAttribute('data-testid', 'earth-canvas');
    container.appendChild(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2); camera.position.z = 1;
    const uniforms = { uLand: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uAspect: { value: 1 } };
    const material = new THREE.ShaderMaterial({
      uniforms, fragmentShader,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const globe = new THREE.Mesh(geometry, material); globe.visible = false; scene.add(globe);
    let playing = true, speed = 1, elapsed = 0, frame = 0, last = performance.now();
    controls.current = { setPlaying: value => { playing = value; }, setSpeed: value => { speed = value; }, reset: () => { elapsed = 0; } };
    const resize = () => {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false); uniforms.uAspect.value = width / height;
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    void makeLandTexture(abort.signal).then(texture => {
      if (abort.signal.aborted) { texture.dispose(); return; }
      uniforms.uLand.value = texture; globe.visible = true; setStatus('ready');
    }).catch(() => { if (!abort.signal.aborted) setStatus('error'); });
    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      const delta = Math.min((now-last)/1000, .05); last = now;
      if (playing) elapsed += delta * speed;
      uniforms.uTime.value = elapsed;
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      abort.abort(); cancelAnimationFrame(frame); observer.disconnect(); controls.current = null;
      uniforms.uLand.value?.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); canvas.remove();
    };
  }, [controls]);
  return <div ref={host} className="earth-viewport" data-testid="earth-viewport">
    {status === 'loading' && <p className="earth-status" role="status" data-testid="earth-loading">Gathering the atmosphere…</p>}
    {status === 'error' && <p className="earth-status" role="alert" data-testid="earth-error">Unable to render this world. Please check your connection and WebGL support, then reload.</p>}
  </div>;
}
