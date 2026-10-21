// Salah Tracker — prayer times, rakats, and the "How to pray" guide. (Everything follows the Hanafi way; the UI doesn't label it.)

// ---------- prayer times ----------
// Times come from the free AlAdhan service: method 1 = University of Islamic Sciences, Karachi; school 1 = Hanafi Asr.
const API = "https://api.aladhan.com/v1/calendarByCity";
const times = new Map();            // "YYYY-MM-DD" -> {Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha} as "HH:MM"
const loaded = new Set();           // "<city>|<country>|YYYY-MM"
const pad = n => String(n).padStart(2,"0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

async function loadMonth(city, country, y, m){   // m = 1..12
  const key = `${city}|${country}|${y}-${pad(m)}`;
  if (loaded.has(key)) return;
  let rows = null;
  try { rows = JSON.parse(localStorage.getItem(`pt:${key}`) || "null"); } catch {}
  if (!rows){
    const r = await fetch(`${API}/${y}/${m}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=1&school=1`);
    const j = await r.json();
    if (j.code !== 200 || !Array.isArray(j.data)) throw new Error("bad city");
    rows = j.data.map(d => { const [dd,mm,yy] = d.date.gregorian.date.split("-"); const t = d.timings;
      const c = s => s.slice(0,5);
      return [`${yy}-${mm}-${dd}`, {Fajr:c(t.Fajr), Sunrise:c(t.Sunrise), Dhuhr:c(t.Dhuhr), Asr:c(t.Asr), Maghrib:c(t.Maghrib), Isha:c(t.Isha)}]; });
    try { localStorage.setItem(`pt:${key}`, JSON.stringify(rows)); } catch {}
  }
  for (const [d, t] of rows) times.set(`${city}|${country}|${d}`, t);
  loaded.add(key);
}
// Load last month, this month and next month (Isha runs into the next day's Fajr).
export async function loadTimes(city, country){
  const n = new Date(), jobs = [];
  for (const off of [-1, 0, 1]){ const d = new Date(n.getFullYear(), n.getMonth() + off, 1); jobs.push(loadMonth(city, country, d.getFullYear(), d.getMonth() + 1)); }
  const res = await Promise.allSettled(jobs);
  if (res[1].status === "rejected") throw res[1].reason;
}
const KEY = {fajr:"Fajr", dhuhr:"Dhuhr", asr:"Asr", maghrib:"Maghrib", isha:"Isha"};
const END = {fajr:"Sunrise", dhuhr:"Asr", asr:"Maghrib", maghrib:"Isha"};
const at = (dateStr, hhmm) => { const [y,m,d] = dateStr.split("-").map(Number); const [h,mi] = hhmm.split(":").map(Number); return new Date(y, m-1, d, h, mi); };
// {start, end} as Date objects, or null when times aren't known for that day.
export function prayerWindow(city, country, dateStr, k){
  const t = times.get(`${city}|${country}|${dateStr}`); if (!t) return null;
  // Bonus prayers: Ishraq from ~20 min after sunrise until shortly before Dhuhr; Tahajjud through the night after Isha until Fajr.
  if (k === "ishraq"){ const s = at(dateStr, t.Sunrise), e = at(dateStr, t.Dhuhr); return {start:new Date(+s + 20*60000), end:new Date(+e - 15*60000)}; }
  if (k === "tahajjud") return prayerWindow(city, country, dateStr, "isha");
  const start = at(dateStr, t[KEY[k]]);
  let end;
  if (k === "isha"){ const d = new Date(start); d.setDate(d.getDate()+1); const nx = times.get(`${city}|${country}|${ymd(d)}`); end = nx ? at(ymd(d), nx.Fajr) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 4, 0); }
  else end = at(dateStr, t[END[k]]);
  return {start, end};
}
// The "prayer day": after midnight but before Fajr, it's still last night's Isha time.
export function prayerToday(city, country){
  const now = new Date(), today = ymd(now), w = prayerWindow(city, country, today, "fajr");
  if (w && now < w.start){ const d = new Date(now); d.setDate(d.getDate()-1); return ymd(d); }
  return today;
}
export const fmtTime = d => d.toLocaleTimeString("en-GB", {hour:"numeric", minute:"2-digit", hour12:true}).replace(" ", " ").toUpperCase();
export function fmtIn(ms){ const m = Math.max(0, Math.round(ms/60000)), h = Math.floor(m/60); return h ? `${h}h ${m%60}m` : `${m}m`; }

// ---------- rakats ----------
// kind: fard = must pray, wajib = must pray (Witr), sunnah = Sunnah Muakkadah (very important), opt = optional (Sunnah ghair muakkadah / Nafl)
export const RAKATS = {
  fajr:    [{n:2, kind:"sunnah"}, {n:2, kind:"fard"}],
  dhuhr:   [{n:4, kind:"sunnah"}, {n:4, kind:"fard"}, {n:2, kind:"sunnah"}, {n:2, kind:"opt", label:"Nafl"}],
  asr:     [{n:4, kind:"opt", label:"Sunnah"}, {n:4, kind:"fard"}],
  maghrib: [{n:3, kind:"fard"}, {n:2, kind:"sunnah"}, {n:2, kind:"opt", label:"Nafl"}],
  isha:    [{n:4, kind:"opt", label:"Sunnah"}, {n:4, kind:"fard"}, {n:2, kind:"sunnah"}, {n:2, kind:"opt", label:"Nafl"}, {n:3, kind:"wajib", label:"Witr"}, {n:2, kind:"opt", label:"Nafl"}],
};
export const KIND_LABEL = {fard:"Fard", wajib:"Witr", sunnah:"Sunnah", opt:"Nafl"};
export const fardCount = k => RAKATS[k].filter(r => r.kind === "fard").reduce((a,r) => a + r.n, 0);

// ---------- How to pray guide ----------
const STEPS = [
  {icon:"droplet", t:"Get ready", d:"Make wudu (wash for prayer). Wear clean clothes, stand on a clean place and face the Qibla (towards the Kaaba in Makkah)."},
  {icon:"hands", t:"Make your intention", d:"In your heart, decide which prayer you are praying, for example: \"2 rakats Fard of Fajr for Allah.\""},
  {icon:"star", t:"Start: Takbir", d:"Raise your hands (boys to the ears, girls to the shoulders) and say \"Allahu Akbar\". Fold your hands: boys below the navel, girls on the chest."},
  {icon:"book", t:"Stand and recite", d:"Read Thana, then Ta'awwudh and Bismillah, then Surah Al-Fatiha. Say \"Ameen\" quietly. Then read another surah, like Surah Al-Ikhlas."},
  {icon:"check", t:"Ruku (bow)", d:"Say \"Allahu Akbar\" and bow with your hands on your knees and your back straight. Say \"Subhana Rabbiyal Azeem\" 3 times."},
  {icon:"sparkles", t:"Stand up again", d:"Rise saying \"Sami Allahu liman hamidah\", then standing straight say \"Rabbana lakal hamd\"."},
  {icon:"mosque", t:"Sajdah (prostrate) twice", d:"Say \"Allahu Akbar\" and go down: forehead, nose, both hands, knees and toes touch the ground. Say \"Subhana Rabbiyal A'la\" 3 times. Sit up for a moment, then do a second sajdah the same way."},
  {icon:"medal1", t:"That's 1 rakat!", d:"Stand up saying \"Allahu Akbar\" for the 2nd rakat. Do it the same way, starting with Bismillah and Al-Fatiha (no Thana this time)."},
  {icon:"glow", t:"Sit after 2 rakats", d:"After the second sajdah of the 2nd rakat, sit and read At-Tahiyyat. If the prayer has 3 or 4 rakats, stand up for the rest. (In the 3rd and 4th rakats of a Fard prayer, read only Al-Fatiha.)"},
  {icon:"crown", t:"Last sitting", d:"In the last rakat, sit and read At-Tahiyyat, then Durood Ibrahim, then a dua."},
  {icon:"party", t:"Finish with Salam", d:"Turn your face to the right and say \"Assalamu alaikum wa rahmatullah\", then to the left and say it again. Your prayer is complete. MashaAllah!"},
];
// Each line: [Arabic, how to say it, what it means]
const SAY = [
  {t:"Takbir", when:"To start the prayer and when moving between positions", lines:[["اللّٰهُ أَكْبَرُ","Allahu Akbar.","Allah is the Greatest."]]},
  {t:"Thana (Sana)", when:"At the start of the 1st rakat, after Takbir", lines:[
    ["سُبْحَانَكَ اللّٰهُمَّ وَبِحَمْدِكَ","Subhanaka Allahumma wa bihamdika,","Glory be to You, O Allah, and all praise is Yours."],
    ["وَتَبَارَكَ اسْمُكَ","wa tabarakasmuka,","Blessed is Your name,"],
    ["وَتَعَالَىٰ جَدُّكَ","wa ta'ala jadduka,","high is Your greatness,"],
    ["وَلَا إِلٰهَ غَيْرُكَ","wa la ilaha ghairuk.","and there is no god except You."]]},
  {t:"Ta'awwudh and Bismillah", when:"Before Al-Fatiha", lines:[
    ["أَعُوذُ بِاللّٰهِ مِنَ الشَّيْطَانِ الرَّجِيمِ","A'udhu billahi minash-shaitanir-rajeem.","I seek protection with Allah from Shaitan, the rejected one."],
    ["بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ","Bismillahir-Rahmanir-Raheem.","In the name of Allah, the Most Kind, the Most Merciful."]]},
  {t:"Surah Al-Fatiha", when:"In every rakat", lines:[
    ["الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ","Alhamdu lillahi Rabbil-'alameen.","All praise is for Allah, Lord of all the worlds,"],
    ["الرَّحْمٰنِ الرَّحِيمِ","Ar-Rahmanir-Raheem.","the Most Kind, the Most Merciful,"],
    ["مَالِكِ يَوْمِ الدِّينِ","Maliki yawmid-deen.","Master of the Day of Judgement."],
    ["إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ","Iyyaka na'budu wa iyyaka nasta'een.","You alone we worship, and You alone we ask for help."],
    ["اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ","Ihdinas-siratal-mustaqeem.","Guide us on the straight path,"],
    ["صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ","Siratal-ladheena an'amta 'alaihim,","the path of those You have blessed,"],
    ["غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ","ghairil-maghdubi 'alaihim wa lad-dalleen.","not of those who earned Your anger, nor of those who went astray."],
    ["آمِين","Ameen.","(Say it quietly.)"]]},
  {t:"Surah Al-Ikhlas", when:"After Al-Fatiha (an easy surah to learn first)", lines:[
    ["قُلْ هُوَ اللّٰهُ أَحَدٌ","Qul huwa Allahu ahad.","Say: He is Allah, the One."],
    ["اللّٰهُ الصَّمَدُ","Allahus-samad.","Allah, who needs nothing, and everyone needs Him."],
    ["لَمْ يَلِدْ وَلَمْ يُولَدْ","Lam yalid wa lam yulad.","He has no children, and He was not born."],
    ["وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ","Wa lam yakun lahu kufuwan ahad.","And there is nothing like Him."]]},
  {t:"In Ruku and Sajdah", when:"Each one 3 times", lines:[
    ["سُبْحَانَ رَبِّيَ الْعَظِيمِ","Subhana Rabbiyal Azeem.","Glory be to my Lord, the Great. (In Ruku)"],
    ["سَمِعَ اللّٰهُ لِمَنْ حَمِدَهُ","Sami Allahu liman hamidah.","Allah hears whoever praises Him. (Rising from Ruku)"],
    ["رَبَّنَا لَكَ الْحَمْدُ","Rabbana lakal hamd.","Our Lord, all praise is Yours. (Standing)"],
    ["سُبْحَانَ رَبِّيَ الْأَعْلَىٰ","Subhana Rabbiyal A'la.","Glory be to my Lord, the Most High. (In Sajdah)"]]},
  {t:"At-Tahiyyat", when:"When sitting after 2 rakats and at the end", lines:[
    ["التَّحِيَّاتُ لِلّٰهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ","At-tahiyyatu lillahi was-salawatu wat-tayyibat.","All greetings, prayers and good things are for Allah."],
    ["السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللّٰهِ وَبَرَكَاتُهُ","As-salamu 'alaika ayyuhan-nabiyyu wa rahmatullahi wa barakatuh.","Peace be on you, O Prophet, and Allah's mercy and blessings."],
    ["السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللّٰهِ الصَّالِحِينَ","As-salamu 'alaina wa 'ala 'ibadillahis-saliheen.","Peace be on us and on Allah's good servants."],
    ["أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ","Ash-hadu an la ilaha illallah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh.","I bear witness there is no god but Allah, and that Muhammad is His servant and Messenger."]]},
  {t:"Durood Ibrahim", when:"In the last sitting, after At-Tahiyyat", lines:[
    ["اللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ","Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad,","O Allah, send Your blessings on Muhammad and his family,"],
    ["كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ","kama sallaita 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hameedun Majeed.","as You blessed Ibrahim and his family. You are Praised and Glorious."],
    ["اللّٰهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ","Allahumma barik 'ala Muhammadin wa 'ala ali Muhammad,","O Allah, bless Muhammad and his family,"],
    ["كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ","kama barakta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hameedun Majeed.","as You blessed Ibrahim and his family. You are Praised and Glorious."]]},
  {t:"Dua before Salam", when:"After Durood Ibrahim", lines:[
    ["رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ","Rabbana atina fid-dunya hasanah, wa fil-akhirati hasanah, wa qina 'adhaban-nar.","Our Lord, give us good in this world and good in the next, and save us from the punishment of the Fire."]]},
  {t:"Salam", when:"To finish", lines:[["السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللّٰهِ","Assalamu alaikum wa rahmatullah.","Peace and Allah's mercy be on you. (Right, then left.)"]]},
];
const BONUS_GUIDE = [
  {icon:"b-tahajjud", t:"Tahajjud (night prayer)", when:"After Isha, best in the last part of the night, before Fajr",
   steps:["Sleep a little after Isha, then wake up before Fajr. (If that's hard, you may pray it before going to bed.)",
          "Make wudu and make your intention: \"2 rakats Nafl, Tahajjud, for Allah.\"",
          "Pray 2 rakats just like Fajr Sunnah. You can pray more, 2 at a time (2, 4, 6 or 8 rakats).",
          "After praying, make dua. This is a special time when Allah loves to answer duas."]},
  {icon:"b-ishraq", t:"Ishraq (sunrise prayer)", when:"About 20 minutes after sunrise",
   steps:["After Fajr, wait until the sun has fully risen (about 20 minutes after sunrise). Don't pray while the sun is still rising.",
          "Make your intention: \"2 rakats Nafl, Ishraq, for Allah.\"",
          "Pray 2 or 4 rakats, 2 at a time, like any 2-rakat prayer.",
          "Staying in remembrance of Allah from Fajr until Ishraq brings an extra big reward."]},
];

export function openGuide({el, img, tab: startTab}){
  const root = document.getElementById("guide-root");
  let tab = startTab || "steps";
  const close = () => { root.replaceChildren(); document.body.classList.remove("gaming"); };
  const P = [["fajr","Fajr"],["dhuhr","Dhuhr"],["asr","Asr"],["maghrib","Maghrib"],["isha","Isha"]];
  function body(){
    if (tab === "steps") return el("ol",{class:"guide-steps"}, STEPS.map((s,i) => el("li",{}, el("span",{class:"gnum"}, i+1), img(s.icon), el("div",{}, el("b",{}, s.t), el("p",{}, s.d)))));
    if (tab === "say") return el("div",{class:"stack"}, SAY.map(s => el("section",{class:"say-card"},
      el("div",{class:"say-head"}, el("b",{}, s.t), el("span",{}, s.when)),
      s.lines.map(([ar, tr, en]) => el("div",{class:"say-line"}, el("div",{class:"ar", lang:"ar", dir:"rtl"}, ar), el("div",{class:"tr"}, tr), el("div",{class:"en"}, en))))));
    if (tab === "bonus") return el("div",{class:"stack"},
      el("p",{class:"small muted"},"Extra (Nafl) prayers that earn bonus points in Salah Tracker, once a grown-up confirms them."),
      BONUS_GUIDE.map(b => el("section",{class:"say-card"},
        el("div",{class:"say-head"}, el("b",{}, b.t), el("span",{}, b.when)),
        el("div",{class:"rk-row", style:"box-shadow:none;padding:0"}, img(b.icon), el("ol",{class:"bonus-steps"}, b.steps.map(s => el("li",{}, s)))))));
    return el("div",{class:"stack"},
      el("p",{class:"small muted"},"How many rakats to pray. Fard and Witr are a must. Sunnah is very important. Nafl is extra reward."),
      P.map(([k,n]) => el("div",{class:"rk-row"}, img(`p-${k}`), el("div",{style:"min-width:0"}, el("b",{}, n),
        el("div",{class:"rk-chips"}, RAKATS[k].map(r => el("span",{class:`rk rk-${r.kind}`}, `${r.n} ${r.label || KIND_LABEL[r.kind]}`)))))),
      el("p",{class:"small muted"},"Just starting? Begin with the Fard rakats: Fajr 2, Dhuhr 4, Asr 4, Maghrib 3, Isha 4 (plus 3 Witr). Add the Sunnah as you grow."));
  }
  function draw(){
    root.replaceChildren(el("div",{class:"game-screen guide-screen", role:"dialog", "aria-label":"How to pray"},
      el("div",{class:"gs-top"}, el("button",{class:"btn ghost sm", onclick:close},"← Back"), el("div",{class:"gs-title"}, img("mosque"), "How to pray"), el("span",{style:"width:70px"})),
      el("div",{class:"tabs guide-tabs", role:"tablist"},
        [["steps","Steps"],["say","What to say"],["rakats","Rakats"],["bonus","Bonus"]].map(([k,l]) => el("button",{role:"tab", "aria-selected":String(tab===k), onclick:()=>{tab=k; draw(); root.firstChild.scrollTop = 0;}}, l))),
      body()));
  }
  document.body.classList.add("gaming");
  draw();
}
