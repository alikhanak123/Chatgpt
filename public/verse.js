// Salah Tracker — Verse of the day: one short verse a day, with its meaning in very simple words for kids.
// The Arabic text, the English translation (Sahih International) and the recitation come from the alquran.cloud service,
// so the Quran text is never typed by hand. Only the "In simple words" lines are written here.
const VERSES = [
  ["1:2",   "Every \"thank you\" belongs to Allah, who looks after everything in the whole world."],
  ["1:5",   "We worship only Allah, and we ask only Allah to help us."],
  ["2:152", "When you remember Allah, Allah remembers you too. What a gift!"],
  ["2:153", "When something is hard, be patient and pray. Allah is with people who are patient."],
  ["2:186", "Allah is always close to you. He hears you every time you make dua."],
  ["2:201", "A beautiful dua: ask Allah for good things now, and good things later in Jannah."],
  ["2:286", "Allah never gives you more than you can handle. You are stronger than you think!"],
  ["4:86",  "When someone says salam to you, say salam back, even nicer!"],
  ["7:31",  "Enjoy your food and drink, but don't waste it and don't eat too much."],
  ["13:28", "Remembering Allah makes your heart feel calm and peaceful."],
  ["14:7",  "When you say thank you to Allah, He gives you even more good things."],
  ["16:18", "Allah has given you so many gifts that you could never count them all!"],
  ["17:24", "Be gentle with your mum and dad, and ask Allah to be kind to them, because they looked after you when you were little."],
  ["17:53", "Always choose the kindest words when you talk to people."],
  ["20:46", "Don't be scared. Allah is with you. He hears and sees everything."],
  ["21:87", "Prophet Yunus made this dua inside the big fish, and Allah saved him. You can say it too when you need help."],
  ["25:63", "Allah's special friends walk gently and stay kind, even when someone is rude to them."],
  ["31:18", "Don't show off or act proud. Be friendly to everyone."],
  ["31:19", "Walk nicely and speak gently. There's no need to shout."],
  ["33:41", "Remember Allah a lot: say SubhanAllah, Alhamdulillah and Allahu Akbar often!"],
  ["39:53", "If you make a mistake, say sorry to Allah. He loves to forgive."],
  ["49:10", "All believers are like one big family, so make peace and be good friends."],
  ["55:13", "Look at all the good things Allah gave you: family, food, sunshine. Say Alhamdulillah!"],
  ["94:6",  "Hard times always come with easy times too. Don't give up!"],
  ["96:1",  "The very first word Allah sent in the Quran was \"Iqra\", which means read and recite. Learning is special!"],
  ["99:7",  "Even the tiniest good thing you do counts. Allah sees it all!"],
  ["103:3", "The winners are people who believe, do good, and remind each other to be truthful and patient."],
  ["112:1", "Allah is One. There is no one else like Him."],
  ["112:4", "Nothing and nobody is like Allah."],
  ["113:1", "Ask Allah to keep you safe from anything bad."],
];
const API = "https://api.alquran.cloud/v1/ayah";

// Same verse for everyone on the same day.
export function verseOfDay(date = new Date()){
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  const [ref, simple] = VERSES[day % VERSES.length];
  return {ref, simple};
}
async function loadVerse(ref){
  const key = `verse:${ref}`;
  try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c?.ar) return c; } catch {}
  const r = await fetch(`${API}/${ref}/editions/quran-uthmani,en.sahih,ar.alafasy`);
  const j = await r.json(); if (j.code !== 200) throw new Error("verse");
  const [ar, en, au] = j.data;
  const v = {ar:ar.text, en:en.text, audio:au.audio, surah:ar.surah.englishName, surahMeaning:ar.surah.englishNameTranslation, n:ar.numberInSurah, s:ar.surah.number};
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  return v;
}

// The card on the Salah tab. Text that loads from the internet fills in when it arrives.
export function verseCard({el, img, read, onRead}){
  const {ref, simple} = verseOfDay();
  const ar = el("div",{class:"verse-ar", lang:"ar", dir:"rtl"}), en = el("div",{class:"verse-en small muted"}), src = el("div",{class:"verse-src small muted"}, `Quran ${ref}`);
  const listen = el("button",{class:"btn ghost sm", hidden:true}, "▶ Listen");
  let audio = null;
  loadVerse(ref).then(v => {
    ar.textContent = v.ar; en.textContent = `"${v.en}"`;
    src.textContent = `Surah ${v.surah} (${v.surahMeaning}) ${v.s}:${v.n} · Translation: Sahih International`;
    listen.hidden = false;
    listen.onclick = () => {
      if (!audio){ audio = new Audio(v.audio); audio.onended = () => { listen.textContent = "▶ Listen"; }; }
      if (audio.paused){ audio.play().catch(() => {}); listen.textContent = "⏸ Pause"; } else { audio.pause(); listen.textContent = "▶ Listen"; }
    };
  }).catch(() => { en.textContent = "Connect to the internet to see the verse."; });
  return el("section",{class:"panel stack verse-card"},
    el("div",{class:"row", style:"justify-content:space-between"},
      el("div",{class:"sec-title"}, img("book"), el("div",{}, el("h2",{},"Verse of the day"), el("div",{class:"small muted"},"A new verse from the Quran every day"))),
      listen),
    ar,
    el("div",{class:"verse-simple"}, el("b",{},"In simple words: "), simple),
    onRead ? el("button",{class:`btn ${read ? "ghost" : "primary"} sm`, style:"align-self:center", disabled:!!read, onclick:onRead}, read ? "Read today ✓" : "I read it! ✓") : null,
    en, src);
}
