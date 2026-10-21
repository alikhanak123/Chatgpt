// Salah Tracker — 3D pets. Animals are professionally made, rigged 3D models with real animations
// (walk / idle / jump…) — see /models/CREDITS.txt. The plant is built here. Uses three.js (import map in index.html).
import { useThree, rigModel, animator } from "/petrig.js";
let THREE = null, GLTFLoader = null, SkeletonUtils = null, RoomEnvironment = null, BGU = null, libP = null;
export function loadThree(){
  return libP ||= Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/utils/SkeletonUtils.js"),
      import("three/addons/environments/RoomEnvironment.js"), import("three/addons/utils/BufferGeometryUtils.js")])
    .then(([t, g, s, r, b]) => { THREE = t; GLTFLoader = g.GLTFLoader; SkeletonUtils = s; RoomEnvironment = r.RoomEnvironment; BGU = b; useThree(t); });
}

// Each animal: file, target height, animation clip names (matched by the end of the name), walking speed, colours
export const MODELS = {
  dog:    {file:"dog.glb",    h:1.2,  idle:"Idle", walk:"Walk", happy:"Jump_ToIdle", sleep:"Idle_2_HeadLow", extra:"Eating", speed:.55, colors:{Main:"#C9742F", Main_Light:"#F3E3CC"}},
  husky:  {file:"husky.glb",  h:1.25, idle:"Idle", walk:"Walk", happy:"Jump_ToIdle", sleep:"Idle_2_HeadLow", extra:"Eating", speed:.55, colors:{Material:"#3C4048", "Material.001":"#E9E6E1"}},
  fox:    {file:"fox.glb",    h:1.05, idle:"Idle", walk:"Walk", happy:"Jump_ToIdle", sleep:"Idle_2_HeadLow", extra:"Eating", speed:.55, colors:{Main:"#D5631F", Main_Light:"#F6EDE2", Grey:"#3A2C25"}},
  pony:   {file:"pony.glb",   h:1.45, idle:"Idle", walk:"WalkSlow", happy:"Jump", sleep:"Idle", speed:.45, colors:{"Material.003":"#7A4426"}},
  rabbit: {file:"rabbit.glb", h:.95,  idle:"Bunny_idle", walk:"Bunny_walk", sleep:"Bunny_idle", speed:.45},
  parrot: {file:"macaw.glb",  h:.95,  idle:"", speed:.32, flat:true},   // crisp feathers; rigged & animated in petrig.js
  frog:   {file:"frog.glb",   h:.7,  idle:"Frog_Idle", walk:"Frog_Jump", happy:"Frog_Jump", sleep:"Frog_Idle", speed:.5},
  cat:    {file:"cat.glb",    h:1.0,  idle:"IdleCat", sleep:"IdleCat", speed:.4},   // walk cycle added in petrig.js
};

// ---------- small building blocks (plant, garden, accessories) ----------
let gradient = null;
function toon(color, extra = {}){
  if (!gradient){
    gradient = new THREE.DataTexture(new Uint8Array([140,140,140,255, 200,200,200,255, 255,255,255,255]), 3, 1, THREE.RGBAFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  }
  return new THREE.MeshToonMaterial({color, gradientMap:gradient, ...extra});
}
function ball(r, color, sx = 1, sy = 1, sz = 1, seg = 28){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(12, seg/2|0)), typeof color === "string" ? toon(color) : color);
  m.scale.set(sx, sy, sz); m.castShadow = true; return m;
}
function cone(r, h, color, seg = 20){ const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), toon(color)); m.castShadow = true; return m; }
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const pivot = (x, y, z, ...kids) => { const g = new THREE.Group(); g.position.set(x, y, z); kids.forEach(k => g.add(k)); return g; };

function buildPlant(level, parts){
  const root = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.48, .36, .62, 32), toon("#E2804F")); pot.position.y = .31; pot.castShadow = true; root.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.48, .07, 12, 40), toon("#C9653A")); rim.rotation.x = Math.PI/2; rim.position.y = .62; root.add(rim);
  const soil = at(new THREE.Mesh(new THREE.CircleGeometry(.44, 32), toon("#6B4A2E")), 0, .63, 0); soil.rotation.x = -Math.PI/2; root.add(soil);
  const face = new THREE.Group(); face.position.set(0, .33, .38); root.add(face);
  parts.eyes = [-1, 1].map(sx => { const e = new THREE.Group(); e.add(ball(.055, "#2A2147", 1, 1.15, .6)); e.add(at(ball(.02, toon("#FFFFFF")), .02, .025, .03)); e.position.set(sx*.14, .06, .02); face.add(e); return e; });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.07, .015, 8, 20, Math.PI), toon("#2A2147")); smile.rotation.z = Math.PI; smile.position.set(0, -.04, .04); face.add(smile);
  const stem = new THREE.Group(); stem.position.y = .62; root.add(stem); parts.stem = stem;
  const h = Math.min(1.5, .35 + level*.13);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, h, 12), toon("#4FAE5C")); st.position.y = h/2; st.castShadow = true; stem.add(st);
  parts.leaves = [];
  const n = Math.min(10, 2 + level);
  for (let i = 0; i < n; i++){
    const side = i % 2 ? 1 : -1, y = .12 + (h - .2) * (i / Math.max(1, n - 1));
    const leaf = pivot(0, y, 0, at(ball(.16, "#6CC24A", 1.6, .25, .8), side*.2, 0, 0));
    leaf.rotation.y = i * 1.3; leaf.rotation.z = side * .35; leaf.userData.base = leaf.rotation.z; stem.add(leaf); parts.leaves.push(leaf);
  }
  const flower = (y, s = 1) => { const f = new THREE.Group(); f.position.y = y; f.scale.setScalar(s); f.add(ball(.1, "#FFC23C"));
    for (let k = 0; k < 6; k++) f.add(at(ball(.1, "#FF8FB4", 1.2, .5, 1), Math.cos(k/6*Math.PI*2)*.16, 0, Math.sin(k/6*Math.PI*2)*.16));
    f.rotation.x = .5; return f; };
  if (level >= 4) stem.add(flower(h + .05, 1));
  if (level >= 7){ const f = flower(h*.6, .7); f.position.x = .25; stem.add(f); }
  if (level >= 9){ const f = flower(h*.45, .7); f.position.x = -.25; stem.add(f); }
  return root;
}
function buildGarden(scene, ground){
  const g = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, .2, 64), toon(ground)); g.position.y = -.1; g.receiveShadow = true; scene.add(g);
  const flowerCols = ["#FF8FB4", "#FFD166", "#A994FF", "#FFFFFF"];
  for (let i = 0; i < 14; i++){
    const a = i / 14 * Math.PI*2 + .2, r = 1.95 + (i % 2) * .15, x = Math.cos(a)*r, z = Math.sin(a)*r;
    if (z > .9) continue;
    if (i % 3 === 0){ const fl = new THREE.Group(); fl.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .25, 6), toon("#4FAE5C")), 0, .12, 0)); fl.add(at(ball(.07, flowerCols[i % 4], 1, .6, 1, 12), 0, .26, 0)); fl.position.set(x, 0, z); scene.add(fl); }
    else { const tc = cone(.07, .22, "#5DBB46", 6); tc.position.set(x, .1, z); scene.add(tc); }
  }
}
// Bow (level 3) or crown (level 5): floats just above the head and follows it.
function crownMesh(){
  const c = new THREE.Group(), gold = new THREE.MeshStandardMaterial({color:"#FFC23C", metalness:.6, roughness:.3, side:THREE.DoubleSide});
  c.add(new THREE.Mesh(new THREE.CylinderGeometry(.17, .19, .12, 24, 1, true), gold));
  for (let k = 0; k < 5; k++){ const p = new THREE.Mesh(new THREE.ConeGeometry(.04, .12, 12), gold); p.position.set(Math.cos(k/5*Math.PI*2)*.17, .11, Math.sin(k/5*Math.PI*2)*.17); c.add(p); }
  c.add(at(ball(.035, "#FF5C8A"), 0, .02, .19));
  return c;
}
function bowMesh(){ const b = new THREE.Group(); b.add(ball(.05, "#FF5C8A")); b.add(at(ball(.09, "#FF5C8A", 1.2, .8, .5), -.1, 0, 0)); b.add(at(ball(.09, "#FF5C8A", 1.2, .8, .5), .1, 0, 0)); return b; }

// ---------- model loading (each file loaded once, then cloned) ----------
const cache = new Map();
function loadModel(type){
  const cfg = MODELS[type];
  if (!cache.has(type)) cache.set(type, new GLTFLoader().loadAsync(`/models/${cfg.file}`).then(gltf => {
    gltf.scene.traverse(m => {
      if (!m.isMesh) return;
      if (!cfg.flat){ const g = m.geometry; g.deleteAttribute("normal");        // smooth away the blocky low-poly look
        const sm = BGU.mergeVertices(g, 1e-4); sm.computeVertexNormals(); m.geometry = sm; }
      const old = m.material, col = cfg.colors?.[old.name];
      m.material = new THREE.MeshStandardMaterial({map:old.map || null, color:col ? new THREE.Color(col) : old.color,
        roughness:/eye/i.test(old.name) ? .25 : .92, metalness:0, envMapIntensity:.9});  // matte fur, no plastic shine
      m.material.name = old.name;
    });
    rigModel(type, gltf);              // eyes / skeleton / walk for the pets that need it
    return gltf;
  }));
  return cache.get(type);
}
const clipFor = (gltf, name) => name && gltf.animations.find(a => a.name.split("|").pop() === name);

// ---------- the live pet ----------
// opts: {type, level, mood, small, ground, onPet(pos), onFail()} → {el, setMood(mood), dispose()}
export function createPet3D(opts){
  const el = document.createElement("div"); el.className = "pet3d" + (opts.small ? " small" : "");
  const api = {el, mood:opts.mood, setMood(m){ api.mood = m; api.onMood?.(); }, dispose(){}, ready:false};
  loadThree().then(() => start(api, opts)).catch(() => { el.classList.add("failed"); opts.onFail?.(el); });
  return api;
}
async function start(api, opts){
  const {el} = api, level = opts.level || 1, isPlant = opts.type === "plant", cfg = MODELS[opts.type] || MODELS.dog;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); } catch { el.classList.add("failed"); opts.onFail?.(el); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  el.append(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(opts.small ? 30 : 32, 1, .1, 50);
  camera.position.set(0, opts.small ? 1.9 : 2.25, opts.small ? 4.6 : 4.9); camera.lookAt(0, .7, 0);
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#B5D6A8", .9));
  const sun = new THREE.DirectionalLight("#FFF4E0", 2.2); sun.position.set(2.5, 5, 3.5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, {left:-3, right:3, top:3, bottom:-3}); sun.shadow.radius = 4; scene.add(sun);
  buildGarden(scene, opts.ground || "#9BDB7C");

  // the pet
  const parts = {}, holder = new THREE.Group(); scene.add(holder);
  let mixer = null, actions = {}, current = null, head = null, anim = null;
  if (isPlant){ holder.add(buildPlant(level, parts)); }
  else {
    let gltf;
    try { gltf = await loadModel(opts.type); } catch { el.classList.add("failed"); opts.onFail?.(el); renderer.dispose(); return; }
    const model = SkeletonUtils.clone(gltf.scene);
    model.traverse(o => {
      if (o.isMesh){ o.castShadow = true; o.frustumCulled = false;
}
      if (o.isBone && !head && /^head$/i.test(o.name)) head = o;
    });
    mixer = new THREE.AnimationMixer(model);
    for (const k of ["idle", "walk", "happy", "sleep", "extra"]){ const clip = clipFor(gltf, cfg[k]); if (clip) actions[k] = mixer.clipAction(clip); }
    if (actions.happy) actions.happy.setLoop(THREE.LoopOnce, 1);
    if (actions.extra) actions.extra.setLoop(THREE.LoopOnce, 1);
    // measure in the standing (idle) pose: skinned models must be measured with their bones applied
    const measure = () => { if (actions.idle){ actions.idle.play(); mixer.update(0); } model.updateMatrixWorld(true); return new THREE.Box3().setFromObject(model, true); };
    const grow = Math.min(1.2, .85 + level*.035);
    const size = measure().getSize(new THREE.Vector3());
    const s = cfg.h / Math.max(size.y, 1e-6) * grow; model.scale.multiplyScalar(s);
    const box2 = measure(), c2 = box2.getCenter(new THREE.Vector3());
    model.position.x -= c2.x; model.position.z -= c2.z; model.position.y -= box2.min.y;
    model.updateMatrixWorld(true);
    // which way does this model face? turn it so its head points forward (+Z)
    let face = 0;
    if (head){ const hp = head.getWorldPosition(new THREE.Vector3()); if (Math.hypot(hp.x, hp.z) > cfg.h * grow * .12) face = Math.atan2(hp.x, hp.z); }
    actions.idle?.stop();
    const turn = new THREE.Group(); turn.rotation.y = -face; turn.add(model); holder.add(turn);
    anim = animator(model, holder);
    if (head && level >= 3){
      parts.head = head; parts.headH = cfg.h * grow;
      parts.topper = level >= 5 ? crownMesh() : bowMesh();
      parts.topper.scale.setScalar(level >= 5 ? .75 : .8); scene.add(parts.topper);
    }
  }
  if (level >= 7){
    parts.stars = [];
    for (let k = 0; k < 3; k++){ const st = new THREE.Mesh(new THREE.OctahedronGeometry(.07), toon("#FFD166", {emissive:"#FFB020", emissiveIntensity:.6})); scene.add(st); parts.stars.push(st); }
  }
  const S = {x:0, z:0, ry:.6, rest:.6, tx:0, tz:0, walking:false, wait:1.5, v:0, extraT:6 + Math.random()*6, happyT:0, look:0, lookT:3, yaw:0};
  // Looking at the child: animals without their own head animation (all but the cat and parrot) turn their head
  // towards the camera now and then while standing, and always right after being patted.
  const lookHead = !isPlant && !opts.small && head && !anim?.procWalk ? head : null, headRest = lookHead?.quaternion.clone();
  const qp = new THREE.Quaternion(), qh = new THREE.Quaternion(), qa = new THREE.Quaternion(), ax = new THREE.Vector3(), tv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const turnBone = (bone, axis, angle) => {        // rotate a bone around a holder-space axis, after the clip has posed it
    bone.parent.getWorldQuaternion(qp); holder.getWorldQuaternion(qh);
    ax.copy(axis).applyQuaternion(qh).applyQuaternion(qp.invert()).normalize();
    bone.quaternion.premultiply(qa.setFromAxisAngle(ax, angle));
  };
  const play = (name, fade = .35) => {
    const a = actions[name] || actions.idle; if (!a || a === current) return;
    a.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (current) current.fadeOut(fade);
    current = a;
  };
  play(api.mood === "sleepy" && !opts.small ? "sleep" : "idle", 0);
  if (mixer) mixer.addEventListener("finished", e => { if (e.action === actions.happy || e.action === actions.extra){ e.action.fadeOut(.3); current = null; play(S.walking ? "walk" : "idle", .3); } });
  api.onMood = () => { if (!S.walking && current !== actions.happy && current !== actions.extra) play(api.mood === "sleepy" && !opts.small ? "sleep" : "idle"); };

  // size the canvas to its box
  const fit = () => { const w = el.clientWidth || 300, h = el.clientHeight || 220; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(fit); ro.observe(el); fit();
  let visible = true; const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(el);

  // behaviour: walk to a spot, stop, look around (idle animation), sometimes eat, walk again.
  const wander = !isPlant && !opts.small && !cfg.stay;
  const ease = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k*dt));
  const onTap = () => {
    if (opts.small) return;
    S.walking = false; S.v = 0; S.wait = 2.5; S.happyT = anim?.procHappy ? 3 : 1.2; S.lookT = -2.5;   // look up at the child
    if (actions.happy && api.mood !== "sleepy"){ current?.fadeOut(.2); current = null; play("happy", .2); }
    const rect = el.getBoundingClientRect(), v = new THREE.Vector3(S.x, isPlant ? 1.4 : 1.1, S.z).project(camera);
    opts.onPet?.({x:(v.x*.5 + .5) * rect.width, y:(-v.y*.5 + .5) * rect.height});
  };
  renderer.domElement.addEventListener("click", onTap);
  api.tap = onTap;

  const clock = new THREE.Clock(); let t = 0, gone = 0, raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.05, clock.getDelta()); t += dt;
    if (!el.isConnected){ gone += dt; if (gone > 3) return dispose(); return; } gone = 0;
    if (!visible || document.hidden) return;
    const sleepy = api.mood === "sleepy" && !opts.small, busy = current && (current === actions.happy || current === actions.extra);

    if (wander && !sleepy && !busy){
      if (!S.walking){
        S.wait -= dt; S.extraT -= dt;
        const back = Math.atan2(Math.sin(S.rest - S.ry), Math.cos(S.rest - S.ry)); S.ry += back * (1 - Math.exp(-.8*dt));   // turn three-quarters towards you
        if (S.extraT <= 0 && actions.extra){ S.extraT = 10 + Math.random()*10; current?.fadeOut(.3); current = null; play("extra"); }
        else if (S.wait <= 0){
          let nx, nz; do { nx = (Math.random()*2 - 1) * 1.45; nz = -.6 + Math.random()*1.4; } while (Math.hypot(nx - S.x, nz - S.z) < .7);
          S.tx = nx; S.tz = nz; S.walking = true; play("walk");
        } else play("idle");
      } else {
        const dx = S.tx - S.x, dz = S.tz - S.z, d = Math.hypot(dx, dz);
        let diff = Math.atan2(dx, dz) - S.ry; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        S.ry += Math.max(-2.2*dt, Math.min(2.2*dt, diff));
        S.v = ease(S.v, Math.abs(diff) < .5 ? cfg.speed : 0, 4, dt);
        const step = Math.min(d, S.v*dt); S.x += Math.sin(S.ry)*step; S.z += Math.cos(S.ry)*step;
        if (actions.walk) actions.walk.timeScale = Math.max(.5, S.v / cfg.speed);
        if (d < .08){ S.walking = false; S.v = 0; S.wait = 2 + Math.random()*3; S.rest = (S.x > 0 ? -1 : 1) * (.45 + Math.random()*.3); play("idle"); }
      }
    } else if (sleepy && !busy){ S.walking = false; play("sleep"); if (actions.sleep) actions.sleep.timeScale = .5; }
    if (opts.small || cfg.stay) S.ry = .5 + Math.sin(t*.25)*.45;
    if (!isPlant && !actions.happy && !anim?.procHappy) S.hopY = S.happyT > 0 ? Math.sin((1.2 - S.happyT) / 1.2 * Math.PI) * .18 : 0;
    holder.position.set(S.x, (S.hopY || 0) + (anim?.bob?.() || 0), S.z); holder.rotation.y = S.ry;
    anim?.reset?.();
    if (lookHead) lookHead.quaternion.copy(headRest);      // clips that don't move the head would otherwise add up our turns
    if (mixer) mixer.update(dt);
    if (lookHead){
      // glance: every 5-9 s look for ~2.5 s (negative lookT = looking); never while walking or asleep
      S.lookT -= dt; if (S.lookT < -2.6) S.lookT = 5 + Math.random() * 4;
      const want = !S.walking && !sleepy && S.lookT < 0 ? 1 : 0;
      S.look += (want - S.look) * (1 - Math.exp(-3 * dt));
      if (S.look > .01){
        holder.updateMatrixWorld(true);
        lookHead.getWorldPosition(tv); tv.subVectors(camera.position, tv).applyQuaternion(holder.getWorldQuaternion(qh).invert());
        S.yaw += (Math.max(-.8, Math.min(.8, Math.atan2(tv.x, tv.z))) - S.yaw) * (1 - Math.exp(-4 * dt));
        turnBone(lookHead, UP, S.yaw * S.look);
      }
    }
    anim?.update(dt, t, {walking:S.walking, speed:cfg.speed ? Math.min(1, S.v / cfg.speed) : 0, speedRaw:S.v, happy:S.happyT, sleepy});
    if (S.happyT > 0) S.happyT -= dt;
    if (parts.topper){ scene.updateMatrixWorld(); const hp = parts.head.getWorldPosition(new THREE.Vector3()); parts.topper.position.set(hp.x, hp.y + parts.headH * .14, hp.z); parts.topper.rotation.y = S.ry; }

    // plant: gentle sway; shakes happily when watered
    if (parts.stem){ parts.stem.rotation.z = Math.sin(t*1.1)*.05 + (S.happyT > 0 ? Math.sin(t*10)*.06 : 0) + (sleepy ? .1 : 0); }
    (parts.leaves || []).forEach((lf, i) => { lf.rotation.z = lf.userData.base + Math.sin(t*1.4 + i)*.06 - (sleepy ? lf.userData.base*.4 : 0); });
    if (parts.eyes){ const blink = (t % 4) < .12; parts.eyes.forEach(e => e.scale.y = sleepy ? .12 : S.happyT > 0 ? .35 : blink ? .1 : 1); }
    (parts.stars || []).forEach((st, i) => { const a = t*.7 + i*2.1; st.position.set(S.x + Math.cos(a)*.9, 1.45, S.z + Math.sin(a)*.9); st.rotation.y = t; });

    renderer.render(scene, camera);
  };
  tick();
  function dispose(){
    cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mixer?.stopAllAction();
    renderer.dispose(); renderer.forceContextLoss?.(); api.disposed = true;
  }
  api.dispose = dispose; api.ready = true;
}
