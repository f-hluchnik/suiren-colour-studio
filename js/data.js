// Product data: rib colours, ring finishes and preset colourways.

export const N = 12; // ribs per dripper

// tint    = light one 2 mm layer of resin lets through (sRGB, 0–1)
// scatter = milky internal glow added on top
// edge    = how much darker the moulded edges read (light travels the rib's width there)
// code    = Hario's 6-rib set number, where known
// Tuned against Hario's Rainbow, Black and Tricolor photos.
export const COLORS = [
  { id: 'TR',  name: 'Red',    hex: '#E5401E', tint: [0.97, 0.20, 0.05], scatter: 0.04, edge: 3.0, code: 'RIB-6-TR' },
  { id: 'TPR', name: 'Pink',   hex: '#F07AAE', tint: [0.98, 0.48, 0.68], scatter: 0.04, edge: 3.0, code: 'RIB-6-TPR' },
  { id: 'TY',  name: 'Yellow', hex: '#F4C61C', tint: [0.99, 0.84, 0.14], scatter: 0.05, edge: 3.0, code: 'RIB-6-TY' },
  { id: 'TG',  name: 'Green',  hex: '#1DAA4E', tint: [0.12, 0.72, 0.30], scatter: 0.04, edge: 3.0, code: 'RIB-6-TG' },
  { id: 'TBU', name: 'Blue',   hex: '#1F78E8', tint: [0.08, 0.52, 0.98], scatter: 0.04, edge: 3.2, code: 'RIB-6-TBU' },
  { id: 'TPU', name: 'Purple', hex: '#9A3FE0', tint: [0.64, 0.24, 0.94], scatter: 0.04, edge: 3.0, code: 'RIB-6-TPU' },
  { id: 'TW',  name: 'White',  hex: '#E9EAEC', tint: [0.80, 0.81, 0.83], scatter: 0.30, edge: 1.4, code: 'RIB-6-TW' },
  { id: 'TBK', name: 'Black',  hex: '#55585C', tint: [0.40, 0.41, 0.43], scatter: 0.02, edge: 3.4, code: '' },
];
export const BY_ID = Object.fromEntries(COLORS.map(c => [c.id, c]));

// Ring + holder (polypropylene). ring/holder are three.js colours, swatch is for the UI.
export const RINGS = {
  black: { label: 'Black', ring: 0x1b1b1d, holder: 0x222225, swatch: '#2a2a2d' },
  white: { label: 'White', ring: 0xf2f2f0, holder: 0xf4f4f2, swatch: '#f0f0ee' },
};

export const pattern = (ids) => Array.from({ length: N }, (_, i) => ids[i % ids.length]);

// Rib 1 faces the front; numbers run to the right. `ring` is optional: presets
// without one keep whatever ring is selected.
export const WAYS = [
  { name: 'Rainbow',       ring: 'white', ribs: ['TR','TW','TW','TY','TY','TG','TG','TBU','TBU','TPU','TPU','TR'] },
  { name: 'Tricolor',      ring: 'black', ribs: ['TBU','TBU','TR','TR','TR','TR','TW','TW','TW','TW','TBU','TBU'] },
  { name: 'Black',         ring: 'black', ribs: pattern(['TBK']) },
  { name: 'Yellow',        ribs: pattern(['TY']) },
  { name: 'Lagoon',        ribs: pattern(['TG', 'TBU']) },
  { name: 'Peony',         ribs: pattern(['TPR', 'TPU']) },
  { name: 'Sunset',        ribs: ['TY','TY','TY','TPR','TPR','TPR','TR','TR','TR','TPU','TPU','TPU'] },
  { name: 'Red & Blue',    ribs: pattern(['TR', 'TBU']) },
  { name: 'Black & White', ribs: pattern(['TBK', 'TW']) },
];
