// Salah Tracker — nudges: ready-made stickers and 3D emojis kids send their Salah Buddies (no free typing, so it stays kind and safe).
// Realtime Database: nudges/<toUid>/<id> = {from, k, t}
import { getDatabase, ref, onValue, push, set, remove, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const STICKERS = [
  {k:"mashaallah", icon:"glow",    text:"MashaAllah! Amazing praying!"},
  {k:"keepgoing",  icon:"rocket",  text:"Keep going, you've got this!"},
  {k:"proud",      icon:"trophy",  text:"So proud of you!"},
  {k:"together",   icon:"hands",   text:"Let's pray together!"},
  {k:"time",       icon:"clock",   text:"Psst… it's prayer time!"},
  {k:"fajr",       icon:"p-fajr",  text:"Don't forget Fajr tomorrow!"},
  {k:"race",       icon:"flag",    text:"Race you to 5 out of 5!"},
  {k:"streak",     icon:"fire",    text:"Your streak is on fire!"},
  {k:"game",       icon:"game",    text:"Want to play a game?"},
  {k:"star",       icon:"star",    text:"You're a superstar!"},
];
export const EMOJIS = [
  {k:"heart", icon:"e-heart", text:"❤️"}, {k:"thumbs", icon:"e-thumbs", text:"👍"}, {k:"clap", icon:"e-clap", text:"👏"},
  {k:"wave", icon:"e-wave", text:"👋"}, {k:"hearts", icon:"e-hearts", text:"🥰"}, {k:"laugh", icon:"e-laugh", text:"😆"},
  {k:"hug", icon:"e-hug", text:"🤗"}, {k:"party", icon:"party", text:"🎉"},
];
const ALL = Object.fromEntries([...STICKERS, ...EMOJIS].map(s => [s.k, s]));

export function initNudges(ctx){
  // ctx: {app, dbURL, me(), people, el, img, avatar, toast, rerender}
  const {el, img, avatar, toast} = ctx;
  let db = null; try { db = getDatabase(ctx.app, ctx.dbURL); } catch {}
  let inbox = [], off = null, firstLoad = true;
  const lastSent = {};
  const seenKey = () => `salah-nudges-seen:${ctx.me()?.uid}`;
  const getSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(seenKey()) || "[]")); } catch { return new Set(); } };
  const markSeen = ids => { try { const s = getSeen(); ids.forEach(i => s.add(i)); localStorage.setItem(seenKey(), JSON.stringify([...s].slice(-200))); } catch {} };

  function start(){
    const me = ctx.me(); if (!db || !me || off) return;
    off = onValue(query(ref(db, `nudges/${me.uid}`), limitToLast(30)), snap => {
      const v = snap.val() || {};
      inbox = Object.entries(v).map(([id, n]) => ({id, ...n})).sort((a, b) => b.t - a.t);
      // tidy up: remove nudges older than 7 days
      for (const n of inbox) if (Date.now() - n.t > 7*864e5) remove(ref(db, `nudges/${me.uid}/${n.id}`)).catch(()=>{});
      const seen = getSeen(); let fresh = inbox.filter(n => !seen.has(n.id) && Date.now() - n.t < 7*864e5).reverse();
      if (firstLoad && fresh.length > 3){ markSeen(fresh.slice(0, -3).map(n => n.id)); fresh = fresh.slice(-3); }   // don't flood on opening; the rest stay in Messages
      if (fresh.length) showQueue(fresh, firstLoad);
      firstLoad = false;
      ctx.rerender();
    }, () => {});
  }
  function stop(){ off?.(); off = null; inbox = []; firstLoad = true; }
  const unread = () => { const s = getSeen(); return inbox.filter(n => !s.has(n.id)).length; };

  // Pop a nudge up on screen with its sticker bouncing in and a little emoji shower.
  let showing = false; const queue = [];
  function showQueue(list){ queue.push(...list); if (!showing) next(); }
  function next(){
    const n = queue.shift(); if (!n){ showing = false; return; }
    showing = true; markSeen([n.id]);
    const s = ALL[n.k] || ALL.heart, from = ctx.people.get(n.from);
    const pop = el("div",{class:"nudge-pop", role:"status"},
      el("div",{class:"np-from"}, avatar(from || {avatar:"cat"}, 48), el("b",{}, from?.name || "A buddy"), el("span",{}, " sent you")),
      img(s.icon, "np-sticker"),
      STICKERS.includes(s) ? el("div",{class:"np-text"}, s.text) : null,
      el("div",{class:"row", style:"justify-content:center"},
        from ? el("button",{class:"btn ghost sm", onclick:() => { pop.remove(); openSend(n.from); next(); }}, "Reply") : null,
        el("button",{class:"btn primary sm", onclick:() => { pop.remove(); next(); }}, "Thanks!")));
    for (let i = 0; i < 10; i++){ const e = img(s.icon, "np-rain"); e.style.left = `${Math.random()*100}%`; e.style.animationDelay = `${Math.random()*600}ms`; pop.append(e); }
    document.body.append(pop);
    setTimeout(() => { if (pop.isConnected){ pop.remove(); next(); } }, 7000);
  }

  async function send(toUid, k){
    const me = ctx.me(); if (!db || !me) return;
    if (Date.now() - (lastSent[toUid] || 0) < 5000) return toast("Wait a moment before sending another one.", "clock");
    lastSent[toUid] = Date.now();
    try { await set(push(ref(db, `nudges/${toUid}`)), {from:me.uid, k, t:Date.now()}); toast(`Sent to ${ctx.people.get(toUid)?.name || "your buddy"}!`, ALL[k]?.icon || "check"); }
    catch { toast("Couldn't send. Check the internet.", "lock"); }
  }

  // The sticker picker for one buddy
  function sendGrid(toUid, done){
    return el("div",{class:"stack", style:"gap:10px"},
      el("div",{class:"eyebrow"},"Stickers"),
      el("div",{class:"sticker-grid"}, STICKERS.map(s => el("button",{class:"sticker", onclick:() => { send(toUid, s.k); done?.(); }}, img(s.icon), el("span",{}, s.text)))),
      el("div",{class:"eyebrow"},"Emojis"),
      el("div",{class:"emoji-row"}, EMOJIS.map(s => el("button",{class:"emoji-btn", "aria-label":`Send ${s.text}`, onclick:() => { send(toUid, s.k); done?.(); }}, img(s.icon)))));
  }
  function openSend(toUid){
    const p = ctx.people.get(toUid);
    ctx.modal(close => el("div",{class:"stack"},
      el("div",{class:"row"}, avatar(p, 48), el("h2",{}, `Send ${p?.name || "your buddy"} a nudge`)),
      sendGrid(toUid, close),
      el("div",{class:"actions"}, el("button",{class:"btn ghost", onclick:close},"Close"))));
  }
  function openInbox(){
    markSeen(inbox.map(n => n.id)); ctx.rerender();
    ctx.modal(close => el("div",{class:"stack"},
      el("div",{class:"sec-title"}, img("envelope"), el("h2",{},"Messages from buddies")),
      inbox.length ? el("div",{class:"stack", style:"gap:8px"}, inbox.map(n => { const s = ALL[n.k] || ALL.heart, p = ctx.people.get(n.from);
        return el("div",{class:"g-row"}, avatar(p || {avatar:"cat"}, 48), img(s.icon, "g-ic"),
          el("div",{style:"flex:1;min-width:0"}, el("b",{}, p?.name || "A buddy"), el("div",{class:"small muted"}, STICKERS.includes(s) ? s.text : "sent you an emoji")),
          p ? el("button",{class:"btn ghost sm", onclick:() => { close(); openSend(n.from); }},"Reply") : null); }))
        : el("div",{class:"note"},"No messages yet. Send your buddies a nudge to cheer them on!"),
      el("div",{class:"actions"}, el("button",{class:"btn primary", onclick:close},"Close"))));
  }
  return {start, stop, unread, openSend, openInbox, sendGrid};
}
