// Salah Tracker — pet shop. Every prayer earns a star (the same as pet food); stars buy hats, toys and garden things.
// Spending stars never shrinks the pet: its level still counts every prayer.
// Saved on the child's profile: spent (number), shop {owned:"id,id", hat, toy, deco}.
export const SHOP = [
  {id:"cap",      kind:"hat",  name:"Cap",            icon:"s-cap",      price:15},
  {id:"tophat",   kind:"hat",  name:"Top hat",        icon:"s-tophat",   price:20},
  {id:"flowers",  kind:"hat",  name:"Flower crown",   icon:"s-hibiscus", price:25},
  {id:"gradcap",  kind:"hat",  name:"Graduation cap", icon:"s-gradcap",  price:35},
  {id:"ball",     kind:"toy",  name:"Football",       icon:"av-soccer",  price:10},
  {id:"teddy",    kind:"toy",  name:"Teddy bear",     icon:"av-teddy",   price:20},
  {id:"balloons", kind:"deco", name:"Balloons",       icon:"balloon",    price:15},
  {id:"tulips",   kind:"deco", name:"Tulip garden",   icon:"s-tulip",    price:20},
  {id:"lamp",     kind:"deco", name:"Glowing lamp",   icon:"s-diya",     price:25},
  {id:"palm",     kind:"deco", name:"Palm tree",      icon:"t-jungle",   price:30},
];
const KINDS = [["hat", "Hats"], ["toy", "Toys"], ["deco", "Garden"]];
export const ownedSet = shop => new Set(String(shop?.owned || "").split(",").filter(Boolean));

// ctx: {el, img, modal, toast, confetti}; o: {petName, stars(), shop(), buy(item) → Promise, use(kind, id|"") → Promise}
export function openShop(ctx, o){
  const {el, img, modal, toast, confetti} = ctx;
  modal(close => {
    const box = el("div",{class:"stack"});
    const draw = () => {
      const stars = o.stars(), shop = o.shop() || {}, owned = ownedSet(shop);
      box.replaceChildren(
        el("div",{class:"row", style:"justify-content:space-between"},
          el("div",{class:"sec-title"}, img("s-bag"), el("div",{}, el("h2",{},"Pet shop"), el("div",{class:"small muted"}, `Treats for ${o.petName}`))),
          el("span",{class:"rank-pill coin-pill"}, img("star"), el("b",{}, String(stars)), " stars")),
        el("p",{class:"small muted"},"Every prayer you pray gives you a star. Buying things never makes your pet smaller!"),
        ...KINDS.map(([kind, label]) => el("div",{class:"stack", style:"gap:6px"}, el("b",{}, label),
          el("div",{class:"shop-grid"}, SHOP.filter(it => it.kind === kind).map(it => {
            const has = owned.has(it.id), using = shop[kind] === it.id;
            return el("button",{class:`shop-item ${using ? "using" : ""}`, onclick:async () => {
              try {
                if (using){ await o.use(kind, ""); toast(`${it.name} taken off`, it.icon); }
                else if (has){ await o.use(kind, it.id); toast(`${o.petName} is using the ${it.name.toLowerCase()}!`, it.icon); }
                else if (stars >= it.price){ await o.buy(it); confetti(); toast(`You bought the ${it.name.toLowerCase()}!`, it.icon); }
                else return toast(`You need ${it.price - stars} more star${it.price - stars === 1 ? "" : "s"}. Keep praying!`, "star");
              } catch { return toast("Couldn't save. Try again.", "lock"); }
              setTimeout(draw, 50);
            }}, img(it.icon), el("b",{}, it.name),
              el("span",{class:"shop-price"}, using ? "Using ✓" : has ? "Tap to use" : `⭐ ${it.price}`));
          })))),
        el("div",{class:"actions"}, el("button",{class:"btn primary", onclick:close},"Done")));
    };
    draw(); return box;
  });
}
