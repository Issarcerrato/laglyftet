import { DEMO, GITHUB_URL } from './config.js';
import { db, esc, kr, digits, slugify, swishFormat, progress } from './lib.js';

const app = document.getElementById('app');
let me, admin, clubs = [], goals = [], reports = [], totals = {};

async function start() {
  if (DEMO) {
    app.innerHTML = `<div class="card"><h1 class="goal-title">Admin finns i den fullständiga versionen</h1>
      <p class="muted">Den här sajten är ett demoprojekt utan databas. I den fullständiga versionen loggar lagledare in här, skapar mål och stämmer av mot Swish.</p>
      <a class="primary" href="${GITHUB_URL}" target="_blank" rel="noopener">Läs hur du sätter upp den på GitHub</a></div>`;
    return;
  }
  const { data: { session } } = await db.auth.getSession();
  if (!session) return renderLogin();
  me = session.user;
  document.getElementById('who').textContent = me.email;
  const { data } = await db.from('admins').select('*').eq('user_id', me.id).maybeSingle();
  admin = data;
  if (!admin) return renderNotAdmin();
  if (admin.name) document.getElementById('who').textContent = admin.name;
  await loadAll();
  render();
}

async function loadAll() {
  const [c, g, r, t] = await Promise.all([
    db.from('clubs').select('*').order('name'),
    db.from('goals').select('*, clubs(name, demo)').order('created_at', { ascending: false }),
    db.from('reports').select('*').order('created_at', { ascending: false }).limit(300),
    db.rpc('all_progress'),
  ]);
  const superadmin = admin.club_id === null;
  clubs = (c.data || []).filter(x => superadmin || x.id === admin.club_id);
  goals = (g.data || []).filter(x => superadmin || x.club_id === admin.club_id);
  reports = r.data || [];
  totals = Object.fromEntries((t.data || []).map(x => [x.goal_id, x]));
}

function renderLogin(sent) {
  app.innerHTML = `<div class="card">
    <h1 class="goal-title">Logga in</h1>
    <p class="muted">För lagledare och föreningar. Du får en inloggningslänk till din e-post.</p>
    <form id="login" class="stack tight" novalidate>
      <div class="field"><label class="label" for="email">E-post</label><input id="email" type="email" autocomplete="email" required></div>
      <button class="primary" type="submit">Skicka inloggningslänk</button>
      ${sent ? '<p class="note">Kolla din e-post och klicka på länken. Den fungerar en gång.</p>' : ''}
      <p class="err" id="login-err" hidden></p>
    </form>
  </div>`;
  document.getElementById('login').onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/admin.html', shouldCreateUser: true } });
    if (error) {
      const err = document.getElementById('login-err');
      err.textContent = 'Det gick inte att skicka länken. Kontrollera adressen och försök igen om en minut.';
      err.hidden = false;
      return;
    }
    renderLogin(true);
  };
}

function renderNotAdmin() {
  app.innerHTML = `<div class="card">
    <h1 class="goal-title">Inte admin än</h1>
    <p>Du är inloggad som <b>${esc(me.email)}</b>, men kontot har ingen adminbehörighet ännu.</p>
    <p class="muted">Be den som driver Laglyftet lägga till dig. De behöver din e-postadress.</p>
    <button class="secondary" id="logout">Logga ut</button>
  </div>`;
  document.getElementById('logout').onclick = logout;
}

function render() {
  const pending = reports.filter(r => r.status === 'pending');
  const goalOf = id => goals.find(g => g.id === id);
  const superadmin = admin.club_id === null;

  app.innerHTML = `
  <div class="card panel">
    <h2>Stäm av mot Swish <small>${pending.length} väntar</small></h2>
    ${pending.length ? `<p class="fine">Jämför med föreningens Swish-rapport. Sortera den på meddelandet.</p>
      <div>${pending.map(r => {
        const g = goalOf(r.goal_id);
        return `<div class="row"><span>Inrapporterad swish<small>${esc(g ? g.team + ' · ' + g.swish_message : '')} · ${new Date(r.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</small></span>
          <span class="num">${kr(r.amount)}</span>
          <div class="btns"><button class="btn" data-ok="${r.id}">Bekräfta</button><button class="btn ghost" data-no="${r.id}">Hittar inte</button></div></div>`;
      }).join('')}</div>` : '<p class="muted">Allt är avstämt.</p>'}
  </div>

  <div class="card panel">
    <h2>Mål <small>${goals.length} st</small></h2>
    ${goals.length ? goals.map(g => {
      const t = totals[g.id] || { confirmed: 0 };
      const unconfirmed = pending.filter(r => r.goal_id === g.id).reduce((sum, r) => sum + r.amount, 0);
      return `<div class="row" style="grid-template-columns:1fr">
        <span><b>${esc(g.clubs?.name)} · ${esc(g.team)}: ${esc(g.title)}</b> ${g.published ? '<span class="pill">Publicerat</span>' : '<span class="pill wait">Ej publicerat</span>'}${g.clubs?.demo ? ' <span class="pill wait">Demo</span>' : ''}
          <small>${location.origin}/m/${esc(g.slug)} · Swish-meddelande "${esc(g.swish_message)}"</small></span>
        ${g.published ? progress(g.target, t.confirmed, unconfirmed) : ''}
        <div class="field"><label class="label" for="upd-${g.id}">Senaste från laget</label><input id="upd-${g.id}" maxlength="280" value="${esc(g.update_text)}"></div>
        <div class="btns">
          <button class="btn ghost" data-save="${g.id}">Spara uppdatering</button>
          <button class="btn ${g.published ? 'ghost' : ''}" data-pub="${g.id}">${g.published ? 'Avpublicera' : 'Publicera'}</button>
          ${g.published ? `<a class="btn ghost" href="/m/${esc(g.slug)}" target="_blank" rel="noopener" style="text-decoration:none">Visa</a>` : ''}
        </div>
      </div>`;
    }).join('') : '<p class="muted">Inga mål än. Skapa det första nedan.</p>'}
  </div>

  ${clubs.length ? `<div class="card panel">
    <h2>Skapa ett mål</h2>
    <form id="goal-form" class="stack tight" novalidate>
      <div class="two">
        <div class="field"><label class="label" for="g-club">Förening</label><select id="g-club">${clubs.filter(c => !c.demo).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="g-team">Lag</label><input id="g-team" maxlength="40" placeholder="T.ex. P14"></div>
      </div>
      <div class="field"><label class="label" for="g-title">Vad samlar ni till?</label><input id="g-title" maxlength="60" placeholder="T.ex. Cupresa till Barcelona"></div>
      <div class="field"><label class="label" for="g-desc">Beskrivning</label><textarea id="g-desc" rows="3" maxlength="600" placeholder="Vad pengarna ska gå till, och varför."></textarea></div>
      <div class="two">
        <div class="field"><label class="label" for="g-target">Mål i kr (minst 500)</label><input id="g-target" inputmode="numeric" placeholder="15000"></div>
        <div class="field"><label class="label" for="g-date">Slutdatum</label><input id="g-date" type="date"></div>
      </div>
      <div class="field"><label class="label" for="g-msg">Swish-meddelande (max 50 tecken)</label><input id="g-msg" maxlength="50" placeholder="T.ex. P14 Barcelona"></div>
      <label class="check"><input type="checkbox" id="g-kak"><span>Erbjud "Swisha din del" för dem som hellre swishar än säljer</span></label>
      <div class="three" id="kak-fields" hidden>
        <div class="field"><label class="label" for="g-thing">Vad säljer ni?</label><input id="g-thing" maxlength="30" value="kakburkar"></div>
        <div class="field"><label class="label" for="g-items">Antal per spelare</label><input id="g-items" inputmode="numeric" value="10"></div>
        <div class="field"><label class="label" for="g-profit">Vinst per styck (kr)</label><input id="g-profit" inputmode="numeric" value="50"></div>
      </div>
      <p class="err" id="g-err" hidden></p>
      <button class="primary" type="submit">Skapa mål (opublicerat)</button>
    </form>
  </div>` : ''}

  ${superadmin ? `<div class="card panel">
    <h2>Lägg till förening</h2>
    <p class="fine">Kontrollera föreningen först: ring kansliet eller mejla föreningens officiella adress. Swish-numret måste tillhöra föreningen.</p>
    <form id="club-form" class="stack tight" novalidate>
      <div class="two">
        <div class="field"><label class="label" for="c-name">Namn</label><input id="c-name" maxlength="80"></div>
        <div class="field"><label class="label" for="c-city">Ort</label><input id="c-city" maxlength="40"></div>
      </div>
      <div class="three">
        <div class="field"><label class="label" for="c-swish">Swish-nummer</label><input id="c-swish" inputmode="numeric" placeholder="123 xxx xx xx"></div>
        <div class="field"><label class="label" for="c-crest">Initialer</label><input id="c-crest" maxlength="4" placeholder="SIF"></div>
        <div class="field"><label class="label" for="c-color">Klubbfärg</label><input id="c-color" type="color" value="#1f6b45"></div>
      </div>
      <div class="field"><label class="label" for="c-place">Plats (valfritt, för "Nära mig")</label><input id="c-place" placeholder="59.312, 18.072"><span class="fine">Högerklicka på klubbens plan i Google Maps och klicka på koordinaterna för att kopiera dem.</span></div>
      <p class="err" id="c-err" hidden></p>
      <button class="primary" type="submit">Lägg till förening</button>
    </form>
    ${clubs.length ? `<div>${clubs.map(c => `<div class="row"><span>${esc(c.name)}<small>${esc(c.city)}${c.swish_number ? ' · Swish ' + swishFormat(c.swish_number) : ''}</small></span>${c.demo ? '<span class="pill wait">Demo</span>' : ''}</div>`).join('')}</div>` : ''}
  </div>` : ''}

  <button class="secondary" id="logout">Logga ut</button>`;

  wire();
}

function wire() {
  app.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => setStatus(b.dataset.ok, 'confirmed'));
  app.querySelectorAll('[data-no]').forEach(b => b.onclick = () => setStatus(b.dataset.no, 'rejected'));
  app.querySelectorAll('[data-pub]').forEach(b => b.onclick = async () => {
    const g = goals.find(x => x.id === b.dataset.pub);
    await act(db.from('goals').update({ published: !g.published }).eq('id', g.id), g.published ? 'Avpublicerat' : 'Publicerat');
  });
  app.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
    const id = b.dataset.save;
    await act(db.from('goals').update({ update_text: document.getElementById('upd-' + id).value.trim() }).eq('id', id), 'Sparat');
  });
  document.getElementById('logout').onclick = logout;

  const gf = document.getElementById('goal-form');
  if (gf) {
    document.getElementById('g-kak').onchange = e => document.getElementById('kak-fields').hidden = !e.target.checked;
    gf.onsubmit = async e => {
      e.preventDefault();
      const v = id => document.getElementById(id).value.trim();
      const team = v('g-team'), title = v('g-title'), target = +digits(v('g-target')), deadline = v('g-date'), msg = v('g-msg');
      const kak = document.getElementById('g-kak').checked;
      const err = !team ? 'Skriv vilket lag det gäller.'
        : title.length < 3 ? 'Skriv vad ni samlar till.'
        : !(target >= 500) ? 'Målet måste vara minst 500 kr.'
        : !deadline || new Date(deadline) <= new Date() ? 'Välj ett slutdatum framåt i tiden.'
        : !msg ? 'Skriv ett Swish-meddelande, så att kassören kan sortera betalningarna.'
        : kak && !(+digits(v('g-items')) > 0 && +digits(v('g-profit')) > 0) ? 'Fyll i antal och vinst för "Swisha din del".'
        : null;
      if (err) return showErr('g-err', err);
      const row = {
        club_id: v('g-club'), team, title, description: v('g-desc'), target, deadline, swish_message: msg,
        slug: `${slugify(team + ' ' + title)}-${Math.random().toString(36).slice(2, 6)}`,
        kak_thing: kak ? v('g-thing') || 'saker' : null,
        kak_items: kak ? +digits(v('g-items')) : null,
        kak_profit: kak ? +digits(v('g-profit')) : null,
      };
      await act(db.from('goals').insert(row), 'Målet är skapat. Publicera det när det ser bra ut.', 'g-err');
    };
  }

  const cf = document.getElementById('club-form');
  if (cf) cf.onsubmit = async e => {
    e.preventDefault();
    const v = id => document.getElementById(id).value.trim();
    const swish = digits(v('c-swish'));
    const nums = v('c-place').split(',').map(x => parseFloat(x));
    const place = nums.length === 2 && nums[0] > 54 && nums[0] < 70 && nums[1] > 10 && nums[1] < 25 ? nums : null;
    const err = v('c-name').length < 2 ? 'Skriv föreningens namn.'
      : !/^123\d{7}$/.test(swish) ? 'Swish-numret ska vara föreningens nummer: 10 siffror som börjar med 123.'
      : v('c-place') && !place ? 'Platsen ska vara två tal med komma emellan, till exempel 59.312, 18.072.'
      : null;
    if (err) return showErr('c-err', err);
    await act(db.from('clubs').insert({
      name: v('c-name'), city: v('c-city'), swish_number: swish, crest: v('c-crest').toUpperCase(), color: v('c-color'),
      lat: place ? place[0] : null, lng: place ? place[1] : null,
    }), 'Föreningen är tillagd', 'c-err');
  };
}

async function setStatus(id, status) {
  await act(db.from('reports').update({ status }).eq('id', id), status === 'confirmed' ? 'Bekräftat' : 'Markerat som ej hittat');
}

// Kör en databasändring, laddar om och visar resultatet
async function act(query, okMsg, errId) {
  const { error } = await query;
  if (error) {
    if (errId) return showErr(errId, 'Det gick inte att spara: ' + error.message);
    return toast('Det gick inte att spara: ' + error.message);
  }
  await loadAll();
  render();
  toast(okMsg);
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.hidden = false;
}

async function logout() {
  await db.auth.signOut();
  location.reload();
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

start();
