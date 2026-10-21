// Salah Tracker — prayer rewards. A grown-up sets a prize; the child watches it grow with every prayer.
// Firestore users/<uid>/private/reward (only the grown-up login or the admin may change it; the child reads it):
//   {currency, show, plan:{mode:"month"|"each", prize, target, each}, months:{"YYYY-MM":{plan, bonus, note, paid}}}
// A month uses its own saved plan when it has one, otherwise the current plan.

export const CURRENCIES = ["OMR", "AED", "SAR", "QAR", "KWD", "BHD", "USD", "GBP", "EUR", "PKR", "INR"];
const DECIMALS = {OMR:3, KWD:3, BHD:3};

export function money(n, cur = "OMR"){
  const v = Math.max(0, +n || 0), d = DECIMALS[cur] ?? 2;
  try { if (/^[A-Z]{3}$/.test(cur)) return new Intl.NumberFormat("en-GB", {style:"currency", currency:cur, minimumFractionDigits:d, maximumFractionDigits:d}).format(v); } catch {}
  return `${v.toFixed(d)} ${cur}`;
}
export const daysIn = ym => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
export const planFor = (r, ym) => r?.months?.[ym]?.plan || r?.plan || null;
// The first month the reward was set up; earlier months never had one.
export const rewardStart = r => Object.keys(r?.months || {}).sort()[0] || null;
const shortMonth = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1).toLocaleDateString("en-GB", {month:"short", year:"numeric"});

// Earned for one month. counted = the five daily prayers prayed (on time, late, done later) plus excused ones,
// so a valid excuse never lowers the reward.
export function earned(r, ym, counted){
  const p = planFor(r, ym); if (!p) return null;
  const extra = Math.max(0, +r?.months?.[ym]?.bonus || 0);
  let base = 0, cap = null, each = 0;
  if (p.mode === "each"){ each = Math.max(0, +p.each || 0); base = each * counted; }
  else {
    const target = Math.max(1, +p.target || daysIn(ym) * 5), prize = Math.max(0, +p.prize || 0);
    each = prize / target; base = Math.min(prize, each * counted); cap = prize;
  }
  return {base, extra, total:base + extra, cap, each, plan:p, note:r?.months?.[ym]?.note || "", paid:!!r?.months?.[ym]?.paid};
}

// ---------- the child's card ----------
export function rewardCard({el, img, r, ym, counted, monthName, prev}){
  if (!r?.plan || r.show === false) return null;
  const e = earned(r, ym, counted), cur = r.currency || "OMR";
  const pct = e.cap ? Math.min(100, e.base / Math.max(e.cap, 1e-9) * 100) : null;
  return el("section",{class:"panel stack reward-card"},
    el("div",{class:"sec-title"}, img("moneybag"), el("div",{}, el("h2",{},"My prayer reward"),
      el("div",{class:"small muted"}, e.plan.mode === "each" ? `Every prayer adds ${money(e.each, cur)}.` : `Pray ${e.plan.target || daysIn(ym) * 5} prayers this month for the full ${money(e.cap, cur)}.`))),
    el("div",{class:"rw-big"}, el("span",{class:"rw-amt num"}, money(e.total, cur)), el("span",{class:"small muted"}, ` earned in ${monthName}`)),
    pct != null ? el("div",{class:"track rw-track"}, el("i",{style:`width:${pct}%;background-color:var(--sun)`})) : null,
    el("div",{class:"small"}, `${counted} prayer${counted === 1 ? "" : "s"} so far`, e.cap ? ` · ${money(e.each, cur)} each` : ""),
    e.extra ? el("div",{class:"rw-bonus"}, img("gift"), el("span",{}, `+${money(e.extra, cur)} bonus`, e.note ? el("span",{class:"muted"}, ` · "${e.note}"`) : null)) : null,
    prev ? el("div",{class:"small muted"}, `Last month: ${money(prev.total, cur)}${prev.paid ? " · paid ✓" : ""}`) : null);
}

// ---------- the grown-up's settings ----------
// save(patch) writes to private/reward with merge. counts(ym) = counted prayers for that month.
export function rewardPanel({el, img, toast, r, kidName, ym, monthName, counts, months, save}){
  const cur0 = r?.currency || "OMR", plan = r?.plan || {mode:"month", prize:5, target:daysIn(ym) * 5};
  const mth = r?.months?.[ym] || {};
  let mode = plan.mode || "month";
  const curSel = el("select",{id:"rw-cur"}, [...CURRENCIES, "Other"].map(c => el("option",{value:c, selected:(CURRENCIES.includes(cur0) ? cur0 : "Other") === c}, c)));
  const curOther = el("input",{id:"rw-cur2", maxlength:"6", placeholder:"e.g. Rs", value:CURRENCIES.includes(cur0) ? "" : cur0, hidden:CURRENCIES.includes(cur0)});
  curSel.addEventListener("change", () => { curOther.hidden = curSel.value !== "Other"; });
  const prize = el("input",{id:"rw-prize", type:"number", min:"0", step:"0.001", inputmode:"decimal", value:plan.prize ?? 5});
  const target = el("input",{id:"rw-target", type:"number", min:"1", step:"1", inputmode:"numeric", value:plan.target || daysIn(ym) * 5});
  const each = el("input",{id:"rw-each", type:"number", min:"0", step:"0.001", inputmode:"decimal", value:plan.each ?? 0.05});
  const bonus = el("input",{id:"rw-bonus", type:"number", min:"0", step:"0.001", inputmode:"decimal", value:mth.bonus || ""});
  const note = el("input",{id:"rw-note", maxlength:"60", placeholder:"e.g. For praying Fajr every day!", value:mth.note || ""});
  const show = el("input",{id:"rw-show", type:"checkbox", checked:r?.show !== false});
  const monthBox = el("div",{class:"two"}, el("div",{class:"field"}, el("label",{for:"rw-prize"},"Prize for the month"), prize),
    el("div",{class:"field"}, el("label",{for:"rw-target"},"Prayers for the full prize"), target));
  const eachBox = el("div",{class:"field"}, el("label",{for:"rw-each"},"Amount for each prayer"), each);
  const modeSeg = el("div",{class:"seg", role:"group", "aria-label":"How the reward works"},
    [["month","Monthly prize"],["each","Per prayer"]].map(([k, l]) => el("button",{type:"button", "aria-pressed":String(mode === k), onclick:e => {
      mode = k; modeSeg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === e.currentTarget))); sync(); }}, l)));
  const sync = () => { monthBox.hidden = mode !== "month"; eachBox.hidden = mode !== "each"; };
  sync();
  const currency = () => (curSel.value === "Other" ? curOther.value.trim() : curSel.value) || "OMR";
  const nowE = r?.plan ? earned(r, ym, counts(ym)) : null;
  const start = rewardStart(r);
  const past = (months || []).filter(m => start && m >= start && m < ym);
  const history = past.slice(0, 6).map(m => ({m, e:earned(r, m, counts(m))}));

  return el("section",{class:"panel stack reward-card"},
    el("div",{class:"sec-title"}, img("moneybag"), el("div",{}, el("h2",{},`${kidName}'s prayer reward`),
      el("div",{class:"small muted"}, "Set a prize. It grows with every prayer, and the child sees it live."))),
    nowE ? el("div",{class:"rw-big"}, el("span",{class:"rw-amt num"}, money(nowE.total, r.currency)), el("span",{class:"small muted"}, ` earned in ${monthName} · ${counts(ym)} prayers`)) : null,
    el("div",{class:"field"}, el("span",{class:"lab"},"How it works"), modeSeg),
    el("div",{class:"two"}, el("div",{class:"field"}, el("label",{for:"rw-cur"},"Currency"), curSel), el("div",{class:"field"}, el("label",{for:"rw-cur2", hidden:true},"Other currency"), curOther)),
    monthBox, eachBox,
    el("p",{class:"small muted"},"Prayers on time, late or done later count. Excused prayers count too, so a valid excuse never lowers the reward."),
    el("div",{class:"field"}, el("label",{for:"rw-bonus"},`Encouragement bonus for ${monthName} (optional)`), bonus),
    el("div",{class:"field"}, el("label",{for:"rw-note"},"Message with the bonus (optional)"), note),
    el("label",{class:"row small", for:"rw-show"}, show, `Show the reward to ${kidName}`),
    el("button",{class:"btn primary", style:"align-self:flex-start", onclick:async e => {
      const c = currency(), num = v => Math.max(0, Math.round((+v || 0) * 1000) / 1000);
      const p = mode === "each" ? {mode, each:num(each.value)} : {mode, prize:num(prize.value), target:Math.max(1, Math.round(+target.value || daysIn(ym) * 5))};
      if (mode === "month" && !p.prize) return toast("Type the prize for the month.", "moneybag");
      if (mode === "each" && !p.each) return toast("Type the amount for each prayer.", "moneybag");
      e.currentTarget.disabled = true;
      try {
        // past months keep the plan they had, so changing the prize never changes what they were worth
        const keep = Object.fromEntries(past.filter(m => !r?.months?.[m]?.plan && r?.plan).map(m => [m, {plan:r.plan}]));
        await save({currency:c, show:show.checked, plan:p, months:{...keep, [ym]:{plan:p, bonus:num(bonus.value), note:note.value.trim().slice(0, 60)}}});
        toast("Reward saved", "moneybag");
      } catch { toast("Couldn't save. Try again.", "lock"); }
      e.currentTarget.disabled = false;
    }}, img("check"), "Save reward"),
    history.length ? el("div",{class:"stack", style:"gap:6px"}, el("b",{},"Earlier months"),
      history.map(({m, e}) => el("div",{class:"check-row"},
        el("span",{}, shortMonth(m)), el("span",{class:"num"}, money(e.total, r.currency)), el("span",{class:"small muted"}, e.paid ? "Paid ✓" : "Not paid yet"),
        el("button",{class:`btn ${e.paid ? "ghost" : "approve"} sm`, onclick:async () => {
          try { await save({months:{[m]:{paid:!e.paid, plan:e.plan}}}); toast(e.paid ? "Marked as not paid" : "Marked as paid", "check"); } catch { toast("Couldn't save. Try again.", "lock"); }
        }}, e.paid ? "Undo" : "Mark paid")))) : null);
}
