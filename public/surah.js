// Salah Tracker — Learn a short surah: line by line, listen and repeat, then earn a sticker.
// Arabic (Uthmani script), transliteration, Sahih International meaning and Mishary Alafasy's recitation come from alquran.cloud.
export const SURAHS = [
  {n:1,   name:"Al-Fatiha",  means:"The Opening"},
  {n:112, name:"Al-Ikhlas",  means:"Pure faith"},
  {n:113, name:"Al-Falaq",   means:"The daybreak"},
  {n:114, name:"An-Nas",     means:"People"},
  {n:108, name:"Al-Kawthar", means:"The abundance"},
  {n:103, name:"Al-Asr",     means:"Time"},
  {n:110, name:"An-Nasr",    means:"The help"},
  {n:106, name:"Quraysh",    means:"The Quraysh tribe"},
  {n:107, name:"Al-Ma'un",   means:"Small kindnesses"},
  {n:109, name:"Al-Kafirun", means:"The disbelievers"},
  {n:105, name:"Al-Fil",     means:"The elephant"},
];
async function loadSurah(n){
  const key = `surah2:${n}`;
  try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c?.length) return c; } catch {}
  const j = await (await fetch(`https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,en.transliteration,en.sahih,ar.alafasy`)).json();
  if (j.code !== 200) throw new Error("surah");
  const [ar, tr, en, au] = j.data;
  const lines = ar.ayahs.map((a, i) => ({ar:a.text.replace(/^\ufeff/, ""), tr:tr.ayahs[i].text, en:en.ayahs[i].text, audio:au.ayahs[i].audio}));
  // the service puts "Bismillah…" in front of line 1 of every surah except Al-Fatiha; the sound and spelling of line 1 don't include it
  const B = ar.ayahs[0].text.match(/^S+s+S+s+S+s+S+s+/);
  if (n !== 1 && B && /^بِسْمِ/.test(lines[0].ar)) lines[0].ar = lines[0].ar.slice(B[0].length).trim();
  try { localStorage.setItem(key, JSON.stringify(lines)); } catch {}
  return lines;
}

// done = {n:true}; onLine() = a line practised (for daily challenges); onLearned(n) = surah finished
export function surahCard({el, img, done = {}, open}){
  const learned = SURAHS.filter(s => done[s.n]).length, next = SURAHS.find(s => !done[s.n]) || SURAHS[0];
  return el("section",{class:"panel stack"},
    el("div",{class:"sec-title"}, img("book"), el("div",{}, el("h2",{},"Learn a surah"), el("div",{class:"small muted"}, `${learned} of ${SURAHS.length} learned · listen and repeat, line by line`))),
    el("div",{class:"surah-pick"}, SURAHS.map(s => el("button",{class:`sp ${done[s.n] ? "done" : ""} ${s === next ? "next" : ""}`, onclick:() => open(s)},
      el("b",{}, s.name), el("span",{}, done[s.n] ? "Learned ⭐" : s.means)))));
}

export function openSurah(ctx, s, {onLine, onLearned}){
  const {el, img, modal, toast, confetti} = ctx;
  let lines = null, i = 0, audio = null, said = new Set();
  const body = el("div",{class:"stack", style:"gap:12px"}, el("div",{class:"muted"},"Loading the surah…"));
  const stop = () => { if (audio){ audio.pause(); audio = null; } };
  const watch = setInterval(() => { if (lines && !body.isConnected){ stop(); clearInterval(watch); } }, 800);   // closed by tapping outside
  const play = (url, btn) => { stop(); audio = new Audio(url); btn && (btn.textContent = "🔊 Playing…");
    audio.onended = () => { if (btn) btn.textContent = "▶ Listen again"; }; audio.play().catch(() => toast("Couldn't play the sound. Check the internet.", "lock")); };
  function draw(){
    const L = lines[i], listen = el("button",{class:"btn ghost", onclick:e => play(L.audio, e.currentTarget)}, "▶ Listen");
    body.replaceChildren(
      el("div",{class:"track"}, el("i",{style:`width:${(said.size / lines.length) * 100}%;background-color:var(--ok)`})),
      el("div",{class:"small muted", style:"text-align:center"}, `Line ${i + 1} of ${lines.length}`),
      i === 0 && s.n !== 1 ? el("div",{class:"small", style:"text-align:center"}, "Start with: Bismillahir Rahmanir Raheem") : null,
      el("div",{class:"verse-ar", lang:"ar", dir:"rtl"}, L.ar),
      el("div",{class:"surah-tr"}, L.tr),
      el("div",{class:"small muted", style:"text-align:center"}, `"${L.en}"`),
      el("div",{class:"row", style:"justify-content:center"},
        i > 0 ? el("button",{class:"btn ghost sm", onclick:() => { stop(); i--; draw(); }}, "← Back") : null,
        listen,
        el("button",{class:"btn primary", onclick:() => {
          stop(); said.add(i); onLine?.();
          if (said.size === lines.length){ confetti(); onLearned?.(s.n); return finish(); }
          i = Math.min(lines.length - 1, i + 1); draw(); }}, img("check"), "I said it!")),
      el("div",{class:"small muted", style:"text-align:center"}, "Listen, then say the line out loud. Repeat until it feels easy!"));
    setTimeout(() => play(L.audio, listen), 250);   // play each line once as it opens
  }
  function finish(){
    body.replaceChildren(el("div",{class:"stack", style:"align-items:center;text-align:center"},
      el("div",{class:"nb-glow"}, img("star", "nb-img")),
      el("h2",{}, `You learned Surah ${s.name}!`),
      el("p",{class:"muted"}, "MashaAllah! You earned a sticker and 5 pet food. Keep practising so you never forget it."),
      el("button",{class:"btn ghost", onclick:() => play(lines.map(l => l.audio)[0])}, "▶ Listen to the start")));
  }
  modal(close => el("div",{class:"stack surah-modal"},
    el("div",{class:"sec-title"}, img("book"), el("div",{}, el("h2",{}, `Surah ${s.name}`), el("div",{class:"small muted"}, s.means))),
    body,
    el("div",{class:"actions"}, el("button",{class:"btn ghost", onclick:() => { stop(); close(); }},"Close"))));
  loadSurah(s.n).then(l => { lines = l; draw(); }).catch(() => body.replaceChildren(el("div",{class:"note"},"Couldn't load the surah. Check the internet and try again.")));
}
