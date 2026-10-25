import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';

export interface SceneControls { setPlaying: (value: boolean) => void; setSpeed: (value: number) => void; reset: () => void }
interface Props { controls: RefObject<SceneControls | null>; onPhase: (phase: string) => void; onCount: (count: number) => void }

export function FetchScene({ controls, onPhase, onCount }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); } catch { setError(true); return; }
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0xfafbf7, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'A boy and a brown Indian street dog playing fetch on a pixelated grassy island');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('data-testid', 'fetch-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 100);
    camera.position.set(9, 12, 17);
    camera.lookAt(0, .65, 0);
    scene.add(new THREE.AmbientLight(0xfff6df, 1.8));
    const sunlight = new THREE.DirectionalLight(0xfff2d1, 3);
    sunlight.position.set(-5, 10, 5); sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    Object.assign(sunlight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
    sunlight.shadow.normalBias = .03;
    scene.add(sunlight);
    const materials = new Map<number, THREE.MeshLambertMaterial>();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    function material(color: number) { if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color })); return materials.get(color)!; }
    function box(parent: THREE.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d: number) {
      const mesh = new THREE.Mesh(geometry, material(color)); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }
    let seed = 854;
    function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    // Individually colored tiles give the island its irregular, pixel-edged silhouette.
    const grass = [0x9eaf60, 0xa8b96b, 0xb4c47a, 0x94ab58, 0xbcca88, 0xc3ce8b];
    const stone = [0xb9b7a4, 0xc9c6b2, 0xd4d0ba, 0xb0b09d, 0xdcd6c2];
    for (let x = -4.7; x <= 4.7; x += .19) for (let z = -3.25; z <= 3.25; z += .19) {
      const r = x*x/21.2 + z*z/10.2;
      if (r > 1 + (random()-.5)*.07) continue;
      const path = x*x/9.8 + z*z/4.7 < 1;
      box(scene, path ? stone[Math.floor(random()*stone.length)] : grass[Math.floor(random()*grass.length)], x, -.09 + random()*.025, z, .185, .16, .185);
      if (!path && random() > .46) {
        const blade = box(scene, grass[Math.floor(random()*grass.length)], x, .05, z, .035, .10 + random()*.13, .035);
        blade.rotation.z = (random()-.5)*.4;
      }
      if (path && random() > .84) box(scene, 0x889459, x, .005, z, .05, .03, .06);
    }
    // Small clusters of daisies and loose stones at the edge.
    for (let i=0;i<30;i++) {
      const a=random()*Math.PI*2; const x=Math.cos(a)*(3.4+random()*.8), z=Math.sin(a)*(2.4+random()*.4);
      if (i%3===0) { box(scene,0x778c43,x,.12,z,.035,.22,.035); box(scene,0xf6efd5,x,.24,z,.13,.045,.13); box(scene,0xd5b353,x,.27,z,.045,.025,.045); }
      else box(scene,stone[i%stone.length],x,.02,z,.13+random()*.12,.12,.16);
    }
    const boy = new THREE.Group(); boy.position.set(-1.25, .02, .1); boy.rotation.y = .8; scene.add(boy);
    boy.scale.set(.82, 1.25, .85);
    const skin=0xb77b51, hair=0x342c24, violet=0xb79ad8;
    // A fixed, irregular mosaic keeps the violet fabric crisp as the boy moves.
    const violetShades = [0xb79ad8, 0xb79ad8, 0xb79ad8, 0xa989ca, 0xc6abe4, 0x9875bb];
    const shirtPixels = new Uint8Array(8 * 8 * 4);
    let fabricSeed = 317;
    for (let pixel = 0; pixel < 64; pixel++) {
      fabricSeed = (fabricSeed * 16807) % 2147483647;
      const shade = violetShades[fabricSeed % violetShades.length];
      shirtPixels.set([(shade >> 16) & 255, (shade >> 8) & 255, shade & 255, 255], pixel * 4);
    }
    const shirtTexture = new THREE.DataTexture(shirtPixels, 8, 8);
    shirtTexture.colorSpace = THREE.SRGBColorSpace;
    shirtTexture.magFilter = THREE.NearestFilter;
    shirtTexture.minFilter = THREE.NearestFilter;
    shirtTexture.generateMipmaps = false;
    shirtTexture.needsUpdate = true;
    const shirtMaterial = new THREE.MeshLambertMaterial({ map: shirtTexture });

    const legs: THREE.Group[]=[];
    const knees: THREE.Group[]=[];
    const feet: THREE.Group[]=[];
    for (const x of [-.14,.14]) {
      const hip=new THREE.Group(); hip.position.set(x,.83,0); boy.add(hip);
      box(hip,0x3b4848,0,-.17,0,.21,.36,.24);
      const knee=new THREE.Group(); knee.position.y=-.35; hip.add(knee);
      box(knee,0x3b4848,0,-.16,0,.19,.34,.22);
      const ankle=new THREE.Group(); ankle.position.y=-.37; knee.add(ankle);
      box(ankle,0x72503a,0,0,.07,.24,.14,.39);
      legs.push(hip);knees.push(knee);feet.push(ankle);
    }
    const torso=new THREE.Group(); torso.position.y=.83; boy.add(torso);
    // Upper body pivots at the hips, independently of the planted feet.
    const upper=new THREE.Group(); upper.position.y=-.83; torso.add(upper);
    box(upper,violet,0,1.18,0,.58,.7,.33).material = shirtMaterial;
    const boyNeck: THREE.Mesh=box(upper,skin,0,1.62,0,.16,.18,.19);
    // BoxGeometry's fifth material is the forward-facing (+Z) side.
    boyNeck.material=[material(skin),material(skin),material(skin),material(skin),material(0xbf875c),material(skin)];
    box(upper,skin,0,1.89,0,.37,.43,.34);
    box(upper,hair,0,2.1,-.025,.41,.15,.37);
    box(upper,hair,-.175,1.97,-.04,.085,.24,.30);
    box(upper,hair,.16,2.01,-.04,.09,.16,.3);
    box(upper,skin,0,1.86,.20,.10,.10,.10);
    for(const x of [-.1,.1]) box(upper,0x282a24,x,1.96,.177,.045,.045,.025);
    const arms: THREE.Group[]=[];
    const elbows: THREE.Group[]=[];
    for (const x of [-.36,.36]) {
      const arm=new THREE.Group(); arm.position.set(x,1.42,0); upper.add(arm);
      box(arm,violet,0,-.12,0,.18,.28,.25).material = shirtMaterial;
      box(arm,skin,0,-.28,0,.14,.12,.16);
      const elbow=new THREE.Group(); elbow.position.y=-.32; arm.add(elbow);
      box(elbow,skin,0,-.12,0,.13,.25,.15);
      box(elbow,skin,0,-.26,.025,.17,.13,.18);
      arms.push(arm);elbows.push(elbow);
    }
    const dog = new THREE.Group(); scene.add(dog);
    dog.scale.set(.60, .73, .76);
    const brown=0xa86634, lightBrown=0xbc7d44;
    const dogBody=new THREE.Group(); dog.add(dogBody);
    box(dogBody,brown,0,.68,0,.38,.43,.85);
    box(dogBody,lightBrown,0,.77,.12,.4,.33,.55);
    // Eight small coat markings: four on the back and four on the visible flank.
    box(dogBody,0x94582e,-.10,.937,-.02,.055,.003,.055);
    box(dogBody,0x94582e,.08,.937,.24,.055,.003,.055);
    box(dogBody,0x94582e,.202,.78,0,.003,.055,.055);
    box(dogBody,0x94582e,.202,.86,.26,.003,.055,.055);
    box(dogBody,0x94582e,.12,.937,-.08,.055,.003,.055);
    box(dogBody,0x94582e,-.08,.937,.32,.055,.003,.055);
    box(dogBody,0x94582e,.202,.88,-.08,.003,.055,.055);
    box(dogBody,0x94582e,.202,.70,.16,.003,.055,.055);
    box(dogBody,0x94582e,0,.64,-.32,.35,.38,.32);
    const dogLegs: THREE.Group[]=[];
    const dogKnees: THREE.Group[]=[];
    for(const x of [-.15,.15]) for(const z of [-.30,.29]) {
      const leg=new THREE.Group();leg.position.set(x,.65,z);dog.add(leg);
      box(leg,brown,0,-.13,0,.12,.24,.13);
      const knee=new THREE.Group();knee.position.y=-.25;leg.add(knee);
      box(knee,brown,0,-.13,0,.11,.26,.12);
      box(knee,0xc39766,0,-.25,.045,.14,.10,.20);
      dogLegs.push(leg);dogKnees.push(knee);
    }
    const neck=new THREE.Group();neck.position.set(0,.83,.38);dogBody.add(neck);
    box(neck,lightBrown,0,.10,.05,.32,.38,.33);
    box(neck,brown,0,.28,.16,.37,.3,.38);
    box(neck,0xb77a46,0,.19,.39,.24,.17,.26);
    box(neck,0x352f28,0,.21,.535,.19,.105,.07);
    for(const x of [-.17,.17]) {const ear=box(neck,0x92552d,x,.51,.11,.11,.24,.16);ear.rotation.z=x>0?-.25:.25;box(neck,0x282720,x,.32,.31,.045,.06,.045);}
    const tail=new THREE.Group();tail.position.set(0,.78,-.43);dogBody.add(tail);
    const tail1=box(tail,brown,0,.15,-.13,.09,.38,.09);tail1.rotation.x=-.7;
    const tail2=box(tail,lightBrown,0,.35,-.24,.08,.20,.08);tail2.rotation.x=.35;
    // A wicker picnic basket and a water bowl anchor the tiny world.
    const basket = new THREE.Group(); basket.position.set(-2.5,.1,.7); scene.add(basket);
    box(basket,0xa77c4c,0,.25,0,.62,.45,.49);
    for(let i=0;i<5;i++) for(let j=0;j<4;j++) box(basket,(i+j)%2?0xc59b67:0x8d683f,-.26+i*.13,.08+j*.1,.253,.08,.05,.025);
    box(basket,0xd6b37f,0,.48,0,.65,.06,.52);
    for(const x of [-.23,.23]) box(basket,0x785d3e,x,.67,0,.055,.35,.055);
    box(basket,0x785d3e,0,.84,0,.5,.05,.055);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.24,.19,.13,10), material(0x617477));bowl.position.set(-.8,.09,1.5);scene.add(bowl);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(.20,.20,.01,10), material(0x9eb9b5));water.position.set(-.8,.16,1.5);scene.add(water);
    const ball=new THREE.Group(); scene.add(ball);
    // A small voxel sphere rounds off the silhouette while retaining stepped edges.
    for(let x=-2;x<=2;x++) for(let y=-2;y<=2;y++) for(let z=-2;z<=2;z++) {
      if(x*x+y*y+z*z>5) continue;
      const color=y===1&&z>=1?0xf0c581:y>0?0xd9754b:y<0?0xad4934:0xc75d3d;
      box(ball,color,x*.04,y*.04,z*.04,.04,.04,.04);
    }
    // Batch the static terrain so thousands of grass pixels cost only a few draw calls.
    const terrainBatches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const object of [...scene.children]) {
      if (object instanceof THREE.Mesh && object.geometry === geometry) {
        const mat = object.material as THREE.Material;
        const batch = terrainBatches.get(mat) ?? [];
        batch.push(object);
        terrainBatches.set(mat, batch);
      }
    }
    for (const [mat, meshes] of terrainBatches) {
      const instances = new THREE.InstancedMesh(geometry, mat, meshes.length);
      meshes.forEach((mesh, index) => {
        mesh.updateMatrix();
        instances.setMatrixAt(index, mesh.matrix);
        scene.remove(mesh);
      });
      instances.castShadow = true;
      instances.receiveShadow = true;
      scene.add(instances);
    }
    const boyHome = new THREE.Vector3(-1.25, .02, .1);
    const home = new THREE.Vector3(-.4, 0, .8);
    const throwTargets = [new THREE.Vector3(2.55,0,-.15), new THREE.Vector3(1.6,0,-1.6), new THREE.Vector3(1.3,0,1.7)];
    const target = throwTargets[0].clone();
    const throwReleaseTime=1;
    const chaseStartTime=throwReleaseTime+.5;
    // Sample the raised-hand pose, not the resting hand, as the flight origin.
    arms[1].rotation.set(-2.5,0,-.07);
    boy.updateMatrixWorld(true);
    const release = elbows[1].localToWorld(new THREE.Vector3(0,-.26,.025));
    const releaseLocal = boy.worldToLocal(release.clone());
    arms[1].rotation.x=0;
    let releasedRound=-1;
    function path(points: number[][]) {
      return new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    }
    // Alternate asymmetric routes each round, staying inside the grassy island.
    const boyPaths = [
      path([[-1.25,.1],[-1.7,-.75],[-.4,-1.7],[1.1,-1.35],[.3,-.4],[-1.25,.1]]),
      path([[-1.25,.1],[-.3,-.7],[1.35,-1.4],[.4,-1.9],[-1.8,-1.2],[-1.25,.1]]),
      path([[-1.25,.1],[-1.9,-.65],[-.9,-1.8],[.7,-.8],[.1,.35],[-1.25,.1]]),
    ];
    const dogPaths = [
      path([[2.55,-.15],[2.8,.9],[1.45,1.8],[.65,.7],[1.9,.25],[2.1,-.8]]),
      path([[2.55,-.15],[1.5,-.45],[.7,.5],[1.8,1.7],[2.9,.8],[2.1,-.8]]),
      path([[2.55,-.15],[3.1,.5],[2.1,1.5],[.4,1.9],[1.3,.6],[2.1,-.8]]),
    ];
    let fetchPath = path([[-.4,.8],[.5,.45],[1.6,-.35],[2.55,-.15]]);
    let roamPath = dogPaths[0];
    let round = -1, missedCatch = false, throwAngle = .8, catchAngle = 0;
    const landing = new THREE.Vector3();
    const flightEnd = new THREE.Vector3();
    const returnPath = path([[2.1,-.8],[1.2,-.2],[.65,1.1],[-.4,.8]]);
    const hand = new THREE.Vector3(), mouth = new THREE.Vector3();
    const handoffTarget = new THREE.Vector3();
    const facing = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const smooth = (u: number) => u*u*(3-2*u);
    let elapsed=0, playing=true, speed=1, frame=0, last=performance.now(), oldPhase='', oldCount=-1;
    controls.current={setPlaying:v=>{playing=v;},setSpeed:v=>{speed=v;},reset:()=>{elapsed=0;round=-1;releasedRound=-1;boy.rotation.y=.8;dog.rotation.y=-1.7;}};
    const resize=()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(Math.max(1,Math.round(w/2.2)),Math.max(1,Math.round(h/2.2)),false);const aspect=w/h;camera.left=-5.3*aspect;camera.right=5.3*aspect;camera.top=5.3;camera.bottom=-5.3;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    function turn(character: THREE.Group, angle: number, dt: number) {
      facing.setFromAxisAngle(up, angle);
      character.quaternion.rotateTowards(facing, dt * 7);
    }
    function follow(character: THREE.Group, route: THREE.CatmullRomCurve3, u: number, dt: number) {
      character.position.copy(route.getPointAt(smooth(u)));
      const tangent = route.getTangentAt(smooth(u));
      turn(character, Math.atan2(tangent.x, tangent.z), dt);
    }
    function reachForBall(target: THREE.Vector3, blend: number) {
      // Solve a two-bone arm in torso space; neither limb changes length.
      const shoulder = arms[1].position.clone();
      const destination = upper.worldToLocal(target.clone());
      const direction = destination.clone().sub(shoulder);
      const upperLength = .32, lowerLength = Math.hypot(.26, .025);
      const distance = THREE.MathUtils.clamp(direction.length(), .061, upperLength + lowerLength - .0001);
      direction.normalize();
      const along = (upperLength**2 - lowerLength**2 + distance**2) / (2 * distance);
      const bend = new THREE.Vector3(0, 0, 1);
      bend.addScaledVector(direction, -bend.dot(direction)).normalize();
      const elbowPosition = shoulder.clone().addScaledVector(direction, along)
        .addScaledVector(bend, Math.sqrt(Math.max(0, upperLength**2 - along**2)));
      const shoulderRotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,-1,0), elbowPosition.clone().sub(shoulder).normalize());
      const lowerDirection = destination.sub(elbowPosition).normalize()
        .applyQuaternion(shoulderRotation.clone().invert());
      const elbowRotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,-.26,.025).normalize(), lowerDirection);
      arms[1].quaternion.slerp(shoulderRotation, blend);
      elbows[1].quaternion.slerp(elbowRotation, blend);
    }
    function animate(now:number) {
      frame=requestAnimationFrame(animate);
      const dt=Math.min((now-last)/1000,.05);last=now;
      const step = playing ? dt*speed : 0;
      elapsed+=step;
      const t=elapsed%18, count=Math.floor(elapsed/18), routeIndex=count%boyPaths.length;
      if(count!==round) {
        round=count;
        target.copy(throwTargets[Math.floor(Math.random()*throwTargets.length)]);
        missedCatch=Math.random()<.3;
        throwAngle=Math.atan2(target.x-boyHome.x,target.z-boyHome.z);
        const midpoint=home.clone().lerp(target,.5);
        midpoint.z-=.25;
        fetchPath=path([[home.x,home.z],[midpoint.x,midpoint.z],[target.x,target.z]]);
        const tangent=fetchPath.getTangentAt(1);
        catchAngle=Math.atan2(tangent.x,tangent.z);
        roamPath=new THREE.CatmullRomCurve3([target.clone(), ...dogPaths[routeIndex].points.slice(1).map(p=>p.clone())],false,'centripetal');
        // Fixed landing and catch points make each throw a true flight through space.
        landing.set(0,.16,.63).applyAxisAngle(new THREE.Vector3(1,0,0),1.15)
          .add(new THREE.Vector3(0,.65,.38)).multiply(dog.scale).applyAxisAngle(up,catchAngle).add(target);
        flightEnd.copy(missedCatch?landing:new THREE.Vector3(0,.99,1.01)
          .multiply(dog.scale).applyAxisAngle(up,catchAngle).add(target));
      }
      const roamStart=missedCatch?7:6;
      let phase='A little anticipation';
      const boyRunning=t>=3&&t<12;
      const dogRunning=(t>=chaseStartTime&&t<5)||(t>=roamStart&&t<15);
      arms[0].rotation.set(0,0,.07);
      arms[1].rotation.set(t<2 ? -Math.sin(t/2*Math.PI)*2.5 : 0,0,-.07);
      elbows.forEach(elbow=>{elbow.rotation.set(0,0,0);});
      torso.rotation.set(0,0,0);
      if(boyRunning) {
        const u=(t-3)/9;
        const route=boyPaths[routeIndex];
        follow(boy,route,u,step);
        // Tie cadence to distance travelled, then soften the start and stop.
        const distance=route.getLength()*smooth(u);
        const gait=distance/.95*Math.PI*2;
        const blend=smooth(Math.min(1,(t-3)/.65,(12-t)/.8));
        legs.forEach((leg,i)=>{
          const phase=gait+i*Math.PI;
          const swing=Math.sin(phase);
          leg.rotation.x=(-.36*swing+.04)*blend;
          // The heel folds up behind the body during recovery, rather than
          // keeping the entire leg straight like a marching pendulum.
          knees[i].rotation.x=(.12+.82*Math.pow(Math.max(0,-swing),2))*blend;
          feet[i].rotation.x=(-.10-.20*Math.max(0,swing))*blend;
          arms[i].rotation.x=(.24*Math.sin(phase+.25)-.08)*blend;
          elbows[i].rotation.x=(-.75+.16*Math.sin(phase-.4))*blend;
          arms[i].rotation.z=(i===0?.08:-.08)*blend;
        });
        torso.rotation.set(.07*blend,Math.sin(gait+.3)*.045*blend,Math.sin(gait)*.025*blend);
        boy.position.y=.02+(1-Math.cos(gait*2))*.018*blend;
      } else {
        boy.position.copy(boyHome);
        legs.forEach((leg,i)=>{leg.rotation.x=0;knees[i].rotation.x=0;feet[i].rotation.x=0;});
        turn(boy,t<3?throwAngle:.8,step);
      }
      if(t<chaseStartTime) {
        phase=t<throwReleaseTime?'Sitting patiently. Ready for another?':'Wait for it…';
        dog.position.copy(home);turn(dog,-1.7,step);
      } else if(t<5) {
        phase='Go on, get it!';follow(dog,fetchPath,(t-chaseStartTime)/(5-chaseStartTime),step);
      } else if(t<roamStart) {
        phase=missedCatch?(t<5.4?'Oops! Just missed it.':'Found it. Picking it up!'):'A very good catch';
        dog.position.copy(target);dog.rotation.y=catchAngle;
        if(!missedCatch) dog.position.y=Math.sin((t-5)*Math.PI)*.25;
      } else if(t<11) {
        phase='A little adventure together';follow(dog,roamPath,(t-roamStart)/(11-roamStart),step);
      } else if(t<15) {
        phase='Right back to his best friend';follow(dog,returnPath,(t-11)/4,step);
      } else {
        phase='Good boy. One more?';dog.position.copy(home);turn(dog,-1.7,step);
      }
      if(dogRunning)dog.position.y+=Math.abs(Math.sin(elapsed*12))*.06*(t<5?Math.min(1,(5-t)/.25):1);
      // Sit only after the ball has changed hands; hold through the throw
      // and its half-second reaction delay, then rise into the chase.
      const sit=t<chaseStartTime?1:t<chaseStartTime+.35?1-smooth((t-chaseStartTime)/.35):t>=16.3?smooth(Math.min(1,(t-16.3)/.9)):0;
      dogBody.position.set(0,-.13*sit,0);
      dogBody.rotation.x=-.45*sit;
      dogLegs.forEach((leg,i)=>{
        const rear=i%2===0;
        leg.position.y=rear?.65-.32*sit:.65-.075*sit;
        leg.position.z=rear?-.30:.29-.04*sit;
        const stride=dogRunning?Math.sin(elapsed*13+(i===0||i===3?0:Math.PI))*.65:0;
        // Fold the front elbows back and bring the paws beneath the chest.
        leg.rotation.x=stride*(1-sit)+(rear?-1.05:.65)*sit;
        dogKnees[i].rotation.x=(rear?2.1:-.95)*sit;
      });
      tail.rotation.z=Math.sin(elapsed*16)*.45;
      const pickup=missedCatch&&t>=5.4&&t<7
        ?t<6.2?smooth((t-5.4)/.8):1-smooth((t-6.2)/.8):0;
      neck.position.y=.83-.18*pickup;
      neck.rotation.x=.25*sit+1.15*pickup+(t>17.6?Math.sin(elapsed*3)*.04:0);
      dog.updateMatrixWorld(true);
      mouth.copy(neck.localToWorld(new THREE.Vector3(0,.16,.63)));
      if(t<16.2) handoffTarget.copy(mouth);
      if(t>=15 && t<17.6) {
        const reach = t<16 ? smooth(t-15) : t<16.2 ? 1 : 1-smooth((t-16.2)/1.4);
        // Shift weight sideways to align the right shoulder, then bend at the hips.
        boy.position.x-=.28*reach;
        boy.position.z+=.29*reach;
        torso.rotation.x=1.3*reach;
        arms[0].rotation.x=-.25*reach;
        elbows[0].rotation.x=-.35*reach;
        boy.updateMatrixWorld(true);
        reachForBall(handoffTarget,reach);
      }
      boy.updateMatrixWorld(true);
      hand.copy(elbows[1].localToWorld(new THREE.Vector3(0,-.26,.025)));
      if(t>=throwReleaseTime&&releasedRound!==count) {
        release.copy(boy.localToWorld(releaseLocal.clone()));
        releasedRound=count;
      }
      if(t<throwReleaseTime||t>=16) ball.position.copy(hand);
      else if(t<5) {
        const u=(t-throwReleaseTime)/(5-throwReleaseTime);
        ball.position.lerpVectors(release,flightEnd,u);
        ball.position.y+=Math.sin(u*Math.PI)*2.1;
      } else if(missedCatch&&t<6.2) {
        ball.position.copy(landing);
        // One small bounce, then rest until the lowered muzzle reaches the ball.
        if(t<5.4) ball.position.y+=Math.sin((t-5)/.4*Math.PI)*.16;
      } else ball.position.copy(mouth);
      const ballTime=missedCatch&&t>=5.4&&t<6.2?count*18+5.4:elapsed;
      ball.rotation.set(ballTime*2,ballTime*3,0);
      if(phase!==oldPhase){onPhase(phase);oldPhase=phase;}
      if(count!==oldCount){onCount(count);oldCount=count;}
      renderer.render(scene,camera);
    }
    frame=requestAnimationFrame(animate);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();controls.current=null;scene.traverse(object=>{if(object instanceof THREE.Mesh && object.geometry!==geometry)object.geometry.dispose();});geometry.dispose();materials.forEach(m=>m.dispose());shirtMaterial.dispose();shirtTexture.dispose();renderer.dispose();renderer.domElement.remove();};
  }, [controls,onPhase,onCount]);
  return <div className="scene-viewport" ref={host} data-testid="fetch-viewport">{error&&<p className="scene-error" data-testid="fetch-error">This little world needs WebGL. Please enable hardware acceleration and reload.</p>}</div>;
}
