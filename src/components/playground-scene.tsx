import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';

export interface PlaygroundControls {
  setPlaying: (value: boolean) => void;
  setSpeed: (value: number) => void;
  reset: () => void;
}
interface Props {
  controls: RefObject<PlaygroundControls | null>;
  onPhase: (phase: string) => void;
  onCount: (count: number) => void;
}

export function PlaygroundScene({ controls, onPhase, onCount }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false }); }
    catch { setError(true); return; }
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0xfdfefa, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Shizuka in a pink skirt with dark pigtails, swinging beside an empty swing and seesaw in a pixel playground');
    canvas.setAttribute('data-testid', 'playground-canvas');
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-8, 8, 5.8, -5.8, .1, 100);
    camera.position.set(9, 12, 17);
    camera.lookAt(0, .5, 0);
    scene.add(new THREE.AmbientLight(0xfff4df, 1.65));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.8);
    sun.position.set(-5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 30 });
    sun.shadow.normalBias = .025;
    scene.add(sun);

    const materials = new Map<number, THREE.MeshLambertMaterial>();
    const geometries = new Set<THREE.BufferGeometry>();
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const sphere = new THREE.SphereGeometry(1, 12, 8);
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
    geometries.add(cube); geometries.add(sphere); geometries.add(cylinder);
    function material(color: number) {
      if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color }));
      return materials.get(color)!;
    }
    function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: number, x: number, y: number, z: number, w: number, h: number, d: number) {
      const object = new THREE.Mesh(geometry, material(color));
      object.position.set(x, y, z); object.scale.set(w, h, d);
      object.castShadow = true; object.receiveShadow = true;
      parent.add(object); return object;
    }
    function box(parent: THREE.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d: number) {
      return mesh(parent, cube, color, x, y, z, w, h, d);
    }
    function round(parent: THREE.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d: number) {
      return mesh(parent, sphere, color, x, y, z, w, h, d);
    }
    function rod(parent: THREE.Object3D, color: number, from: number[], to: number[], radius: number) {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
      const direction = b.clone().sub(a);
      const center = a.clone().add(b).multiplyScalar(.5);
      const object = mesh(parent, cylinder, color, center.x, center.y, center.z, radius, direction.length(), radius);
      object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return object;
    }
    let seed = 926;
    function random() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
    const grass = [0x638737, 0x749344, 0x84a24b, 0x587b32, 0x96aa59];
    const sand = [0xc4b894, 0xcbbf9c, 0xd2c6a5, 0xc0b38f, 0xd5c9a8];
    // Nearest-filtered grains stay crisp at the scene's low rendering resolution.
    const sandPixels = new Uint8Array(4 * 4 * 4);
    const grainValues = [255, 236, 255, 250, 248, 255, 221, 255, 255, 244, 255, 231, 240, 255, 249, 255];
    grainValues.forEach((value, index) => sandPixels.set([value, value, value, 255], index * 4));
    const sandTexture = new THREE.DataTexture(sandPixels, 4, 4);
    sandTexture.colorSpace = THREE.SRGBColorSpace;
    sandTexture.magFilter = THREE.NearestFilter;
    sandTexture.minFilter = THREE.NearestFilter;
    sandTexture.generateMipmaps = false;
    sandTexture.needsUpdate = true;
    const sandMaterials = new Map<number, THREE.MeshLambertMaterial>();
    function texturedSand(color: number) {
      if (!sandMaterials.has(color)) sandMaterials.set(color, new THREE.MeshLambertMaterial({ color, map: sandTexture }));
      return sandMaterials.get(color)!;
    }
    // A rounded rectangular footprint, with a dithered edge rather than a hard slab.
    function roundedRect(x: number, z: number, width: number, depth: number, radius: number) {
      const dx = Math.abs(x) - (width - radius), dz = Math.abs(z) - (depth - radius);
      return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0) - radius;
    }
    for (let x = -5.5; x <= 5.5; x += .16) for (let z = -3.9; z <= 3.9; z += .16) {
      if (roundedRect(x, z, 5.2, 3.65, .55) > (random() - .5) * .24) continue;
      const border = roundedRect(x, z, 4.75, 3.2, .4) > (random() - .5) * .14;
      const worn = !border && ((x + 1.85) ** 2 / .4 + (z + 1) ** 2 / 2.2 < 1 || (x + .15) ** 2 / .4 + (z + 1) ** 2 / 2.2 < 1);
      const palette = border ? grass : sand;
      const patch = Math.sin(x * 1.8 + Math.sin(z * 1.3)) * Math.cos(z * 1.6 - x * .4);
      const sandIndex = THREE.MathUtils.clamp(Math.floor(2 + patch * 1.7 + (random() - .5) * 1.8), 0, sand.length - 1);
      const color = worn ? [0xb1a27e, 0xbcad89, 0xc2b38d][Math.floor(random() * 3)] : border ? palette[Math.floor(random() * palette.length)] : sand[sandIndex];
      const tile = box(scene, color, x, -.055 + random() * .012, z, .162, .11, .162);
      if (!border) tile.material = texturedSand(color);
      if (border && random() > .62) {
        box(scene, grass[Math.floor(random() * grass.length)], x, .05, z, .027, .08 + random() * .10, .027);
      } else if (!border && random() > .86) {
        const pebble = random();
        box(scene, pebble > .5 ? 0xab9976 : 0xe0d2b2,
          x + (random() - .5) * .09, .016, z + (random() - .5) * .09,
          .025 + pebble * .035, .015, .025 + random() * .035);
      }
    }
    // Tiny flowers and stones soften the perimeter without filling the play space.
    for (let i = 0; i < 28; i++) {
      const edge = i % 4;
      const x = edge < 2 ? (random() - .5) * 9 : (edge === 2 ? -4.95 : 4.95);
      const z = edge < 2 ? (edge === 0 ? -3.4 : 3.4) : (random() - .5) * 5.9;
      if (i % 3 === 0) {
        rod(scene, 0x587936, [x, 0, z], [x, .15, z], .014);
        round(scene, i % 2 ? 0xe9d698 : 0xf2e8cc, x, .16, z, .055, .025, .055);
      } else round(scene, 0xa6a18b, x, .025, z, .07, .035, .05);
    }

    const swingFrame = new THREE.Group(); swingFrame.position.set(-1, 0, -1); scene.add(swingFrame);
    const teal = 0x507c78, steel = 0x555c52, wood = 0x986440;
    for (const x of [-2.02, 2.02]) {
      for (const z of [-1.02, 1.02]) {
        rod(swingFrame, teal, [x, .06, z], [x, 2.8, 0], .065);
        mesh(swingFrame, cylinder, 0x9c9d8b, x, .03, z, .13, .07, .13);
      }
      rod(swingFrame, teal, [x, .95, -.69], [x, .95, .69], .04);
    }
    rod(swingFrame, teal, [-2.15, 2.8, 0], [2.15, 2.8, 0], .085);
    const swings: THREE.Group[] = [];
    for (const x of [-.85, .85]) {
      const pivot = new THREE.Group(); pivot.position.set(x, 2.76, 0); swingFrame.add(pivot);
      for (const side of [-.29, .29]) {
        rod(pivot, steel, [side, 0, 0], [side, -1.98, 0], .018);
        round(swingFrame, 0xc2b68c, x + side, 2.76, 0, .045, .045, .045);
      }
      box(pivot, wood, 0, -1.99, 0, .7, .075, .38);
      box(pivot, 0xb08053, 0, -1.947, .01, .64, .014, .32);
      swings.push(pivot);
    }

    // Rounded, small-scale cartoon silhouette: pink skirt and two dark pigtails.
    const girl = new THREE.Group(); girl.position.y = -1.94; girl.scale.setScalar(.88); swings[1].add(girl);
    const skin = 0xe9b995, pink = 0xe58fab, hair = 0x302831;
    round(girl, pink, 0, .38, 0, .20, .27, .135);
    round(girl, 0xf2b9cb, 0, .51, .01, .18, .14, .13);
    round(girl, skin, 0, .65, .015, .065, .075, .065);
    const skirtGeometry = new THREE.CylinderGeometry(.15, .29, .29, 12);
    geometries.add(skirtGeometry);
    const skirt = mesh(girl, skirtGeometry, 0xd96b93, 0, .16, .07, 1, 1, 1);
    skirt.rotation.x = -.22;
    // A few subdued panels suggest cloth folds without creating stripes.
    round(girl, 0xe37fa1, -.15, .12, .13, .11, .13, .16);
    round(girl, 0xe37fa1, .15, .12, .13, .11, .13, .16);
    const headPivot = new THREE.Group(); headPivot.position.y = .65; headPivot.scale.setScalar(.90); girl.add(headPivot);
    const head = new THREE.Group(); head.position.y = -.65; headPivot.add(head);
    round(head, hair, 0, .86, -.025, .235, .255, .205);
    round(head, skin, 0, .83, .075, .205, .215, .175);
    round(head, hair, 0, 1.015, .035, .22, .11, .18);
    for (const x of [-.12, -.04, .055, .145]) round(head, hair, x, .967 + Math.abs(x) * .12, .18, .055, .09, .045);
    const pigtails: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      round(head, skin, side * .205, .82, .035, .045, .065, .045);
      round(head, 0xef9fba, side * .225, .90, -.035, .045, .047, .045);
      const pigtail = new THREE.Group(); pigtail.position.set(side * .24, .89, -.07); head.add(pigtail);
      const tuft = round(pigtail, hair, side * .055, -.085, -.025, .075, .16, .075); tuft.rotation.z = side * .45;
      round(pigtail, hair, side * .09, -.20, -.015, .045, .075, .05);
      pigtails.push(pigtail);
      round(head, 0x332b2d, side * .075, .85, .237, .016, .022, .013);
      round(head, 0xd6877a, side * .12, .795, .217, .025, .012, .008);
      // Hands remain on the chains throughout the pendulum motion.
      round(girl, pink, side * .19, .48, 0, .075, .11, .08);
      rod(girl, skin, [side * .20, .44, .015], [side * .25, .33, .075], .043);
      rod(girl, skin, [side * .25, .33, .075], [side * (.29 / girl.scale.x), .51, 0], .037);
      round(girl, skin, side * (.29 / girl.scale.x), .51, 0, .046, .055, .043);
    }
    round(head, 0xb8726a, 0, .75, .23, .028, .009, .008);
    const lowerLegs: THREE.Group[] = [];
    for (const x of [-.11, .11]) {
      rod(girl, skin, [x, .08, .08], [x, .015, .31], .058);
      const knee = new THREE.Group(); knee.position.set(x, .015, .31); girl.add(knee);
      round(knee, skin, 0, 0, 0, .058, .058, .058);
      rod(knee, skin, [0, 0, 0], [0, -.28, .015], .047);
      rod(knee, 0xf2e7d8, [0, -.22, .015], [0, -.31, .02], .05);
      round(knee, 0x9d354f, 0, -.33, .065, .067, .055, .12);
      lowerLegs.push(knee);
    }

    const seesaw = new THREE.Group(); seesaw.position.set(1.5, 0, 1.75); seesaw.rotation.y = -.18; scene.add(seesaw);
    for (const z of [-.28, .28]) {
      rod(seesaw, teal, [-.37, .06, z], [0, .57, z], .055);
      rod(seesaw, teal, [.37, .06, z], [0, .57, z], .055);
    }
    rod(seesaw, steel, [0, .57, -.35], [0, .57, .35], .075);
    const plank = new THREE.Group(); plank.position.y = .61; plank.rotation.z = -.11; seesaw.add(plank);
    box(plank, 0xb58a4f, 0, 0, 0, 3.25, .10, .28);
    for (const side of [-1, 1]) {
      box(plank, 0xb25f4e, side * 1.31, .075, 0, .46, .075, .40);
      rod(plank, teal, [side * 1.04, .08, 0], [side * 1.04, .39, 0], .035);
      rod(plank, teal, [side * 1.04, .39, -.17], [side * 1.04, .39, .17], .032);
    }
    // A quiet bench at the back, sized like the small props in the reference.
    const bench = new THREE.Group(); bench.position.set(3.35, 0, -2.3); bench.rotation.y = -.18; scene.add(bench);
    for (const x of [-.63, .63]) {
      for (const z of [-.17, .17]) rod(bench, steel, [x, 0, z], [x, .42, z], .04);
      rod(bench, steel, [x, .35, -.19], [x, .82, -.23], .035);
    }
    for (const z of [-.15, 0, .15]) box(bench, 0xa97a4e, 0, .44, z, 1.6, .055, .12);
    for (const y of [.62, .77]) box(bench, 0xaf8459, 0, y, -.22, 1.6, .11, .055);
    for (let i = 0; i < 4; i++) round(scene, 0xb0ad96, -3.7 + i * .23, .025, 2.75 - i * .45, .25, .045, .17);

    // Static ground pixels share draw calls; character joints stay independent.
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const object of [...scene.children]) {
      if (object instanceof THREE.Mesh && object.geometry === cube) {
        const mat = object.material as THREE.Material;
        const batch = batches.get(mat) ?? []; batch.push(object); batches.set(mat, batch);
      }
    }
    for (const [mat, objects] of batches) {
      const instances = new THREE.InstancedMesh(cube, mat, objects.length);
      objects.forEach((object, index) => { object.updateMatrix(); instances.setMatrixAt(index, object.matrix); scene.remove(object); });
      instances.castShadow = true; instances.receiveShadow = true; scene.add(instances);
    }
    const resize = () => {
      const width = container.clientWidth, height = container.clientHeight;
      renderer.setSize(Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2)), false);
      const halfHeight = Math.max(5.35, 6.5 / (width / Math.max(height, 1)));
      camera.left = -halfHeight * width / height; camera.right = -camera.left;
      camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    let playing = true, speed = 1, elapsed = 0, last = performance.now(), frame = 0, lastCount = -1, lastPhase = '';
    const period = 4.2;
    controls.current = { setPlaying: value => { playing = value; }, setSpeed: value => { speed = value; }, reset: () => { elapsed = 0; } };
    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      const delta = Math.min((now - last) / 1000, .05); last = now;
      if (playing) elapsed += delta * speed;
      const cycle = elapsed / period * Math.PI * 2;
      swings[1].rotation.x = Math.sin(cycle) * .48;
      lowerLegs.forEach((leg, index) => { leg.rotation.x = -.16 - .24 * Math.cos(cycle + index * .08); });
      pigtails.forEach((pigtail, index) => { pigtail.rotation.x = Math.sin(cycle - .5) * .13; pigtail.rotation.z = Math.sin(cycle + index) * .045; });
      const count = Math.floor(elapsed / period);
      const phase = Math.cos(cycle) >= 0 ? 'A little closer to the sky' : 'And softly back again';
      if (count !== lastCount) { onCount(count); lastCount = count; }
      if (phase !== lastPhase) { onPhase(phase); lastPhase = phase; }
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.current = null;
      scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(mat => mat.dispose());
      sandMaterials.forEach(mat => mat.dispose()); sandTexture.dispose();
      renderer.dispose(); canvas.remove();
    };
  }, [controls, onPhase, onCount]);
  return <div className="scene-viewport playground-viewport" ref={host} data-testid="playground-viewport">{error && <p className="scene-error" data-testid="playground-error">This little world needs WebGL. Please enable hardware acceleration and reload.</p>}</div>;
}
