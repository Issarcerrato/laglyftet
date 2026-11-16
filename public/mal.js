import { DEMO, GITHUB_URL } from './config.js';
import { demoGoals } from './demo-data.js';
import { db, esc, kr, crest, progress, daysLeft, kakSum, swishFormat, swishLink, swishQrText, teamPhoto, getSaved, toggleSaved, toast, START_STEPS } from './lib.js';

const app = document.getElementById('app');
// /m/<slug> på Netlify, mal.html?m=<slug> lokalt
const slug = location.pathname.startsWith('/m/') ? decodeURIComponent(location.pathname.slice(3)).replace(/\/$/, '') : new URLSearchParams(location.search).get('m');

let goal, totals;
const state = { amount: 100, kak: false };

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';

async function load() {
  if (!slug) return notFound();
  if (DEMO) {
    document.querySelector('.foot').innerHTML = `Demoprojekt. Laglyftet sparar inga uppgifter om dig.<br><a href="${GITHUB_URL}" target="_blank" rel="noopener">Koden på GitHub</a>`;
    goal = demoGoals().find(g => g.slug === slug);
    if (!goal) return notFound();
    totals = goal.t;
    document.title = `${goal.clubs.name} ${goal.team}: ${goal.title} · Laglyftet`;
    return renderChoose();
  }
  const { data, error } = await db.from('goals').select('*, clubs(*)').eq('slug', slug).eq('published', true).maybeSingle();
  if (error || !data) return notFound();
  goal = data;
  const { data: t } = await db.rpc('goal_progress', { goal: goal.id });
  totals = (t && t[0]) || { confirmed: 0, supporters: 0 };
  if (kakSum(goal)) { state.kak = true; state.amount = kakSum(goal); }
  document.title = `${goal.clubs.name} ${goal.team}: ${goal.title} · Laglyftet`;
  renderChoose();
}

function notFound() {
  app.innerHTML = `<div class="card"><h2 class="goal-title">Målet finns inte</h2>
    <p class="muted">Länken kan vara fel, eller så är insamlingen avslutad.</p><a class="primary" href="/">Se alla lag</a></div>`;
}

function header() {
  const c = goal.clubs;
  return `<div class="head">${crest(c)}<div>
      <p class="club">${esc(c.name)} · ${esc(goal.team)}${c.city ? ' · ' + esc(c.city) : ''}</p>
      <h1 class="goal-title">${esc(goal.title)}</h1>
    </div></div>`;
}

function renderChoose() {
  const c = goal.clubs, ks = kakSum(goal);
  const saved = getSaved().includes(goal.slug);
  const info = `<div class="card">
    <div class="goal-photo">${teamPhoto(c, goal.slug)}
      <div class="chip-row">${c.demo ? '<span class="chip demo">Demo</span>' : ''}</div></div>
    ${header()}
    ${goal.description ? `<p>${esc(goal.description)}</p>` : ''}
    ${progress(goal.target, totals.confirmed)}
    <div class="meta"><span><strong>${totals.supporters}</strong> stöttar</span><span><strong>${daysLeft(goal.deadline)}</strong> dagar kvar</span></div>
    ${goal.update_text ? `<p class="latest"><b>Senaste från laget:</b> ${esc(goal.update_text)}</p>` : ''}
    <div class="btns"><button class="btn ghost" id="save">${saved ? 'Sparat i Mina lag' : 'Spara i Mina lag'}</button><button class="btn ghost" id="share-top">Dela</button></div>
  </div>`;

  if (c.demo) {
    app.innerHTML = info + `<div class="card">
      <div class="demo-box">
        <b>Det här är ett demolag</b>
        <span>Så här ser det ut när ett riktigt lag samlar pengar. Hos ett riktigt lag väljer du belopp här och swishar direkt till föreningen, med allt ifyllt.</span>
        ${ks ? `<span>Det här laget erbjuder <b>Swisha din del: ${kr(ks)}</b> i stället för att sälja ${esc(goal.kak_thing)}.</span>` : ''}
      </div>
      ${DEMO ? `<h2 class="goal-title">Gillar du idén?</h2>
      <p class="muted">Laglyftet är ett demoprojekt. All kod är fri att använda, så bygg gärna vidare för ditt eget lag eller din förening.</p>
      <a class="primary" href="${GITHUB_URL}" target="_blank" rel="noopener">Se koden på GitHub</a>` : `<h2 class="goal-title">Starta ert eget på 3 steg</h2>
      ${START_STEPS}
      <a class="primary" href="/#lagledare">Kom igång, det är gratis</a>`}
      <a class="secondary" href="/" style="text-align:center;text-decoration:none;color:inherit">Se fler lag</a>
    </div>`;
    wireTop();
    return;
  }

  app.innerHTML = info + `<div class="card">
    ${ks ? `<div class="kak">
      <b class="h">Slipp sälja ${esc(goal.kak_thing || 'saker')}</b>
      <span>Varje spelare brukar sälja ${goal.kak_items} ${esc(goal.kak_thing || 'saker')} och laget tjänar ${kr(goal.kak_profit)} per styck. Swisha ${kr(ks)} i stället, så får laget lika mycket.</span>
      <button class="amt" id="kak-btn" aria-pressed="${state.kak}">Swisha min del: ${kr(ks)}</button>
    </div>` : ''}
    <div><p class="label" style="margin-bottom:6px">${ks ? 'Eller välj ett eget belopp' : 'Välj belopp'}</p>
      <div class="amounts">${[50, 100, 200, 500].map(a => `<button class="amt" data-amt="${a}" aria-pressed="${!state.kak && state.amount === a}">${a} kr</button>`).join('')}</div>
    </div>
    <div class="field"><label class="label" for="custom">Annat belopp (20–5 000 kr)</label><input id="custom" inputmode="numeric" autocomplete="off" placeholder="T.ex. 300"></div>
    <p class="fine">Alla bidrag är anonyma på Laglyftet, och vi vet aldrig vem som betalar. ${esc(c.name)} ser avsändaren i sin Swish-rapport, som vanligt.</p>
    <button class="primary" id="next"></button>
  </div>`;

  const refresh = () => {
    const ok = state.amount >= 20 && state.amount <= 5000;
    document.getElementById('next').textContent = ok ? `Swisha ${kr(state.amount)}` : 'Välj ett belopp';
    document.getElementById('next').disabled = !ok;
    const k = document.getElementById('kak-btn');
    if (k) k.setAttribute('aria-pressed', state.kak);
  };
  const clear = () => app.querySelectorAll('[data-amt]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  const kakBtn = document.getElementById('kak-btn');
  if (kakBtn) kakBtn.onclick = () => { state.kak = true; state.amount = ks; document.getElementById('custom').value = ''; clear(); refresh(); };
  app.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => {
    state.kak = false; state.amount = +b.dataset.amt; document.getElementById('custom').value = '';
    clear(); b.setAttribute('aria-pressed', 'true'); refresh();
  });
  document.getElementById('custom').oninput = e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    state.kak = false; state.amount = +e.target.value || 0; clear(); refresh();
  };
  document.getElementById('next').onclick = renderSwish;
  wireTop();
  refresh();
}

// Knapparna Spara och Dela i målets första kort
function wireTop() {
  document.getElementById('save').onclick = e => {
    const on = toggleSaved(goal.slug);
    e.target.textContent = on ? 'Sparat i Mina lag' : 'Spara i Mina lag';
    toast(on ? 'Sparat i Mina lag' : 'Borttaget från Mina lag');
  };
  document.getElementById('share-top').onclick = () => share(`Stötta ${goal.clubs.name} ${goal.team}: ${goal.title}.`);
}

async function share(text) {
  const url = location.origin + '/m/' + goal.slug;
  if (navigator.share) {
    try { await navigator.share({ title: goal.title, text, url }); } catch (e) { /* avbrutet */ }
    return;
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Länken är kopierad'); }
  catch (e) { toast(url); }
}

function renderSwish() {
  const c = goal.clubs;
  app.innerHTML = `<div class="card">
    ${header()}
    <p class="label">Swisha med allt ifyllt</p>
    <div class="swishbox">
      <div><span>Mottagare</span><span>${esc(c.name)}</span></div>
      <div><span>Swish-nummer</span><span>${swishFormat(c.swish_number)}</span></div>
      <div><span>Belopp</span><span>${kr(state.amount)}</span></div>
      <div><span>Meddelande</span><span>${esc(goal.swish_message)}</span></div>
    </div>
    <a class="primary mobile-only" href="${swishLink(c.swish_number, state.amount, goal.swish_message)}">Öppna Swish</a>
    <div class="qr"><div id="qr"></div><span>Skanna med Swish-appen i mobilen. Belopp och meddelande är redan ifyllda.</span></div>
    <p class="note">Kontrollera att mottagaren i Swish heter <b>${esc(c.name)}</b>. Laglyftet ber aldrig om Swish till ett privat 07-nummer.</p>
    <p class="fine">Öppnas inte Swish? Swisha manuellt till numret ovan och skriv meddelandet "${esc(goal.swish_message)}".</p>
    <button class="primary" id="done">Jag har swishat</button>
    <button class="secondary" id="back">Tillbaka</button>
  </div>`;
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(swishQrText(c.swish_number, state.amount, goal.swish_message));
    qr.make();
    document.getElementById('qr').innerHTML = qr.createSvgTag(4, 2);
  } catch (e) {
    document.querySelector('.qr').hidden = true;
  }
  document.getElementById('back').onclick = renderChoose;
  document.getElementById('done').onclick = report;
}

async function report() {
  const btn = document.getElementById('done');
  btn.disabled = true; btn.textContent = 'Sparar…';
  // Alla bidrag är anonyma: databasen tar bara emot visningsnamnet "En supporter"
  const { error } = await db.from('reports').insert({ goal_id: goal.id, amount: state.amount });
  if (error) {
    btn.disabled = false; btn.textContent = 'Jag har swishat';
    btn.insertAdjacentHTML('beforebegin', '<p class="err">Det gick inte att spara. Försök igen om en stund.</p>');
    return;
  }
  if (!getSaved().includes(goal.slug)) toggleSaved(goal.slug);
  app.innerHTML = `<div class="card done">
    <div class="check-icon">${CHECK}</div>
    <h1 class="goal-title">Tack för ditt stöd!</h1>
    <p class="muted">${kr(state.amount)} till ${esc(goal.clubs.name)} ${esc(goal.team)}. Ditt bidrag är anonymt. Det räknas in i lagets summa när lagledaren har bekräftat det mot föreningens Swish-rapport.</p>
    <div style="width:100%;text-align:left">${progress(goal.target, totals.confirmed, state.amount)}</div>
    <button class="primary" id="share">Dela och få fler att swisha</button>
    <a class="secondary" href="/" style="text-align:center;text-decoration:none;color:inherit">Se fler lag</a>
  </div>`;
  document.getElementById('share').onclick = () => share(`Jag stöttar ${goal.clubs.name} ${goal.team}: ${goal.title}. Swisha du också!`);
}

load();
