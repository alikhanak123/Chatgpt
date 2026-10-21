'use strict';
// Demo-only state. No Firebase, network calls, storage, or real user information.
const prayers = [
  {name:'Fajr', scene:'fajr', description:'A peaceful beginning', done:true},
  {name:'Dhuhr', scene:'dhuhr', description:'A moment in the sunshine', done:true},
  {name:'Asr', scene:'asr', description:'A little afternoon pause', done:false},
  {name:'Maghrib', scene:'maghrib', description:'As the sky turns golden', done:false},
  {name:'Isha', scene:'isha', description:'End your day with peace', done:false}
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
    row.innerHTML = `<div class="prayer-scene scene-${prayer.scene}" aria-hidden="true"><span class="scene-tower"></span></div><div class="prayer-name"><strong>${prayer.name}</strong><small>${prayer.description}</small><span class="prayer-status">${prayer.done ? 'Lovely effort · completed' : 'A new chance to grow'}</span></div><button class="prayer-check" type="button" aria-pressed="${prayer.done}" aria-label="${prayer.name}: ${prayer.done ? 'completed, undo sample tick' : 'mark complete in demo'}">✓</button>`;
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
function patPet(message) {
  const speech = document.getElementById('pet-speech');
  const pet = document.getElementById('pet-button');
  speech.textContent = message;
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {speech.textContent = 'A little hello makes my day ♡';}, 3500);
  pet.classList.remove('patted');
  void pet.offsetWidth;
  pet.classList.add('patted');
  clearTimeout(happyTimer);
  happyTimer = setTimeout(() => pet.classList.remove('patted'), 750);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const hearts = document.getElementById('pet-hearts');
    for (let i = 0; i < 4; i++) {
      const heart = document.createElement('span');
      heart.className = 'floating-heart'; heart.textContent = '♡';
      heart.style.setProperty('--drift', `${(i - 1.5) * 28}px`);
      heart.style.animationDelay = `${i * .08}s`;
      hearts.append(heart);
      setTimeout(() => heart.remove(), 2000);
    }
  }
}
const lines = ['You make my day brighter ♡', 'A little pat, a lot of love!', 'So happy you’re here!', 'My favourite part of the day ♡'];
let pats = 0, food = 12;
document.getElementById('pet-button').addEventListener('click', () => patPet(lines[pats++ % lines.length]));
document.getElementById('feed-button').addEventListener('click', () => {
  if (food < 20) food++;
  document.getElementById('food-label').textContent = `${food} / 20`;
  document.getElementById('food-bar').style.width = `${food * 5}%`;
  patPet(food === 20 ? 'A full tummy and a happy heart ♡' : 'Thank you for my little treat!');
  toast('Demo treat only. Real pet progress is unchanged.');
});
document.getElementById('cheer-button').addEventListener('click', () => toast('A little sunshine! ☀ Demo only — no message was sent.'));
document.querySelectorAll('.bottom-nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.bottom-nav a').forEach(other => {
    const active = link === other;
    other.classList.toggle('active', active);
    if (active) other.setAttribute('aria-current','location'); else other.removeAttribute('aria-current');
  });
}));
renderPrayers();
