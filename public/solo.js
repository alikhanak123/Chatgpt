// Salah Tracker — play any game against the computer (no internet play needed). Levels: easy, medium, hard.
import { loadChess, aiMove, chessBoard, chessStatus } from "/chesskit.js";
import { renderSLBoard, slMove } from "/games.js";

export const LEVEL_NAMES = {easy:"Easy", medium:"Medium", hard:"Hard"};
const COLORS = ["#FF5C8A", "#3E9BFF", "#17A35F", "#FFC23C"];
const C4C = 7, C4R = 6;

export function openSolo(type, {level = "medium", bots = 1} = {}, ctx){
  const {el, img, avatar, toast, confetti} = ctx;
  const root = document.getElementById("game-root");
  const me = ctx.me(), cpu = {avatar:"av-robot", name:"Computer"};
  let stopFns = [], closed = false;
  const later = (fn, ms) => { const t = setTimeout(() => { if (!closed) fn(); }, ms); stopFns.push(() => clearTimeout(t)); };
  const close = () => { closed = true; stopFns.forEach(f => f()); stopFns = []; root.replaceChildren(); document.body.classList.remove("gaming"); };
  document.body.classList.add("gaming");
  const TITLE = {ttt:["Tic-Tac-Toe","xmark"], c4:["Four in a Row","disc-red"], memory:["Memory Match","cards"], snakes:["Snakes & Ladders","snake"], hockey:["Air Hockey","hockey"], chess:["Chess","chess"]}[type];
  const score = {me:0, cpu:0};
  const pcard = (p, label, sc, active) => el("div",{class:`gs-player ${active ? "active" : ""}`}, avatar(p, 48), el("div",{}, el("b",{}, label), el("div",{class:"gs-score num"}, sc)));
  function frame(status, board, {done = false, again, players, go = false} = {}){
    root.replaceChildren(el("div",{class:"game-screen", role:"dialog", "aria-label":TITLE[0]},
      el("div",{class:"gs-top"}, el("button",{class:"btn ghost sm", onclick:close},"← Back"), el("div",{class:"gs-title"}, img(TITLE[1]), TITLE[0]), el("span",{class:"lvl-chip"}, LEVEL_NAMES[level])),
      players || el("div",{class:"gs-players"}, pcard(me, "You", score.me, go), el("div",{class:"gs-vs"},"vs"), pcard(cpu, "Computer", score.cpu, !go && !done)),
      el("div",{class:`gs-status ${go ? "go" : ""}`}, status),
      board,
      done ? el("div",{class:"actions", style:"justify-content:center"}, el("button",{class:"btn primary", onclick:again},"Play again"), el("button",{class:"btn ghost", onclick:close},"Done")) : null));
  }
  const cheer = w => { if (w === "me"){ score.me++; confetti(); toast("You beat the computer! MashaAllah!", "trophy"); } else if (w === "cpu"){ score.cpu++; toast("The computer won this time. Try again!", "av-robot"); } else toast("It's a draw!", "game"); };

  // ---------- Tic-Tac-Toe ----------
  if (type === "ttt"){
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const win = b => { for (const [a,c,d] of L) if (b[a] !== "." && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.includes(".") ? null : "draw"; };
    const mm = (b, who) => { const w = win(b); if (w === "2") return 10; if (w === "1") return -10; if (w === "draw") return 0;
      const vals = [...b].map((c,i) => c === "." ? mm(b.slice(0,i) + who + b.slice(i+1), who === "2" ? "1" : "2") : null).filter(v => v !== null);
      return who === "2" ? Math.max(...vals) : Math.min(...vals); };
    const pickCpu = b => {
      const free = [...b].map((c,i) => c === "." ? i : -1).filter(i => i >= 0);
      if (level === "easy") return free[Math.random()*free.length|0];
      for (const who of ["2","1"]) for (const i of free) if (win(b.slice(0,i) + who + b.slice(i+1)) === who) return i;   // win, else block
      if (level === "medium") return b[4] === "." ? 4 : free[Math.random()*free.length|0];
      let best = -99, bi = free[0]; for (const i of free){ const v = mm(b.slice(0,i) + "2" + b.slice(i+1), "1"); if (v > best){ best = v; bi = i; } } return bi;
    };
    let b, turn, first = "me";
    const start = () => { b = "........."; turn = first; first = first === "me" ? "cpu" : "me"; draw(); if (turn === "cpu") later(cpuGo, 500); };
    const end = () => { const w = win(b); if (!w) return false; cheer(w === "1" ? "me" : w === "2" ? "cpu" : "draw"); draw(w); return true; };
    const cpuGo = () => { const i = pickCpu(b); b = b.slice(0,i) + "2" + b.slice(i+1); if (!end()){ turn = "me"; draw(); } };
    function draw(w){
      const line = new Set(); for (const l of L) if (b[l[0]] !== "." && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) l.forEach(i => line.add(i));
      frame(w ? (w === "1" ? "You win! 🎉" : w === "2" ? "Computer wins!" : "It's a draw!") : turn === "me" ? "Your turn!" : "Computer is thinking…",
        el("div",{class:"ttt"}, [...b].map((c,i) => el("button",{class:`ttt-cell ${line.has(i) ? "win" : ""}`, disabled: !!w || turn !== "me" || c !== ".",
          onclick:() => { b = b.slice(0,i) + "1" + b.slice(i+1); if (!end()){ turn = "cpu"; draw(); later(cpuGo, 450); } }}, c === "1" ? img("xmark") : c === "2" ? img("omark") : null))),
        {done:!!w, again:start, go:!w && turn === "me"});
    }
    return start();
  }

  // ---------- Four in a Row ----------
  if (type === "c4"){
    const at = (b,r,c) => (r>=0 && r<C4R && c>=0 && c<C4C) ? b[r*C4C+c] : ".";
    const winner = b => { for (let r=0;r<C4R;r++) for (let c=0;c<C4C;c++){ const v = at(b,r,c); if (v === ".") continue;
      for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) if (at(b,r+dr,c+dc)===v && at(b,r+2*dr,c+2*dc)===v && at(b,r+3*dr,c+3*dc)===v) return v; }
      return b.includes(".") ? null : "draw"; };
    const drop = (b, col, ch) => { for (let r=C4R-1;r>=0;r--){ const i = r*C4C+col; if (b[i] === ".") return b.slice(0,i) + ch + b.slice(i+1); } return null; };
    const heur = b => { let s = 0; const W = [[0,1],[1,0],[1,1],[1,-1]];
      for (let r=0;r<C4R;r++) for (let c=0;c<C4C;c++) for (const [dr,dc] of W){ let two=0, one=0, emp=0;
        for (let k=0;k<4;k++){ const v = at(b,r+dr*k,c+dc*k); if (r+dr*k<0||r+dr*k>=C4R||c+dc*k<0||c+dc*k>=C4C){ two=-9; break; } v==="2"?two++:v==="1"?one++:emp++; }
        if (two < 0) continue; if (!one) s += [0,1,4,25,1000][two]; if (!two) s -= [0,1,5,30,1000][one]; }
      for (let r=0;r<C4R;r++) s += (b[r*C4C+3] === "2" ? 3 : b[r*C4C+3] === "1" ? -3 : 0);
      return s; };
    const nega = (b, depth, a, beta, who) => { const w = winner(b); if (w === "2") return 100000 + depth; if (w === "1") return -100000 - depth; if (w === "draw") return 0; if (!depth) return heur(b);
      const order = [3,2,4,1,5,0,6];
      if (who === "2"){ let best = -Infinity; for (const c of order){ const nb = drop(b,c,"2"); if (!nb) continue; best = Math.max(best, nega(nb, depth-1, a, beta, "1")); a = Math.max(a, best); if (a >= beta) break; } return best; }
      let best = Infinity; for (const c of order){ const nb = drop(b,c,"1"); if (!nb) continue; best = Math.min(best, nega(nb, depth-1, a, beta, "2")); beta = Math.min(beta, best); if (a >= beta) break; } return best; };
    const pickCpu = b => {
      const cols = [...Array(C4C).keys()].filter(c => drop(b,c,"2"));
      if (level === "easy") return cols[Math.random()*cols.length|0];
      for (const who of ["2","1"]) for (const c of cols) if (winner(drop(b,c,who)) === who) return c;
      if (level === "medium") return cols.includes(3) && Math.random() < .5 ? 3 : cols[Math.random()*cols.length|0];
      let best = -Infinity, bc = cols[0]; for (const c of cols){ const v = nega(drop(b,c,"2"), 5, -Infinity, Infinity, "1"); if (v > best){ best = v; bc = c; } } return bc;
    };
    let b, turn, first = "me";
    const start = () => { b = ".".repeat(C4C*C4R); turn = first; first = first === "me" ? "cpu" : "me"; draw(); if (turn === "cpu") later(cpuGo, 500); };
    const end = () => { const w = winner(b); if (!w) return false; cheer(w === "1" ? "me" : w === "2" ? "cpu" : "draw"); draw(w); return true; };
    const cpuGo = () => { b = drop(b, pickCpu(b), "2"); if (!end()){ turn = "me"; draw(); } };
    function draw(w){
      const cols = []; for (let c=0;c<C4C;c++) cols.push(el("button",{class:"c4-col", disabled: !!w || turn !== "me" || b[c] !== ".", onclick:() => { b = drop(b,c,"1"); if (!end()){ turn = "cpu"; draw(); later(cpuGo, 450); } }},
        Array.from({length:C4R}, (_,r) => { const v = b[r*C4C+c]; return el("span",{class:"c4-slot"}, v === "1" ? img("disc-red","c4-disc") : v === "2" ? img("disc-yellow","c4-disc") : null); })));
      frame(w ? (w === "1" ? "You win! 🎉" : w === "2" ? "Computer wins!" : "It's a draw!") : turn === "me" ? "Your turn! You are red." : "Computer is thinking…",
        el("div",{class:"c4-wrap"}, el("div",{class:"c4"}, cols)), {done:!!w, again:start, go:!w && turn === "me"});
    }
    return start();
  }

  // ---------- Memory Match ----------
  if (type === "memory"){
    const PICS = ["cat","panda","unicorn","lion","frog","owl","penguin","fox"];
    const remember = {easy:.25, medium:.6, hard:.95}[level];
    let deck, opened, matched, showing, turn, known;
    const start = () => { deck = [...PICS, ...PICS].sort(() => Math.random() - .5); opened = []; matched = {}; showing = null; turn = "me"; known = new Map(); score.me = score.cpu = 0; draw(); };
    const see = i => { if (Math.random() < remember) known.set(i, deck[i]); };
    const done = () => Object.keys(matched).length === deck.length;
    function flip(i, who){
      opened.push(i); see(i);
      if (opened.length < 2){ draw(); return; }
      const [a, c] = opened; opened = [];
      if (deck[a] === deck[c]){ matched[a] = matched[c] = who; score[who]++; known.delete(a); known.delete(c);
        if (done()){ const w = score.me === score.cpu ? "draw" : score.me > score.cpu ? "me" : "cpu"; if (w === "me"){ confetti(); toast("You beat the computer! MashaAllah!", "trophy"); } else toast(w === "cpu" ? "The computer found more pairs!" : "It's a draw!", "cards"); draw(w); return; }
        draw(); if (who === "cpu") later(cpuGo, 700);
      } else { showing = [a, c]; draw(); later(() => { showing = null; turn = who === "me" ? "cpu" : "me"; draw(); if (turn === "cpu") later(cpuGo, 600); }, 1100); }
    }
    function cpuGo(){
      const free = deck.map((_,i) => i).filter(i => !matched[i]);
      const pairs = new Map(); let pick = null;
      for (const [i, p] of known) if (!matched[i]){ if (pairs.has(p)){ pick = [pairs.get(p), i]; break; } pairs.set(p, i); }
      if (pick){ flip(pick[0], "cpu"); later(() => flip(pick[1], "cpu"), 600); return; }
      const unknown = free.filter(i => !known.has(i)), first = (unknown.length ? unknown : free)[Math.random()*(unknown.length || free.length)|0];
      flip(first, "cpu");
      later(() => { const mate = [...known].find(([i, p]) => i !== first && !matched[i] && p === deck[first]);
        const rest = free.filter(i => i !== first); flip(mate ? mate[0] : rest[Math.random()*rest.length|0], "cpu"); }, 650);
    }
    function draw(w){
      const up = new Set([...opened, ...(showing || [])]);
      frame(w ? (w === "me" ? "You win! 🎉" : w === "cpu" ? "Computer wins!" : "It's a draw!") : turn === "me" ? "Your turn! Find a pair." : "Computer is looking…",
        el("div",{class:"mem-wrap"}, el("div",{class:"mem"}, deck.map((p, i) => { const face = up.has(i) || matched[i];
          return el("button",{class:`mem-card ${face ? "up" : ""} ${matched[i] ? `got ${matched[i] === "me" ? "mine" : "theirs"}` : ""}`, disabled: !!w || turn !== "me" || !!face || !!showing || opened.length >= 2,
            onclick:() => flip(i, "me")}, face ? img(p) : img("star","mem-back")); }))),
        {done:!!w, again:start, go:!w && turn === "me"});
    }
    return start();
  }

  // ---------- Snakes & Ladders (you + 1–3 computer players) ----------
  if (type === "snakes"){
    const n = Math.max(1, Math.min(3, bots));
    const ids = ["me", ...Array.from({length:n}, (_,i) => `cpu${i+1}`)];
    const names = {me:"You", cpu1:"Robo", cpu2:"Astro", cpu3:"Ninja"}, avs = {me, cpu1:{avatar:"av-robot"}, cpu2:{avatar:"av-astronaut"}, cpu3:{avatar:"av-ninja"}};
    let pos, turn, dice, last, winner;
    const start = () => { pos = Object.fromEntries(ids.map(i => [i, 0])); turn = 0; dice = null; last = ""; winner = null; draw(); };
    function roll(){
      const id = ids[turn], r = slMove(pos[id]);
      dice = r.dice; pos[id] = r.to;
      last = `${names[id]} rolled ${r.dice}${r.via === "ladder" ? " and climbed a ladder! 🪜" : r.via === "snake" ? " and slid down a snake! 🐍" : r.stay ? " (need the exact number)" : ""}`;
      if (r.to === 100){ winner = id; if (id === "me"){ confetti(); toast("You reached 100! MashaAllah!", "trophy"); } else toast(`${names[id]} won this time!`, "av-robot"); draw(); return; }
      if (r.dice !== 6) turn = (turn + 1) % ids.length;
      draw();
      if (ids[turn] !== "me") later(roll, 1000);
    }
    function draw(){
      const players = el("div",{class:"sl-players"}, ids.map((id, i) => el("div",{class:`gs-player ${!winner && ids[turn] === id ? "active" : ""}`, style:`border-color:${COLORS[i]}`}, avatar(avs[id], 48), el("div",{}, el("b",{}, names[id]), el("div",{class:"small muted"}, `Square ${pos[id]}`)))));
      const myTurn = !winner && ids[turn] === "me";
      frame(winner ? (winner === "me" ? "You win! 🎉" : `${names[winner]} wins!`) : myTurn ? "Your turn! Roll the dice." : `${names[ids[turn]]} is rolling…`,
        el("div",{class:"stack", style:"gap:12px"},
          el("div",{class:"sl-controls"}, dice ? el("div",{class:"dice-big"}, String(dice)) : el("div",{class:"dice empty"}), el("button",{class:"btn primary", disabled:!myTurn, onclick:roll}, img("die"), "Roll"), el("div",{class:"small muted", style:"flex:1;min-width:0"}, last)),
          renderSLBoard({el, order:ids, pos, avatarOf:id => avs[id], colors:COLORS})),
        {done:!!winner, again:start, players, go:myTurn});
    }
    return start();
  }

  // ---------- Chess ----------
  if (type === "chess"){
    let Chess, fen, myColor = "w", last = null, over = false;
    const start = () => { const ch = new Chess(); fen = ch.fen(); last = null; over = false; draw(); if (myColor === "b") later(cpuGo, 600); };
    const check = ch => { if (!ch.game_over()) return false; over = true;
      if (ch.in_checkmate()){ const meWon = ch.turn() !== myColor; cheer(meWon ? "me" : "cpu"); } else cheer("draw"); return true; };
    const cpuGo = () => { const ch = new Chess(fen), mv = aiMove(ch, level); if (!mv) return; ch.move(mv); fen = ch.fen(); last = {from:mv.from, to:mv.to}; check(ch); draw(); };
    function draw(){
      const ch = new Chess(fen), mine = ch.turn() === myColor && !over;
      frame(chessStatus(ch, myColor, "Computer") + (mine || over ? "" : ""),
        el("div",{class:"stack", style:"gap:8px;align-items:center"},
          chessBoard(el, {Chess, fen, myColor, canMove:mine, last, onMove:(mv, nf) => { fen = nf; last = {from:mv.from, to:mv.to}; const c2 = new Chess(fen); if (!check(c2)){ draw(); later(cpuGo, level === "hard" ? 50 : 400); } else draw(); }}),
          el("div",{class:"small muted"}, myColor === "w" ? "You are white. Tap a piece, then where it should go." : "You are black. Tap a piece, then where it should go.")),
        {done:over, again:() => { myColor = myColor === "w" ? "b" : "w"; start(); }, go:mine});
    }
    frame("Loading the chess board…", el("div",{class:"muted"}," "));
    loadChess().then(C => { Chess = C; start(); }).catch(() => frame("Couldn't load chess. Check the internet.", el("div",{})));
    return;
  }

  // ---------- Air Hockey vs computer ----------
  if (type === "hockey"){
    const W = 1, H = 1.6, PR = .075, BR = .045, GOAL = .38, WIN = 5;
    const aiSpeed = {easy:.9, medium:1.5, hard:2.3}[level], aiReact = {easy:.35, medium:.15, hard:.05}[level];
    let mine, them, puck, scoreMe, scoreCpu, over, cd, running = true, last = performance.now(), reactT = 0, aimX = .5;
    const canvas = el("canvas",{class:"hockey", "aria-label":"Air hockey rink. Drag your paddle."});
    const status = el("div",{class:"gs-status"});
    const sc = el("div",{class:"gs-players"});
    const again = el("button",{class:"btn primary", onclick:() => start()},"Play again");
    const wrapEl = el("div",{class:"hockey-wrap"}, canvas, el("div",{class:"small muted", style:"text-align:center"},"Drag your pink paddle. Defend the bottom goal!"));
    root.replaceChildren(el("div",{class:"game-screen", role:"dialog", "aria-label":"Air Hockey"},
      el("div",{class:"gs-top"}, el("button",{class:"btn ghost sm", onclick:close},"← Back"), el("div",{class:"gs-title"}, img("hockey"), "Air Hockey"), el("span",{class:"lvl-chip"}, LEVEL_NAMES[level])),
      sc, status, wrapEl, el("div",{class:"actions", style:"justify-content:center"}, again)));
    stopFns.push(() => { running = false; });
    let scale = 300;
    const resize = () => { const maxW = Math.min(wrapEl.clientWidth || 340, 420), maxH = Math.max(320, innerHeight - 300); scale = Math.min(maxW / W, maxH / H);
      canvas.width = Math.round(W*scale*devicePixelRatio); canvas.height = Math.round(H*scale*devicePixelRatio); canvas.style.width = `${W*scale}px`; canvas.style.height = `${H*scale}px`; };
    const ro = new ResizeObserver(resize); ro.observe(wrapEl); stopFns.push(() => ro.disconnect());
    const pointer = e => { const r = canvas.getBoundingClientRect(); let x = (e.clientX - r.left)/scale, y = (e.clientY - r.top)/scale;
      x = Math.max(PR, Math.min(W-PR, x)); y = Math.max(H/2 + PR, Math.min(H-PR, y)); mine.vx = (x - mine.x)*60; mine.vy = (y - mine.y)*60; mine.x = x; mine.y = y; e.preventDefault(); };
    canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture(e.pointerId); pointer(e); });
    canvas.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") pointer(e); });
    const paint = () => sc.replaceChildren(pcard(me, "You", scoreMe, false), el("div",{class:"gs-vs"},"vs"), pcard(cpu, "Computer", scoreCpu, false));
    function start(){ mine = {x:.5, y:H-.18, vx:0, vy:0}; them = {x:.5, y:.18, vx:0, vy:0}; puck = {x:.5, y:H*.62, vx:0, vy:0}; scoreMe = scoreCpu = 0; over = false; cd = 2; again.hidden = true; paint(); status.textContent = "First to 5 goals wins!"; }
    const collide = p => { const dx = puck.x - p.x, dy = puck.y - p.y, d = Math.hypot(dx, dy), min = PR + BR;
      if (d < min && d > 0){ const nx = dx/d, ny = dy/d; puck.x = p.x + nx*min; puck.y = p.y + ny*min; const rel = (puck.vx - p.vx)*nx + (puck.vy - p.vy)*ny;
        if (rel < 0){ puck.vx -= 1.9*rel*nx; puck.vy -= 1.9*rel*ny; } const sp = Math.hypot(puck.vx, puck.vy); if (sp > 3.2){ puck.vx *= 3.2/sp; puck.vy *= 3.2/sp; } } };
    function physics(dt){
      // computer paddle: follow the puck on its half, otherwise guard the goal
      reactT += dt; if (reactT > aiReact){ reactT = 0; aimX = puck.x + (level === "easy" ? (Math.random() - .5)*.25 : 0); }
      const tx = puck.y < H/2 ? aimX : .5, ty = puck.y < H/2 ? Math.max(PR, Math.min(H/2 - PR, puck.y - .05)) : .2;
      const ox = them.x, oy = them.y, mx = Math.max(-aiSpeed*dt, Math.min(aiSpeed*dt, tx - them.x)), my = Math.max(-aiSpeed*dt, Math.min(aiSpeed*dt, ty - them.y));
      them.x += mx; them.y += my; them.vx = (them.x - ox)/dt; them.vy = (them.y - oy)/dt;
      puck.x += puck.vx*dt; puck.y += puck.vy*dt; puck.vx *= Math.pow(.6, dt); puck.vy *= Math.pow(.6, dt);
      if (puck.x < BR){ puck.x = BR; puck.vx = Math.abs(puck.vx); } if (puck.x > W-BR){ puck.x = W-BR; puck.vx = -Math.abs(puck.vx); }
      const inGoal = Math.abs(puck.x - W/2) < GOAL/2;
      if (puck.y < BR && !inGoal){ puck.y = BR; puck.vy = Math.abs(puck.vy); } if (puck.y > H-BR && !inGoal){ puck.y = H-BR; puck.vy = -Math.abs(puck.vy); }
      if (puck.y < -BR) return "me"; if (puck.y > H+BR) return "cpu";
      collide(mine); collide(them); return null;
    }
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    function draw(){
      const s = scale*devicePixelRatio, c = canvas.getContext("2d"); c.setTransform(s,0,0,s,0,0); c.clearRect(0,0,W,H);
      c.fillStyle = css("--surface-2"); c.beginPath(); c.roundRect(0,0,W,H,.06); c.fill();
      c.strokeStyle = css("--line"); c.lineWidth = .012; c.beginPath(); c.moveTo(0,H/2); c.lineTo(W,H/2); c.stroke(); c.beginPath(); c.arc(W/2,H/2,.14,0,7); c.stroke();
      c.fillStyle = css("--grape"); c.fillRect(W/2-GOAL/2, 0, GOAL, .025); c.fillStyle = css("--accent"); c.fillRect(W/2-GOAL/2, H-.025, GOAL, .025);
      for (const [p, col] of [[them, css("--grape")], [mine, css("--accent")]]){ c.fillStyle = col; c.beginPath(); c.arc(p.x,p.y,PR,0,7); c.fill(); c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.arc(p.x,p.y,PR*.5,0,7); c.fill(); }
      c.fillStyle = css("--ink"); c.beginPath(); c.arc(puck.x,puck.y,BR,0,7); c.fill();
      if (cd > 0 && !over){ c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.roundRect(.3,H/2-.11,.4,.22,.05); c.fill(); c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "700 .14px Fredoka, sans-serif"; c.fillText(String(Math.ceil(cd)), W/2, H/2); }
    }
    function frameLoop(now){
      if (!running) return;
      const dt = Math.min(.05, (now - last)/1000); last = now; mine.vx *= .8; mine.vy *= .8;
      if (!over){
        if (cd > 0) cd -= dt;
        else { const g = physics(dt);
          if (g){ if (g === "me") scoreMe++; else scoreCpu++; paint(); puck = {x:.5, y: g === "me" ? H*.38 : H*.62, vx:0, vy:0}; cd = 1.5;
            if (scoreMe >= WIN || scoreCpu >= WIN){ over = true; again.hidden = false; if (scoreMe >= WIN){ confetti(); status.textContent = "You win! 🎉"; } else status.textContent = "Computer wins! Try again!"; } } }
      }
      draw(); requestAnimationFrame(frameLoop);
    }
    start(); requestAnimationFrame(t => { last = t; resize(); frameLoop(t); });
  }
}
