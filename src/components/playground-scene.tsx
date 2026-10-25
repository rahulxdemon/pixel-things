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
    canvas.setAttribute('aria-label', 'Shizuka in a pink skirt with dark pigtails, swinging beside an empty swing, seesaw, and sandbox on a stone-paved pixel playground');
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
    const sandPixels = new Uint8Array(16 * 16 * 4);
    let grainSeed=739;
    for(let pixel=0;pixel<256;pixel++) {
      grainSeed=grainSeed*16807%2147483647;
      const value=grainSeed%11===0?215:239+grainSeed%17;
      sandPixels.set([value,value,value,255],pixel*4);
    }
    const sandTexture = new THREE.DataTexture(sandPixels, 16, 16);
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
      const color = border ? grass[Math.floor(random() * grass.length)] : 0x82796b;
      box(scene, color, x, -.07, z, .162, .11, .162);
      if (border && random() > .62) {
        box(scene, grass[Math.floor(random() * grass.length)], x, .04, z, .027, .08 + random() * .10, .027);
      }
    }
    // Lighter limestone branches connect the entry to each piece of equipment.
    const paths = [
      [[-.8,3.15],[-.8,.65]],
      [[-.8,1.8],[-2.35,1.8]], // sandbox entrance
      [[-.8,.65],[-1,.1]], // swing approach
      [[-.8,.65],[1.5,.65]],
      [[1.5,.65],[1.5,1.1]], // seesaw approach
      [[1.5,.65],[2.5,.35]],
      [[2.5,.35],[3.35,-1.8]], // bench approach
    ];
    function onPath(x: number, z: number) {
      return paths.some(([a,b]) => {
        const dx=b[0]-a[0], dz=b[1]-a[1];
        const u=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
        return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<.30;
      });
    }
    const stoneShades=[0xa99b86,0xb5a58f,0xbdae98,0xa99c8c,0xb0a08b];
    const pathShades=[0xd0cbbb,0xc8c4b6,0xd7d1c0,0xc9c8bc];
    // Small flat pavers in alternating pairs, with recessed joints like the reference.
    for(let row=0;row<18;row++) for(let column=0;column<27;column++) {
      const cellX=-4.68+column*.36, cellZ=-3.06+row*.36;
      const horizontal=(row+column)%2===0;
      for(const offset of [-.09,.09]) {
        const x=cellX+(horizontal?0:offset), z=cellZ+(horizontal?offset:0);
        const width=horizontal?.335:.155, depth=horizontal?.155:.335;
        if(roundedRect(Math.abs(x)+width/2,Math.abs(z)+depth/2,4.75,3.2,.4)>0) continue;
        const palette=onPath(x,z)?pathShades:stoneShades;
        const color=palette[Math.floor(random()*palette.length)];
        box(scene,color,x,-.014+random()*.004,z,width,.055,depth);
        if(random()>.76) {
          box(scene,onPath(x,z)?0xb9b7a9:0x978b79,x+(random()-.5)*width*.55,.017,z+(random()-.5)*depth*.55,.025,.003,.022);
        }
      }
    }
    // A separate timber-edged sandbox keeps the grainy sand in one small play area.
    const sandboxX=-3.3, sandboxZ=1.8;
    box(scene,0x886346,sandboxX,.085,sandboxZ-.77,1.92,.19,.15);
    box(scene,0x886346,sandboxX,.085,sandboxZ+.77,1.92,.19,.15);
    box(scene,0x9c7751,sandboxX-.885,.085,sandboxZ,.15,.19,1.4);
    box(scene,0x9c7751,sandboxX+.885,.085,sandboxZ,.15,.19,1.4);
    for(let ix=0;ix<22;ix++) for(let iz=0;iz<18;iz++) {
      const dx=-.772+ix*.0735, dz=-.6375+iz*.075;
      const mound=Math.exp(-((dx-.2)**2+(dz+.2)**2)/.10)*.035;
      const ripple=Math.sin(dx*9+Math.cos(dz*7))*.004;
      const color=sand[THREE.MathUtils.clamp(Math.floor(2+Math.sin(dx*4+dz*2)*1.2+(random()-.5)*.8),0,4)];
      const tile=box(scene,color,sandboxX+dx,.03+mound+ripple,sandboxZ+dz,.075,.055,.077);
      tile.material=texturedSand(color);
      if(random()>.86) box(scene,random()>.5?0xe8d9b6:0xb6a47e,sandboxX+dx,.061+mound+ripple,sandboxZ+dz,.018,.004,.022);
    }
    for(const x of [-.885,.885]) for(const z of [-.77,.77]) {
      box(scene,0xb28c62,sandboxX+x,.19,sandboxZ+z,.19,.04,.19);
    }
    const toys=new THREE.Group(); toys.position.set(sandboxX,0,sandboxZ); scene.add(toys);
    function ring(parent: THREE.Object3D, color: number, radius: number, tube: number, x: number, y: number, z: number, arc=Math.PI*2) {
      const geometry=new THREE.TorusGeometry(radius,tube,6,16,arc);geometries.add(geometry);
      return mesh(parent,geometry,color,x,y,z,1,1,1);
    }
    // Open bucket with a thick rim and an upright carry handle.
    const bucket=new THREE.Group();bucket.position.set(-.52,.06,-.32);toys.add(bucket);
    const bucketGeometry=new THREE.CylinderGeometry(.13,.095,.23,12);geometries.add(bucketGeometry);
    mesh(bucket,bucketGeometry,0x559eaa,0,.115,0,1,1,1);
    mesh(bucket,cylinder,0x386872,0,.232,0,.112,.006,.112);
    ring(bucket,0x78bec3,.123,.018,0,.235,0).rotation.x=Math.PI/2;
    ring(bucket,0xe7c56c,.14,.014,0,.23,0,Math.PI);
    // A short shovel and a rake lying naturally on the sand.
    const shovel=new THREE.Group();shovel.position.set(-.47,.075,.28);shovel.rotation.y=-.45;toys.add(shovel);
    rod(shovel,0xe3b45b,[0,0,-.19],[0,0,.12],.023);
    const grip=ring(shovel,0xc66c50,.055,.014,0,0,-.22);grip.rotation.x=Math.PI/2;
    round(shovel,0xc66c50,0,0,.18,.075,.02,.105);
    const rake=new THREE.Group();rake.position.set(.57,.075,.04);rake.rotation.y=.32;toys.add(rake);
    rod(rake,0x7b9c6d,[0,0,-.18],[0,0,.15],.02);
    rod(rake,0x609080,[-.10,0,.16],[.10,0,.16],.018);
    for(const x of [-.09,-.045,0,.045,.09]) rod(rake,0x609080,[x,0,.16],[x,0,.25],.012);
    // Two colorful molds and a small castle made from packed, textured sand.
    const starShape=new THREE.Shape();
    for(let point=0;point<10;point++) {
      const angle=point*Math.PI/5, radius=point%2?.055:.10;
      const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
      if(point===0) starShape.moveTo(x,y); else starShape.lineTo(x,y);
    }
    starShape.closePath();
    const starGeometry=new THREE.ExtrudeGeometry(starShape,{depth:.035,bevelEnabled:false});geometries.add(starGeometry);
    const star=mesh(toys,starGeometry,0xe0b857,.16,.07,.46,1,1,1);star.rotation.x=-Math.PI/2;
    mesh(toys,cylinder,0xc68492,.49,.095,.47,.085,.055,.085);
    ring(toys,0xe1a1ad,.085,.012,.49,.126,.47).rotation.x=Math.PI/2;
    const castle=new THREE.Group();castle.position.set(.13,.075,-.26);toys.add(castle);
    box(castle,0xbca47b,0,.08,0,.31,.16,.25).material=texturedSand(0xbca47b);
    for(const x of [-.16,.16]) {
      mesh(castle,cylinder,0xcbb58b,x,.12,0,.09,.24,.09).material=texturedSand(0xcbb58b);
      for(const [dx,dz] of [[-.045,-.045],[.045,-.045],[-.045,.045],[.045,.045]]) {
        box(castle,0xd5bd92,x+dx,.25,dz,.045,.045,.045).material=texturedSand(0xd5bd92);
      }
    }
    box(castle,0x99815e,0,.035,.128,.06,.07,.005);
    // Broken, shallow rake lines and small scooped hollows, rather than uniform stripes.
    for(let line=0;line<3;line++) for(let part=0;part<5;part++) {
      box(toys,0xb5a27e,-.12+line*.045,.061,.06+part*.045,.013,.003,.032);
    }
    round(toys,0xbba782,-.16,.06,-.48,.10,.004,.07);
    round(toys,0xdac7a2,-.19,.063,-.50,.065,.005,.045);
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
    const collarWhite=0xf5f0e7;
    const collarBandGeometry=new THREE.CylinderGeometry(.069,.079,.035,16,1,true);
    geometries.add(collarBandGeometry);
    mesh(girl,collarBandGeometry,collarWhite,0,.623,.015,1,1,1);
    // Fit the fabric to the rounded blouse instead of spanning it with flat triangles.
    function blouseFront(x: number,y: number) {
      const torso=.135*Math.sqrt(Math.max(0,1-(x/.20)**2-((y-.38)/.27)**2));
      const shoulder=.01+.13*Math.sqrt(Math.max(0,1-(x/.18)**2-((y-.51)/.14)**2));
      return Math.max(torso,shoulder)+.006;
    }
    for(const side of [-1,1]) {
      const outline=[new THREE.Vector2(side*.008,.615),new THREE.Vector2(side*.128,.592),
        new THREE.Vector2(side*.095,.478),new THREE.Vector2(side*.020,.563)];
      const positions: number[]=[];
      function addTriangle(a: THREE.Vector2,b: THREE.Vector2,c: THREE.Vector2) {
        const points=side>0?[a,c,b]:[a,b,c];
        for(const point of points) positions.push(point.x,point.y,blouseFront(point.x,point.y));
      }
      // Small facets preserve the pointed outline while following the chest curvature.
      for(const [ia,ib,ic] of [[0,1,2],[0,2,3]]) {
        const a=outline[ia],b=outline[ib],c=outline[ic],steps=6;
        const at=(i:number,j:number)=>a.clone().addScaledVector(b.clone().sub(a),i/steps)
          .addScaledVector(c.clone().sub(a),j/steps);
        for(let i=0;i<steps;i++) for(let j=0;j<steps-i;j++) {
          addTriangle(at(i,j),at(i+1,j),at(i,j+1));
          if(i+j<steps-1) addTriangle(at(i+1,j),at(i+1,j+1),at(i,j+1));
        }
      }
      const collarGeometry=new THREE.BufferGeometry();
      collarGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      collarGeometry.computeVertexNormals();geometries.add(collarGeometry);
      const collar=mesh(girl,collarGeometry,collarWhite,0,0,0,1,1,1);
      collar.castShadow=false;
    }
    const skirtGeometry = new THREE.CylinderGeometry(.15, .29, .29, 12);
    const skirtShades=[0xeaa0bb,0xeaa0bb,0xeaa0bb,0xf0b2c9,0xe291ae,0xedabc3];
    const skirtPixels=new Uint8Array(32*8*4);
    let skirtSeed=419;
    for(let pixel=0;pixel<256;pixel++) {
      skirtSeed=skirtSeed*16807%2147483647;
      const shade=skirtShades[skirtSeed%skirtShades.length];
      skirtPixels.set([(shade>>16)&255,(shade>>8)&255,shade&255,255],pixel*4);
    }
    const skirtTexture=new THREE.DataTexture(skirtPixels,32,8);
    skirtTexture.colorSpace=THREE.SRGBColorSpace;
    skirtTexture.magFilter=THREE.NearestFilter;
    skirtTexture.minFilter=THREE.NearestFilter;
    skirtTexture.generateMipmaps=false;
    skirtTexture.needsUpdate=true;
    const skirtMaterial=new THREE.MeshLambertMaterial({map:skirtTexture});
    geometries.add(skirtGeometry);
    const skirt = mesh(girl, skirtGeometry, 0xeaa0bb, 0, .16, .07, 1, 1, 1);
    skirt.material=skirtMaterial;
    skirt.rotation.x = -.22;
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
      skirtMaterial.dispose(); skirtTexture.dispose();
      renderer.dispose(); canvas.remove();
    };
  }, [controls, onPhase, onCount]);
  return <div className="scene-viewport playground-viewport" ref={host} data-testid="playground-viewport">{error && <p className="scene-error" data-testid="playground-error">This little world needs WebGL. Please enable hardware acceleration and reload.</p>}</div>;
}
