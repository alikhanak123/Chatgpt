// Salah Tracker — hand rigging for pets whose models came without a full set of animations.
//  • lifelike eyes (glossy, iris + pupil, catch-light, blinking)
//  • the parrot gets a skeleton (body, head, wings, tail) and is animated here: waddle, head tilt, dance
//  • the cat's own bones get a walk cycle, tail swish and head turns
let T = null;
export const useThree = t => { T = t; };

// ---------- eyes ----------
const texCache = new Map();
function eyeTexture(kind){
  if (texCache.has(kind)) return texCache.get(kind);
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"), cat = kind === "cat";
  const R = cat ? 122 : 74;
  x.fillStyle = cat ? "#33400F" : "#F6F2E6"; x.fillRect(0, 0, 256, 256);                  // around the iris
  const g = x.createRadialGradient(128, 128, 8, 128, 128, R);
  if (cat){ g.addColorStop(0, "#F2F59A"); g.addColorStop(.4, "#C9D84A"); g.addColorStop(.8, "#7E9E24"); g.addColorStop(1, "#465A12"); }
  else    { g.addColorStop(0, "#FFF6D2"); g.addColorStop(.65, "#F0D88E"); g.addColorStop(1, "#B98F38"); }
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, R, 0, 7); x.fill();
  x.globalAlpha = .22; x.strokeStyle = cat ? "#41580C" : "#8A6A20"; x.lineWidth = 2;   // iris fibres
  for (let i = 0; i < 90; i++){ const a = i / 90 * Math.PI * 2, r0 = R * (.22 + Math.random() * .12), r1 = R * (.75 + Math.random() * .25);
    x.beginPath(); x.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); x.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); x.stroke(); }
  x.globalAlpha = 1; x.fillStyle = "#040404"; x.beginPath();                              // pupil: a cat's slit, a bird's dot
  if (cat) x.ellipse(128, 128, 17, 80, 0, 0, 7); else x.arc(128, 128, 34, 0, 7);
  x.fill();
  x.strokeStyle = "#00000099"; x.lineWidth = cat ? 9 : 6; x.beginPath(); x.arc(128, 128, R - 3, 0, 7); x.stroke();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; texCache.set(kind, t); return t;
}
function eyeMesh(kind, r){
  const geo = new T.SphereGeometry(r, 32, 24), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / r * .5 + .5, p.getY(i) / r * .5 + .5);   // picture faces +Z
  const eye = new T.Mesh(geo, new T.MeshPhysicalMaterial({map:eyeTexture(kind), roughness:.3, clearcoat:1, clearcoatRoughness:.04, envMapIntensity:1.3}));
  const glint = new T.Mesh(new T.SphereGeometry(r * .17, 12, 8), new T.MeshBasicMaterial({color:"#FFFFFF", toneMapped:false}));
  glint.position.set(r * .38, r * .42, r * .86);
  const lid = new T.Group(); lid.add(eye, glint); lid.userData.eye = true;
  const g = new T.Group(); g.add(lid); return g;
}
// cast a ray at the face; put an eye where it hits, half sunk in, looking out along `out`
function placeEye(root, mesh, head, kind, r, origin, dir, out){
  const hit = new T.Raycaster(origin, dir.clone().normalize()).intersectObject(mesh, false)[0];
  if (!hit) return null;
  const e = eyeMesh(kind, r);
  e.position.copy(hit.point).addScaledVector(out, -r * .5);
  root.add(e); e.lookAt(e.position.clone().add(out)); root.updateMatrixWorld(true);
  head.attach(e);
  return e.children[0];
}
// blink every few seconds; squint when happy; closed when sleepy
export function updateEyes(lids, t, mood){
  if (!lids?.length) return;
  const blink = (t % 3.7) < .13 || ((t + 1.1) % 9.3) < .11;
  const y = mood === "sleepy" ? .08 : mood === "happy" ? .45 : blink ? .1 : 1;
  lids.forEach(l => { l.scale.y += (y - l.scale.y) * .5; });
}

const V = (x, y, z) => new T.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function skinnedVerts(mesh){
  const p = new T.Vector3(), out = [];
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++){ mesh.getVertexPosition(i, p); out.push(p.clone().applyMatrix4(mesh.matrixWorld)); }
  return out;
}

// ---------- rigging, done once per model file (clones share it) ----------
export function rigModel(type, gltf){
  if (type === "cat") return rigCat(gltf);
  if (type === "parrot") return rigParrot(gltf);
}

function rigCat(gltf){
  const o = gltf.scene, mx = new T.AnimationMixer(o);
  mx.clipAction(gltf.animations[0]).play(); mx.update(0); o.updateMatrixWorld(true);
  let mesh; o.traverse(m => { if (m.isSkinnedMesh) mesh = m; });
  const head = o.getObjectByName("Head"), H = head.getWorldPosition(V()), verts = skinnedVerts(mesh);
  const nose = verts.filter(v => v.distanceTo(H) < 1).reduce((a, b) => b.x > a.x ? b : a);  // the cat faces +X
  const d = nose.x - H.x, r = d * .15;
  const lids = [-1, 1].map(s => placeEye(o, mesh, head, "cat", r,
    V(nose.x + d, nose.y + d * .36, s * d * .37), V(-1, 0, -s * .1), V(1, .1, s * .6).normalize()));
  mx.stopAllAction(); mx.uncacheRoot(o);
  o.userData.rig = "cat";
}

// The parrot is one solid mesh, so it gets a skeleton here: every vertex is weighted to body / head / wings / tail / feet.
function rigParrot(gltf){
  const o = gltf.scene; o.updateMatrixWorld(true);
  let src; o.traverse(m => { if (m.isMesh && !src) src = m; });
  const geo = src.geometry, P = geo.attributes.position, n = P.count;
  // model units: feet at y≈-56, head top y≈54, beak towards +z, tail towards -z, x is left/right
  const bones = {root:V(0, -56, 16), body:V(0, -42, 8), head:V(0, 20, 26), tail:V(0, -36, -32), wingL:V(17, 12, 6), wingR:V(-17, 12, 6)};
  const parent = {body:"root", head:"body", tail:"body", wingL:"body", wingR:"body"};
  const names = Object.keys(bones), B = {};
  names.forEach(k => { B[k] = new T.Bone(); B[k].name = k === "head" ? "Head" : k; });
  names.forEach(k => { const p = parent[k]; B[k].position.copy(bones[k]).sub(p ? bones[p] : V(0, 0, 0)); if (p) B[p].add(B[k]); });
  const idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
  for (let i = 0; i < n; i++){
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = Math.abs(x);
    const w = {};
    w.head = smooth(13, 25, y + (z - 26) * .12);
    const wing = smooth(14.5, 20, ax) * (1 - smooth(6, 14, y)) * (1 - w.head);
    w[x > 0 ? "wingL" : "wingR"] = wing;
    w.tail = smooth(-26, -42, z) * (1 - wing) * (1 - w.head);
    w.root = smooth(-36, -44, y) * (ax < 14 && z > -8 ? 1 : 0) * (1 - wing) * (1 - w.tail);   // legs & feet stay planted
    const used = (w.head + wing + w.tail + w.root);
    w.body = Math.max(0, 1 - used);
    const top = Object.entries(w).filter(([, v]) => v > .001).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, [, v]) => s + v, 0);
    top.forEach(([k, v], j) => { idx[i * 4 + j] = names.indexOf(k); wts[i * 4 + j] = v / sum; });
  }
  geo.setAttribute("skinIndex", new T.Uint16BufferAttribute(idx, 4));
  geo.setAttribute("skinWeight", new T.Float32BufferAttribute(wts, 4));
  const sk = new T.SkinnedMesh(geo, src.material); sk.name = src.name; sk.castShadow = true;
  const par = src.parent; par.add(sk); par.remove(src);
  sk.position.copy(src.position); sk.quaternion.copy(src.quaternion); sk.scale.copy(src.scale);
  sk.add(B.root); o.updateMatrixWorld(true);
  sk.bind(new T.Skeleton(names.map(k => B[k])));
  // glossy eyes on the white face patch
  o.updateMatrixWorld(true);
  const lids = [-1, 1].map(s => placeEye(o, sk, B.head, "bird", 3.4, V(s * 40, 42, 47), V(-s, 0, 0), V(s, .1, .35).normalize()));
  o.userData.rig = "parrot";
}

// ---------- per-pet animator (each live clone) ----------
// returns {update(dt, t, st)} where st = {walking, speed (0..1), happy (secs left), sleepy, look (-1..1)}
export function animator(model, holder){
  const kind = model.userData.rig || model.children.find(c => c.userData?.rig)?.userData.rig;
  const lids = []; model.traverse(o => { if (o.userData.eye) lids.push(o); });
  if (kind === "parrot") return parrotAnim(model, lids);
  if (kind === "cat") return catAnim(model, holder, lids);
  return {lids, update(dt, t, st){ updateEyes(lids, t, st.sleepy ? "sleepy" : st.happy > 0 ? "happy" : ""); }};
}
function parrotAnim(model, lids){
  const b = n => model.getObjectByName(n), body = b("body"), head = b("Head"), tail = b("tail"), wl = b("wingL"), wr = b("wingR");
  const rest = {body:body.position.clone(), head:head.position.clone()};
  let phase = 0, look = 0, lookT = 0, tilt = 0, tiltT = 0, nod = 0;
  return {lids, procWalk:true, procHappy:true, update(dt, t, st){
    const walk = st.walking ? st.speed : 0, dance = st.happy > 0 ? 1 : 0, sleepy = st.sleepy;
    phase += dt * (walk * 9 + dance * 7);
    // curious head: looks around and tilts like parrots do
    lookT -= dt; if (lookT <= 0){ look = (Math.random() * 2 - 1) * .8; tiltT = Math.random() < .5 ? (Math.random() < .5 ? -.38 : .38) : 0; lookT = 1.2 + Math.random() * 2; }
    tilt += ((sleepy || walk ? 0 : tiltT) - tilt) * (1 - Math.exp(-4 * dt));
    nod += ((sleepy ? .55 : 0) - nod) * (1 - Math.exp(-2 * dt));
    head.rotation.set(nod + (dance ? Math.sin(phase * 2) * .28 : 0) + (walk ? Math.sin(phase * 2) * .12 : 0), walk || sleepy ? head.rotation.y * .95 : head.rotation.y + (look - head.rotation.y) * (1 - Math.exp(-3 * dt)), tilt);
    // body: waddle when walking, bob when dancing, breathe always
    body.rotation.z = Math.sin(phase) * .12 * walk + Math.sin(phase * .5) * .12 * dance;
    body.rotation.x = sleepy ? .12 : Math.sin(t * 2) * .015;
    body.position.y = rest.body.y + Math.abs(Math.sin(phase)) * 2.2 * walk + Math.abs(Math.sin(phase)) * 1.5 * dance;
    // wings: tucked, flutter when dancing, a small shuffle while walking
    const open = dance ? .08 + Math.abs(Math.sin(phase * 2)) * .14 : walk * .04 + Math.max(0, Math.sin(t * .9) - .985) * 8;
    wl.rotation.z += (open - wl.rotation.z) * .4; wr.rotation.z = -wl.rotation.z;
    // tail sways
    tail.rotation.y = Math.sin(t * 1.3) * .08 + Math.sin(phase) * .12 * walk; tail.rotation.x = dance ? Math.sin(phase * 2) * .15 : -.04;
    updateEyes(lids, t, sleepy ? "sleepy" : dance ? "happy" : "");
  }};
}
// cat: its own bones get a walk cycle on top of its idle animation
function catAnim(model, holder, lids){
  const b = n => model.getObjectByName(n);
  const legs = [["L_Leg_Upper", "L_Leg_Lower", 0, 1], ["R_Leg_Upper", "R_Leg_Lower", Math.PI, 1], ["L_BLeg_Upper", "L_BLeg_Lower", Math.PI, -1], ["R_BLeg_Upper", "R_BLeg_Lower", 0, -1]]
    .map(([u, l, ph, front]) => ({u:b(u), l:b(l), ph, front})).filter(x => x.u && x.l);
  const tails = ["tail1", "tail2", "tail3", "tail4"].map(b).filter(Boolean), head = b("Head"), neck = b("Neck");
  const used = [...legs.flatMap(L => [L.u, L.l]), ...tails, head, neck].filter(Boolean), rest = used.map(o => o.quaternion.clone());
  const side = V(1, 0, 0), up = V(0, 1, 0);       // in the holder: the cat faces +Z, so its legs swing around X
  const qa = new T.Quaternion(), qp = new T.Quaternion(), qh = new T.Quaternion(), ax = new T.Vector3();
  const rotate = (bone, axis, angle) => {      // turn a bone around a holder-space axis
    if (!angle) return;
    bone.parent.getWorldQuaternion(qp); holder.getWorldQuaternion(qh);
    ax.copy(axis).applyQuaternion(qh).applyQuaternion(qp.invert());
    bone.quaternion.premultiply(qa.setFromAxisAngle(ax, angle));
  };
  let phase = 0, look = 0, lookT = 0, lookCur = 0, wW = 0;
  return {lids, procWalk:true, reset(){ used.forEach((o, i) => o.quaternion.copy(rest[i])); }, update(dt, t, st){
    wW += ((st.walking ? st.speed : 0) - wW) * (1 - Math.exp(-6 * dt));
    phase += dt * st.speedRaw * 9;
    model.updateMatrixWorld(true);
    legs.forEach(L => {
      const s = Math.sin(phase + L.ph), lift = Math.max(0, Math.cos(phase + L.ph));
      rotate(L.u, side, -s * .42 * wW);
      rotate(L.l, side, (L.front > 0 ? .6 : .45) * lift * wW);
    });
    // tail: lazy S-curve swish, faster when happy
    const sw = st.happy > 0 ? 3.5 : 1.1;
    tails.forEach((tb, i) => rotate(tb, up, Math.sin(t * sw - i * .6) * (.12 + .05 * i) * (st.sleepy ? .2 : 1)));
    // head: looks around when standing still
    lookT -= dt; if (lookT <= 0){ look = (Math.random() * 2 - 1) * .55; lookT = 1.5 + Math.random() * 2.5; }
    lookCur += ((st.walking || st.sleepy ? 0 : look) - lookCur) * (1 - Math.exp(-2.5 * dt));
    if (neck) rotate(neck, up, lookCur * .45);
    if (head){ rotate(head, up, lookCur * .55); if (st.sleepy) rotate(head, side, .35); }
    updateEyes(lids, t, st.sleepy ? "sleepy" : st.happy > 0 ? "happy" : "");
  }, bob: () => Math.abs(Math.sin(phase)) * .012 * wW};
}
