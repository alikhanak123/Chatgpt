'use strict';
// Demo-only state. No Firebase, network calls, storage, or real user information.
const prayers = [
  {name:'Fajr', scene:'fajr', description:'Early morning', done:true},
  {name:'Dhuhr', scene:'dhuhr', description:'Midday', done:true},
  {name:'Asr', scene:'asr', description:'Afternoon', done:false},
  {name:'Maghrib', scene:'maghrib', description:'Sunset', done:false},
  {name:'Isha', scene:'isha', description:'Night', done:false}
];
let toastTimer, speechTimer, happyTimer;
const toast = message => {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 3000);
};
function renderPrayers() {
  const list = document.getElementById('prayer-list');
  list.replaceChildren();
  prayers.forEach((prayer, index) => {
    const row = document.createElement('div');
    row.className = `prayer-row${prayer.done ? ' done' : ''}`;
    row.innerHTML = `<div class="prayer-scene scene-${prayer.scene}" aria-hidden="true"><span class="scene-tower"></span></div><div class="prayer-name"><strong>${prayer.name}</strong><small>${prayer.description}</small><span class="prayer-status">${prayer.done ? 'Completed' : ''}</span></div><button class="prayer-check" type="button" aria-pressed="${prayer.done}" aria-label="${prayer.name}: ${prayer.done ? 'completed, undo sample tick' : 'mark complete in demo'}">✓</button>`;
    row.querySelector('button').addEventListener('click', () => {
      const hadFocus = document.activeElement === row.querySelector('button');
      prayer.done = !prayer.done;
      renderPrayers();
      if (hadFocus) list.children[index].querySelector('button').focus({preventScroll:true});
      toast(prayer.done ? 'A lovely little step. Demo prayer ticked! ♡' : 'Sample tick undone. Real progress is unchanged.');
    });
    list.append(row);
  });
  const count = prayers.filter(p => p.done).length;
  document.getElementById('progress-label').textContent = `${count} of 5 prayers`;
  document.getElementById('progress-caption').textContent = count === 5 ? 'Five little moments. A beautiful day. ♡' : 'You’re growing something beautiful.';
  document.getElementById('progress-bar').style.width = `${count * 20}%`;
  const stars = document.getElementById('stars');
  stars.setAttribute('aria-label', `${count} of 5 prayers complete`);
  Array.from(stars.children).forEach((star, i) => {
    star.textContent = i < count ? '★' : '☆';
    star.classList.toggle('unfilled', i >= count);
  });
}
document.getElementById('cheer-button').addEventListener('click', () => toast('A little sunshine! ☀ Demo only — no message was sent.'));
document.querySelectorAll('.bottom-nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.bottom-nav a').forEach(other => {
    const active = link === other;
    other.classList.toggle('active', active);
    if (active) other.setAttribute('aria-current','location'); else other.removeAttribute('aria-current');
  });
}));
renderPrayers();
