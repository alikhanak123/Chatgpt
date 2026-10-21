// Salah Tracker — chess helpers shared by online chess (games.js) and vs-computer chess (solo.js).
// Move rules come from chess.js (loaded on demand); the computer opponent is a small minimax search.
let libP = null;
export function loadChess(){
  if (window.Chess) return Promise.resolve(window.Chess);
  return libP ||= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js";
    s.onload = () => res(window.Chess); s.onerror = () => { libP = null; rej(new Error("chess")); };
    document.head.append(s);
  });
}

const VAL = {p:100, n:320, b:330, r:500, q:900, k:0};
const centre = (f, r) => 3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5));   // 0 at the edge … 3 in the middle
// Score from White's point of view: material, pieces towards the centre, pawns moving up.
function evaluate(ch){
  let s = 0; const b = ch.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++){
    const p = b[r][f]; if (!p) continue;
    let v = VAL[p.type];
    if (p.type === "n" || p.type === "b" || p.type === "p") v += centre(f, 7 - r) * 8;
    if (p.type === "p") v += (p.color === "w" ? (6 - r) : (r - 1)) * 6;
    s += p.color === "w" ? v : -v;
  }
  return s;
}
function search(ch, depth, alpha, beta, white){
  if (ch.in_checkmate()) return white ? -100000 - depth : 100000 + depth;   // side to move is mated
  if (ch.game_over()) return 0;
  if (depth === 0) return evaluate(ch);
  const moves = ch.moves({verbose:true}).sort((a, b) => (b.captured ? VAL[b.captured] : 0) - (a.captured ? VAL[a.captured] : 0));
  let best = white ? -Infinity : Infinity;
  for (const m of moves){
    ch.move(m); const v = search(ch, depth - 1, alpha, beta, !white); ch.undo();
    if (white){ best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (alpha >= beta) break;
  }
  return best;
}
// level: "easy" (mostly random), "medium" (looks 2 moves ahead), "hard" (looks 3 moves ahead)
export function aiMove(ch, level){
  const moves = ch.moves({verbose:true}); if (!moves.length) return null;
  if (level === "easy"){
    const caps = moves.filter(m => m.captured);
    return (caps.length && Math.random() < .35) ? caps[Math.random()*caps.length|0] : moves[Math.random()*moves.length|0];
  }
  const depth = level === "hard" ? 3 : 2, white = ch.turn() === "w";
  let best = null, bestV = white ? -Infinity : Infinity;
  for (const m of moves.sort(() => Math.random() - .5)){
    ch.move(m); const v = search(ch, depth - 1, -Infinity, Infinity, !white); ch.undo();
    if (white ? v > bestV : v < bestV){ bestV = v; best = m; }
  }
  return best;
}
export function chessStatus(ch, myColor, nameThem){
  const mine = ch.turn() === myColor;
  if (ch.in_checkmate()) return mine ? `Checkmate! ${nameThem} wins.` : "Checkmate! You win! 🎉";
  if (ch.in_draw() || ch.in_stalemate()) return "It's a draw!";
  return (mine ? "Your move" : `${nameThem}'s move…`) + (ch.in_check() ? " · Check!" : "");
}

const GLYPH = {k:"♚", q:"♛", r:"♜", b:"♝", n:"♞", p:"♟"};
// Tap a piece to see where it can go, then tap a highlighted square. Pawns reaching the end become queens.
export function chessBoard(el, {Chess, fen, myColor, canMove, onMove, last}){
  const ch = new Chess(fen); let sel = null;
  const wrap = el("div",{class:"chess-wrap"});
  function draw(){
    const targets = sel ? ch.moves({square:sel, verbose:true}).map(m => m.to) : [];
    const cells = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++){
      const r = myColor === "b" ? i : 7 - i, f = myColor === "b" ? 7 - j : j;    // your side is always at the bottom
      const sq = "abcdefgh"[f] + (r + 1), p = ch.get(sq), dark = (r + f) % 2 === 0, isT = targets.includes(sq);
      const check = p && p.type === "k" && p.color === ch.turn() && ch.in_check();
      cells.push(el("button",{class:`cs ${dark ? "dk" : "lt"} ${sel === sq ? "sel" : ""} ${isT ? (p ? "cap" : "tgt") : ""} ${last && (last.from === sq || last.to === sq) ? "last" : ""} ${check ? "chk" : ""}`,
        "aria-label": `${sq}${p ? ` ${p.color === "w" ? "white" : "black"} ${({k:"king",q:"queen",r:"rook",b:"bishop",n:"knight",p:"pawn"})[p.type]}` : ""}`,
        onclick:() => {
          if (!canMove) return;
          if (isT){ const mv = ch.move({from:sel, to:sq, promotion:"q"}); sel = null; if (mv) onMove(mv, ch.fen()); return; }
          sel = (p && p.color === myColor && ch.turn() === myColor && sel !== sq) ? sq : null; draw();
        }},
        p ? el("span",{class:`pc ${p.color}`}, GLYPH[p.type]) : null,
        j === 0 ? el("i",{class:"rk"}, r + 1) : null, i === 7 ? el("i",{class:"fl"}, "abcdefgh"[f]) : null));
    }
    wrap.replaceChildren(el("div",{class:"chess"}, cells));
  }
  draw();
  return wrap;
}
