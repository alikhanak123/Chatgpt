import * as T from 'three';

// A new rounded character sculpt driven by the original licensed horse skeleton.
// The original mesh is replaced visually; its animated bones still drive every limb.
export function createPonyCharacter(model, scene) {
  model.updateMatrixWorld(true);
  const bones = {};
  model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  model.traverse(o => { if (o.isMesh) o.visible = false; });
  const pos = name => bones[name].getWorldPosition(new T.Vector3());
  const coat = new T.MeshPhysicalMaterial({color:'#d9a06f',roughness:.65,clearcoat:.12,clearcoatRoughness:.5});
  const cream = new T.MeshStandardMaterial({color:'#fff0d8',roughness:.8});
  const pink = new T.MeshStandardMaterial({color:'#eaa6a0',roughness:.8});
  const mane = new T.MeshPhysicalMaterial({color:'#5767a9',roughness:.5,clearcoat:.25,clearcoatRoughness:.4});
  const maneLight = new T.MeshStandardMaterial({color:'#8093ce',roughness:.58});
  const hoof = new T.MeshStandardMaterial({color:'#6f526c',roughness:.58});
  const dark = new T.MeshStandardMaterial({color:'#422f43',roughness:.45});
  const sphere = new T.SphereGeometry(1,40,28);
  function ellipsoid(parent, material, xyz, size) {
    const m = new T.Mesh(sphere, material);
    m.position.set(...xyz); m.scale.set(...size); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function attach(bone, group) { scene.add(group); scene.updateMatrixWorld(true); bones[bone].attach(group); return group; }
  function shell(bone, center, size, material=coat) {
    const g = new T.Group(); g.position.copy(center); ellipsoid(g,material,[0,0,0],size); return attach(bone,g);
  }
  function segment(from, to, radius, material=coat, endRadius=radius) {
    const a=pos(from), b=pos(to), d=b.clone().sub(a), length=d.length();
    const g=new T.Group();g.position.copy(a).add(b).multiplyScalar(.5);
    const mesh=new T.Mesh(new T.CapsuleGeometry(radius,Math.max(.01,length-radius*1.4),8,24),material);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());g.add(mesh);
    return attach(from,g);
  }
  shell('Torso',new T.Vector3(0,.87,-.12),[.36,.37,.63]);
  shell('Hips',new T.Vector3(0,.89,-.52),[.35,.37,.36]);
  shell('Shoulders',new T.Vector3(0,.91,.25),[.31,.39,.32]);
  segment('Shoulders','Neck',.20); segment('Neck','Head',.185);
  for(const side of ['L','R']) {
    for(const pair of ['Front','Back']) {
      segment(`${pair}UpLeg${side}`,`${pair}LowLeg${side}`,pair==='Back'?.11:.095);
      segment(`${pair}LowLeg${side}`,`${pair}Foot${side}`,.075);
      shell(`${pair}LowLeg${side}`,pos(`${pair}LowLeg${side}`),[.085,.095,.085]);
      const f=pos(`${pair}Foot${side}`);f.y=.075;f.z+=.025;
      shell(`${pair}Foot${side}`,f,[.115,.095,.14],hoof);
      const sock=f.clone();sock.y+=.11;
      shell(`${pair}LowLeg${side}`,sock,[.083,.10,.09],cream);
    }
  }
  for(let i=1;i<4;i++)segment(`Tail${i}`,`Tail${i+1}`,.115-i*.012,mane);
  const tip=pos('Tail4');tip.y-=.08;
  shell('Tail4',tip,[.10,.16,.11],maneLight);
  const h=pos('Head'), face=new T.Group();face.position.copy(h);
  ellipsoid(face,coat,[0,.025,.015],[.255,.285,.27]);
  ellipsoid(face,coat,[0,-.16,.20],[.205,.225,.28]);
  ellipsoid(face,cream,[0,-.25,.30],[.235,.145,.215]);
  ellipsoid(face,cream,[0,.07,.266],[.055,.17,.022]);
  for(const side of [-1,1]) {
    const ear=new T.Group();ear.position.set(side*.16,.30,-.07);ear.rotation.z=-side*.16;
    ellipsoid(ear,coat,[0,0,0],[.095,.215,.075]);
    ellipsoid(ear,pink,[0,.015,.057],[.055,.145,.024]);face.add(ear);
    ellipsoid(face,pink,[side*.205,-.125,.235],[.047,.04,.026]);
    ellipsoid(face,dark,[side*.115,-.225,.49],[.029,.018,.012]);
  }
  const mouth=new T.CatmullRomCurve3([new T.Vector3(-.075,-.33,.466),new T.Vector3(0,-.345,.49),new T.Vector3(.075,-.33,.466)]);
  face.add(new T.Mesh(new T.TubeGeometry(mouth,20,.006,6,false),dark));
  const eyes=[];
  for(const side of [-1,1]) {
    const eye=new T.Group();eye.position.set(side*.216,.035,.15);
    eye.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(side*.83,.04,.56).normalize());
    ellipsoid(eye,dark,[0,0,0],[.126,.151,.075]);
    ellipsoid(eye,new T.MeshPhysicalMaterial({color:'#fff9ec',roughness:.25,clearcoat:1}),[0,0,.014],[.114,.137,.073]);
    ellipsoid(eye,new T.MeshPhysicalMaterial({color:'#9a5d39',roughness:.18,clearcoat:1}),[-side*.012,-.002,.075],[.073,.093,.023]);
    ellipsoid(eye,new T.MeshPhysicalMaterial({color:'#231c30',roughness:.08,clearcoat:1}),[-side*.015,-.002,.095],[.045,.069,.013]);
    ellipsoid(eye,new T.MeshBasicMaterial({color:'#ffffff'}),[-.025,.042,.108],[.024,.029,.009]);
    ellipsoid(eye,new T.MeshBasicMaterial({color:'#ffffff'}),[.029,-.035,.11],[.010,.012,.007]);
    eye.userData.eye=true;face.add(eye);eyes.push(eye);
    const brow=ellipsoid(face,mane,[side*.21,.20,.16],[.105,.025,.04]);brow.rotation.z=side*.12;
  }
  // Rounded forelock and a flowing mane replace the original angular hair strip.
  const lock1=ellipsoid(face,mane,[0,.29,.13],[.19,.105,.17]);lock1.rotation.z=-.3;
  const lock2=ellipsoid(face,maneLight,[.10,.24,.22],[.09,.13,.09]);lock2.rotation.z=-.4;
  ellipsoid(face,mane,[-.08,.32,.01],[.13,.09,.13]);
  attach('Head',face);
  for(let i=0;i<5;i++) {
    const point=new T.Vector3(-.02,1.43-i*.115,.40-i*.065);
    const g=shell('Neck',point,[.14,.13,.15],i%2?maneLight:mane);g.rotateZ(i%2?.1:-.1);
  }
  // A small turquoise neckerchief makes the character recognisable from behind.
  const scarf=new T.Group();scarf.position.set(0,1.12,.43);scarf.rotation.x=.6;
  const ring=new T.Mesh(new T.TorusGeometry(.205,.034,12,40),new T.MeshStandardMaterial({color:'#50bca9',roughness:.75}));
  scarf.add(ring);attach('Neck',scarf);
  return {eyes, update(t,happy=false){
    const blink=(t%4.3)<.12 || ((t+1.7)%11.2)<.11;
    const target=blink?.08:happy?.85:1;
    eyes.forEach(e=>{e.scale.y+=(target-e.scale.y)*.55;});
  }};
}
