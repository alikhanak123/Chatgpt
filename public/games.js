// Salah Tracker — games for Salah Buddies: Four in a Row, Tic-Tac-Toe, Memory Match (2 players, turn-based),
// Snakes & Ladders (2–4 players) and Air Hockey (live).
// Uses Firebase Realtime Database:
//   inbox/<uid>/<gid>  = {type, other, status: "invite"|"sent"|"playing"|"done", ts}   (each kid's list of games)
//   games/<gid>        = {type, p1, p2, status, board, turn, first, winner, score:{p1,p2}, round, ts}
//                        Snakes & Ladders: p1 = host, pl:{<uid>:{ok}} invited players, order:[uids], pos:{uid:square}, turn = index
//   live/<gid>         = air hockey positions (puck + paddles), written many times a second
import { getDatabase, ref, onValue, set, update, remove, push, runTransaction, onDisconnect, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { openSolo, LEVEL_NAMES } from "/solo.js";
import { loadChess, chessBoard, chessStatus } from "/chesskit.js";

export const GAMES = {
  c4:  {name:"Four in a Row", icon:"disc-red", blurb:"Drop discs. Get 4 in a line to win."},
  ttt: {name:"Tic-Tac-Toe",   icon:"xmark",    blurb:"Get 3 in a row before your friend."},
  chess: {name:"Chess", icon:"chess", blurb:"The classic. Checkmate the king!"},
  memory: {name:"Memory Match", icon:"cards", blurb:"Find matching pairs. Most pairs wins."},
  snakes: {name:"Snakes & Ladders", icon:"snake", blurb:"Roll the dice! 2 to 4 players.", multi:true},
  hockey: {name:"Air Hockey", icon:"hockey",   blurb:"Live! Slide your paddle and score goals."},
  rps:    {name:"Rock Paper Scissors", icon:"g-scissors", blurb:"First to 3 wins. Can you beat the computer?", solo:true},
  words:  {name:"Balloon Words", icon:"balloon", blurb:"Guess the word before the balloons pop!", solo:true},
  quiz:   {name:"Salah Quiz", icon:"quiz", blurb:"How much do you know about prayer?", solo:true},
};
const C4_COLS = 7, C4_ROWS = 6;
const HOCKEY_WIN = 5;

// ---------- Snakes & Ladders: shared board and move rules ----------
const LADDERS = {3:22, 8:30, 28:55, 58:77, 75:86, 80:99};
const SNAKES  = {17:4, 52:29, 62:18, 69:33, 95:56, 97:78};
export const TOKEN_COLORS = ["#FF5C8A", "#3E9BFF", "#17A35F", "#FFC23C"];
const cellXY = n => { const r = Math.floor((n-1)/10), c = r % 2 === 0 ? (n-1) % 10 : 9 - (n-1) % 10; return {x:c*10 + 5, y:(9-r)*10 + 5}; };   // centre in a 100x100 box
// Roll from a square: exact number needed to land on 100; ladders go up, snakes go down.
export function slMove(from){
  const dice = 1 + (Math.random()*6|0); let to = from + dice, via = null, stay = false;
  if (to > 100){ to = from; stay = true; }
  else if (LADDERS[to]){ via = "ladder"; to = LADDERS[to]; }
  else if (SNAKES[to]){ via = "snake"; to = SNAKES[to]; }
  return {dice, from, to, via, stay};
}
export function renderSLBoard({el, order, pos, avatarOf, colors = TOKEN_COLORS}){
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox","0 0 100 100"); svg.setAttribute("class","sl-art"); svg.setAttribute("aria-hidden","true");
  let art = "";
  for (const [a, b] of Object.entries(LADDERS)){
    const p = cellXY(+a), q = cellXY(b), dx = q.x-p.x, dy = q.y-p.y, len = Math.hypot(dx,dy), nx = -dy/len*2.2, ny = dx/len*2.2;
    art += `<line x1="${p.x+nx}" y1="${p.y+ny}" x2="${q.x+nx}" y2="${q.y+ny}" stroke="#B5762A" stroke-width="1.3" stroke-linecap="round"/><line x1="${p.x-nx}" y1="${p.y-ny}" x2="${q.x-nx}" y2="${q.y-ny}" stroke="#B5762A" stroke-width="1.3" stroke-linecap="round"/>`;
    const rungs = Math.max(2, Math.round(len/5));
    for (let k = 1; k < rungs; k++){ const f = k/rungs, x = p.x+dx*f, y = p.y+dy*f; art += `<line x1="${x+nx}" y1="${y+ny}" x2="${x-nx}" y2="${y-ny}" stroke="#D99A4E" stroke-width="1"/>`; }
  }
  const snakeCols = ["#17A35F","#7C5CFF","#EB4760","#E08A00","#3E9BFF","#C2338A"]; let si = 0;
  for (const [a, b] of Object.entries(SNAKES)){
    const h = cellXY(+a), tl = cellXY(b), mx = (h.x+tl.x)/2, my = (h.y+tl.y)/2, wig = (si % 2 ? 1 : -1) * 9, col = snakeCols[si++ % snakeCols.length];
    art += `<path d="M${h.x} ${h.y} Q ${mx+wig} ${my-wig*0.4}, ${mx} ${my} T ${tl.x} ${tl.y}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>`
        + `<circle cx="${h.x}" cy="${h.y}" r="2.6" fill="${col}"/><circle cx="${h.x-0.8}" cy="${h.y-0.6}" r=".55" fill="#fff"/><circle cx="${h.x+0.8}" cy="${h.y-0.6}" r=".55" fill="#fff"/>`;
  }
  svg.innerHTML = art;
  const cells = [];
  for (let row = 9; row >= 0; row--) for (let col = 0; col < 10; col++){
    const n = row % 2 === 0 ? row*10 + col + 1 : row*10 + (9-col) + 1;
    cells.push(el("div",{class:`sl-cell ${(row+col) % 2 ? "alt" : ""} ${n === 100 ? "goal" : ""}`}, String(n)));
  }
  const tokens = order.map((u, i) => {
    const xy = cellXY(Math.max(1, (pos||{})[u] || 0)), off = [[-2,-2],[2,-2],[-2,2],[2,2]][i];   // not started yet = waiting on square 1
    const tok = el("div",{class:"sl-token", style:`left:${xy.x + off[0]}%;top:${xy.y + off[1]}%;border-color:${colors[i]}`});
    const av = avatarOf(u); if (av) tok.append(av);
    return tok;
  });
  return el("div",{class:"sl-wrap"}, el("div",{class:"sl-board"}, el("div",{class:"sl-grid"}, cells), svg, tokens));
}

export function initGames(ctx){
  // ctx: {app, dbURL, me(), people, el, img, avatar, toast, confetti, rerender}
  const {el, img, avatar, toast, confetti} = ctx;
  let db = null, ready = false, broken = false;
  try { db = getDatabase(ctx.app, ctx.dbURL); ready = true; } catch { broken = true; }

  let inbox = {};                 // gid -> entry
  let inboxOff = null, seenInvites = new Set();
  let pick = {type:"c4", friend:null, many:new Set(), mode:"friend", level:"medium", bots:1};
  let Chess = null; loadChess().then(C => { Chess = C; if (open?.game?.type === "chess") renderScreen(); }).catch(()=>{});
  let open = null;                // currently open game screen state

  const uid = () => ctx.me()?.uid;
  const nameOf = id => ctx.people.get(id)?.name || "Friend";

  function start(){
    if (!ready || inboxOff) return;
    inboxOff = onValue(ref(db, `inbox/${uid()}`), snap => {
      inbox = snap.val() || {};
      for (const [gid, e] of Object.entries(inbox)) if (e.status === "invite" && !seenInvites.has(gid)){
        seenInvites.add(gid);
        if (seenInvites.size > 0) toast(`${nameOf(e.other)} wants to play ${GAMES[e.type]?.name || "a game"}!`, "game");
      }
      ctx.rerender();
      if (open) renderScreen();
    }, () => { broken = true; ctx.rerender(); });
  }
  function stop(){ inboxOff?.(); inboxOff = null; inbox = {}; seenInvites = new Set(); closeScreen(); }

  const inviteCount = () => Object.values(inbox).filter(e => e.status === "invite").length;
  const yourTurnCount = () => Object.values(inbox).filter(e => e.status === "playing" && e.yourTurn).length;

  // ---------- invites ----------
  async function sendInvite(){
    const me = uid(), other = pick.friend;
    if (GAMES[pick.type].multi) return sendGroupInvite();
    if (!other) return toast("Pick a friend to play with.", "game");
    const gid = push(ref(db, "games")).key, ts = Date.now();
    const game = {type:pick.type, p1:me, p2:other, status:"invited", round:1, first:"p1", turn:"p1", winner:null, score:{p1:0, p2:0}, ts,
                  board: pick.type === "c4" ? ".".repeat(C4_COLS*C4_ROWS) : pick.type === "ttt" ? ".".repeat(9) : ""};
    if (pick.type === "memory"){ game.deck = newDeck(); game.opened = []; game.matched = {}; game.showing = null; }
    if (pick.type === "chess") game.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";   // "first" plays white
    try {
      await set(ref(db, `games/${gid}`), game);
      await update(ref(db), {[`inbox/${me}/${gid}`]:{type:pick.type, other, status:"sent", ts}, [`inbox/${other}/${gid}`]:{type:pick.type, other:me, status:"invite", ts}});
      toast(`Invite sent to ${nameOf(other)}!`, "game");
    } catch { toast("Games aren't switched on yet. Ask a grown-up to finish the setup.", "lock"); }
  }
  async function sendGroupInvite(){
    const me = uid(), others = [...pick.many].filter(f => ctx.people.has(f)).slice(0, 3);
    if (!others.length) return toast("Pick 1 to 3 friends to play with.", "game");
    const gid = push(ref(db, "games")).key, ts = Date.now();
    const game = {type:pick.type, p1:me, p2:null, pl:Object.fromEntries(others.map(u => [u, {ok:false}])), status:"invited", ts};
    try {
      await set(ref(db, `games/${gid}`), game);
      const upd = {[`inbox/${me}/${gid}`]:{type:pick.type, other:others[0], count:others.length, status:"sent", ts}};
      for (const u of others) upd[`inbox/${u}/${gid}`] = {type:pick.type, other:me, count:others.length, status:"invite", ts};
      await update(ref(db), upd);
      toast(`Invites sent to ${others.map(nameOf).join(", ")}!`, "game");
      openGame(gid);
    } catch { toast("Games aren't switched on yet. Ask a grown-up to finish the setup.", "lock"); }
  }
  async function accept(gid){
    const e = inbox[gid]; if (!e) return;
    if (GAMES[e.type]?.multi){
      try { await update(ref(db), {[`games/${gid}/pl/${uid()}/ok`]:true, [`inbox/${uid()}/${gid}/status`]:"joined"}); openGame(gid); }
      catch { toast("That game isn't available any more.", "lock"); remove(ref(db, `inbox/${uid()}/${gid}`)); }
      return;
    }
    try {
      await update(ref(db), {[`games/${gid}/status`]:"playing", [`inbox/${uid()}/${gid}/status`]:"playing", [`inbox/${e.other}/${gid}/status`]:"playing"});
      openGame(gid);
    } catch { toast("That game isn't available any more.", "lock"); remove(ref(db, `inbox/${uid()}/${gid}`)); }
  }
  async function dismiss(gid){
    const e = inbox[gid]; if (!e) return;
    await remove(ref(db, `inbox/${uid()}/${gid}`)).catch(()=>{});
    if (GAMES[e.type]?.multi){
      if (e.status === "invite" || e.status === "joined") update(ref(db), {[`games/${gid}/pl/${uid()}/ok`]:false}).catch(()=>{});
      return;
    }
    if (e.status === "invite" || e.status === "sent"){
      update(ref(db), {[`games/${gid}/status`]:"declined", [`inbox/${e.other}/${gid}/status`]:"done"}).catch(()=>{});
    }
  }

  // ---------- lobby panel (shown on the kid's page) ----------
  function panel(){
    const me = ctx.me(); if (!me) return null;
    const friends = (me.friends||[]).filter(f => ctx.people.has(f));
    if (!pick.friend || !friends.includes(pick.friend)) pick.friend = friends[0] || null;
    // "With a buddy" shows only games you can play together; computer-only games appear under "Vs computer".
    const mode = friends.length ? pick.mode : "cpu";
    if (mode === "friend" && GAMES[pick.type]?.solo) pick.type = "c4";
    const head = el("div",{class:"sec-title"}, img("game"), el("div",{}, el("h2",{},"Games"), el("div",{class:"small muted"},"Play with your Salah Buddies or against the computer.")));
    const online = ready && !broken;
    const entries = online ? Object.entries(inbox).sort((a,b) => (b[1].ts||0) - (a[1].ts||0)) : [];
    const invites = entries.filter(([,e]) => e.status === "invite");
    const mine = entries.filter(([,e]) => e.status !== "invite" && e.status !== "done");

    const gameCards = el("div",{class:"game-pick", role:"group", "aria-label":"Choose a game"},
      Object.entries(GAMES).filter(([, g]) => mode === "cpu" || !g.solo).map(([k,g]) => el("button",{type:"button", class:"gp", "aria-pressed":String(pick.type===k), onclick:()=>{pick.type=k; ctx.rerender();}},
        img(g.icon), el("b",{}, g.name), el("span",{}, g.blurb))));
    const multi = !!GAMES[pick.type].multi;
    const seg = (items, cur, set, label) => el("div",{class:"seg", role:"group", "aria-label":label}, items.map(([k,l]) => el("button",{type:"button", "aria-pressed":String(cur===k), onclick:()=>{ set(k); ctx.rerender(); }}, l)));
    const modeSeg = seg([["friend","With a buddy"],["cpu","Vs computer"]], pick.mode, v => pick.mode = v, "Who to play with");

    let choose;
    if (mode === "cpu"){
      choose = el("div",{class:"stack", style:"gap:10px"},
        pick.type === "snakes"
          ? el("div",{}, el("div",{class:"eyebrow", style:"margin-bottom:6px"},"Computer players"), seg([[1,"1"],[2,"2"],[3,"3"]], pick.bots, v => pick.bots = v, "Number of computer players"))
          : el("div",{}, el("div",{class:"eyebrow", style:"margin-bottom:6px"},"Difficulty"), seg(Object.entries(LEVEL_NAMES), pick.level, v => pick.level = v, "Difficulty")),
        el("button",{class:"btn primary", onclick:()=>openSolo(pick.type, {level:pick.level, bots:pick.bots}, ctx)}, img("av-robot"), `Play ${GAMES[pick.type].name} vs computer`));
    } else {
      for (const f of [...pick.many]) if (!friends.includes(f)) pick.many.delete(f);
      if (multi && !pick.many.size && friends[0]) pick.many.add(friends[0]);
      const friendPick = el("div",{class:"friend-pick", role:"group", "aria-label": multi ? "Choose up to 3 friends" : "Choose a friend"},
        friends.map(f => el("button",{type:"button", class:"fp", "aria-pressed":String(multi ? pick.many.has(f) : pick.friend===f), onclick:()=>{
            if (multi){ if (pick.many.has(f)) pick.many.delete(f); else if (pick.many.size < 3) pick.many.add(f); else toast("Up to 3 friends (4 players).", "game"); }
            else pick.friend = f;
            ctx.rerender(); }},
          avatar(ctx.people.get(f), 48), nameOf(f))));
      const inviteLabel = multi ? (pick.many.size ? `Invite ${[...pick.many].map(nameOf).join(" + ")}` : "Pick friends to invite") : `Invite ${pick.friend ? nameOf(pick.friend) : "a friend"} to play`;
      choose = !online ? el("div",{class:"note"},"Playing with buddies needs one more setup step by a grown-up. You can play vs the computer now!")
        : el("div",{class:"stack", style:"gap:10px"}, el("div",{class:"eyebrow"}, multi ? "Play with (pick up to 3)" : "Play with"), friendPick,
            el("button",{class:"btn primary", onclick:sendInvite}, img("game"), inviteLabel));
    }

    return el("section",{class:"panel stack", id:"games"}, head,
      invites.length ? el("div",{class:"stack", style:"gap:8px"}, invites.map(([gid,e]) => el("div",{class:"g-invite"},
        avatar(ctx.people.get(e.other), 48),
        el("div",{style:"flex:1;min-width:0"}, el("b",{}, `${nameOf(e.other)} wants to play!`), el("div",{class:"small muted"}, GAMES[e.type]?.name)),
        el("button",{class:"btn ghost sm", onclick:()=>dismiss(gid)},"No"),
        el("button",{class:"btn primary sm", onclick:()=>accept(gid)},"Play")))) : null,
      mine.length ? el("div",{class:"stack", style:"gap:8px"}, el("div",{class:"eyebrow"},"Your games"), mine.map(([gid,e]) => el("div",{class:"g-row"},
        img(GAMES[e.type]?.icon || "game","g-ic"),
        el("div",{style:"flex:1;min-width:0"}, el("b",{}, GAMES[e.type]?.multi ? `${GAMES[e.type].name} with ${nameOf(e.other)}${e.count > 1 ? ` + ${e.count - 1}` : ""}` : `${GAMES[e.type]?.name} vs ${nameOf(e.other)}`),
          el("div",{class:"small muted"}, e.status === "sent" ? (GAMES[e.type]?.multi ? "Open to start when friends join" : "Waiting for them to say yes…") : e.status === "joined" ? "Waiting for the host to start" : "Tap Open to play")),
        el("button",{class:"linkbtn", onclick:()=>dismiss(gid)},"remove"),
        (e.status === "playing" || e.status === "joined" || (e.status === "sent" && GAMES[e.type]?.multi)) ? el("button",{class:"btn primary sm", onclick:()=>openGame(gid)},"Open") : null))) : null,
      friends.length ? modeSeg : el("div",{class:"small muted"},"Invite a Salah Buddy to play together online. For now, play vs the computer!"),
      el("div",{class:"eyebrow"},"Pick a game"),
      gameCards,
      choose);
  }

  // ---------- game screen ----------
  const $root = document.getElementById("game-root");
  function openGame(gid){
    closeScreen();
    open = {gid, game:null, off:null, hockey:null};
    open.off = onValue(ref(db, `games/${gid}`), snap => {
      const g = snap.val();
      if (!g){ toast("That game was removed.", "lock"); return closeScreen(); }
      const prev = open?.game; open.game = g;
      if (prev && prev.winner == null && g.winner && GAMES[g.type]?.multi){
        if (g.winner === uid()){ confetti(); toast("You win! MashaAllah!", "trophy"); } else toast(`${nameOf(g.winner)} wins this round!`, "medal2");
      } else if (prev && prev.winner == null && g.winner){
        const side = g.p1 === uid() ? "p1" : "p2";
        if (g.winner === side){ confetti(); toast("You win! MashaAllah!", "trophy"); }
        else if (g.winner === "draw") toast("It's a draw!", "game");
        else toast(`${nameOf(side === "p1" ? g.p2 : g.p1)} wins this round!`, "medal2");
      }
      renderScreen();
    }, () => { toast("Couldn't open the game.", "lock"); closeScreen(); });
    document.body.classList.add("gaming");
  }
  function closeScreen(){
    if (!open) return;
    open.off?.(); open.hockey?.stop(); open = null;
    $root.replaceChildren(); document.body.classList.remove("gaming");
  }

  function renderScreen(){
    if (!open?.game) return;
    if (GAMES[open.game.type]?.multi){ $root.replaceChildren(renderSnakes(open.game)); return; }
    const g = open.game, me = uid(), side = g.p1 === me ? "p1" : "p2", otherId = side === "p1" ? g.p2 : g.p1;
    const meP = ctx.people.get(me), them = ctx.people.get(otherId);
    const myTurn = g.status === "playing" && !g.winner && g.turn === side;
    const status = g.status === "declined" ? `${nameOf(otherId)} said no this time.`
      : g.status === "invited" ? `Waiting for ${nameOf(otherId)} to say yes…`
      : g.winner === "draw" ? "It's a draw!"
      : g.winner ? (g.winner === side ? "You win! 🎉" : `${nameOf(otherId)} wins!`)
      : g.type === "hockey" ? "First to 5 goals wins!"
      : g.type === "chess" && Chess && g.fen ? chessStatus(new Chess(g.fen), g.first === side ? "w" : "b", nameOf(otherId))
      : myTurn ? "Your turn!" : `${nameOf(otherId)}'s turn…`;
    const pcard = (p, label, sc, active) => el("div",{class:`gs-player ${active?"active":""}`}, avatar(p, 48), el("div",{}, el("b",{}, label), el("div",{class:"gs-score num"}, sc)));

    let board;
    if (g.type === "ttt") board = tttBoard(g, side, myTurn);
    else if (g.type === "memory") board = memoryBoard(g, side, myTurn);
    else if (g.type === "chess") board = chessOnline(g, side, myTurn);
    else if (g.type === "c4") board = c4Board(g, side, myTurn);
    else board = hockeyBoard(g, side);

    const screen = el("div",{class:"game-screen", role:"dialog", "aria-label":GAMES[g.type].name},
      el("div",{class:"gs-top"},
        el("button",{class:"btn ghost sm", onclick:closeScreen},"← Back"),
        el("div",{class:"gs-title"}, img(GAMES[g.type].icon), GAMES[g.type].name),
        el("span",{style:"width:70px"})),
      el("div",{class:"gs-players"},
        pcard(meP, "You", g.score?.[side] ?? 0, myTurn),
        el("div",{class:"gs-vs"},"vs"),
        pcard(them, nameOf(otherId), g.score?.[side === "p1" ? "p2" : "p1"] ?? 0, g.status === "playing" && !g.winner && g.turn !== side && g.type !== "hockey")),
      el("div",{class:`gs-status ${myTurn?"go":""}`}, status),
      board,
      g.winner ? el("div",{class:"actions", style:"justify-content:center"},
        el("button",{class:"btn primary", onclick:()=>rematch()}, "Play again"),
        el("button",{class:"btn ghost", onclick:closeScreen},"Done")) : null);
    $root.replaceChildren(screen);   // the live hockey canvas node is reused, so the game keeps running
  }

  async function rematch(){
    const gid = open.gid;
    await runTransaction(ref(db, `games/${gid}`), g => {
      if (!g || !g.winner) return g;
      if (g.type === "snakes"){ g.pos = Object.fromEntries((g.order||[]).map(u => [u, 0])); g.turn = 0; g.winner = null; g.dice = null; g.last = null; return g; }
      if (g.type === "memory"){ g.deck = newDeck(); g.opened = []; g.matched = {}; g.showing = null; }
      if (g.type === "chess"){ g.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"; g.last = null; }
      const first = g.first === "p1" ? "p2" : "p1";
      g.first = first; g.turn = first; g.winner = null; g.round = (g.round||1) + 1;
      g.board = g.type === "c4" ? ".".repeat(C4_COLS*C4_ROWS) : g.type === "ttt" ? ".".repeat(9) : "";
      if (g.type === "hockey") g.score = {p1:0, p2:0};
      return g;
    });
  }

  // ---------- turn-based moves ----------
  function move(applyFn){
    const side = open.game.p1 === uid() ? "p1" : "p2";
    runTransaction(ref(db, `games/${open.gid}`), g => {
      if (!g) return g;
      if (g.status !== "playing" || g.winner || g.turn !== side) return;   // abort: not your turn
      const nb = applyFn(g.board, side === "p1" ? "1" : "2");
      if (!nb) return;
      g.board = nb;
      const w = g.type === "c4" ? c4Winner(nb) : tttWinner(nb);
      if (w){ g.winner = w === "1" ? "p1" : "p2"; g.score = g.score || {p1:0,p2:0}; g.score[g.winner] = (g.score[g.winner]||0) + 1; }
      else if (!nb.includes(".")) g.winner = "draw";
      else g.turn = side === "p1" ? "p2" : "p1";
      return g;
    }).catch(() => toast("That move didn't send. Try again.", "lock"));
  }

  // Tic-Tac-Toe
  const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function tttWinner(b){ for (const [a,c,d] of TTT_LINES) if (b[a] !== "." && b[a] === b[c] && b[a] === b[d]) return b[a]; return null; }
  function tttLine(b){ for (const l of TTT_LINES) if (b[l[0]] !== "." && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l; return []; }
  function tttBoard(g, side, myTurn){
    const win = new Set(tttLine(g.board));
    return el("div",{class:"ttt"}, [...g.board].map((c,i) => el("button",{class:`ttt-cell ${win.has(i)?"win":""}`, disabled:!(myTurn && c === "."), "aria-label":`Square ${i+1}`,
      onclick:()=>move(b => b[i] === "." ? b.slice(0,i) + (side === "p1" ? "1" : "2") + b.slice(i+1) : null)},
      c === "1" ? img("xmark") : c === "2" ? img("omark") : null)));
  }

  // Four in a Row (board is row-major, row 0 at the top)
  function c4Winner(b){
    const at = (r,c) => (r>=0 && r<C4_ROWS && c>=0 && c<C4_COLS) ? b[r*C4_COLS+c] : ".";
    for (let r=0;r<C4_ROWS;r++) for (let c=0;c<C4_COLS;c++){
      const v = at(r,c); if (v === ".") continue;
      for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) if (at(r+dr,c+dc)===v && at(r+2*dr,c+2*dc)===v && at(r+3*dr,c+3*dc)===v) return v;
    }
    return null;
  }
  function c4Drop(b, col, ch){
    for (let r=C4_ROWS-1;r>=0;r--){ const i = r*C4_COLS+col; if (b[i] === ".") return b.slice(0,i) + ch + b.slice(i+1); }
    return null;
  }
  function c4Board(g, side, myTurn){
    const cols = [];
    for (let c=0;c<C4_COLS;c++){
      const full = g.board[c] !== ".";
      cols.push(el("button",{class:"c4-col", disabled:!myTurn || full, "aria-label":`Drop in column ${c+1}`, onclick:()=>move(b => c4Drop(b, c, side === "p1" ? "1" : "2"))},
        Array.from({length:C4_ROWS}, (_,r) => { const v = g.board[r*C4_COLS+c];
          return el("span",{class:"c4-slot"}, v === "1" ? img("disc-red","c4-disc") : v === "2" ? img("disc-yellow","c4-disc") : null); })));
    }
    return el("div",{class:"c4-wrap"},
      el("div",{class:"small muted", style:"text-align:center"}, side === "p1" ? "You are red. Tap a column to drop." : "You are yellow. Tap a column to drop."),
      el("div",{class:"c4"}, cols));
  }


  // ---------- Chess (2 players) ----------
  // g.fen holds the position; whoever is "first" plays white. Moves are checked with chess.js in a transaction.
  function chessOnline(g, side, myTurn){
    if (!Chess) return el("div",{class:"muted"},"Loading the chess board…");
    const myColor = g.first === side ? "w" : "b";
    return el("div",{class:"stack", style:"gap:8px;align-items:center"},
      chessBoard(el, {Chess, fen:g.fen, myColor, canMove:myTurn, last:g.last, onMove:mv => {
        runTransaction(ref(db, `games/${open.gid}`), gg => {
          if (!gg) return gg;
          if (gg.status !== "playing" || gg.winner || gg.turn !== side) return;
          const ch = new Chess(gg.fen); if (!ch.move({from:mv.from, to:mv.to, promotion:"q"})) return;
          gg.fen = ch.fen(); gg.last = {from:mv.from, to:mv.to};
          if (ch.in_checkmate()){ gg.winner = side; gg.score = gg.score || {p1:0,p2:0}; gg.score[side] = (gg.score[side]||0) + 1; }
          else if (ch.game_over()) gg.winner = "draw";
          else gg.turn = side === "p1" ? "p2" : "p1";
          return gg;
        }).catch(() => toast("That move didn't send. Try again.", "lock"));
      }}),
      el("div",{class:"small muted"}, myColor === "w" ? "You are white." : "You are black."));
  }

  // ---------- Memory Match (2 players) ----------
  // deck = 16 picture names (8 pairs). Flip two: a match keeps your turn and scores; no match shows both, then the turn passes.
  const MEMORY_PICS = ["cat","panda","unicorn","lion","frog","owl","penguin","fox"];
  function newDeck(){ const d = [...MEMORY_PICS, ...MEMORY_PICS]; for (let i = d.length-1; i > 0; i--){ const j = Math.random()*(i+1)|0; [d[i], d[j]] = [d[j], d[i]]; } return d; }
  function memoryFlip(i){
    const side = open.game.p1 === uid() ? "p1" : "p2";
    runTransaction(ref(db, `games/${open.gid}`), g => {
      if (!g) return g;
      if (g.status !== "playing" || g.winner || g.turn !== side || g.showing) return;
      const opened = g.opened || [], matched = g.matched || {};
      if (matched[i] || opened.includes(i)) return;
      opened.push(i);
      if (opened.length === 2){
        const [a, b] = opened;
        if (g.deck[a] === g.deck[b]){
          matched[a] = side; matched[b] = side; g.score = g.score || {p1:0,p2:0}; g.score[side] = (g.score[side]||0) + 1;
          g.opened = []; g.matched = matched;
          if (Object.keys(matched).length === g.deck.length){ const s1 = g.score.p1||0, s2 = g.score.p2||0; g.winner = s1 === s2 ? "draw" : s1 > s2 ? "p1" : "p2"; }
        } else { g.showing = [a, b]; g.opened = []; g.showAt = Date.now(); }
      } else g.opened = opened;
      return g;
    }).catch(() => toast("That flip didn't send. Try again.", "lock"));
  }
  function memoryContinue(){
    runTransaction(ref(db, `games/${open.gid}`), g => {
      if (!g || !g.showing) return;
      g.showing = null; g.turn = g.turn === "p1" ? "p2" : "p1";
      return g;
    }).catch(()=>{});
  }
  function memoryBoard(g, side, myTurn){
    const opened = new Set(g.opened || []), showing = new Set(g.showing || []), matched = g.matched || {};
    // the player whose turn it was hides the two cards after a moment; the other player can tap if they're away
    if (g.showing){
      clearTimeout(open.memT);
      open.memT = setTimeout(() => { if (open?.game?.showing && open.game.turn === side) memoryContinue(); }, 1400);
    }
    return el("div",{class:"mem-wrap"},
      el("div",{class:"mem"}, (g.deck||[]).map((pic, i) => {
        const face = opened.has(i) || showing.has(i) || matched[i];
        return el("button",{class:`mem-card ${face ? "up" : ""} ${matched[i] ? `got ${matched[i] === side ? "mine" : "theirs"}` : ""}`,
          disabled: !myTurn || !!face || !!g.showing, "aria-label": face ? pic : `Card ${i+1}`, onclick:()=>memoryFlip(i)},
          face ? img(pic) : img("star","mem-back"));
      })),
      g.showing && g.turn !== side ? el("button",{class:"linkbtn", style:"align-self:center", onclick:memoryContinue},"Tap to continue") : null,
      el("div",{class:"small muted", style:"text-align:center"}, "Find a pair to score and go again. Pink border = your pairs."));
  }

  // ---------- Snakes & Ladders (2 to 4 players) ----------
  function snakesRoll(){
    runTransaction(ref(db, `games/${open.gid}`), g => {
      if (!g) return g;
      const order = g.order || [], me = uid();
      if (g.status !== "playing" || g.winner || order[g.turn] !== me) return;
      const {dice, from, to, via} = slMove((g.pos||{})[me] || 0);
      g.pos = {...(g.pos||{}), [me]:to}; g.dice = dice; g.last = {uid:me, from, to, via, n:(g.last?.n||0)+1};
      if (to === 100) g.winner = me;
      else if (dice !== 6) g.turn = (g.turn + 1) % order.length;   // a 6 gives another go
      return g;
    }).catch(() => toast("That roll didn't send. Try again.", "lock"));
  }
  async function snakesStart(){
    await runTransaction(ref(db, `games/${open.gid}`), g => {
      if (!g || g.status !== "invited") return;
      const joined = Object.entries(g.pl||{}).filter(([,v]) => v?.ok).map(([u]) => u);
      if (!joined.length) return;
      g.order = [g.p1, ...joined]; g.pos = Object.fromEntries(g.order.map(u => [u, 0])); g.turn = 0; g.status = "playing"; g.winner = null; g.dice = null; g.last = null;
      return g;
    });
    const g = open.game, upd = {[`inbox/${uid()}/${open.gid}/status`]:"playing"};
    for (const [u, v] of Object.entries(g?.pl||{})) upd[`inbox/${u}/${open.gid}/status`] = v?.ok ? "playing" : "done";
    update(ref(db), upd).catch(()=>{});
  }
  function dicePips(n){
    const P = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]}[n] || [];
    return el("div",{class:"dice"}, Array.from({length:9}, (_,i) => el("span",{class: P.includes(i+1) ? "pip" : ""})));
  }
  function snakesBoard(g){
    const me = uid();
    return renderSLBoard({el, order:g.order || [], pos:g.pos, avatarOf:u => avatar(ctx.people.get(u) || (u === me ? ctx.me() : null), 48)});
  }
  function renderSnakes(g){
    const me = uid(), order = g.order || [], host = g.p1 === me;
    const others = Object.keys(g.pl||{});
    const people = g.status === "invited" ? [g.p1, ...others] : order;
    const turnUid = order[g.turn];
    const lastTxt = g.last ? `${g.last.uid === me ? "You" : nameOf(g.last.uid)} rolled ${g.dice}${g.last.via === "ladder" ? " and climbed a ladder! 🪜" : g.last.via === "snake" ? " and slid down a snake! 🐍" : g.last.from === g.last.to ? " (need the exact number)" : ""}` : "";
    const status = g.status === "declined" ? "This game was cancelled."
      : g.status === "invited" ? (host ? "Wait for friends to join, then start!" : "Waiting for the host to start…")
      : g.winner ? (g.winner === me ? "You reached 100! You win! 🎉" : `${nameOf(g.winner)} wins!`)
      : turnUid === me ? "Your turn! Roll the dice." : `${nameOf(turnUid)}'s turn…`;
    const pl = el("div",{class:"sl-players"}, people.map((u, i) => {
      const joined = u === g.p1 || g.pl?.[u]?.ok;
      return el("div",{class:`gs-player ${g.status === "playing" && turnUid === u && !g.winner ? "active" : ""}`, style:`border-color:${g.status !== "invited" ? TOKEN_COLORS[i] : "transparent"}`},
        avatar(ctx.people.get(u) || (u === me ? ctx.me() : null), 48),
        el("div",{style:"min-width:0"}, el("b",{}, u === me ? "You" : nameOf(u)),
          el("div",{class:"small muted"}, g.status === "invited" ? (joined ? "Ready ✓" : "Invited…") : `Square ${(g.pos||{})[u] || 0}`)));
    }));
    const joinedCount = Object.values(g.pl||{}).filter(v => v?.ok).length;
    const myTurn = g.status === "playing" && !g.winner && turnUid === me;
    return el("div",{class:"game-screen", role:"dialog", "aria-label":"Snakes and Ladders"},
      el("div",{class:"gs-top"}, el("button",{class:"btn ghost sm", onclick:closeScreen},"← Back"), el("div",{class:"gs-title"}, img("snake"), "Snakes & Ladders"), el("span",{style:"width:70px"})),
      pl,
      el("div",{class:`gs-status ${myTurn ? "go" : ""}`}, status),
      g.status === "invited" && host ? el("button",{class:"btn primary", disabled: !joinedCount, onclick:snakesStart}, joinedCount ? `Start with ${joinedCount + 1} players` : "Waiting for someone to join…") : null,
      g.status !== "invited" ? el("div",{class:"sl-controls"},
        g.dice ? dicePips(g.dice) : el("div",{class:"dice empty"}),
        el("button",{class:"btn primary", disabled:!myTurn, onclick:snakesRoll}, img("die"), "Roll"),
        el("div",{class:"small muted", style:"flex:1;min-width:0"}, lastTxt)) : null,
      snakesBoard(g),
      g.winner ? el("div",{class:"actions", style:"justify-content:center"}, el("button",{class:"btn primary", onclick:rematch},"Play again"), el("button",{class:"btn ghost", onclick:closeScreen},"Done")) : null);
  }

  // ---------- Air Hockey (live) ----------
  // World: width 1, height H. p1 defends the bottom goal, p2 the top. Each player sees their own goal at the bottom.
  // p1's device runs the physics and sends the puck; each device sends its own paddle ~20 times a second.
  function hockeyBoard(g, side){
    if (open.hockey && open.hockey.side === side) { open.hockey.update(g); return open.hockey.wrap; }
    open.hockey?.stop();
    open.hockey = makeHockey(open.gid, g, side);
    return open.hockey.wrap;
  }
  function makeHockey(gid, g0, side){
    const W = 1, H = 1.6, PR = .075, BR = .045, GOAL = .38, host = side === "p1";
    let g = g0, running = true, last = performance.now(), sendT = 0;
    const canvas = el("canvas",{class:"hockey", "aria-label":"Air hockey rink. Drag your paddle."});
    const wrap = el("div",{class:"hockey-wrap"}, canvas, el("div",{class:"small muted", style:"text-align:center"},"Drag your pink paddle. Defend the bottom goal!"));
    const ctx2 = canvas.getContext("2d");
    // positions in world space
    const mine = {x:.5, y: side === "p1" ? H-.18 : .18, vx:0, vy:0};
    const theirs = {x:.5, y: side === "p1" ? .18 : H-.18};
    let puck = {x:.5, y:H/2, vx:0, vy:0}, puckT = performance.now();
    let otherHere = false, countdown = 0;
    const liveRef = ref(db, `live/${gid}`);
    const myKey = side === "p1" ? "pad1" : "pad2", otherKey = side === "p1" ? "pad2" : "pad1";
    const hereRef = ref(db, `live/${gid}/here_${side}`);
    set(hereRef, true).catch(()=>{}); onDisconnect(hereRef).remove();

    const off = onValue(liveRef, snap => {
      const v = snap.val() || {};
      if (v[otherKey]) {
        // estimate the other paddle's speed so their hits push the puck properly
        const t = performance.now(), dtt = (t - (theirs.t || t)) / 1000, nx = v[otherKey].x, ny = v[otherKey].y;
        if (dtt > .01){ theirs.vx = Math.max(-4, Math.min(4, (nx - theirs.x)/dtt)); theirs.vy = Math.max(-4, Math.min(4, (ny - theirs.y)/dtt)); }
        theirs.x = nx; theirs.y = ny; theirs.t = t;
      }
      const nowHere = !!v[`here_${side === "p1" ? "p2" : "p1"}`];
      if (nowHere && !otherHere && host) { resetPuck(1); countdown = 3; }
      otherHere = nowHere;
      if (!host && v.puck){ puck = {...v.puck}; puckT = performance.now(); }
      if (!host && typeof v.cd === "number") countdown = v.cd;
    });

    // view transform: flip for p2 so your goal is at the bottom
    const toView = p => side === "p1" ? {x:p.x, y:p.y} : {x:W-p.x, y:H-p.y};
    let scale = 300;
    function resize(){
      const maxW = Math.min(wrap.clientWidth || 340, 420), maxH = Math.max(320, innerHeight - 300);
      scale = Math.min(maxW / W, maxH / H);
      canvas.width = Math.round(W*scale*devicePixelRatio); canvas.height = Math.round(H*scale*devicePixelRatio);
      canvas.style.width = `${W*scale}px`; canvas.style.height = `${H*scale}px`;
    }
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    function pointer(e){
      const r = canvas.getBoundingClientRect();
      let vx = (e.clientX - r.left) / scale, vy = (e.clientY - r.top) / scale;
      vx = Math.max(PR, Math.min(W-PR, vx)); vy = Math.max(H/2 + PR, Math.min(H-PR, vy));   // own half (bottom in view)
      const w = side === "p1" ? {x:vx, y:vy} : {x:W-vx, y:H-vy};
      mine.vx = (w.x - mine.x) * 60; mine.vy = (w.y - mine.y) * 60;
      mine.x = w.x; mine.y = w.y;
      e.preventDefault();
    }
    canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture(e.pointerId); pointer(e); });
    canvas.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") pointer(e); });

    function resetPuck(towardSide){
      // towardSide 1 = start on p1's half, 2 = p2's half
      puck = {x:.5, y: towardSide === 1 ? H*0.62 : H*0.38, vx:0, vy:0};
    }
    function collide(p){
      const dx = puck.x - p.x, dy = puck.y - p.y, d = Math.hypot(dx, dy), min = PR + BR;
      if (d < min && d > 0){
        const nx = dx/d, ny = dy/d;
        puck.x = p.x + nx*min; puck.y = p.y + ny*min;
        const rel = (puck.vx - (p.vx||0))*nx + (puck.vy - (p.vy||0))*ny;
        if (rel < 0){ puck.vx -= 1.9*rel*nx; puck.vy -= 1.9*rel*ny; }
        const sp = Math.hypot(puck.vx, puck.vy), max = 3.2; if (sp > max){ puck.vx *= max/sp; puck.vy *= max/sp; }
      }
    }
    function physics(dt){
      puck.x += puck.vx*dt; puck.y += puck.vy*dt;
      puck.vx *= Math.pow(.6, dt); puck.vy *= Math.pow(.6, dt);
      if (puck.x < BR){ puck.x = BR; puck.vx = Math.abs(puck.vx); }
      if (puck.x > W-BR){ puck.x = W-BR; puck.vx = -Math.abs(puck.vx); }
      const inGoal = Math.abs(puck.x - W/2) < GOAL/2;
      if (puck.y < BR && !inGoal){ puck.y = BR; puck.vy = Math.abs(puck.vy); }
      if (puck.y > H-BR && !inGoal){ puck.y = H-BR; puck.vy = -Math.abs(puck.vy); }
      if (puck.y < -BR) return "p1";       // went into p2's (top) goal → p1 scores
      if (puck.y > H+BR) return "p2";
      collide(mine); collide(theirs);
      theirs.vx = (theirs.vx||0) * .9; theirs.vy = (theirs.vy||0) * .9;
      return null;
    }
    async function goal(scorer){
      resetPuck(scorer === "p1" ? 2 : 1);
      await runTransaction(ref(db, `games/${gid}`), gg => {
        if (!gg || gg.winner) return gg;
        gg.score = gg.score || {p1:0,p2:0}; gg.score[scorer] = (gg.score[scorer]||0) + 1;
        if (gg.score[scorer] >= HOCKEY_WIN) gg.winner = scorer;
        return gg;
      }).catch(()=>{});
      countdown = 2;
    }

    let cdAcc = 0;
    function frame(now){
      if (!running) return;
      const dt = Math.min(.05, (now - last)/1000); last = now;
      mine.vx *= .8; mine.vy *= .8;
      const playing = g.status === "playing" && !g.winner && otherHere;
      if (host && playing){
        if (countdown > 0){ cdAcc += dt; if (cdAcc >= 1){ cdAcc = 0; countdown--; } }
        else { const s = physics(dt); if (s) goal(s); }
      }
      if (!host && playing && countdown <= 0){
        // guest: glide the puck forward from the last update so it looks smooth
        const age = Math.min(.15, (now - puckT)/1000);
        puck._vx = puck.x + puck.vx*age; puck._vy = puck.y + puck.vy*age;
      }
      sendT += dt;
      if (sendT > .05){
        sendT = 0;
        const out = {[myKey]:{x:+mine.x.toFixed(4), y:+mine.y.toFixed(4)}};
        if (host) { out.puck = {x:+puck.x.toFixed(4), y:+puck.y.toFixed(4), vx:+puck.vx.toFixed(3), vy:+puck.vy.toFixed(3)}; out.cd = countdown; }
        update(liveRef, out).catch(()=>{});
      }
      draw(playing);
      requestAnimationFrame(frame);
    }

    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    function draw(playing){
      const s = scale*devicePixelRatio, c = ctx2;
      c.setTransform(s,0,0,s,0,0);
      c.clearRect(0,0,W,H);
      // rink
      c.fillStyle = css("--surface-2"); roundRect(c, 0, 0, W, H, .06); c.fill();
      c.strokeStyle = css("--line"); c.lineWidth = .012;
      c.beginPath(); c.moveTo(0, H/2); c.lineTo(W, H/2); c.stroke();
      c.beginPath(); c.arc(W/2, H/2, .14, 0, Math.PI*2); c.stroke();
      // goals (top = theirs, bottom = mine in view)
      c.fillStyle = css("--grape"); c.fillRect(W/2-GOAL/2, 0, GOAL, .025);
      c.fillStyle = css("--accent"); c.fillRect(W/2-GOAL/2, H-.025, GOAL, .025);
      // paddles
      const pm = toView(mine), pt = toView(theirs);
      paddle(c, pt, css("--grape")); paddle(c, pm, css("--accent"));
      // puck
      const pp = toView(!host && puck._vx != null ? {x:puck._vx, y:puck._vy} : puck);
      c.fillStyle = css("--ink"); c.beginPath(); c.arc(pp.x, pp.y, BR, 0, Math.PI*2); c.fill();
      c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.arc(pp.x-.012, pp.y-.012, BR*.45, 0, Math.PI*2); c.fill();
      // overlays
      const msg = !otherHere && g.status === "playing" && !g.winner ? `Waiting for ${nameOf(side === "p1" ? g.p2 : g.p1)} to open the game…`
        : g.status === "invited" ? "Waiting for them to say yes…"
        : playing && countdown > 0 ? String(countdown) : "";
      if (msg){
        c.fillStyle = "rgba(0,0,0,.35)"; roundRect(c, .08, H/2-.11, W-.16, .22, .05); c.fill();
        c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle";
        c.font = `700 ${msg.length < 3 ? .14 : .05}px Fredoka, sans-serif`;
        c.fillText(msg, W/2, H/2, W-.2);
      }
    }
    function paddle(c, p, col){
      c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, PR, 0, Math.PI*2); c.fill();
      c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.arc(p.x, p.y, PR*.5, 0, Math.PI*2); c.fill();
    }
    function roundRect(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }

    requestAnimationFrame(t => { last = t; resize(); frame(t); });
    return {
      side, wrap, canvas,
      update(ng){ const wasWinner = g.winner; g = ng; if (wasWinner && !ng.winner && host){ resetPuck(1); countdown = 3; } },
      stop(){ running = false; off(); ro.disconnect(); remove(hereRef).catch(()=>{}); },
    };
  }

  function playWith(uid){ pick.mode = "friend"; pick.friend = uid; pick.many = new Set([uid]); if (GAMES[pick.type]?.solo) pick.type = "c4"; }
  return {start, stop, panel, inviteCount, yourTurnCount, playWith, close: closeScreen};
}
