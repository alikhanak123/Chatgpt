// Salah Tracker — chat with Salah Buddies.
// Kid-safe by design: only buddies (checked by the security rules), short messages, no links / emails / phone numbers,
// a kind-words filter, and the child's grown-up can read the chats from the grown-up login. The admin can switch chat off.
// Firestore chats/<uidA>_<uidB>/msgs/<id> = {from, text, t}   (uids sorted, joined with "_")
const QUICK = ["Assalamu alaikum! 👋", "Did you pray yet? 🕌", "MashaAllah! ⭐", "Let's pray together! 🤲", "Want to play a game? 🎮", "JazakAllah khair! ❤️"];
const UNKIND = ["stupid", "idiot", "dumb", "shut up", "hate you", "loser", "ugly", "fool", "kill", "die", "damn", "hell", "crap", "sex", "sexy", "fuck", "fck", "shit", "bitch", "bastard", "ass", "dick", "porn"];
const UNKIND_RE = new RegExp(`\\b(${UNKIND.map(w => w.replace(/ /g, "\\s+")).join("|")})\\b`, "gi");
export const MAX_LEN = 200;

// Returns {text} ready to send, or {why} explaining what to change.
export function cleanMessage(raw){
  const text = String(raw || "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
  if (!text) return {why:"Type a message first."};
  if (/(https?:\/\/|www\.|\.(com|net|org|io|me|ly|app)\b|@[a-z0-9_.-]+\.[a-z]|t\.me|wa\.me)/i.test(text)) return {why:"Links and email addresses can't be sent in chat."};
  if (/(\d[\s().+-]*){6,}/.test(text)) return {why:"Phone numbers can't be sent in chat. Ask a grown-up to share them."};
  return {text:text.replace(UNKIND_RE, m => "★".repeat(Math.min(5, m.length)))};
}

export function initChat(ctx){
  // ctx: {db, fs:{collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp}, me(), people, el, img, avatar, toast, modal, rerender, enabled(), readOnly()}
  const {el, img, avatar, toast, fs, db} = ctx;
  const pairOf = (a, b) => [a, b].sort().join("_");
  const msgs = pair => fs.collection(db, "chats", pair, "msgs");
  const tms = t => t?.toMillis ? t.toMillis() : (+t || Date.now());
  const last = new Map(), watching = new Map();
  const readKey = pair => `salah-chat-read:${ctx.me()?.uid}:${pair}`;
  const getRead = pair => { try { return +(localStorage.getItem(readKey(pair)) || 0); } catch { return 0; } };
  const setRead = (pair, t) => { try { localStorage.setItem(readKey(pair), String(t)); } catch {} };
  let lastSent = 0;

  // Keep an eye on the newest message with each buddy, for the unread dots.
  function sync(){
    const me = ctx.me();
    const want = new Set(me && ctx.enabled() && !ctx.readOnly() ? (me.friends || []) : []);
    for (const [u, off] of watching) if (!want.has(u)){ off(); watching.delete(u); last.delete(u); }
    for (const u of want) if (!watching.has(u)) watching.set(u, fs.onSnapshot(fs.query(msgs(pairOf(me.uid, u)), fs.orderBy("t", "desc"), fs.limit(1)),
      snap => { const d = snap.docs[0]?.data(); if (d) last.set(u, {...d, t:tms(d.t)}); else last.delete(u); ctx.rerender(); }, () => {}));
  }
  function stop(){ for (const off of watching.values()) off(); watching.clear(); last.clear(); }
  const unreadFrom = u => { const m = last.get(u), me = ctx.me(); return m && me && m.from !== me.uid && m.t > getRead(pairOf(me.uid, u)) ? 1 : 0; };
  const unread = () => [...last.keys()].reduce((n, u) => n + unreadFrom(u), 0);

  // One conversation. For a grown-up login it opens read-only.
  function openChat(buddy){
    const me = ctx.me(), p = ctx.people.get(buddy), pair = pairOf(me.uid, buddy), ro = ctx.readOnly();
    if (!ctx.enabled()) return toast("Chat is switched off right now.", "lock");
    const list = el("div",{class:"chat-list", role:"log", "aria-live":"polite"}, el("div",{class:"muted small"},"Loading messages…"));
    let off = null;
    const watch = setInterval(() => { if (!list.isConnected){ off?.(); clearInterval(watch); } }, 1500);
    off = fs.onSnapshot(fs.query(msgs(pair), fs.orderBy("t", "desc"), fs.limit(60)), snap => {
      const items = snap.docs.map(d => ({id:d.id, ...d.data()})).reverse();
      if (!ro && items.length) setRead(pair, Math.max(...items.map(m => tms(m.t))));
      list.replaceChildren(...(items.length ? items.map(m => {
        const mine = m.from === me.uid, who = mine ? me : ctx.people.get(m.from);
        return el("div",{class:`bubble ${mine ? "mine" : ""}`},
          ro ? el("b",{class:"small"}, who?.name || "Buddy") : null,
          el("span",{}, m.text),
          el("span",{class:"time"}, new Date(tms(m.t)).toLocaleTimeString("en-GB", {hour:"numeric", minute:"2-digit", hour12:true}).toUpperCase()));
      }) : [el("div",{class:"note small"}, ro ? "No messages yet." : `Say Assalamu alaikum to ${p?.name || "your buddy"}!`)]));
      list.scrollTop = list.scrollHeight; ctx.rerender();
    }, () => list.replaceChildren(el("div",{class:"note small"},"Couldn't load the chat. Check the internet.")));

    const input = el("input",{class:"chat-input", maxlength:String(MAX_LEN), placeholder:`Message ${p?.name || "your buddy"}…`, "aria-label":"Your message", autocomplete:"off"});
    const send = async text => {
      const r = cleanMessage(text); if (r.why) return toast(r.why, "lock");
      if (Date.now() - lastSent < 1500) return toast("Slow down a little!", "clock");
      lastSent = Date.now(); input.value = "";
      try { await fs.addDoc(msgs(pair), {from:me.uid, text:r.text, t:fs.serverTimestamp()}); }
      catch { toast("Couldn't send. You can only chat with your Salah Buddies.", "lock"); }
    };
    ctx.modal(close => el("div",{class:"stack chat-modal"},
      el("div",{class:"row"}, avatar(p || {avatar:"cat"}, 48), el("div",{style:"flex:1;min-width:0"}, el("h2",{}, ro ? `${me.name} & ${p?.name || "buddy"}` : p?.name || "Buddy"),
        el("div",{class:"small muted"}, ro ? "You're reading your child's chat." : "Be kind. Grown-ups can read chats."))),
      list,
      ro ? null : el("div",{class:"chat-quick"}, QUICK.map(q => el("button",{type:"button", class:"mini", onclick:() => send(q)}, q))),
      ro ? null : el("form",{class:"chat-send", onsubmit:e => { e.preventDefault(); send(input.value); }}, input, el("button",{class:"btn primary", type:"submit", "aria-label":"Send"}, img("chat"), "Send")),
      el("div",{class:"actions"}, el("button",{class:"btn ghost", onclick:() => { off?.(); clearInterval(watch); close(); ctx.rerender(); }},"Close"))));
  }

  // All buddies, newest chat first.
  function openList(){
    const me = ctx.me(), ro = ctx.readOnly();
    if (!ctx.enabled()) return toast("Chat is switched off right now.", "lock");
    const friends = (me.friends || []).filter(f => ctx.people.has(f)).sort((a, b) => (last.get(b)?.t || 0) - (last.get(a)?.t || 0));
    ctx.modal(close => el("div",{class:"stack"},
      el("div",{class:"sec-title"}, img("chat"), el("div",{}, el("h2",{}, ro ? `${me.name}'s chats` : "Chat with buddies"),
        el("div",{class:"small muted"}, ro ? "Tap a buddy to read the chat." : "Only your Salah Buddies can chat with you."))),
      friends.length ? el("div",{class:"stack", style:"gap:8px"}, friends.map(f => { const p = ctx.people.get(f), m = last.get(f);
        return el("button",{class:"g-row chat-row", onclick:() => { close(); openChat(f); }}, avatar(p, 48),
          el("div",{style:"flex:1;min-width:0;text-align:left"}, el("b",{}, p.name), el("div",{class:"small muted chat-prev"}, m ? `${m.from === me.uid ? (ro ? me.name : "You") : p.name}: ${m.text}` : "No messages yet")),
          unreadFrom(f) ? el("span",{class:"chat-dot", "aria-label":"New message"}) : null); }))
        : el("div",{class:"note"},"Invite a Salah Buddy first. Then you can chat here."),
      el("div",{class:"actions"}, el("button",{class:"btn primary", onclick:close},"Close"))));
  }
  return {sync, stop, unread, unreadFrom, openChat, openList};
}
