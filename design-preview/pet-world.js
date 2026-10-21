import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const root = document.getElementById('pet-world');
const status = document.getElementById('world-status');
const say = text => {document.getElementById('pet-speech').textContent = text;};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const configs = {
 pony:{file:'pony.glb',name:'Twinkle',h:1.65,walk:'WalkSlow',idle:'Idle',speed:.5,colors:{'Material.003':'#cb955c','Material.006':'#634779'}},
 dog:{file:'dog.glb',name:'Biscuit',h:.95,walk:'Walk',idle:'Idle',eat:'Eating',speed:.52,colors:{Main:'#d99953',Main_Light:'#fff0d2'}},
 fox:{file:'fox.glb',name:'Maple',h:1.02,walk:'Walk',idle:'Idle',eat:'Eating',speed:.55,colors:{Main:'#ef9645',Main_Light:'#fff0dc',Grey:'#57424c'}},
 rabbit:{file:'rabbit.glb',name:'Mochi',h:.86,walk:'Bunny_walk',idle:'Bunny_idle',speed:.38,colors:{Fur:'#e0c0a7',Fur_white:'#fff0de'}}
};
let renderer;
try {renderer = new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});} catch(e) {
 status.textContent='This device could not start 3D. Try Chrome or Edge with graphics acceleration enabled.'; throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.domElement.setAttribute('aria-label','Interactive 3D pet island. Choose a pet or use the walk, treat, and hello buttons.');
root.prepend(renderer.domElement);
const scene=new T.Scene();
scene.background=new T.Color('#d4f0ff');scene.fog=new T.Fog('#d4f0ff',15,28);
const camera=new T.PerspectiveCamera(35,1,.1,60);
let yaw=.42,zoom=6.9;
function setCamera(){camera.position.set(Math.sin(yaw)*zoom,3.5,Math.cos(yaw)*zoom);camera.lookAt(0,.6,0);}
setCamera();
const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=environment.texture;pmrem.dispose();
scene.add(new T.HemisphereLight('#e6f6ff','#a3bf88',1.25));
const sun=new T.DirectionalLight('#fff1d4',2.6);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
const fill=new T.DirectionalLight('#d8d9ff',.7);fill.position.set(4,3,-2);scene.add(fill);
const mat=(color,roughness=.72)=>new T.MeshStandardMaterial({color,roughness,metalness:0,envMapIntensity:.45});
const cache=new Map();function material(c){if(!cache.has(c))cache.set(c,mat(c));return cache.get(c);}
function mesh(geo,col,x=0,y=0,z=0){const m=new T.Mesh(geo,material(col));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function ball(col,x,y,z,sx,sy=sx,sz=sx){const m=mesh(new T.SphereGeometry(1,24,16),col,x,y,z);m.scale.set(sx,sy,sz);return m;}
const island=mesh(new T.CylinderGeometry(2.65,2.45,.48,80),'#c79fdb',0,-.3,0);scene.add(island);
const rim=mesh(new T.CylinderGeometry(2.69,2.66,.11,80),'#a4d991',0,-.025,0);scene.add(rim);
const grass=mesh(new T.CylinderGeometry(2.6,2.6,.07,80),'#aeda8a',0,.025,0);scene.add(grass);
const ground=grass;
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sx=shadowCanvas.getContext('2d');const grad=sx.createRadialGradient(64,64,4,64,64,64);grad.addColorStop(0,'rgba(38,70,58,.28)');grad.addColorStop(1,'rgba(38,70,58,0)');sx.fillStyle=grad;sx.fillRect(0,0,128,128);
const contact=new T.Mesh(new T.PlaneGeometry(1.4,1.2),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.07;scene.add(contact);
// A toy-like garden in actual 3D, with clear walking space in the middle.
function tree(x,z,color){const g=new T.Group();g.add(mesh(new T.CylinderGeometry(.09,.12,.75,12),'#bd8f6c',0,.38,0));g.add(ball(color,0,1.1,0,.48,.58,.45));g.add(ball(color,.3,.96,.05,.33,.4,.35));g.add(ball(color,-.24,1.02,.08,.32,.4,.32));g.position.set(x,0,z);scene.add(g);return g;}
tree(-1.8,-1.2,'#6ab69a');tree(1.8,-1.15,'#8da6de');
function flower(x,z,color,size=1){const g=new T.Group();g.add(mesh(new T.CylinderGeometry(.014,.014,.18,6),'#5ba77a',0,.12,0));for(let j=0;j<5;j++){let a=j/5*Math.PI*2;g.add(ball(color,Math.cos(a)*.075,.25+Math.sin(a)*.075,0,.06,.06,.027));}g.add(ball('#ffd36a',0,.25,.03,.045));g.scale.setScalar(size);g.position.set(x,0,z);g.rotation.y=.3;scene.add(g);return g;}
const blooms=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const r=2.13+(i%3)*.1;if(Math.sin(a)>.65 && i%2)continue;blooms.push(flower(Math.cos(a)*r,Math.sin(a)*r,['#ffe3ec','#c7b6ff','#fff8da','#ffb9ce'][i%4],.8+(i%3)*.2));}
for(let i=0;i<11;i++){const a=Math.PI+i/10*Math.PI;let x=Math.cos(a)*2.28,z=Math.sin(a)*2.28;const fence=mesh(new T.BoxGeometry(.13,.5,.13),'#fff3db',x,.3,z);fence.rotation.y=-a;scene.add(fence);if(i<10){const a2=a+Math.PI/10;const p1=new T.Vector3(x,.33,z),p2=new T.Vector3(Math.cos(a2)*2.28,.33,Math.sin(a2)*2.28);const beam=mesh(new T.CylinderGeometry(.04,.04,p1.distanceTo(p2),10),'#fff3db');beam.position.copy(p1).add(p2).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),p2.sub(p1).normalize());scene.add(beam);}}
for(let i=0;i<5;i++){const stone=mesh(new T.CylinderGeometry(.17,.19,.045,18),'#eae2dc',.62+i*.21,.09,.9+i*.18);stone.scale.z=.7;scene.add(stone);}
function mushroom(x,z,c){const g=new T.Group();g.add(mesh(new T.CylinderGeometry(.045,.065,.2,10),'#fff3df',0,.15,0));g.add(ball(c,0,.28,0,.19,.11,.19));for(let j=0;j<3;j++)g.add(ball('#fff6e9',Math.cos(j*2.1)*.09,.355,Math.sin(j*2.1)*.09,.025,.012,.025));g.position.set(x,0,z);scene.add(g);}
mushroom(-1.9,.6,'#f7a5c4');mushroom(-1.65,.8,'#c6a4f1');mushroom(1.9,.3,'#ffc675');
const bowl=mesh(new T.TorusGeometry(.19,.05,12,32),'#b995eb',1.45,.14,.6);bowl.rotation.x=Math.PI/2;scene.add(bowl);const water=mesh(new T.CylinderGeometry(.16,.16,.03,32),'#8ed9ec',1.45,.11,.6);scene.add(water);
const clouds=[];for(const [x,y,z,s] of [[-3.5,3,-3,.6],[3,3.5,-4,.7],[0,4,-5,.5]]){const cloud=new T.Group();cloud.add(ball('#ffffff',0,0,0,s,s*.4,s*.35));cloud.add(ball('#ffffff',-.4*s,.14*s,0,s*.6,s*.45,s*.35));cloud.add(ball('#ffffff',.35*s,.16*s,0,s*.65,s*.5,s*.35));cloud.position.set(x,y,z);scene.add(cloud);clouds.push(cloud);}
const orb=ball('#ffdc83',-2.9,3,-5,.5);orb.material=new T.MeshBasicMaterial({color:'#ffe39e'});scene.add(orb);
const butterfly=new T.Group();const wing1=ball('#c4a2ff',.08,0,0,.11,.025,.16),wing2=ball('#ffb9d2',-.08,0,0,.11,.025,.16);butterfly.add(wing1,wing2);scene.add(butterfly);
let model,holder=new T.Group(),mixer,actions={},current,head,headBase,ready=false,loading=0,currentType='pony';scene.add(holder);
const s={x:0,z:0,yaw:-.6,tx:0,tz:0,walking:false,wait:1.5,paused:reduced,treat:0,hello:0,clip:'',distance:0};
const loader=new GLTFLoader();
function play(name,fade=.3){const a=actions[name]||actions.idle;if(!a||a===current)return;current?.fadeOut(fade);a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();current=a;s.clip=name;}
async function selectPet(type){const ticket=++loading;ready=false;status.hidden=false;status.textContent='Waking up your 3D buddy…';document.querySelectorAll('[data-pet]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pet===type)));
 try{const cfg=configs[type];const gltf=await loader.loadAsync(`models/${cfg.file}`);if(ticket!==loading)return;currentType=type;
 if(model){holder.remove(model);model.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});mixer?.stopAllAction();}
 model=gltf.scene;actions={};current=null;head=null;
 model.traverse(m=>{if(m.isBone&&/^head$/i.test(m.name))head=m;if(!m.isMesh)return;
  const old=m.material;const color=cfg.colors[old.name];
  if(!old.map){const g=m.geometry;g.deleteAttribute('normal');const sm=mergeVertices(g,1e-4);sm.computeVertexNormals();m.geometry=sm;}
  m.material=new T.MeshPhysicalMaterial({map:old.map||null,color:color||old.color,roughness:/eye|pupil/i.test(old.name)?.2:.68,metalness:0,clearcoat:/eye|pupil/i.test(old.name)?1:.08,clearcoatRoughness:.35,envMapIntensity:.6});m.material.name=old.name;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;
 });
 mixer=new T.AnimationMixer(model);for(const [kind,name] of Object.entries({idle:cfg.idle,walk:cfg.walk,eat:cfg.eat})){const clip=gltf.animations.find(a=>a.name.split('|').pop()===name);if(clip)actions[kind]=mixer.clipAction(clip);}
 actions.idle?.play();mixer.update(0);model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model,true);const scale=cfg.h/box.getSize(new T.Vector3()).y;model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model,true);const c=b.getCenter(new T.Vector3());model.position.set(-c.x,-b.min.y,-c.z);model.updateMatrixWorld(true);
 let face=0;if(head){const hp=head.getWorldPosition(new T.Vector3());if(Math.hypot(hp.x,hp.z)>.12)face=Math.atan2(hp.x,hp.z);}
 const turn=new T.Group();turn.rotation.y=-face;turn.add(model);holder.clear();holder.add(turn);model=turn;
 headBase=head?.quaternion.clone();s.x=0;s.z=0;s.yaw=-.6;s.walking=false;s.wait=1.4;s.treat=0;s.hello=0;current=null;play('idle',0);ready=true;status.hidden=true;
 document.getElementById('pet-name').textContent=cfg.name;document.getElementById('pet-kind').textContent=type==='pony'?'Your 3D pony pal':'Your 3D '+type+' pal';say(reduced?'Ready when you are! Use the walk button.':'I’m real 3D! Watch me explore ✨');
 }catch(e){status.hidden=false;status.textContent='The 3D buddy could not load. Please refresh to try again.';console.error(e);}}
function target(x,z){const r=Math.hypot(x,z);if(r>1.35){x=x/r*1.35;z=z/r*1.35;}s.tx=x;s.tz=z;s.walking=true;s.treat=0;s.hello=0;play('walk');}
function randomTarget(){let x,z;do{x=(Math.random()-.5)*2.4;z=(Math.random()-.5)*1.9;}while(Math.hypot(x-s.x,z-s.z)<.55);target(x,z);}
function greet(){if(!ready)return;s.walking=false;s.wait=3;s.hello=2;s.treat=0;play('idle');say('Hi, bestie! So happy you’re here 💜');}
function feed(){if(!ready)return;s.walking=false;s.wait=4;s.treat=3;s.hello=0;play(actions.eat?'eat':'idle');say('Nom nom! Thank you for my treat 🥕');}
document.getElementById('walk-button').addEventListener('click',()=>{if(!ready)return;s.paused=false;randomTarget();say('Adventure time! Tap the grass to guide me 🐾');});
document.getElementById('feed-button').addEventListener('click',feed);
document.getElementById('hello-button').addEventListener('click',greet);
document.querySelectorAll('[data-pet]').forEach(b=>b.addEventListener('click',()=>selectPet(b.dataset.pet)));
let pointer=null;const ray=new T.Raycaster();const mouse=new T.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,drag:false};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x;if(Math.abs(dx)>3||Math.abs(e.clientY-pointer.y)>3){pointer.drag=true;yaw-=dx*.008;pointer.x=e.clientX;pointer.y=e.clientY;setCamera();}});
renderer.domElement.addEventListener('pointerup',e=>{if(pointer&&!pointer.drag&&ready){const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const petHit=ray.intersectObject(holder,true)[0];if(petHit)greet();else{const hit=ray.intersectObject(ground)[0];if(hit){s.paused=false;target(hit.point.x,hit.point.z);say('On my way! 🐾');}}}pointer=null;});
renderer.domElement.addEventListener('pointercancel',()=>pointer=null);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();status.hidden=false;status.textContent='3D paused. Refresh this page to restart.';});
const resize=()=>{const w=root.clientWidth,h=root.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(root);resize();
let last=performance.now(),elapsed=0,frames=0;const scratch=new T.Quaternion(),axis=new T.Vector3(1,0,0);
function tick(now){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.04);last=now;if(document.hidden)return;elapsed+=dt;frames++;
 if(ready){if(head&&headBase)head.quaternion.copy(headBase);mixer.update(dt);
  if(s.hello>0){s.hello-=dt;s.yaw+=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw))*Math.min(1,dt*2);if(head){scratch.setFromAxisAngle(axis,Math.sin(elapsed*5)*.1);head.quaternion.multiply(scratch);}}
  else if(s.treat>0){s.treat-=dt;if(!actions.eat&&head){scratch.setFromAxisAngle(axis,-.22+Math.sin(elapsed*4)*.06);head.quaternion.multiply(scratch);}if(s.treat<=0){play('idle');say('That was yummy! Let’s explore ✨');}}
  else if(s.walking){const dx=s.tx-s.x,dz=s.tz-s.z,d=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);let diff=Math.atan2(Math.sin(angle-s.yaw),Math.cos(angle-s.yaw));s.yaw+=Math.max(-dt*2.4,Math.min(dt*2.4,diff));const step=Math.min(d,configs[currentType].speed*dt*(Math.abs(diff)<.7?1:.2));if(d>0){s.x+=dx/d*step;s.z+=dz/d*step;s.distance+=step;}
   if(d<.06){s.walking=false;s.wait=1.5+Math.random()*1.8;play('idle');}}
  else if(!s.paused){s.wait-=dt;if(s.wait<=0)randomTarget();}
  holder.position.set(s.x,.075,s.z);holder.rotation.y=s.yaw;contact.position.set(s.x,.07,s.z);
 }
 if(!reduced){butterfly.position.set(Math.cos(elapsed*.4)*1.8,.7+Math.sin(elapsed*1.5)*.15,Math.sin(elapsed*.4)*1.5);butterfly.rotation.y=-elapsed*.4;wing1.rotation.z=Math.sin(elapsed*13)*.7;wing2.rotation.z=-Math.sin(elapsed*13)*.7;}
 renderer.render(scene,camera);
}
requestAnimationFrame(tick);selectPet('pony');
// Read-only diagnostics for smoke tests; contains only fictional demo state.
window.petPreview={get state(){return {ready,type:currentType,walking:s.walking,x:s.x,z:s.z,clip:s.clip,distance:s.distance,frames,animations:Object.keys(actions),bone:head?head.quaternion.toArray():null,canvas:!!renderer.domElement,renderer:renderer.info.render.calls};}};
