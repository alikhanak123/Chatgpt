// Salah Tracker — Dots and Boxes, Find the Ships, Word Search race, Draw and Guess, Quick Ludo.
// Each game is written once as plain rules (init / move / turn / winner / bot / view). The same rules run
// online with buddies (games.js keeps the state in the Realtime Database and applies moves in a transaction)
// and offline against the computer (openKit below).
// State must be safe for the Realtime Database: no empty arrays or objects (they disappear), so boards are strings.
const COLORS = ["#E8466C", "#2E8BEA", "#F5A524", "#0A8A7C"];
const rint = n => Math.random() * n | 0;
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
const setAt = (s, i, ch) => s.slice(0, i) + ch + s.slice(i + 1);
const countOf = (s, ch) => [...s].filter(c => c === ch).length;
const best = (players, score) => { const sc = players.map(score), top = Math.max(...sc); return sc.filter(v => v === top).length > 1 ? "draw" : players[sc.indexOf(top)]; };

// ======================= Dots and Boxes =======================
// 4×4 boxes. Draw a line on your turn; close a box to claim it and go again. Most boxes wins.
const DN = 4, DH = (DN + 1) * DN, DL = DH * 2;
const boxLines = b => { const r = b / DN | 0, c = b % DN; return [r * DN + c, (r + 1) * DN + c, DH + r * (DN + 1) + c, DH + r * (DN + 1) + c + 1]; };
const boxesOf = l => { const out = []; if (l < DH){ const r = l / DN | 0, c = l % DN; if (r > 0) out.push((r - 1) * DN + c); if (r < DN) out.push(r * DN + c); }
  else { const k = l - DH, r = k / (DN + 1) | 0, c = k % (DN + 1); if (c > 0) out.push(r * DN + c - 1); if (c < DN) out.push(r * DN + c); } return out; };
const sidesDone = (lines, b) => boxLines(b).filter(l => lines[l] !== ".").length;
const dots = {
  name:"Dots and Boxes", icon:"star", blurb:"Draw lines. Close a box to claim it!", min:2, max:2,
  init:p => ({players:p, t:0, lines:".".repeat(DL), boxes:".".repeat(DN * DN)}),
  turn:s => s.players[s.t],
  move(s, pid, a){
    if (s.players[s.t] !== pid || !(a.l >= 0 && a.l < DL) || s.lines[a.l] !== ".") return null;
    let lines = setAt(s.lines, a.l, String(s.t)), boxes = s.boxes, got = false;
    for (const b of boxesOf(a.l)) if (sidesDone(lines, b) === 4){ boxes = setAt(boxes, b, String(s.t)); got = true; }
    return {...s, lines, boxes, t:got ? s.t : 1 - s.t};
  },
  winner:s => s.boxes.includes(".") ? null : best(s.players, (u, i) => countOf(s.boxes, String(s.players.indexOf(u)))),
  score:(s, u) => countOf(s.boxes, String(s.players.indexOf(u))),
  bot(s, pid, level){
    const free = [...s.lines].map((c, i) => c === "." ? i : -1).filter(i => i >= 0);
    if (level === "easy") return {l:free[rint(free.length)]};
    const closes = free.filter(l => boxesOf(l).some(b => sidesDone(s.lines, b) === 3));
    if (closes.length) return {l:closes[rint(closes.length)]};
    const safe = free.filter(l => boxesOf(l).every(b => sidesDone(s.lines, b) < 2));
    if (safe.length) return {l:safe[rint(safe.length)]};
    if (level === "medium") return {l:free[rint(free.length)]};
    // hard: give away as few boxes as possible
    const cost = l => { let lines = setAt(s.lines, l, "x"), n = 0, again = true;
      while (again){ again = false; for (const f of [...lines].map((c, i) => c === "." ? i : -1).filter(i => i >= 0)) if (boxesOf(f).some(b => sidesDone(lines, b) === 3)){ lines = setAt(lines, f, "x"); n++; again = true; } } return n; };
    return {l:free.map(l => [cost(l), l]).sort((a, b) => a[0] - b[0])[0][1]};
  },
  view({el}, s, me, send){
    const mine = s.players[s.t] === me, U = 100 / DN, svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg"); svg.setAttribute("viewBox", "-6 -6 112 112"); svg.setAttribute("class", "dots-board");
    const mk = (tag, at) => { const e = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); svg.append(e); return e; };
    for (let b = 0; b < DN * DN; b++) if (s.boxes[b] !== "."){ const r = b / DN | 0, c = b % DN;
      mk("rect", {x:c * U + 2, y:r * U + 2, width:U - 4, height:U - 4, rx:5, fill:COLORS[+s.boxes[b]], opacity:.85}); }
    for (let l = 0; l < DL; l++){
      let x1, y1, x2, y2;
      if (l < DH){ const r = l / DN | 0, c = l % DN; x1 = c * U; y1 = r * U; x2 = x1 + U; y2 = y1; }
      else { const k = l - DH, r = k / (DN + 1) | 0, c = k % (DN + 1); x1 = c * U; y1 = r * U; x2 = x1; y2 = y1 + U; }
      const owner = s.lines[l];
      mk("line", {x1, y1, x2, y2, stroke:owner === "." ? "var(--line)" : COLORS[+owner], "stroke-width":owner === "." ? 1.6 : 3.4, "stroke-linecap":"round", "stroke-dasharray":owner === "." ? "2 3" : ""});
      if (owner === "." && mine){ const hit = mk("line", {x1, y1, x2, y2, stroke:"transparent", "stroke-width":11, class:"dots-hit"}); hit.addEventListener("click", () => send({l})); }
    }
    for (let r = 0; r <= DN; r++) for (let c = 0; c <= DN; c++) mk("circle", {cx:c * U, cy:r * U, r:2.6, fill:"var(--ink)"});
    return el("div",{class:"kit-board"}, svg, el("div",{class:"small muted", style:"text-align:center"}, mine ? "Tap between two dots to draw a line." : "Wait for your turn…"));
  },
};

// ======================= Find the Ships =======================
// 6×6 sea, ships of 3, 2, 2 and 1 placed at random. Take turns firing; sink all their ships to win.
const SN = 6, FLEET = [3, 2, 2, 1];
function placeFleet(){
  let sea = ".".repeat(SN * SN);
  FLEET.forEach((len, k) => {
    for (let tries = 0; tries < 200; tries++){
      const h = Math.random() < .5, r = rint(h ? SN : SN - len + 1), c = rint(h ? SN - len + 1 : SN);
      const cells = Array.from({length:len}, (_, i) => h ? r * SN + c + i : (r + i) * SN + c);
      if (cells.every(i => sea[i] === ".")){ cells.forEach(i => sea = setAt(sea, i, "abcd"[k])); break; }
    }
  });
  return sea;
}
const sunkAll = (sea, shots) => [...sea].every((c, i) => c === "." || shots[i] === "h");
const ships = {
  name:"Find the Ships", icon:"t-ocean", blurb:"Fire at the sea. Sink all their ships!", min:2, max:2,
  init:p => ({players:p, t:0, sea:Object.fromEntries(p.map(u => [u, placeFleet()])), shots:Object.fromEntries(p.map(u => [u, ".".repeat(SN * SN)])), last:"none"}),
  turn:s => s.players[s.t],
  move(s, pid, a){
    if (s.players[s.t] !== pid || !(a.i >= 0 && a.i < SN * SN)) return null;
    const foe = s.players[1 - s.t], shots = s.shots[pid];
    if (shots[a.i] !== ".") return null;
    const ship = s.sea[foe][a.i], hit = ship !== ".";
    const ns = setAt(shots, a.i, hit ? "h" : "x");
    const sunk = hit && [...s.sea[foe]].every((c, i) => c !== ship || ns[i] === "h");
    return {...s, shots:{...s.shots, [pid]:ns}, t:1 - s.t, last:`${pid}|${hit ? (sunk ? "sunk" : "hit") : "miss"}`};
  },
  winner:s => s.players.find(u => sunkAll(s.sea[s.players.find(v => v !== u)], s.shots[u])) || null,
  score:(s, u) => countOf(s.shots[u], "h"),
  bot(s, pid, level){
    const shots = s.shots[pid], free = [...shots].map((c, i) => c === "." ? i : -1).filter(i => i >= 0);
    if (level !== "easy"){
      const foe = s.players.find(u => u !== pid), sea = s.sea[foe];
      // follow up on hits whose ship isn't sunk yet
      for (let i = 0; i < SN * SN; i++) if (shots[i] === "h" && [...sea].some((c, j) => c === sea[i] && shots[j] !== "h")){
        const r = i / SN | 0, c = i % SN, near = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && y < SN && x >= 0 && x < SN).map(([y, x]) => y * SN + x).filter(j => shots[j] === ".");
        if (near.length) return {i:near[rint(near.length)]};
      }
      if (level === "hard"){ const even = free.filter(i => ((i / SN | 0) + i % SN) % 2 === 0); if (even.length) return {i:even[rint(even.length)]}; }
    }
    return {i:free[rint(free.length)]};
  },
  view({el, img}, s, me, send, nameOf){
    const foe = s.players.find(u => u !== me), mine = s.players[s.t] === me, myShots = s.shots[me], theirShots = s.shots[foe];
    const [who, what] = (s.last || "none").split("|");
    const msg = what ? `${who === me ? "You" : nameOf(who)}: ${what === "sunk" ? "sank a ship! 💥" : what === "hit" ? "hit! 🔥" : "missed 🌊"}` : "Find their hidden ships!";
    const grid = (sea, shots, clickable, showShips) => el("div",{class:`sea ${clickable ? "can" : ""}`}, Array.from({length:SN * SN}, (_, i) => {
      const shot = shots[i], ship = showShips && sea[i] !== ".";
      return el("button",{class:`cell2 ${ship ? "ship" : ""} ${shot === "h" ? "hit" : shot === "x" ? "miss" : ""}`, disabled:!clickable || shot !== ".", "aria-label":`Square ${i + 1}`, onclick:() => send({i})},
        shot === "h" ? "💥" : shot === "x" ? "•" : "");
    }));
    return el("div",{class:"kit-board ships-board"},
      el("div",{class:"small", style:"text-align:center;font-weight:900"}, msg),
      el("div",{class:"eyebrow", style:"text-align:center"}, `${nameOf(foe)}'s sea · tap to fire`),
      grid(s.sea[foe], myShots, mine, false),
      el("div",{class:"eyebrow", style:"text-align:center"},"Your ships"),
      el("div",{class:"sea-small"}, grid(s.sea[me], theirShots, false, true)));
  },
};

// ======================= Word Search race =======================
// 8×8 letters hiding 6 words. Tap the first letter, then the last. Find more words than the others!
const WN = 8;
const WS_SETS = [
  ["PRAYER", "MOSQUE", "QURAN", "FAJR", "ISHA", "WUDU", "ASR", "DUA"],
  ["CAMEL", "FALCON", "DATES", "DESERT", "OASIS", "PALM", "SAND", "MOON"],
  ["APPLE", "MANGO", "GRAPE", "LEMON", "PEACH", "MELON", "KIWI", "FIG"],
  ["LION", "TIGER", "ZEBRA", "PANDA", "HORSE", "SHEEP", "GOAT", "OWL"],
  ["KIND", "HONEST", "HELP", "SMILE", "SHARE", "THANKS", "PEACE", "CARE"],
];
function makeSearch(level){
  for (let tries = 0; tries < 50; tries++){
    const words = shuffle(WS_SETS[rint(WS_SETS.length)]).slice(0, 6), dirs = level === "hard" ? [[0,1],[1,0],[1,1],[-1,1]] : [[0,1],[1,0]];
    let g = Array(WN * WN).fill(""), placed = [];
    for (const w of words){
      let ok = false;
      for (let k = 0; k < 120 && !ok; k++){
        const [dr, dc] = dirs[rint(dirs.length)], r0 = rint(WN), c0 = rint(WN), cells = [...w].map((_, i) => [r0 + dr * i, c0 + dc * i]);
        if (cells.some(([r, c]) => r < 0 || r >= WN || c < 0 || c >= WN)) continue;
        if (cells.some(([r, c], i) => g[r * WN + c] && g[r * WN + c] !== w[i])) continue;
        cells.forEach(([r, c], i) => g[r * WN + c] = w[i]); placed.push({w, a:cells[0][0] * WN + cells[0][1], b:cells.at(-1)[0] * WN + cells.at(-1)[1]}); ok = true;
      }
      if (!ok) break;
    }
    if (placed.length < 6) continue;
    const ABC = "ABCDEFGHIJKLMNOPRSTUWY";
    return {grid:g.map(ch => ch || ABC[rint(ABC.length)]).join(""), words:placed};
  }
}
const wordCells = (a, b) => { const r1 = a / WN | 0, c1 = a % WN, r2 = b / WN | 0, c2 = b % WN, dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1), n = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  if (r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return [];
  return Array.from({length:n + 1}, (_, i) => (r1 + dr * i) * WN + c1 + dc * i); };
const wsearch = {
  name:"Word Search", icon:"abc", blurb:"Race to find the hidden words!", min:2, max:2, simultaneous:true,
  init:(p, opts = {}) => { const m = makeSearch(opts.level || "medium"); return {players:p, grid:m.grid, words:m.words, found:".".repeat(m.words.length)}; },
  turn:() => null,
  move(s, pid, a){
    const k = s.words.findIndex((w, i) => s.found[i] === "." && ((w.a === a.a && w.b === a.b) || (w.a === a.b && w.b === a.a)));
    if (k < 0) return null;
    return {...s, found:setAt(s.found, k, String(s.players.indexOf(pid)))};
  },
  winner:s => s.found.includes(".") ? null : best(s.players, u => countOf(s.found, String(s.players.indexOf(u)))),
  score:(s, u) => countOf(s.found, String(s.players.indexOf(u))),
  botEvery:{easy:16000, medium:10000, hard:6500},
  bot(s){ const k = [...s.found].map((c, i) => c === "." ? i : -1).filter(i => i >= 0); if (!k.length) return null; const w = s.words[k[rint(k.length)]]; return {a:w.a, b:w.b}; },
  view({el}, s, me, send, nameOf, local){
    local.sel ??= null;
    const owner = {}; s.words.forEach((w, k) => { if (s.found[k] !== ".") for (const i of wordCells(w.a, w.b)) owner[i] = +s.found[k]; });
    const grid = el("div",{class:"ws-grid"}, [...s.grid].map((ch, i) => el("button",{class:`ws-cell ${local.sel === i ? "sel" : ""}`,
      style:owner[i] != null ? `background:${COLORS[owner[i]]};color:#fff` : "", onclick:() => {
        if (local.sel == null){ local.sel = i; local.redraw(); return; }
        const a = local.sel; local.sel = null;
        if (a !== i && wordCells(a, i).length && send({a, b:i}) === false) local.toast?.("Not a word. Try again!");
        local.redraw();
      }}, ch)));
    return el("div",{class:"kit-board"},
      el("div",{class:"small muted", style:"text-align:center"}, local.sel == null ? "Tap the first letter of a word, then the last letter." : "Now tap the last letter."),
      grid,
      el("div",{class:"ws-words"}, s.words.map((w, k) => el("span",{class:`ws-word ${s.found[k] !== "." ? "got" : ""}`, style:s.found[k] !== "." ? `border-color:${COLORS[+s.found[k]]}` : ""},
        w.w, s.found[k] !== "." ? ` · ${s.players[+s.found[k]] === me ? "you" : nameOf(s.players[+s.found[k]])}` : ""))));
  },
};

// ======================= Draw and Guess (buddies only) =======================
// Take turns: the drawer picks a word and draws it; the other player picks the right word from 6 choices (2 tries).
// Right guess: guesser +2, drawer +1. 6 rounds.
const DRAW_WORDS = ["CAT", "SUN", "HOUSE", "TREE", "FISH", "MOON", "STAR", "CAR", "BALL", "APPLE", "CAMEL", "BOOK", "FLOWER", "CAKE", "BOAT", "KITE",
  "BIRD", "CLOCK", "UMBRELLA", "CUP", "DUCK", "RAINBOW", "SNAKE", "HEART", "PLANE", "TRAIN", "BANANA", "HAT", "SHOE", "PIZZA", "SPIDER", "MOSQUE"];
const DROUNDS = 6, PEN = ["#22204A", "#E8466C", "#2E8BEA", "#0A8A7C", "#F5A524"];
const newRound = s => ({...s, phase:"pick", pickFrom:shuffle(DRAW_WORDS).slice(0, 3).join(","), word:"", opts:"", strokes:null, tries:2, result:""});
const draw = {
  name:"Draw and Guess", icon:"palette", blurb:"Draw a word. Can your buddy guess it?", min:2, max:2, buddyOnly:true,
  init:p => newRound({players:p, r:0, pts:Object.fromEntries(p.map(u => [u, 0]))}),
  turn:s => s.phase === "pick" || s.phase === "draw" && !s.strokes ? s.players[s.r % 2] : null,
  move(s, pid, a){
    const drawer = s.players[s.r % 2], guesser = s.players[1 - s.r % 2];
    if (a.pick && s.phase === "pick" && pid === drawer && s.pickFrom.split(",").includes(a.pick)){
      const opts = shuffle([a.pick, ...shuffle(DRAW_WORDS.filter(w => w !== a.pick)).slice(0, 5)]).join(",");
      return {...s, phase:"draw", word:a.pick, opts};
    }
    if (a.stroke && s.phase === "draw" && pid === drawer) return {...s, strokes:[...(s.strokes || []), String(a.stroke).slice(0, 4000)].slice(-120)};
    if (a.clear && s.phase === "draw" && pid === drawer) return {...s, strokes:null};
    if (a.guess && s.phase === "draw" && pid === guesser && s.opts.split(",").includes(a.guess)){
      if (a.guess === s.word) return {...s, phase:"done", result:"right", pts:{...s.pts, [guesser]:(s.pts[guesser] || 0) + 2, [drawer]:(s.pts[drawer] || 0) + 1}};
      const tries = (s.tries || 2) - 1, opts = s.opts.split(",").filter(w => w !== a.guess).join(",");
      return tries > 0 ? {...s, tries, opts} : {...s, phase:"done", result:"wrong", tries:0};
    }
    if (a.next && s.phase === "done") return s.r + 1 >= DROUNDS ? {...s, phase:"over"} : newRound({...s, r:s.r + 1});
    return null;
  },
  winner:s => s.phase === "over" ? best(s.players, u => s.pts[u] || 0) : null,
  score:(s, u) => s.pts?.[u] || 0,
  status:(s, me) => s.phase === "done" ? "Round finished!" : s.phase === "draw" ? (s.players[s.r % 2] === me ? "Draw your word!" : "Guess the word!") : null,
  view({el}, s, me, send, nameOf, local){
    const drawer = s.players[s.r % 2], iDraw = drawer === me, other = s.players.find(u => u !== me);
    const head = el("div",{class:"small muted", style:"text-align:center"}, `Round ${Math.min(s.r + 1, DROUNDS)} of ${DROUNDS} · ${iDraw ? "you draw" : `${nameOf(drawer)} draws`}`);
    if (s.phase === "pick") return el("div",{class:"kit-board"}, head, iDraw
      ? el("div",{class:"stack", style:"gap:8px;align-items:center"}, el("b",{},"Pick a word to draw:"), el("div",{class:"row", style:"justify-content:center"},
          s.pickFrom.split(",").map(w => el("button",{class:"btn primary", onclick:() => send({pick:w})}, w))))
      : el("div",{class:"note", style:"text-align:center"}, `${nameOf(drawer)} is choosing a word…`));
    // the drawing: a square canvas; strokes are "x,y x,y …" in 0–1000 with a colour number first
    const size = Math.min(380, window.innerWidth - 40), cv = el("canvas",{class:"draw-canvas", width:size * 2, height:size * 2, style:`width:${size}px;height:${size}px`});
    const c2 = cv.getContext("2d"); c2.lineCap = c2.lineJoin = "round";
    const paint = (str, scale = size * 2 / 1000) => { const [col, ...pts] = str.split(" "); c2.strokeStyle = PEN[+col] || PEN[0]; c2.lineWidth = 10;
      c2.beginPath(); pts.forEach((p, i) => { const [x, y] = p.split(",").map(Number); i ? c2.lineTo(x * scale, y * scale) : c2.moveTo(x * scale, y * scale); }); if (pts.length === 1){ const [x, y] = pts[0].split(",").map(Number); c2.lineTo(x * scale + .1, y * scale); } c2.stroke(); };
    c2.fillStyle = "#fff"; c2.fillRect(0, 0, cv.width, cv.height); (s.strokes || []).forEach(st => paint(st));
    local.pen ??= 0;
    if (iDraw && s.phase === "draw"){
      let cur = null;
      const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1000), Math.round((e.clientY - r.top) / r.height * 1000)]; };
      cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); cur = [pt(e)]; });
      cv.addEventListener("pointermove", e => { if (!cur) return; const p = pt(e), q = cur.at(-1); if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 8) return; cur.push(p);
        c2.strokeStyle = PEN[local.pen]; c2.lineWidth = 10; c2.beginPath(); const sc = size * 2 / 1000; c2.moveTo(q[0] * sc, q[1] * sc); c2.lineTo(p[0] * sc, p[1] * sc); c2.stroke(); });
      const end = () => { if (!cur) return; const str = `${local.pen} ` + cur.map(p => p.join(",")).join(" "); cur = null; send({stroke:str}); };
      cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
      cv.style.touchAction = "none";
    }
    const parts = [head];
    if (s.phase === "draw" && iDraw) parts.push(el("div",{style:"text-align:center;font-weight:900"}, "Draw: ", el("span",{class:"draw-word"}, s.word)));
    parts.push(cv);
    if (s.phase === "draw" && iDraw) parts.push(el("div",{class:"row", style:"justify-content:center"},
      PEN.map((c, k) => el("button",{class:`pen ${local.pen === k ? "on" : ""}`, style:`background:${c}`, "aria-label":`Colour ${k + 1}`, onclick:() => { local.pen = k; local.redraw(); }})),
      el("button",{class:"btn ghost sm", onclick:() => send({clear:true})}, "Clear")));
    if (s.phase === "draw" && !iDraw) parts.push(el("div",{class:"stack", style:"gap:6px"},
      el("div",{class:"small muted", style:"text-align:center"}, `What is ${nameOf(drawer)} drawing? ${s.tries} ${s.tries === 1 ? "try" : "tries"} left`),
      el("div",{class:"quiz-opts", style:"grid-template-columns:1fr 1fr"}, s.opts.split(",").map(w => el("button",{class:"quiz-opt", onclick:() => send({guess:w})}, w)))));
    if (s.phase === "done") parts.push(el("div",{class:"stack", style:"gap:8px;align-items:center"},
      el("b",{}, s.result === "right" ? `Yes! It was ${s.word}! 🎉` : `It was ${s.word}. Good try!`),
      el("button",{class:"btn primary", onclick:() => send({next:true})}, s.r + 1 >= DROUNDS ? "See who won" : "Next round")));
    return el("div",{class:"kit-board"}, ...parts);
  },
};

// ======================= Quick Ludo (2 to 4 players, 2 pieces each) =======================
// Roll a 6 to bring a piece out. 6 = roll again. Land on someone to send them home. ★ squares are safe.
// Get both pieces to the middle to win. Steps: -1 = at home base, 0–50 round the board, 51–55 the coloured path, 56 = finished.
const LTRACK = (() => {   // the 52 squares, starting at red's start square
  const t = [], seg = (r1, c1, r2, c2) => { const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1); for (let r = r1, c = c1; ; r += dr, c += dc){ t.push([r, c]); if (r === r2 && c === c2) break; } };
  seg(6,1,6,5); seg(5,6,0,6); seg(0,7,0,7); seg(0,8,5,8); seg(6,9,6,14); seg(7,14,7,14); seg(8,14,8,9); seg(9,8,14,8); seg(14,7,14,7); seg(14,6,9,6); seg(8,5,8,0); seg(7,0,7,0); seg(6,0,6,0);
  return t;
})();
const LSTART = [0, 13, 26, 39], LSAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const LHOME = [[[7,1],[7,2],[7,3],[7,4],[7,5]], [[1,7],[2,7],[3,7],[4,7],[5,7]], [[7,13],[7,12],[7,11],[7,10],[7,9]], [[13,7],[12,7],[11,7],[10,7],[9,7]]];
const LBASE = [[[2,2],[3,3]], [[2,11],[3,12]], [[11,11],[12,12]], [[11,2],[12,3]]];
const LCOL = ["#E8466C", "#0A8A7C", "#F5A524", "#2E8BEA"], LPIECES = 2;
const seatsFor = n => n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
const absOf = (seat, step) => step >= 0 && step <= 50 ? (LSTART[seat] + step) % 52 : -1;
const canMove = (step, d) => step === -1 ? d === 6 : step + d <= 56;
const ludo = {
  name:"Quick Ludo", icon:"die", blurb:"Classic Ludo, quick version. 2 to 4 players!", min:2, max:4, multi:true,
  init:p => ({players:p, seats:seatsFor(p.length), toks:p.map(() => Array(LPIECES).fill(-1)), t:0, dice:0, phase:"roll", log:"start"}),
  turn:s => s.players[s.t],
  move(s, pid, a){
    if (s.players[s.t] !== pid) return null;
    const me = s.t, toks = s.toks.map(x => [...x]);
    const next = (again, log) => ({...s, toks, dice:s.dice, phase:"roll", t:again ? me : (me + 1) % s.players.length, log});
    if (a.roll && s.phase === "roll"){
      const d = 1 + rint(6), movable = toks[me].some(st => canMove(st, d));
      if (!movable) return {...s, dice:d, phase:"roll", t:d === 6 ? me : (me + 1) % s.players.length, log:`${pid}|rolled ${d}, no move`};
      return {...s, dice:d, phase:"move", log:`${pid}|rolled ${d}`};
    }
    if (a.piece != null && s.phase === "move"){
      const d = s.dice, k = a.piece, st = toks[me][k];
      if (!canMove(st, d)) return null;
      const ns = st === -1 ? 0 : st + d; toks[me][k] = ns;
      let log = `${pid}|${st === -1 ? "brought a piece out" : ns === 56 ? "got a piece home! 🏠" : `moved ${d}`}`, bonus = d === 6 || ns === 56;
      const at = absOf(s.seats[me], ns);
      if (at >= 0 && !LSAFE.has(at)) s.players.forEach((u, j) => { if (j === me) return;
        toks[j] = toks[j].map(o => { if (absOf(s.seats[j], o) === at){ bonus = true; log = `${pid}|sent ${u}'s piece home! 💥`; return -1; } return o; }); });
      return {...next(bonus && !toks[me].every(x => x === 56), log), toks};
    }
    return null;
  },
  winner:s => s.players.find((u, j) => s.toks[j].every(x => x === 56)) || null,
  score:(s, u) => s.toks[s.players.indexOf(u)].filter(x => x === 56).length,
  bot(s, pid, level){
    if (s.phase === "roll") return {roll:true};
    const me = s.players.indexOf(pid), d = s.dice, opts = s.toks[me].map((st, k) => [st, k]).filter(([st]) => canMove(st, d));
    if (!opts.length) return null;
    if (level === "easy") return {piece:opts[rint(opts.length)][1]};
    const value = ([st]) => { const ns = st === -1 ? 0 : st + d, at = absOf(s.seats[me], ns); let v = ns;
      if (ns === 56) v += 200; if (st === -1) v += 60;
      if (at >= 0 && !LSAFE.has(at) && s.toks.some((o, j) => j !== me && o.some(x => absOf(s.seats[j], x) === at))) v += 150;
      if (at >= 0 && LSAFE.has(at)) v += 20; return v; };
    return {piece:opts.sort((a, b) => value(b) - value(a))[0][1]};
  },
  view({el, img}, s, me, send, nameOf){
    const myIdx = s.players.indexOf(me), mine = s.players[s.t] === me, colorOf = j => LCOL[s.seats[j]];
    const board = el("div",{class:"ludo"});
    const cellAt = {};
    for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++){
      const q = r < 6 && c < 6 ? 0 : r < 6 && c > 8 ? 1 : r > 8 && c > 8 ? 2 : r > 8 && c < 6 ? 3 : -1;
      const d = el("div",{class:`lc ${q >= 0 ? "base" : ""}`, style:q >= 0 ? `background:${LCOL[q]}` : ""}); board.append(d); cellAt[`${r},${c}`] = d;
    }
    for (let i = 0; i < 52; i++){ const [r, c] = LTRACK[i], d = cellAt[`${r},${c}`]; d.classList.add("track");
      const st = LSTART.indexOf(i); if (st >= 0){ d.style.background = LCOL[st]; d.classList.add("start"); } if (LSAFE.has(i) && st < 0) d.textContent = "★"; }
    LHOME.forEach((path, q) => path.forEach(([r, c]) => { const d = cellAt[`${r},${c}`]; d.classList.add("track"); d.style.background = LCOL[q]; d.style.opacity = .75; }));
    for (let q = 0; q < 4; q++) LBASE[q].forEach(([r, c]) => cellAt[`${r},${c}`].classList.add("nest"));
    cellAt["7,7"].classList.add("goal");
    s.players.forEach((u, j) => s.toks[j].forEach((st, k) => {
      const seat = s.seats[j]; let rc;
      if (st === -1) rc = LBASE[seat][k]; else if (st <= 50) rc = LTRACK[absOf(seat, st)]; else if (st <= 55) rc = LHOME[seat][st - 51]; else rc = [7, 7];
      const can = mine && j === myIdx && s.phase === "move" && canMove(st, s.dice);
      const pc = el("button",{class:`piece ${can ? "can" : ""}`, style:`background:${colorOf(j)}`, disabled:!can, "aria-label":`${u === me ? "Your" : nameOf(u) + "'s"} piece`, onclick:() => send({piece:k})});
      cellAt[`${rc[0]},${rc[1]}`].append(pc);
    }));
    const [who, what] = (s.log || "").split("|");
    const logTxt = what ? `${who === me ? "You" : nameOf(who)} ${what.replace(/sent (\S+)'s/, (m, u) => `sent ${u === me ? "your" : nameOf(u) + "'s"}`)}` : "Roll a 6 to bring a piece out!";
    return el("div",{class:"kit-board"},
      el("div",{class:"sl-controls"},
        el("div",{class:"dice-big"}, s.dice || "–"),
        el("button",{class:"btn primary", disabled:!(mine && s.phase === "roll"), onclick:() => send({roll:true})}, img("die"), "Roll"),
        el("div",{class:"small muted", style:"flex:1;min-width:0"}, mine && s.phase === "move" ? "Tap a glowing piece to move it." : logTxt)),
      board,
      el("div",{class:"row small", style:"justify-content:center"}, s.players.map((u, j) => el("span",{class:"lchip"}, el("i",{style:`background:${colorOf(j)}`}), u === me ? "You" : nameOf(u)))));
  },
};

export const KIT = {dots, ships, wsearch, draw, ludo};

// ======================= the screen (shared by online and computer games) =======================
// opts: {G, state, me, nameOf, avatarOf, send(action) → false if not allowed, onBack, onAgain, winner, waiting, level}
export function kitScreen(ctx, o){
  const {el, img, avatar} = ctx, G = o.G, s = o.state, turn = s ? G.turn(s) : null, w = o.winner;
  const status = o.waiting || (!w && s && G.status?.(s, o.me)) || (w === "draw" ? "It's a draw!" : w ? (w === o.me ? "You win! 🎉" : `${o.nameOf(w)} wins!`)
    : turn === o.me ? "Your turn!" : turn ? `${o.nameOf(turn)}'s turn…` : "Go go go!");
  const players = s ? s.players : [];
  return el("div",{class:"game-screen", role:"dialog", "aria-label":G.name},
    el("div",{class:"gs-top"}, el("button",{class:"btn ghost sm", onclick:o.onBack},"← Back"), el("div",{class:"gs-title"}, img(G.icon), G.name),
      o.level ? el("span",{class:"lvl-chip"}, o.level) : el("span",{style:"width:70px"})),
    el("div",{class:"kit-players"}, players.map((u, j) => el("div",{class:`gs-player ${!w && turn === u ? "active" : ""}`, style:`border-color:${!w && turn === u ? "" : "transparent"}`},
      avatar(o.avatarOf(u), 48), el("div",{style:"min-width:0"}, el("b",{}, u === o.me ? "You" : o.nameOf(u)), el("div",{class:"gs-score num", style:`color:${(G === ludo ? LCOL[s.seats[j]] : COLORS[j])}`}, G.score(s, u)))))),
    el("div",{class:`gs-status ${!w && (turn === o.me || (G.simultaneous && !o.waiting)) ? "go" : ""}`}, status),
    s && !o.waiting ? G.view(ctx, s, o.me, o.send, o.nameOf, o.local) : null,
    w ? el("div",{class:"actions", style:"justify-content:center"}, el("button",{class:"btn primary", onclick:o.onAgain},"Play again"), el("button",{class:"btn ghost", onclick:o.onBack},"Done")) : null);
}

// ======================= playing against the computer =======================
export function openKit(type, {level = "medium", bots = 1} = {}, ctx){
  const G = KIT[type], root = document.getElementById("game-root"), me = ctx.me(), timers = [];
  const players = [me.uid, ...Array.from({length:G.multi ? Math.max(1, Math.min(3, bots)) : 1}, (_, i) => `cpu${i + 1}`)];
  const names = {cpu1:"Computer", cpu2:"Robo", cpu3:"Bleep"}, avs = {cpu1:{avatar:"av-robot"}, cpu2:{avatar:"av-astronaut"}, cpu3:{avatar:"dino"}};
  let state, first = 0, closed = false;
  const local = {redraw:() => draw(), toast:t => ctx.toast(t, "lock")};
  const later = (fn, ms) => timers.push(setTimeout(() => { if (!closed) fn(); }, ms));
  const close = () => { closed = true; timers.forEach(clearTimeout); clearInterval(local.tick); root.replaceChildren(); document.body.classList.remove("gaming"); };
  const start = () => { const order = [...players.slice(first), ...players.slice(0, first)]; first = (first + 1) % players.length;
    state = G.init(order, {level}); clearInterval(local.tick);
    if (G.simultaneous) local.tick = setInterval(() => { if (!closed && !G.winner(state)){ const a = G.bot(state, "cpu1", level); if (a) apply("cpu1", a); } }, G.botEvery[level] || 10000);
    draw(); };
  function apply(pid, a){
    const ns = G.move(state, pid, a); if (!ns) return false;
    const before = G.winner(state); state = ns; const w = G.winner(state);
    if (w && !before){ clearInterval(local.tick); if (w === me.uid){ ctx.confetti(); ctx.toast("You win! MashaAllah!", "trophy"); } else if (w === "draw") ctx.toast("It's a draw!", "game"); else ctx.toast(`${names[w]} won this time. Try again!`, "av-robot"); }
    draw(); return true;
  }
  function draw(){
    root.replaceChildren(kitScreen(ctx, {G, state, me:me.uid, level:{easy:"Easy", medium:"Medium", hard:"Hard"}[level], winner:G.winner(state), local,
      nameOf:u => names[u] || "You", avatarOf:u => avs[u] || me, send:a => apply(me.uid, a), onBack:close, onAgain:start}));
    const t = G.turn(state);
    if (!G.winner(state) && t && t !== me.uid) later(() => { const a = G.bot(state, t, level); if (a) apply(t, a); }, type === "ludo" ? 700 : 650);
  }
  document.body.classList.add("gaming");
  start();
}
