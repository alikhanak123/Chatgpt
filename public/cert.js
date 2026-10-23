// Salah Tracker — badge certificates. Drawn on a canvas (A4 landscape), then saved as a PDF or picture, or printed.
// The PDF maker (jsPDF) loads only when someone asks for a PDF.
const W = 1754, H = 1240;   // A4 landscape at 150 dpi
const PALETTE = ["#FF5C8A", "#FFC23C", "#2EC4B6", "#3E9BFF", "#7C5CFF", "#FF8A3D"];
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
let pdfLib = null;
function loadPdf(){
  return pdfLib ||= new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => window.jspdf?.jsPDF ? ok(window.jspdf.jsPDF) : no(new Error("pdf")); s.onerror = no; document.head.append(s);
  });
}
function roundRect(x, X, Y, w, h, r){ x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function fitText(x, text, maxW, size, weight, family){ let s = size; do { x.font = `${weight} ${s}px ${family}`; s -= 4; } while (x.measureText(text).width > maxW && s > 20); }

// badges: [{name, hint, icon}] (one = a single badge certificate; several = "all my badges")
export async function drawCertificate({name, badges, date, hijri}){
  const DISPLAY = '"Baloo 2", "Fredoka", sans-serif', BODY = '"Nunito", sans-serif';
  try { await Promise.all([document.fonts.load(`800 80px "Baloo 2"`), document.fonts.load(`800 30px "Nunito"`)]); } catch {}
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  // paper + rainbow frame
  x.fillStyle = "#FFFDF7"; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, W, H); PALETTE.forEach((col, i) => g.addColorStop(i / (PALETTE.length - 1), col));
  roundRect(x, 34, 34, W - 68, H - 68, 54); x.lineWidth = 30; x.strokeStyle = g; x.stroke();
  roundRect(x, 78, 78, W - 156, H - 156, 34); x.lineWidth = 4; x.setLineDash([4, 14]); x.lineCap = "round"; x.strokeStyle = "#E7DDF5"; x.stroke(); x.setLineDash([]);
  // confetti dots, kept away from the text area
  let seed = name.length * 97 + badges.length; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 70; i++){
    const px = 110 + rnd() * (W - 220), py = 110 + rnd() * (H - 220);
    if (px > 330 && px < W - 330 && py > 150 && py < H - 160) continue;
    x.fillStyle = PALETTE[i % PALETTE.length]; x.globalAlpha = .55; x.beginPath(); x.arc(px, py, 5 + rnd() * 9, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  const star = await loadImg("/img/star.png").catch(() => null), mosque = await loadImg("/img/mosque.png").catch(() => null);
  if (star){ for (const [sx, sy, s] of [[150, 150, 90], [W - 240, 150, 90], [150, H - 330, 80], [W - 230, H - 330, 80]]) x.drawImage(star, sx, sy, s, s); }
  // heading
  x.textAlign = "center"; x.textBaseline = "alphabetic";
  x.fillStyle = "#7C5CFF"; x.font = `800 34px ${BODY}`; x.fillText("SALAH TRACKER", W / 2 + 34, 205);
  if (mosque) x.drawImage(mosque, W / 2 - x.measureText("SALAH TRACKER").width / 2 - 40, 160, 58, 58);
  x.fillStyle = "#2A2147"; fitText(x, "Certificate of Achievement", W - 520, 92, 800, DISPLAY); x.fillText("Certificate of Achievement", W / 2, 300);
  x.fillStyle = "#6F6894"; x.font = `700 34px ${BODY}`; x.fillText("This certificate is proudly given to", W / 2, 378);
  // the child's name with a ribbon underline
  const ng = x.createLinearGradient(W / 2 - 420, 0, W / 2 + 420, 0); ng.addColorStop(0, "#FF5C8A"); ng.addColorStop(.5, "#7C5CFF"); ng.addColorStop(1, "#3E9BFF");
  x.fillStyle = ng; fitText(x, name, W - 600, 130, 800, DISPLAY); x.fillText(name, W / 2, 505);
  x.fillStyle = "#FFC23C"; roundRect(x, W / 2 - 300, 532, 600, 10, 5); x.fill();

  if (badges.length === 1){
    const b = badges[0], icon = await loadImg(`/img/${b.icon}.png`).catch(() => null);
    // glowing badge medallion
    const cx = W / 2, cy = 735, R = 150;
    const glow = x.createRadialGradient(cx, cy, 20, cx, cy, R + 70); glow.addColorStop(0, "rgba(255,194,60,.55)"); glow.addColorStop(1, "rgba(255,194,60,0)");
    x.fillStyle = glow; x.beginPath(); x.arc(cx, cy, R + 70, 0, 7); x.fill();
    x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill(); x.lineWidth = 12; x.strokeStyle = "#FFC23C"; x.stroke();
    if (icon) x.drawImage(icon, cx - 105, cy - 105, 210, 210);
    x.fillStyle = "#2A2147"; x.font = `700 38px ${BODY}`; x.fillText("for earning the badge", W / 2, 950);
    x.fillStyle = "#FF5C8A"; fitText(x, b.name, W - 700, 76, 800, DISPLAY); x.fillText(b.name, W / 2, 1030);
    x.fillStyle = "#6F6894"; x.font = `700 30px ${BODY}`; x.fillText(b.hint, W / 2, 1078);
  } else {
    x.fillStyle = "#2A2147"; x.font = `700 38px ${BODY}`; x.fillText(`for collecting ${badges.length} prayer badge${badges.length === 1 ? "" : "s"}`, W / 2, 610);
    const per = Math.min(6, Math.max(1, badges.length)), rows = Math.ceil(badges.length / per), cell = 210, top = 650 + (rows === 1 ? 70 : 0);
    for (let i = 0; i < badges.length; i++){
      const r = Math.floor(i / per), inRow = Math.min(per, badges.length - r * per), col = i % per;
      const cx = W / 2 + (col - (inRow - 1) / 2) * cell, cy = top + r * 205 + 70;
      x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(cx, cy, 70, 0, 7); x.fill(); x.lineWidth = 7; x.strokeStyle = PALETTE[i % PALETTE.length]; x.stroke();
      const icon = await loadImg(`/img/${badges[i].icon}.png`).catch(() => null); if (icon) x.drawImage(icon, cx - 50, cy - 50, 100, 100);
      x.fillStyle = "#2A2147"; fitText(x, badges[i].name, cell - 16, 26, 800, BODY); x.fillText(badges[i].name, cx, cy + 105);
    }
  }
  // footer: date, signature line, mosque
  x.font = `700 28px ${BODY}`; x.fillStyle = "#6F6894";
  x.textAlign = "left"; x.fillText(date, 170, H - 132); if (hijri) x.fillText(hijri, 170, H - 94);
  x.textAlign = "right"; x.strokeStyle = "#CFC6E8"; x.lineWidth = 3; x.beginPath(); x.moveTo(W - 520, H - 150); x.lineTo(W - 170, H - 150); x.stroke();
  x.fillText("Signed by a proud grown-up", W - 170, H - 108);
  return c;
}

// Inside the Android app, files and printing go through the phone (window.AndroidApp); browsers in apps can't download or print on their own.
const app = () => window.AndroidApp;
const fileName = (name, label) => `${name}-${label}`.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "certificate";

// Modal with a preview and the three ways to keep it.
export async function openCertificate(ctx, {name, badges, date, hijri}){
  const {el, img, modal, toast} = ctx;
  const label = badges.length === 1 ? badges[0].name : "all-my-badges";
  let canvas = null;
  const preview = el("div",{class:"cert-preview"}, el("div",{class:"muted"},"Making your certificate…"));
  modal(close => el("div",{class:"stack cert-modal"},
    el("div",{class:"sec-title"}, img("scroll"), el("div",{}, el("h2",{}, badges.length === 1 ? `${badges[0].name} certificate` : "All my badges"),
      el("div",{class:"small muted"},"Download it, or print it and put it on the wall!"))),
    preview,
    el("div",{class:"actions", style:"justify-content:center"},
      el("button",{class:"btn primary", onclick:async e => {
        if (!canvas) return; const b = e.currentTarget; b.disabled = true; b.textContent = "Making PDF…";
        try { const PDF = await loadPdf(); const doc = new PDF({orientation:"landscape", unit:"mm", format:"a4"});
          doc.addImage(canvas.toDataURL("image/jpeg", .92), "JPEG", 0, 0, 297, 210);
          if (app()) app().saveFile(doc.output("datauristring").split(",")[1], "application/pdf", `${fileName(name, label)}.pdf`);
          else { doc.save(`${fileName(name, label)}.pdf`); toast("Certificate saved as PDF", "scroll"); } }
        catch { toast("Couldn't make the PDF. Try Download picture instead.", "lock"); }
        b.disabled = false; b.replaceChildren(img("scroll"), "Download PDF");
      }}, img("scroll"), "Download PDF"),
      el("button",{class:"btn ghost", onclick:() => {
        if (!canvas) return; if (app()) return app().saveFile(canvas.toDataURL("image/png").split(",")[1], "image/png", `${fileName(name, label)}.png`);
        const a = document.createElement("a"); a.download = `${fileName(name, label)}.png`; a.href = canvas.toDataURL("image/png"); a.click(); toast("Picture saved", "check");
      }}, img("sparkles"), "Download picture"),
      el("button",{class:"btn ghost", onclick:() => {
        if (!canvas) return;
        if (app()) return app().printImage(canvas.toDataURL("image/png").split(",")[1], "Salah Tracker certificate");
        const f = document.createElement("iframe"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"; document.body.append(f);
        const d = f.contentDocument; d.open();
        d.write(`<!doctype html><title>Certificate</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0}img{width:100%;height:100vh;object-fit:contain;display:block}</style><img src="${canvas.toDataURL("image/png")}">`);
        d.close(); setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); }, 400);
      }}, img("printer"), "Print"),
      el("button",{class:"btn ghost", onclick:close},"Close"))));
  try {
    canvas = await drawCertificate({name, badges, date, hijri});
    const shown = el("img",{src:canvas.toDataURL("image/jpeg", .85), alt:`Certificate for ${name}`});
    preview.replaceChildren(shown);
  } catch { preview.replaceChildren(el("div",{class:"note"},"Couldn't draw the certificate. Check the internet and try again.")); }
}
