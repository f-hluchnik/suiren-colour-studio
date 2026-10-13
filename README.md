# Suiren colour studio

An unofficial 3D colour configurator for the Hario V60 Dripper Suiren. You paint each of the 12 resin ribs, pick a black or white ring, then save an image or share a link. A list shows which six-rib sets you would need to buy.

Not affiliated with, endorsed by or sponsored by Hario Co., Ltd. On-screen colours are approximations.

## How it was made

This app was vibe-coded. All of the code, the 3D model and this README were written by Claude (Anthropic's AI model) in one long chat. The project owner never wrote code. They supplied product photos and judged the results, and each round of feedback became the next version:

1. A React/three.js prototype with rough, invented petal shapes.
2. A realistic resin look and a 12-rib model based on Hario's specs (each rib 24 × 18 × 115 mm).
3. A redesigned UI, and a switch from React to plain HTML + ES modules, since nothing here needs a build step.
4. Colours tuned against Hario's Rainbow, Black and Tricolor photos. The ring and holder were rebuilt from Hario's parts drawing.
5. The rib outline traced from a product photo of a single rib. The curl was matched to a top-down shot.
6. The code split into modules, plus SEO and this README.
7. The rib angle set to 30° (the 60° cone the V60 is named after), a smaller starting view, and a title link that returns to the start.

Claude's sandbox had no network and couldn't render WebGL. So Claude checked the geometry with offline previews in Python and the UI in a headless browser with three.js stubbed out. The owner checked the real 3D rendering in their own browser. The model is only as accurate as those photos.

## Running it

ES modules don't load from `file://`, so serve the folder over HTTP:

```sh
python3 -m http.server 8000      # or: npx serve -l 8000
```

Then open http://localhost:8000. three.js and the fonts load from CDNs, so you need to be online.

**GitHub Pages:**

1. Push the folder to a repository.
2. Go to Settings → Pages → Deploy from branch, and choose `main` and `/ (root)`.
3. The site URL, https://f-hluchnik.github.io/suiren-configurator/, is set in `index.html`, `robots.txt` and `sitemap.xml`. If the repository is renamed, update it in all three.
4. Optionally, submit the sitemap in Google Search Console.

## Files

```
index.html            markup, SEO meta tags, import map for three.js
css/styles.css        all styling (colour tokens are at the top, in :root)
js/main.js            entry point: wires the panel UI to the state and the 3D view
js/state.js           app state, and syncing it to the URL hash for share links
js/data.js            rib colours, ring finishes, preset colourways
js/viewer.js          renderer, camera, lights, picking, render loop
js/rib-geometry.js    the rib mesh, built from a traced outline (no three.js)
js/resin-material.js  the two shaders that make the ribs look like coloured resin
js/base.js            ring and holder meshes
js/dial.js            the top-down SVG dial and the preset thumbnails
favicon.svg, og-image.png, robots.txt, sitemap.xml
```

There's no build step and no dependencies apart from three.js 0.160 from jsDelivr. The version is pinned in the import map in `index.html`.

## How it works

**State.** `state.js` holds the colour of each rib, the selected brush colour, the ring colour and the design's name. Every change goes through `setRibs` or `setRing` in `main.js`. These re-render the panel, tell the viewer to update and write the state into the URL hash. Opening a link restores the design.

**Rib geometry.** `PROFILE` in `rib-geometry.js` is the rib's outline in millimetres: one row per height on the rib, with the inner-edge and outer-edge positions. The rib is built as a grid of points over that outline, with the fork slot cut out. Each point is then placed in 3D:
- the straight inner edge leans out at `LEAN` degrees (30°, half of the V60's 60° cone), along the ring's cone;
- beyond radius `BEND_R0` the rib bends around a vertical axis by `BEND_K × distance²`, which makes the spiral you see from above;
- the faces are offset by half the thickness each way, and side walls close the edges.

The 3D view uses one shared mesh, rotated 12 times.

**Resin look.** Each rib is drawn twice with the same geometry:
- **Filter pass:** multiplies whatever is behind the rib by its tint. Multiplying gives the same result in any order, so overlapping ribs mix correctly without sorting. The light path gets longer at glancing angles and through the moulded edges, which darkens them like real resin.
- **Gloss pass:** adds Fresnel reflections of a few procedural softboxes, plus a little milky glow.

Because of the multiply pass, the canvas must be opaque. Its background is the page colour `--mist`.

**Ring and holder.** These are lathe and extrude shapes in `base.js`, using dimensions taken from Hario's photos. The slots and holder gaps line up with the ribs.

## Tweaking

- **Change a colour:** edit its entry in `COLORS` in `data.js`.
  - `tint` is how much light one layer lets through, per channel from 0 to 1. Lower values give a darker, more saturated rib.
  - `scatter` is the milky glow.
  - `edge` sets how dark the edges look.
  - `hex` is used only by the UI.
- **Add a colour:** add an entry to `COLORS` with a new `id`. Ids appear in share links, so don't rename existing ones.
- **Add or change a preset:** edit `WAYS`. `ribs` lists 12 colour ids, starting with rib 1 at the front and going right. `ring` is optional.
- **Rib shape:** edit `RIB` and `PROFILE` in `rib-geometry.js`. A bigger `LEAN` gives a wider flower, and a bigger `BEND_K` gives a stronger curl.
  - If you change `LEAN` or `BASE_R`, also update the ring cone in `base.js` (`RING_LOWER`, `CROWN`, using the wall centre line in the comment there) and the holder's `rIn`/`rOut`, so the parts still fit together. `BEND_K` also needs retuning, because a wider lean takes the ribs further out, where the bend grows quickly.
- **Initial size of the model on screen:** change `VIEW.distance` and `VIEW.target` in `viewer.js`.
- **Look of the page:** change the CSS custom properties at the top of `styles.css`. If you change `--mist`, the 3D background follows automatically.

## Maintenance notes

- **Upgrading three.js:** bump both URLs in the import map. The shaders use `gl_FragColor` and the built-in `cameraPosition` uniform, so check that they still compile.
- **Colour management:** the rib shaders write raw values with no tone mapping, so `tint` values are effectively sRGB. Only the ring, holder and shadow go through ACES tone mapping.
- **Browser support:** the editable name uses `contenteditable`. Pasting goes through `document.execCommand('insertText')`, which is deprecated but still works in all major browsers.
