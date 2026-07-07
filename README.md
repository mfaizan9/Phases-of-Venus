# Phases of Venus — HTML5

An accessible HTML5 rebuild of the Flash *Phases of Venus* demonstrator
(`venusPhases005.swf`), built on the shared KL-UNL foundation.

## It must be served over HTTP — double-clicking `index.html` will NOT work

The KL-UNL masthead loads its title / Help / About text with
`fetch('foundation/contents.json')`. Browsers **block `fetch()` over the
`file://` protocol** (same-origin security policy), so if you open
`index.html` directly from disk the masthead comes up empty and the page looks
broken. Serving the folder over HTTP makes the fetch succeed and everything
loads normally.

## Run it locally

Open a terminal **inside this `html5/` folder** and run any one of:

```bash
# Python 3
python3 -m http.server 8123
# then open http://localhost:8123/

# Node
npx serve
# (or) npx http-server
```

Or, in VS Code, use the **Live Server** extension.

Because you are serving *from inside* `html5/`, the simulation is at the server
root — open **`http://localhost:8123/`**, not `.../html5/index.html`.

## Production

When deployed to the cloud host (served over HTTP/HTTPS) it just works. The
`file://` limitation only affects local double-clicking.

## Layout

```
html5/
  index.html            KL-UNL shell: .app-shell + <kl-unl-masthead> + panels
  foundation/           copied UNCHANGED from the linked foundation/ …
    kl-unl-masthead.js  … (code untouched)
    kl-unl.css
    kl-unl.js
    contents.json       … except: made strict-valid JSON (see CONVERSION_NOTES)
    mathjax/            MathJax 3.2.2 (tex-chtml), vendored locally — no CDN
  styles/styles.css     sim-specific styles only
  simulation.js         all sim logic (faithful port of the AS1 source)
  assets/               exported vector shapes reused as-is (orbits, sun,
                        planets, hover ring, scale bar)
  README.md
  CONVERSION_NOTES.md
  ACCESSIBILITY.md
```

No build step, no bundler, no framework, no CDN, no analytics. Everything is
local; the only runtime fetches are `foundation/contents.json` and MathJax's own
local font files.
