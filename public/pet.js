import { createPet3D } from "/pet3d.js";
// Salah Tracker — prayer pet. Every prayer feeds the pet (1 food each, bonus prayers too); food makes it grow.
// Today's prayers set its mood. It wanders its little garden, and tapping it gives hearts.
export const PETS = {
  dog:    {name:"Puppy",  img:"pet-dog",    sky:"#E5F0FF", ground:"#A8DD8A", note:"wags & trots"},
  cat:    {name:"Kitty",  img:"pet-cat",    sky:"#FFE6EF", ground:"#B6E39A", note:"calm & cuddly"},
  parrot: {name:"Parrot", img:"pet-parrot", sky:"#E2F7FF", ground:"#A9DE8C", note:"dances!"},
  rabbit: {name:"Bunny",  img:"pet-rabbit", sky:"#EAF8E6", ground:"#9FD887", note:"hops around"},
  fox:    {name:"Fox",    img:"pet-fox",    sky:"#FFF0E2", ground:"#A6DA86", note:"trots & sniffs"},
  husky:  {name:"Husky",  img:"pet-wolf",   sky:"#E8EEFF", ground:"#B3E0A0", note:"big & fluffy"},
  pony:   {name:"Pony",   img:"pet-horse",  sky:"#F6E9FF", ground:"#B8E39A", note:"gentle walker"},
  frog:   {name:"Froggy", img:"pet-frog",   sky:"#E4FAEC", ground:"#9FD88F", note:"jumps around"},
  plant:  {name:"Plant",  grow:["pet-seedling","pet-herb","pet-potted","av-sunflower","pet-tree","pet-blossom"], plant:true, sky:"#DFF5FF", ground:"#9BDB7C", note:"grows flowers"},
};
// Pets we no longer offer move to the closest one we have.
const OLD = {chick:"parrot", penguin:"parrot", dragon:"parrot", turtle:"frog", unicorn:"pony"};
export const petType = t => PETS[t] ? t : (OLD[t] || "dog");
// Food needed for each level (level 1 = 0 food)
const LEVELS = [0, 8, 20, 40, 70, 110, 160, 230, 320, 450];
export function levelFor(food){ let l = 1; LEVELS.forEach((need, i) => { if (food >= need) l = i + 1; }); return l; }
export const nextNeed = level => LEVELS[level] ?? null;
const imgFor = (type, level) => { const p = PETS[petType(type)]; return p.grow ? p.grow[Math.min(p.grow.length - 1, Math.floor((level - 1) / 2))] : p.img; };

const HAPPY = ["Hehe, that tickles!", "I love you!", "Yay! More pats!", "You're my best friend!", "Purr-fect!", "MashaAllah, you prayed today!", "Wheee!"];
const PLANT_HAPPY = ["Thank you for the water!", "I'm growing so tall!", "Ahh, sunshine!", "Leaves feel happy!"];

// ctx: {el, img, me(), food(uid), todayCount(uid), nextPrayerName(), confetti, toast, save(pet)}
export function petPanel(ctx){
  const {el, img} = ctx, me = ctx.me(), pet = me.pet;
  const head = el("div",{class:"sec-title"}, img("e-hearts"), el("div",{}, el("h2",{}, pet ? pet.name : "Adopt a pet!"), el("div",{class:"small muted"}, pet ? "Every prayer feeds your pet and helps it grow." : "Choose a pet. Each prayer you pray feeds it and makes it grow!")));
  if (!pet) return el("section",{class:"panel stack", id:"pet"}, head, choosePet(ctx));
  const food = ctx.food(me.uid), level = levelFor(food), need = nextNeed(level), prev = LEVELS[level - 1];
  const today = ctx.todayCount(me.uid), info = PETS[petType(pet.type)];
  const mood = today >= 5 ? "super" : today >= 3 ? "happy" : today >= 1 ? "ok" : "sleepy";
  const say = mood === "super" ? (info.plant ? "I'm blooming! All 5 prayers today! ✨" : "Best day ever! All 5 prayers! ✨")
    : mood === "sleepy" ? `I'm hungry… pray ${ctx.nextPrayerName() || "your next prayer"} to feed me!`
    : mood === "ok" ? `Yum! ${today} prayer${today > 1 ? "s" : ""} today. More please!` : `So happy! Only ${5 - today} more today!`;
  const scene = petScene(ctx, petType(pet.type), level, mood, false, me.uid);
  const bubble = el("div",{class:"pet-bubble"}, say);
  scene.onPetLine = line => { bubble.textContent = line; };
  return el("section",{class:"panel stack", id:"pet"},
    el("div",{class:"row", style:"justify-content:space-between"}, head, el("span",{class:"lvl-chip pet-lvl"}, `Level ${level}`)),
    el("div",{class:"pet-stage"}, bubble, scene),
    el("div",{},
      el("div",{class:"track"}, el("i",{style:`width:${need ? Math.min(100, (food - prev) / (need - prev) * 100) : 100}%;background-color:var(--ok)`})),
      el("div",{class:"small muted", style:"margin-top:4px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"},
        el("span",{}, need ? `${need - food} more prayer${need - food === 1 ? "" : "s"} to reach Level ${level + 1}` : "Max level! Your pet is a legend 🌟"),
        el("span",{class:"num"}, `${food} food so far`))),
    el("div",{class:"row", style:"justify-content:space-between"},
      el("span",{class:"small muted"}, info.plant ? "Tap your plant to water it." : `Tap ${pet.name} to give pats!`),
      el("button",{class:"linkbtn", onclick:() => ctx.openChooser()}, "Rename or change pet")),
    el("div",{class:"pet-credit"}, "3D animals by Quaternius (CC0) · Bunny by Sherkiz, Cat by J-Toastie, Macaw by Poly by Google (CC-BY) · via poly.pizza"));
}

// Live 3D pets are kept between page refreshes so they keep walking where they were.
const live = new Map();
export function petScene(ctx, type, level, mood, small = false, key = ""){
  type = petType(type);
  const {el, img} = ctx, info = PETS[type], k = `${key}|${type}|${level}|${small}`;
  let api = live.get(k);
  if (!api || api.disposed){
    const wrap = el("div",{class:`pet-home pet-3d ${small ? "small" : ""}`, style:`--sky:${info.sky};--ground:${info.ground}`},
      img("cloud", "deco c1"), img("cloud", "deco c2"), level >= 4 ? img("butterfly2", "deco bf") : null);
    const zzz = img("e-zzz", "pet-zzz3d");
    api = createPet3D({type, level, mood, small, ground:info.ground,
      onPet:pos => {
        for (let i = 0; i < 6; i++){
          const h = img(info.plant ? "droplet" : "e-heart", "pet-heart");
          h.style.left = `${pos.x + (Math.random()*50 - 25)}px`; h.style.top = `${pos.y}px`; h.style.bottom = "auto";
          h.style.animationDelay = `${i*70}ms`; h.style.setProperty("--dx", `${Math.random()*60 - 30}px`);
          wrap.append(h); setTimeout(() => h.remove(), 1500);
        }
        const lines = info.plant ? PLANT_HAPPY : HAPPY;
        wrap.onPetLine?.(lines[Math.random()*lines.length | 0]);
      },
      onFail:() => { const flat = flatScene(ctx, type, level, mood, small); wrap.replaceWith(flat); live.delete(k); }});
    wrap.append(api.el, zzz); api.wrap = wrap; api.zzz = zzz; live.set(k, api);
  }
  api.setMood(mood);
  api.zzz.hidden = !(mood === "sleepy" && !small);
  return api.wrap;
}

// Fallback (no 3D support): picture-based garden.
function flatScene(ctx, type, level, mood, small = false){
  const {el, img} = ctx, info = PETS[type] || PETS.cat;
  const scale = info.grow ? 1 : Math.min(1.25, .7 + level * .06);
  const sprite = img(imgFor(type, level), "pet-img");
  const extras = el("div",{class:"pet-extras"},
    !info.grow && level >= 3 ? img("pet-ribbon", "pet-acc ribbon") : null,
    level >= 5 ? img("crown", "pet-acc crown") : null);
  const body = el("div",{class:`pet-body ${info.plant ? "is-plant" : ""} mood-${mood}`, style:`--s:${scale}`}, sprite, extras);
  const walker = el("div",{class:"pet-walker", role:"button", tabindex:"0", "aria-label":"Pet your pet"}, body,
    mood === "sleepy" ? img("e-zzz", "pet-zzz") : null);
  const scene = el("div",{class:`pet-home ${small ? "small" : ""}`, style:`--sky:${info.sky};--ground:${info.ground}`},
    img("cloud", "deco c1"), img("cloud", "deco c2"), level >= 4 ? img("butterfly2", "deco bf") : null,
    level >= 7 ? img("sparkles", "deco sp") : null, walker);
  // wandering
  let x = 50, alive = true;
  if (!info.plant && !small){
    const wander = () => {
      if (!alive || !scene.isConnected) return;
      const nx = 15 + Math.random() * 70, right = nx > x;
      body.classList.toggle("face-right", right); walker.classList.add("walking");
      walker.style.left = `${nx}%`; x = nx;
      setTimeout(() => walker.classList.remove("walking"), 1600);
      setTimeout(wander, mood === "sleepy" ? 6000 : 2600 + Math.random() * 2200);
    };
    setTimeout(wander, 800);
  }
  const pat = () => {
    if (small) return;
    body.classList.remove("jump"); void body.offsetWidth; body.classList.add("jump");
    for (let i = 0; i < 6; i++){
      const h = img(info.plant ? "droplet" : "e-heart", "pet-heart");
      h.style.left = `${x + (Math.random() * 16 - 8)}%`; h.style.animationDelay = `${i * 70}ms`; h.style.setProperty("--dx", `${Math.random() * 60 - 30}px`);
      scene.append(h); setTimeout(() => h.remove(), 1500);
    }
    const lines = info.plant ? PLANT_HAPPY : HAPPY;
    scene.dispatchEvent(new CustomEvent("petted", {detail: lines[Math.random() * lines.length | 0]}));
  };
  walker.addEventListener("click", pat);
  walker.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") pat(); });
  return scene;
}

export function choosePet(ctx, current){
  const {el, img} = ctx;
  let type = current?.type ? petType(current.type) : "dog", name = current?.name || "";
  const nameIn = el("input",{id:"pet-name", maxlength:"16", placeholder:"Give your pet a name", value:name});
  const grid = el("div",{class:"pet-pick"}, Object.entries(PETS).map(([k, p]) => el("button",{type:"button", class:"pp", "aria-pressed":String(k === type),
    onclick:e => { type = k; grid.querySelectorAll(".pp").forEach(b => b.setAttribute("aria-pressed", String(b === e.currentTarget))); if (!nameIn.value || Object.values(PETS).some(x => x.name === nameIn.value)) nameIn.value = p.name; }},
    img(p.grow ? p.grow[p.grow.length - 1] : p.img), el("b",{}, p.name), el("span",{}, p.note))));
  if (!nameIn.value) nameIn.value = PETS[type].name;
  return el("div",{class:"stack", style:"gap:12px"}, grid,
    el("div",{class:"field"}, el("label",{for:"pet-name"},"Name"), nameIn),
    el("button",{class:"btn primary", onclick:() => {
      const n = nameIn.value.trim() || PETS[type].name;
      ctx.save({type, name:n, since:current?.since || new Date().toISOString().slice(0,10)});
    }}, img("e-hearts"), current ? "Save" : "Adopt!"));
}
