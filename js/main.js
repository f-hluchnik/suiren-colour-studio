// Entry point: wires the panel UI, the dial and the 3D viewer to the shared state.
import { N, COLORS, BY_ID, RINGS, WAYS, pattern } from './data.js';
import { state, wayMatches, readHash, writeHash, DEFAULT_NAME, MAX_NAME } from './state.js';
import { createDial, miniDial } from './dial.js';
import { createViewer } from './viewer.js';

const $ = id => document.getElementById(id);

readHash();

const dial = createDial($('dial'), { paint, hover: setHover });
const viewer = createViewer($('stage'), state, { tap: paint, hover: setHover, turn: az => dial.rotate(az) });

/* ---------- state changes ---------- */

function setHover(i) {
  if (state.hover === i) return;
  state.hover = i;
  dial.render(state); renderStatus();
}

function setRibs(next, name) {
  state.ribs = next;
  if (name) { state.name = name; state.customName = false; }
  else if (!state.customName) { const m = WAYS.find(wayMatches); state.name = m ? m.name : 'Your colourway'; }
  viewer.applyRibs(); renderAll(); writeHash();
}

function setRing(id) {
  state.ring = id;
  viewer.applyRing(); renderAll(); writeHash();
}

function paint(i) {
  if (state.ribs[i] === state.brush) return;
  const next = state.ribs.slice(); next[i] = state.brush;
  setRibs(next);
}

/* ---------- rendering the panel ---------- */

function renderSwatches() {
  const box = $('swatches'); box.innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.style.setProperty('--c', c.hex);
    b.setAttribute('aria-pressed', String(state.brush === c.id));
    b.setAttribute('aria-label', c.name); b.title = c.name;
    b.addEventListener('click', () => { state.brush = c.id; renderSwatches(); renderStatus(); dial.render(state); });
    box.appendChild(b);
  });
  $('alternate').textContent = 'Alternate with ' + BY_ID[state.brush].name.toLowerCase();
}

function renderWays() {
  const box = $('ways'); box.innerHTML = '';
  WAYS.forEach(w => {
    const b = document.createElement('button'); b.className = 'way';
    b.setAttribute('aria-pressed', String(wayMatches(w)));
    b.appendChild(miniDial(w.ribs, w.ring || state.ring));
    const s = document.createElement('span'); s.textContent = w.name; b.appendChild(s);
    b.addEventListener('click', () => {
      if (w.ring) { state.ring = w.ring; viewer.applyRing(); }
      setRibs(w.ribs.slice(), w.name);
    });
    box.appendChild(b);
  });
}

function renderRing() {
  const box = $('ringSeg'); box.innerHTML = '';
  Object.entries(RINGS).forEach(([id, r]) => {
    const b = document.createElement('button');
    b.setAttribute('aria-pressed', String(state.ring === id));
    b.innerHTML = `<i style="background:${r.swatch}"></i>${r.label}`;
    b.addEventListener('click', () => setRing(id));
    box.appendChild(b);
  });
}

function renderStatus() {
  const s = $('status');
  s.innerHTML = state.hover >= 0
    ? `<b>Rib ${state.hover + 1}</b> is ${BY_ID[state.ribs[state.hover]].name}`
    : `Painting with <b>${BY_ID[state.brush].name}</b>`;
}

// What to order: ribs come in sets of six.
function renderOrder() {
  const rows = COLORS.map(c => ({ c, n: state.ribs.filter(id => id === c.id).length })).filter(r => r.n > 0);
  let sets = 0;
  $('order').innerHTML = rows.map(({ c, n }) => {
    const packs = Math.ceil(n / 6), spare = packs * 6 - n; sets += packs;
    return `<tr><td class="dot"><i style="background:${c.hex}"></i></td>
      <td>${c.name}${c.code ? `<small>${c.code}</small>` : ''}</td>
      <td class="num">${packs} ${packs === 1 ? 'set' : 'sets'}<small>${n} used${spare ? `, ${spare} spare` : ''}</small></td></tr>`;
  }).join('') + `<tr><td class="dot"><i style="background:${RINGS[state.ring].swatch}"></i></td>
      <td>Ring and holder<small>${RINGS[state.ring].label}</small></td><td class="num">1</td></tr>`;
  $('total').textContent = `${sets} rib ${sets === 1 ? 'set' : 'sets'} in total. Codes are Hario's rib set numbers.`;
}

function renderTitle() {
  const h = $('wayName');
  if (document.activeElement !== h && h.textContent !== state.name) h.textContent = state.name;
  document.title = `${state.name} | Suiren colour studio`;
}

function renderAll() {
  renderSwatches(); renderWays(); renderRing(); dial.render(state); renderStatus(); renderOrder(); renderTitle();
}

/* ---------- editable colourway name ---------- */
{
  const h = $('wayName');
  const selectAll = () => { const r = document.createRange(); r.selectNodeContents(h); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  const caretToEnd = () => { const r = document.createRange(); r.selectNodeContents(h); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); h.blur(); } });
  h.addEventListener('paste', e => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text').replace(/\s+/g, ' '));
  });
  h.addEventListener('input', () => {
    let t = h.textContent.replace(/\s+/g, ' ');
    if (t.length > MAX_NAME) { t = t.slice(0, MAX_NAME); h.textContent = t; caretToEnd(); }
    state.name = t.trim() || DEFAULT_NAME; state.customName = true;
    document.title = `${state.name} | Suiren colour studio`;
  });
  h.addEventListener('focus', selectAll);
  h.addEventListener('blur', () => { h.textContent = state.name; writeHash(); renderWays(); });
}

/* ---------- tools and actions ---------- */

$('fillAll').addEventListener('click', () => setRibs(pattern([state.brush])));
$('alternate').addEventListener('click', () => {
  const other = state.ribs.find(id => id !== state.brush) || 'TW';
  setRibs(Array.from({ length: N }, (_, i) => (i % 2 ? other : state.brush)));
});
$('shuffle').addEventListener('click', () => {
  const used = [...new Set(state.ribs)];
  const pool = used.length > 1 ? used : COLORS.map(c => c.id);
  setRibs(Array.from({ length: N }, () => pool[Math.floor(Math.random() * pool.length)]));
});
$('resetView').addEventListener('click', () => viewer.resetView());

// Title link: back to the start (first preset, default brush, default camera, clean URL).
$('homeLink').addEventListener('click', e => {
  e.preventDefault();
  const home = WAYS[0];
  state.brush = 'TR';
  state.ring = home.ring;
  viewer.applyRing();
  setRibs(home.ribs.slice(), home.name);
  viewer.resetView();
  try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { /* ignore */ }
});

const toastEl = $('toast'); let toastTimer;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// Save image: the 3D view with the colourway name written in the corner.
$('saveImg').addEventListener('click', async () => {
  const src = viewer.snapshot();
  const out = document.createElement('canvas'); out.width = src.width; out.height = src.height;
  const g = out.getContext('2d');
  g.drawImage(src, 0, 0);
  try { await document.fonts.ready; } catch (e) { /* draw with fallback fonts */ }
  const cs = getComputedStyle(document.documentElement);
  const pad = Math.round(out.height * 0.05);
  let size = Math.round(out.height * 0.075);
  g.fillStyle = cs.getPropertyValue('--ink').trim() || '#1D2420';
  do { g.font = `600 ${size}px 'Bricolage Grotesque', sans-serif`; size -= 2; }
  while (g.measureText(state.name).width > out.width - pad * 2 && size > 12);
  g.fillText(state.name, pad, out.height - pad - Math.round(out.height * 0.035));
  g.fillStyle = cs.getPropertyValue('--reed').trim() || '#5C6660';
  g.font = `500 ${Math.round(out.height * 0.022)}px 'Zen Kaku Gothic New', sans-serif`;
  g.fillText('Suiren colour studio, an unofficial fan project', pad, out.height - pad);
  out.toBlob(blob => {
    if (!blob) { toast('Could not save the image'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `suiren-${state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Image saved');
  });
});

$('copyLink').addEventListener('click', async () => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
  catch (e) { toast('Copy the address bar to share this colourway'); }
});

renderAll();
writeHash();
