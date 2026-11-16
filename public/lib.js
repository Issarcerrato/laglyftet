import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const db = createClient(SUPABASE_URL, SUPABASE_KEY);

export const kr = n => Number(n || 0).toLocaleString('sv-SE') + ' kr';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const digits = s => String(s ?? '').replace(/\D/g, '');
export const daysLeft = date => Math.max(0, Math.ceil((new Date(date + 'T23:59:59') - Date.now()) / 864e5));
export const kakSum = g => (g.kak_items && g.kak_profit) ? g.kak_items * g.kak_profit : 0;

// 1234567890 → 123 456 78 90
export const swishFormat = n => {
  const d = digits(n);
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : d;
};

export function slugify(s) {
  return s.toLowerCase()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function crest(club, cls = 'crest') {
  const c = /^#[0-9a-fA-F]{6}$/.test(club.color) ? club.color : '#1f6b45';
  const text = esc((club.crest || club.name.split(' ').map(w => w[0]).join('')).slice(0, 4).toUpperCase());
  const size = text.length > 2 ? 20 : 26;
  return `<svg class="${cls}" viewBox="0 0 64 66" aria-hidden="true">
    <path d="M32 3 59 11v21c0 16-11.5 27-27 31C16.5 59 5 48 5 32V11Z" fill="#fff" stroke="${c}" stroke-width="4"/>
    <text x="32" y="${text.length > 2 ? 40 : 42}" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="${size}" fill="${c}">${text}</text></svg>`;
}

// Förloppsindikator: bekräftat (helt) + inrapporterat men ej avstämt (randigt).
// Publikt visas bara bekräftat; obekräftat skickas bara med på tacksidan och i admin.
export function progress(target, confirmed, pending = 0) {
  const ok = Math.min(100, Math.round(confirmed / target * 100));
  const all = Math.min(100, Math.round((confirmed + pending) / target * 100));
  return `<div class="money">
    <div class="bar"><span class="ok" style="width:${ok}%"></span><span class="pend" style="width:${all - ok}%"></span></div>
    <div class="nums"><b>${kr(confirmed + pending)}</b><small>av ${kr(target)}</small><span class="pct">${all} %</span></div>
    ${pending ? `<span class="pend-note"><i></i>${kr(pending)} väntar på avstämning mot Swish</span>` : ''}
  </div>`;
}

// Swish-betalning med ifyllda fält. Formaten bör bekräftas med Swish innan skarp lansering.
export function swishLink(number, amount, message) {
  const data = {
    version: 1,
    payee: { value: digits(number), editable: false },
    amount: { value: amount, editable: false },
    message: { value: message, editable: false },
  };
  return 'swish://payment?data=' + encodeURIComponent(JSON.stringify(data));
}
export const swishQrText = (number, amount, message) => `C${digits(number)};${amount};${message};0`;

// Illustrerad lagbild: spelarna bakifrån i klubbfärgen, så att inga ansikten syns
const HAIR = ['#2b1d14', '#5a3a22', '#c9a26b', '#8a5a2b', '#141414', '#d8b56d', '#6b4226'];
const NUMS = [7, 10, 4, 9, 11, 3, 5, 8, 2, 6, 14, 12];
export function teamPhoto(club, key = '') {
  const c1 = /^#[0-9a-fA-F]{6}$/.test(club.color) ? club.color : '#1f6b45';
  const seed = [...(key + club.name)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const player = (x, base, s, i) => `<g transform="translate(${x} ${base}) scale(${s})">
    <rect x="-10" y="-28" width="8" height="28" rx="2" fill="${c1}"/><rect x="2" y="-28" width="8" height="28" rx="2" fill="${c1}"/>
    <rect x="-13" y="-46" width="26" height="20" rx="4" fill="#1b1b1b"/>
    <rect x="-23" y="-84" width="8" height="32" rx="4" fill="${c1}"/><rect x="15" y="-84" width="8" height="32" rx="4" fill="${c1}"/>
    <rect x="-17" y="-88" width="34" height="46" rx="10" fill="${c1}"/>
    <text x="0" y="-55" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="20" fill="#fff">${NUMS[(i + seed) % NUMS.length]}</text>
    <rect x="-5" y="-94" width="10" height="8" fill="#c99a78"/>
    <circle cx="0" cy="-102" r="12" fill="${HAIR[(i * 3 + seed) % HAIR.length]}"/></g>`;
  const back = 4, front = 5;
  const backRow = Array.from({ length: back }, (_, i) => player(400 * (i + 1) / (back + 1), 200, .86, i + 20)).join('');
  const frontRow = Array.from({ length: front }, (_, i) => player(400 * (i + .5) / front, 252, 1.05, i)).join('');
  const stripes = Array.from({ length: 6 }, (_, i) => `<rect x="0" y="${118 + i * 20}" width="400" height="20" fill="${i % 2 ? '#3a8546' : '#43924f'}"/>`).join('');
  return `<svg class="photo" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Lagbild, spelarna bakifrån">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb8d4"/><stop offset="1" stop-color="#f1dcae"/></linearGradient></defs>
    <rect width="400" height="130" fill="url(#sky)"/>
    <path d="M0 112 L18 92 L30 104 L46 84 L62 104 L80 90 L96 106 L120 88 L140 104 L160 86 L182 102 L204 90 L226 106 L250 84 L270 104 L292 92 L312 106 L334 88 L356 104 L378 90 L400 102 V122 H0Z" fill="#2c4a33"/>
    ${stripes}
    <path d="M0 150 H400" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
    <ellipse cx="200" cy="150" rx="70" ry="14" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>
    ${backRow}${frontRow}</svg>`;
}

// Avstånd i km mellan två punkter
export function distanceKm(a, b) {
  const rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// "Mina lag" sparas bara i den här webbläsaren
const SAVED_KEY = 'laglyftet:saved';
export function getSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) { return []; }
}
export function setSaved(list) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) { /* privat läge */ }
}
export function toggleSaved(slug) {
  const list = getSaved();
  const next = list.includes(slug) ? list.filter(s => s !== slug) : [slug, ...list];
  setSaved(next);
  return next.includes(slug);
}

export function toast(msg, link) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span>${link ? `<a href="${esc(link.href)}">${esc(link.label)}</a>` : ''}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// Tre steg för att starta en egen insamling. Visas på demolag och i reklamkortet.
export const START_STEPS = `<ol class="steps3">
  <li><b>Berätta om ert lag</b><span>Fyll i formuläret. Det tar en minut.</span></li>
  <li><b>Föreningen godkänner</b><span>Vi kontrollerar föreningen och kopplar föreningens eget Swish-nummer. Helt gratis.</span></li>
  <li><b>Dela länken</b><span>Föräldrar, släkt och grannar swishar sin del direkt till föreningen.</span></li>
</ol>`;
