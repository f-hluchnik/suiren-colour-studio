// App state, plus reading/writing it to the URL hash so colourways can be shared.
import { N, BY_ID, RINGS, WAYS } from './data.js';

export const DEFAULT_NAME = 'Untitled colourway';
export const MAX_NAME = 48;

export const state = {
  ribs: WAYS[0].ribs.slice(), // colour id per rib
  brush: 'TR',                // colour used when painting
  ring: WAYS[0].ring,         // 'black' | 'white'
  name: WAYS[0].name,
  customName: false,          // true once the user renames the design
  hover: -1,                  // rib under the pointer, or -1
};

export const wayMatches = w =>
  w.ribs.join() === state.ribs.join() && (!w.ring || w.ring === state.ring);

export function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const r = (p.get('ribs') || '').split('.');
  if (r.length === N && r.every(id => BY_ID[id])) state.ribs = r;
  if (RINGS[p.get('ring')]) state.ring = p.get('ring');
  const name = (p.get('name') || '').trim().slice(0, MAX_NAME);
  if (name) {
    state.name = name;
    state.customName = !WAYS.some(w => w.name === name);
  } else if (p.get('ribs')) {
    const m = WAYS.find(wayMatches);
    state.name = m ? m.name : 'Your colourway';
  }
}

export function writeHash() {
  const q = new URLSearchParams({ ribs: state.ribs.join('.'), ring: state.ring, name: state.name });
  try { history.replaceState(null, '', '#' + q.toString()); } catch (e) { /* file:// etc. */ }
}
