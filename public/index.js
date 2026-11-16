import { DEMO, GITHUB_URL } from './config.js';
import { demoGoals } from './demo-data.js';
import { db, esc, kr, crest, progress, daysLeft, kakSum, teamPhoto, distanceKm, getSaved, toggleSaved, toast, START_STEPS } from './lib.js';

const view = document.getElementById('view');
const state = { goals: [], view: 'swipe', query: '', radius: 'all', here: null, seen: new Set() };

// Kontaktformuläret för lagledare skickas till Netlify Forms
document.getElementById('lead-form').onsubmit = async e => {
  e.preventDefault();
  const form = e.target, err = document.getElementById('lead-err');
  const v = n => form.elements[n].value.trim();
  const problem = !v('namn') ? 'Skriv ditt namn.'
    : !v('forening') ? 'Skriv förening och lag.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('epost')) ? 'Skriv en giltig e-postadress.'
    : null;
  if (problem) { err.textContent = problem; err.hidden = false; return; }
  err.hidden = true;
  const btn = form.querySelector('button');
  btn.disabled = true; btn.textContent = 'Skickar…';
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    if (!res.ok) throw new Error(res.status);
    form.hidden = true;
    document.getElementById('lead-ok').hidden = false;
  } catch (e2) {
    btn.disabled = false; btn.textContent = 'Skicka';
    err.textContent = 'Det gick inte att skicka. Försök igen om en stund.';
    err.hidden = false;
  }
};

// I demoläget visas en banderoll och "Bygg själv" i stället för lagledarformuläret
if (DEMO) {
  document.getElementById('demo-banner').hidden = false;
  document.getElementById('bygg-sjalv').hidden = false;
  document.getElementById('lagledare').hidden = true;
  document.querySelectorAll('[data-github]').forEach(a => a.href = GITHUB_URL);
  document.querySelector('.foot').innerHTML = `Demoprojekt. Laglyftet sparar inga uppgifter om dig.<br><a href="${GITHUB_URL}" target="_blank" rel="noopener">Koden på GitHub</a>`;
}

async function load() {
  if (DEMO) {
    state.goals = demoGoals();
    updateSavedCount();
    render();
    if (location.hash === '#lagledare' || location.hash === '#bygg-sjalv') toForm();
    return;
  }
  const [{ data: goals, error }, { data: totals }] = await Promise.all([
    db.from('goals').select('*, clubs(*)').eq('published', true),
    db.rpc('all_progress'),
  ]);
  if (error) {
    view.innerHTML = `<p class="err">Kunde inte hämta målen. Försök igen om en stund.</p>`;
    return;
  }
  const byGoal = Object.fromEntries((totals || []).map(t => [t.goal_id, t]));
  state.goals = goals.map(g => ({ ...g, t: byGoal[g.id] || { confirmed: 0, supporters: 0 } }));
  updateSavedCount();
  render();
  // Länken "Kom igång" från demosidorna: hoppa till formuläret när lagen har laddats
  if (location.hash === '#lagledare') toForm();
}

// Riktiga lag före demolag, sedan närmast först, sedan kortast tid kvar
function visible() {
  const q = state.query.trim().toLowerCase();
  return state.goals
    .map(g => ({ ...g, dist: state.here && g.clubs.lat != null ? distanceKm(state.here, g.clubs) : null }))
    .filter(g => !q || [g.clubs.name, g.clubs.city, g.team, g.title].join(' ').toLowerCase().includes(q))
    .filter(g => state.radius === 'all' || (g.dist != null && g.dist <= +state.radius))
    .sort((a, b) => (a.clubs.demo - b.clubs.demo)
      || ((a.dist ?? 1e9) - (b.dist ?? 1e9))
      || a.deadline.localeCompare(b.deadline));
}

function place(g) {
  if (g.dist == null) return esc(g.clubs.city || 'Sverige');
  const km = g.dist < 10 ? g.dist.toFixed(1).replace('.', ',') : Math.round(g.dist);
  return `${km} km · ${esc(g.clubs.city)}`;
}

function meta(g) {
  return `<div class="meta"><span><strong>${g.t.supporters}</strong> stöttar</span><span><strong>${daysLeft(g.deadline)}</strong> dagar kvar</span></div>`;
}

function render() {
  document.querySelectorAll('.seg [data-view]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === state.view));
  if (state.view === 'swipe') renderSwipe();
  else renderList(state.view === 'saved');
}

/* Swipe ---------------------------------------------------------------------- */

function cardHTML(g) {
  return `<div class="photo-wrap">
      ${teamPhoto(g.clubs, g.slug)}
      <div class="chip-row"><span class="chip">${place(g)}</span>${g.clubs.demo ? '<span class="chip demo">Demo</span>' : ''}</div>
      <div class="stamp yes">STÖD</div><div class="stamp no">NÄSTA</div>
      <div class="crest-badge">${crest(g.clubs)}</div>
    </div>
    <div class="body">
      <p class="club offset">${esc(g.clubs.name)} · ${esc(g.team)}</p>
      <h2 class="goal-title">${esc(g.title)}</h2>
      ${kakSum(g) ? `<p class="kak-line">Slipp sälja ${g.kak_items} ${esc(g.kak_thing)}: swisha ${kr(kakSum(g))}</p>` : `<p class="desc">${esc(g.description)}</p>`}
      ${progress(g.target, g.t.confirmed)}
      ${meta(g)}
    </div>`;
}

// Reklamkortet för lagledare läggs in som fjärde kort så länge det finns demolag
function deckItems() {
  const goals = visible().filter(g => !state.seen.has(g.id));
  const items = goals.map(g => ({ key: g.id, g }));
  const seenGoals = [...state.seen].filter(k => k !== 'promo').length;
  if (!state.seen.has('promo') && goals.some(g => g.clubs.demo)) {
    items.splice(Math.min(Math.max(0, 3 - seenGoals), items.length), 0, { key: 'promo', promo: true });
  }
  return items;
}

function promoHTML() {
  if (DEMO) return `<div class="promo">
      <div class="stamp yes">KOLLA</div><div class="stamp no">NÄSTA</div>
      <span class="chip demo">Demoprojekt</span>
      <h2 class="goal-title">Gillar du idén?</h2>
      <p class="muted">Laglyftet är ett demoprojekt. All kod är fri att använda, så bygg gärna vidare för ditt eget lag eller din förening.</p>
      <ul class="plain">
        <li>Fri kod med MIT-licens</li>
        <li>Gratis att köra med Netlify och Supabase</li>
        <li>Swish direkt till föreningen, inga pengar via appen</li>
      </ul>
      <span class="primary">Läs mer</span>
    </div>`;
  return `<div class="promo">
      <div class="stamp yes">STARTA</div><div class="stamp no">NÄSTA</div>
      <span class="chip demo">För lagledare</span>
      <h2 class="goal-title">Ditt lag här?</h2>
      <p class="muted">Byt kakförsäljningen mot Swish. Gratis för föreningar, och pengarna går direkt till föreningen.</p>
      ${START_STEPS}
      <span class="primary">Kom igång</span>
    </div>`;
}

const toForm = () => {
  if (DEMO) return document.getElementById('bygg-sjalv').scrollIntoView({ block: 'start' });
  document.getElementById('lagledare').scrollIntoView({ block: 'start' });
  document.getElementById('l-name').focus({ preventScroll: true });
};

function renderSwipe() {
  const items = deckItems();
  if (!items.some(it => it.g)) {
    const any = visible().length;
    view.innerHTML = `<div class="card empty-state">
      <h2 class="goal-title">${any ? 'Du har sett alla lag' : 'Inga lag hittades'}</h2>
      <p class="muted">${any ? 'Börja om, eller se alla i en lista.' : 'Prova en annan sökning eller ett större avstånd.'}</p>
      <div class="btns">${any ? '<button class="btn" id="restart">Börja om</button>' : ''}<button class="btn ghost" id="to-list">Visa lista</button></div>
    </div>`;
    document.getElementById('restart')?.addEventListener('click', () => { state.seen.clear(); render(); });
    document.getElementById('to-list').onclick = () => { state.view = 'list'; render(); };
    return;
  }
  view.innerHTML = `<div class="deck" id="deck"></div>
    <div class="actions">
      <button class="round skip" id="skip" aria-label="Hoppa över"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <button class="round open" id="open" aria-label="Öppna"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.6 0-2.8.8-2.8 2s1.2 1.6 2.8 2 2.8.8 2.8 2-1.2 2-2.8 2c-1.3 0-2.3-.5-2.8-1.2M12 6.5v11"/></svg></button>
      <button class="round like" id="like" aria-label="Spara i Mina lag"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.3C1 8.4 3 5 6.4 5c2 0 3.6 1.1 4.4 2.6h2.4C14 6.1 15.6 5 17.6 5 21 5 23 8.4 21.6 11.7 19.5 16.4 12 21 12 21Z"/></svg></button>
    </div>
    <p class="fine center">Dra höger för att spara laget, vänster för nästa. Tryck på kortet för att swisha.</p>`;
  const deck = document.getElementById('deck');
  items.slice(0, 3).reverse().forEach((it, i, arr) => {
    const depth = arr.length - 1 - i;
    const el = document.createElement('article');
    el.className = 'swipe-card' + (it.promo ? ' promo-card' : '') + (depth === 0 ? ' is-top' : '');
    el.setAttribute('aria-label', it.promo ? 'Ditt lag här? Så kommer ni igång' : `${it.g.clubs.name} ${it.g.team}: ${it.g.title}`);
    el.innerHTML = it.promo ? promoHTML() : cardHTML(it.g);
    el.style.transform = `translateY(${depth * 10}px) scale(${1 - depth * .04})`;
    if (depth === 2) el.style.opacity = .6;
    if (depth === 0) drag(el, it);
    deck.appendChild(el);
  });
  const top = items[0];
  document.getElementById('skip').onclick = () => decide('left', top);
  document.getElementById('like').onclick = () => decide('right', top);
  document.getElementById('open').onclick = () => open(top);
}

function open(it) {
  if (it.promo) return toForm();
  location.href = '/m/' + it.g.slug;
}

function drag(card, it) {
  let start = null, dx = 0, moved = false;
  const yes = card.querySelector('.stamp.yes'), no = card.querySelector('.stamp.no');
  card.addEventListener('pointerdown', e => {
    start = { x: e.clientX, y: e.clientY }; dx = 0; moved = false;
    card.setPointerCapture(e.pointerId);
    card.style.transition = 'none';
  });
  card.addEventListener('pointermove', e => {
    if (!start) return;
    dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    card.style.transform = `translate(${dx}px, ${dy * .25}px) rotate(${dx / 18}deg)`;
    yes.style.opacity = Math.max(0, Math.min(1, dx / 90));
    no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  });
  const end = () => {
    if (!start) return;
    start = null;
    card.style.transition = '';
    if (Math.abs(dx) > 100) decide(dx > 0 ? 'right' : 'left', it);
    else {
      card.style.transform = ''; yes.style.opacity = no.style.opacity = 0;
      if (!moved) open(it);
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

function decide(dir, it) {
  const card = document.querySelector('.swipe-card.is-top');
  if (!card || card.dataset.leaving) return;
  card.dataset.leaving = '1';
  card.querySelector(dir === 'right' ? '.stamp.yes' : '.stamp.no').style.opacity = 1;
  card.style.transition = 'transform .32s ease, opacity .32s ease';
  card.style.transform = `translate(${dir === 'right' ? 520 : -520}px, 30px) rotate(${dir === 'right' ? 24 : -24}deg)`;
  card.style.opacity = 0;
  state.seen.add(it.key);
  if (dir === 'right' && it.promo) {
    setTimeout(() => { render(); toForm(); }, 300);
    return;
  }
  if (dir === 'right') {
    const g = it.g;
    if (!getSaved().includes(g.slug)) toggleSaved(g.slug);
    updateSavedCount();
    toast(`${g.clubs.name} ${g.team} är sparat i Mina lag`, { href: '/m/' + g.slug, label: 'Swisha nu' });
  }
  setTimeout(render, 300);
}

document.addEventListener('keydown', e => {
  if (state.view !== 'swipe' || e.target.matches('input, select, textarea')) return;
  const top = deckItems()[0];
  if (!top) return;
  if (e.key === 'ArrowRight') decide('right', top);
  if (e.key === 'ArrowLeft') decide('left', top);
});

/* Lista och Mina lag ---------------------------------------------------------- */

function renderList(onlySaved) {
  const saved = getSaved();
  const list = onlySaved ? visible().filter(g => saved.includes(g.slug)) : visible();
  if (!list.length) {
    view.innerHTML = `<div class="card empty-state"><p class="muted">${onlySaved
      ? 'Här samlas lagen du sparar. Swipea höger på ett lag, eller tryck på Spara på ett lags sida.'
      : 'Inga lag matchar. Prova en annan sökning eller ett större avstånd.'}</p></div>`;
    return;
  }
  view.innerHTML = list.map(g => `<a class="card goal-card" href="/m/${esc(g.slug)}">
      <div class="photo-wrap small">${teamPhoto(g.clubs, g.slug)}
        <div class="chip-row"><span class="chip">${place(g)}</span>${g.clubs.demo ? '<span class="chip demo">Demo</span>' : ''}</div>
        <div class="crest-badge">${crest(g.clubs)}</div></div>
      <p class="club offset">${esc(g.clubs.name)} · ${esc(g.team)}</p>
      <h2 class="goal-title">${esc(g.title)}</h2>
      ${progress(g.target, g.t.confirmed)}
      ${meta(g)}
      ${g.clubs.demo ? '<p class="promo-line">Demolag. Vill ditt lag också samla så här? Se hur ni kommer igång.</p>' : ''}
    </a>`).join('');
}

function updateSavedCount() {
  const n = getSaved().filter(s => state.goals.some(g => g.slug === s)).length;
  document.getElementById('saved-count').textContent = n ? `(${n})` : '';
}

/* Kontroller ------------------------------------------------------------------ */

document.querySelectorAll('.seg [data-view]').forEach(b => b.onclick = () => { state.view = b.dataset.view; render(); });
document.getElementById('q').oninput = e => { state.query = e.target.value; state.seen.clear(); render(); };
document.getElementById('radius').onchange = e => { state.radius = e.target.value; state.seen.clear(); render(); };
document.getElementById('near').onclick = () => {
  const label = document.getElementById('near-label');
  if (!navigator.geolocation) return toast('Din webbläsare kan inte dela plats.');
  label.textContent = 'Hämtar plats…';
  navigator.geolocation.getCurrentPosition(pos => {
    state.here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    state.radius = '50';
    const r = document.getElementById('radius');
    r.disabled = false; r.value = '50';
    label.textContent = 'Nära dig';
    state.seen.clear();
    render();
  }, () => {
    label.textContent = 'Nära mig';
    toast('Platsen kunde inte hämtas. Du kan söka på din ort i stället.');
  }, { timeout: 10000, maximumAge: 600000 });
};

load();
