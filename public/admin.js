// Salah Tracker — admin area at /admin. Only Firebase logins listed as admins in firestore.rules can read anything here.
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_DOMAIN = "admins.salah-tracker.example";
const PRAYERS = ["fajr","dhuhr","asr","maghrib","isha"];

export function startAdmin({auth, db, el, img, avatar, toast, $app}){
  let state = {kids:[], marks:new Map(), activity:[], loading:true, error:null, q:"", sort:"seen", open:null, requireConfirm:false};
  const show = (...p) => $app.replaceChildren(...p.filter(Boolean));
  const pad = n => String(n).padStart(2,"0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const ago = t => { if (!t) return "never"; const s = (Date.now() - t)/1000; if (s < 60) return "just now"; if (s < 3600) return `${Math.round(s/60)} min ago`; if (s < 86400) return `${Math.round(s/3600)} h ago`; return `${Math.round(s/86400)} days ago`; };
  const ageOf = dob => { if (!dob) return "–"; const b = new Date(dob), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
  const days = n => Array.from({length:n}, (_,i) => { const d = new Date(); d.setDate(d.getDate() - (n-1-i)); return ymd(d); });
  const st = (uid, d, p) => state.marks.get(`${uid}_${d.slice(0,7)}`)?.days?.[d.slice(8)]?.[p] || null;
  const ok = (uid, d, p) => { const c = state.marks.get(`${uid}_${d.slice(0,7)}`)?.checked?.[d.slice(8)]; return c === true || !!c?.[p]; };
  function week(uid){
    let ticks = 0, conf = 0, missed = 0, bonus = 0;
    for (const d of days(7)){ for (const p of PRAYERS){ const s = st(uid, d, p); if (s === "p" || s === "l"){ ticks++; if (ok(uid, d, p)) conf++; } else if (s === "m") missed++; }
      for (const b of ["tahajjud","ishraq"]) if (st(uid, d, b) === "p") bonus++; }
    return {ticks, conf, missed, bonus, pct: Math.round(ticks / 35 * 100)};
  }

  // ---------- login ----------
  function loginView(msg){
    const u = el("input",{id:"ad-user", autocapitalize:"none", placeholder:"admin name"}), pw = el("input",{id:"ad-pw", type:"password", placeholder:"at least 8 characters"});
    const err = el("div",{class:"err"}, msg || "");
    const go = async create => {
      const name = u.value.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(name)) return err.textContent = "Admin name: 3 to 20 letters, numbers or _.";
      if (pw.value.length < 8) return err.textContent = "Password must be at least 8 characters.";
      try { create ? await createUserWithEmailAndPassword(auth, `${name}@${ADMIN_DOMAIN}`, pw.value) : await signInWithEmailAndPassword(auth, `${name}@${ADMIN_DOMAIN}`, pw.value); }
      catch (x) { err.textContent = x?.code === "auth/email-already-in-use" ? "That admin name already exists. Log in instead." : create ? "Couldn't create the admin login." : "Admin name or password isn't right."; }
    };
    show(el("section",{class:"panel stack auth"},
      el("div",{class:"sec-title"}, img("admin"), el("div",{}, el("h2",{},"Admin"), el("div",{class:"small muted"},"For the site owner only. Kids log in on the main page."))),
      el("div",{class:"field"}, el("label",{for:"ad-user"},"Admin name"), u),
      el("div",{class:"field"}, el("label",{for:"ad-pw"},"Password"), pw),
      err,
      el("div",{class:"actions", style:"justify-content:space-between"},
        el("button",{class:"btn ghost", onclick:()=>go(true)},"Create admin login"),
        el("button",{class:"btn primary", onclick:()=>go(false)},"Log in")),
      el("a",{href:"/", class:"linkbtn"},"← Back to Salah Tracker")));
  }

  // ---------- data ----------
  async function load(){
    state.loading = true; render();
    try {
      const months = [days(1)[0].slice(0,7)]; const pm = new Date(); pm.setDate(1); pm.setMonth(pm.getMonth()-1); months.push(ymd(pm).slice(0,7));
      const [us, ms, act] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "marks"), where("month", "in", months))),
        getDocs(query(collection(db, "activity"), orderBy("t", "desc"), limit(80))).catch(() => ({docs:[]})),
      ]);
      state.kids = us.docs.map(d => ({uid:d.id, ...d.data()}));
      state.marks = new Map(ms.docs.map(d => [d.id, d.data()]));
      state.activity = act.docs.map(d => d.data());
      state.requireConfirm = !!(await getDoc(doc(db, "config", "app")).catch(() => null))?.data()?.requireConfirm;
      state.error = null;
    } catch (x) {
      state.error = x?.code === "permission-denied" ? "not-admin" : "load";
    }
    state.loading = false; render();
  }

  // ---------- views ----------
  function render(){
    if (!auth.currentUser) return loginView();
    // A child's account is logged in on this browser (only one login per browser): offer to switch.
    if (!auth.currentUser.email?.endsWith("@" + ADMIN_DOMAIN)) return show(el("section",{class:"panel stack auth"},
      el("div",{class:"sec-title"}, img("lock"), el("h2",{},"A child's account is logged in")),
      el("p",{}, `This browser is logged in as the child account @${(auth.currentUser.email || "").split("@")[0]}. A browser can only use one login at a time.`),
      el("p",{class:"small muted"},"Log it out here, then log in with your admin name and password."),
      el("div",{class:"actions"},
        el("a",{href:"/", class:"btn ghost"},"Go to the kids' page"),
        el("button",{class:"btn primary", onclick:async () => { await signOut(auth); state.error = null; loginView(); }},"Switch to admin login"))));
    if (state.error === "not-admin") return show(el("section",{class:"panel stack"},
      el("div",{class:"sec-title"}, img("lock"), el("h2",{},"Not activated yet")),
      el("p",{}, "You're logged in, but this login isn't an admin yet. Send this code to your developer to switch it on:"),
      el("code",{class:"uidbox"}, auth.currentUser.uid),
      el("div",{class:"actions"}, el("button",{class:"btn ghost", onclick:()=>signOut(auth)},"Log out"), el("button",{class:"btn primary", onclick:load},"Try again"))));
    if (state.loading) return show(el("div",{class:"panel muted"},"Loading everything…"));
    if (state.error) return show(el("div",{class:"panel"}, "Couldn't load data. ", el("button",{class:"btn ghost sm", onclick:load},"Try again")));

    const today = days(1)[0], d7 = Date.now() - 7*864e5;
    const kids = state.kids;
    const activeToday = kids.filter(k => k.lastSeen && ymd(new Date(k.lastSeen)) === today).length;
    const newWeek = kids.filter(k => k.created && Date.parse(k.created) > d7).length;
    let ticksToday = 0, waiting = 0;
    for (const k of kids) for (const p of [...PRAYERS, "tahajjud", "ishraq"]){ const s = st(k.uid, today, p); if (s === "p" || s === "l"){ ticksToday++; if (!ok(k.uid, today, p)) waiting++; } }
    const stat = (n, label, icon) => el("div",{class:"score"}, el("div",{class:"grade"}, img(icon), String(n)), el("div",{class:"eyebrow"}, label));

    const q = state.q.toLowerCase();
    let list = kids.filter(k => !q || `${k.name} ${k.username} ${k.city}`.toLowerCase().includes(q)).map(k => ({...k, wk:week(k.uid)}));
    list.sort(state.sort === "seen" ? (a,b) => (b.lastSeen||0) - (a.lastSeen||0) : state.sort === "score" ? (a,b) => b.wk.pct - a.wk.pct : (a,b) => (a.name||"").localeCompare(b.name||""));

    const table = el("div",{class:"tbl-wrap"}, el("table",{class:"admin-tbl"},
      el("thead",{}, el("tr",{}, ["Kid","Age","City","Joined","Last seen","Visits","This week","Buddies",""].map(h => el("th",{}, h)))),
      el("tbody",{}, list.map(k => el("tr",{class: k.disabled ? "paused" : ""},
        el("td",{}, el("div",{class:"row", style:"flex-wrap:nowrap"}, avatar(k, 48), el("div",{}, el("b",{}, k.name || "?"), el("div",{class:"small muted"}, `@${k.username}`)))),
        el("td",{}, String(ageOf(k.dob))), el("td",{}, k.city || "–"), el("td",{class:"small"}, k.joined || "–"),
        el("td",{class:"small"}, ago(k.lastSeen)), el("td",{class:"num"}, String(k.visits || 0)),
        el("td",{class:"num"}, `${k.wk.ticks}/35 · ${k.wk.conf} ✓✓${k.wk.bonus ? ` · ${k.wk.bonus} bonus` : ""}`),
        el("td",{class:"num"}, String((k.friends||[]).length)),
        el("td",{}, el("button",{class:"btn ghost sm", onclick:()=>{ state.open = k.uid; render(); }},"Manage")))))));

    const nameOf = uid => kids.find(k => k.uid === uid)?.name || "someone";
    const feed = el("div",{class:"stack", style:"gap:6px"}, state.activity.length ? state.activity.map(a => el("div",{class:"g-row small"},
      el("b",{}, nameOf(a.uid)), el("span",{}, a.type === "signup" ? "joined Salah Tracker" : a.type === "login" ? "logged in" : a.type === "open" ? "opened the app" : a.type === "tick" ? `ticked ${a.p} (${a.s})` : a.type),
      el("span",{class:"muted", style:"margin-left:auto"}, ago(a.t)))) : el("div",{class:"note"},"No activity yet. It appears as kids use the app."));

    show(
      el("div",{class:"parent-bar"}, el("span",{class:"pb-badge"},"ADMIN"), el("span",{class:"grow small"}, "Everything on Salah Tracker"),
        el("button",{class:"btn ghost sm", onclick:load},"Refresh"), el("button",{class:"btn ghost sm", onclick:()=>signOut(auth)},"Log out")),
      el("section",{class:"panel row", style:"justify-content:space-between"},
        el("div",{style:"min-width:0;flex:1"}, el("b",{}, "Grown-up confirmation"),
          el("div",{class:"small muted"}, state.requireConfirm ? "ON: ticked prayers count for Salah Buddies and the ranking only after a grown-up confirms them." : "OFF: every ticked prayer counts straight away. No waiting for grown-ups.")),
        el("button",{class:`btn ${state.requireConfirm ? "approve" : "ghost"}`, role:"switch", "aria-checked":String(state.requireConfirm), onclick: async () => {
          try { await setDoc(doc(db, "config", "app"), {requireConfirm: !state.requireConfirm}, {merge:true}); state.requireConfirm = !state.requireConfirm; toast(`Grown-up confirmation is now ${state.requireConfirm ? "ON" : "OFF"}`, "check"); render(); }
          catch { toast("Couldn't change the setting. Try again.", "lock"); }
        }}, state.requireConfirm ? "ON · tap to turn off" : "OFF · tap to turn on")),
      el("section",{class:"scores admin-stats"}, stat(kids.length, "Kids", "av-student"), stat(activeToday, "Active today", "clock"), stat(newWeek, "New this week", "sparkles"), stat(ticksToday, "Prayers ticked today", "check"), stat(waiting, "Waiting to confirm today", "lock")),
      el("section",{class:"panel stack"},
        el("div",{class:"row", style:"justify-content:space-between"}, el("h2",{},"All kids"),
          el("div",{class:"row"}, el("input",{id:"ad-q", class:"ad-q", placeholder:"Search name, @username, city", value:state.q, oninput:e => { state.q = e.target.value; render(); document.getElementById("ad-q")?.focus(); }}),
            el("div",{class:"seg"}, [["seen","Recent"],["score","This week"],["name","Name"]].map(([k,l]) => el("button",{"aria-pressed":String(state.sort===k), onclick:()=>{state.sort=k; render();}}, l))))),
        table),
      el("section",{class:"panel stack"}, el("h2",{},"Recent activity"), feed),
      state.open ? manage(state.kids.find(k => k.uid === state.open)) : null);
    if (state.open) document.getElementById("manage")?.scrollIntoView({behavior:"smooth"});
  }

  function manage(k){
    if (!k) return null;
    const pinIn = el("input",{id:"ad-ppin", inputmode:"numeric", maxlength:"4", placeholder:"4 numbers"});
    const dayRow = d => el("div",{class:"check-row"}, el("span",{}, new Date(d).toLocaleDateString("en-GB",{weekday:"short", day:"numeric", month:"short"})),
      el("div",{class:"dots"}, PRAYERS.map(p => el("span",{class:`dot ${st(k.uid, d, p) || ""}`}))),
      el("span",{class:"small muted"}, `${PRAYERS.filter(p => ok(k.uid, d, p) && st(k.uid, d, p)).length} ✓✓`), el("span",{}));
    const buddies = (k.friends||[]).map(f => state.kids.find(x => x.uid === f)).filter(Boolean);
    const act = async (fn, msg) => { try { await fn(); toast(msg, "check"); await load(); state.open = k.uid; render(); } catch { toast("That didn't work. Try again.", "lock"); } };
    return el("section",{class:"panel stack", id:"manage", style:"outline:3px solid var(--grape)"},
      el("div",{class:"row", style:"justify-content:space-between"},
        el("div",{class:"row"}, avatar(k, 48), el("div",{}, el("h2",{}, k.name), el("div",{class:"small muted"}, `@${k.username} · born ${k.dob || "?"} · ${k.city || ""}, ${k.country || ""}`))),
        el("button",{class:"btn ghost sm", onclick:()=>{ state.open = null; render(); }},"Close")),
      el("div",{class:"eyebrow"},"Last 14 days"),
      el("div",{class:"check-list"}, days(14).reverse().map(dayRow)),
      el("div",{class:"eyebrow"},"Salah Buddies"),
      buddies.length ? el("div",{class:"friend-pick"}, buddies.map(b => el("span",{class:"fp"}, avatar(b, 48), b.name))) : el("div",{class:"small muted"},"No buddies yet."),
      el("div",{class:"eyebrow"},"Manage"),
      el("div",{class:"row"}, pinIn, el("button",{class:"btn ghost sm", onclick:async ()=>{
        if (!/^\d{4}$/.test(pinIn.value)) return toast("Grown-up PIN must be 4 numbers.", "lock");
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`salah-parent:${k.uid}:${pinIn.value}`));
        const h = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
        act(() => setDoc(doc(db, "users", k.uid, "private", "settings"), {parentPinHash:h}), "Grown-up PIN reset");
      }},"Reset grown-up PIN")),
      el("div",{class:"row"},
        el("button",{class:"btn ghost sm", onclick:()=>act(() => updateDoc(doc(db, "users", k.uid), {disabled: !k.disabled}), k.disabled ? "Account switched back on" : "Account paused")}, k.disabled ? "Unpause account" : "Pause account"),
        el("button",{class:"btn danger sm", onclick:async e => {
          if (e.target.dataset.sure !== "1"){ e.target.dataset.sure = "1"; e.target.textContent = `Yes, delete ${k.name}'s data`; return; }
          act(async () => {
            for (const id of [...state.marks.keys()].filter(id => id.startsWith(k.uid + "_"))) await deleteDoc(doc(db, "marks", id));
            await deleteDoc(doc(db, "leaderboard", k.uid)).catch(()=>{});
            await deleteDoc(doc(db, "users", k.uid));
            state.open = null;
          }, "Data deleted");
        }},"Delete kid's data")),
      el("p",{class:"small muted"},"A child's own login PIN can only be changed from their account (Grown-up mode → Change child's PIN). Paused accounts can't log in to the app. Deleting removes their profile and prayer records; the login itself can be removed in the Firebase console under Authentication."));
  }

  onAuthStateChanged(auth, u => { if (u) load(); else render(); });
}
