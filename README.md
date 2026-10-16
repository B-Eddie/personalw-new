# eddiebian.me

A personal website built as a small macOS desktop. Vanilla JavaScript and CSS; no build step.

## Run locally

```sh
cd /Users/eddieb/Coding_Projects/personalw-new
python3 -m http.server 4173
```

Open http://localhost:4173. The original Three.js laptop scene is the default entrance: scroll to open the lid and approach the screen, or choose Enter desktop. `?desktop=1` goes straight to the desktop without downloading Three.js, GSAP, or the 24 MB web model. The Apple menu returns to the 3D desk.

## Explore

- Open apps from the Dock or with Spotlight (`⌘ K`, or `Ctrl K`).
- Desktop files select on click and open on double-click; Enter also opens them.
- Drag window title bars, resize any edge, double-click the title bar to zoom, and use the traffic lights to close, minimize, or zoom. `⌘ W` closes a window; `⌘ M` minimizes.
- Click empty wallpaper to reveal the desktop; click again to restore windows.
- The Dock auto-hides by default, matching the Mac used as a reference. Move the pointer to the bottom edge to reveal it, or change this in Appearance / Control Center. Minimized windows appear as separate Dock tiles.
- Projects supports icon/list views, categories, and search. Select a project and press Space or double-click to inspect it. Mobile uses single taps.
- The Arc-inspired About Me window has sidebar tabs, working back/forward history, a collapsible sidebar, and a New Tab app search; Contacts links to the original public profiles and email.
- Notes and appearance preferences save only in local storage on the visitor’s device.
- Tiny Break is a 16-card memory game. Terminal supports `help`, `skills`, `whoami`, `experience`, `projects`, `contact`, `neofetch`, `ls`, `pwd`, `echo`, `snow`, and `clear`, with history and completion.
- A text-only portfolio and the résumé PDF remain available through the menus.

## Source map

- `js/desktop.js` — window manager, desktop interactions, and app behavior
- `js/content.js` — public biography, project data, and app markup
- `desktop.css` — desktop, native-style app surfaces, responsive layout, and accessibility preferences
- `styles.css` — text portfolio and 3D entrance styles
- `js/main.js`, `scene.js`, `laptop.js`, `animations.js`, `config.js` — original 3D scene
- `assets/icons/native/` — macOS icons converted from local system ICNS resources for this visual prototype; existing Arc and Terminal images are retained from the original repo

The visual reference pass used Finder, System Settings, and the owner’s normal Arc window on the owner’s Mac: neutral light/dark surfaces, blue selections, default icon styling, clear materials, auto-hidden Dock, separate minimized windows, title-bar double-click to zoom, and wallpaper-click desktop reveal. Arc’s sidebar address field, favorites, pinned tabs, bottom space controls, and inset page frame informed the browser layout. No personal documents or account photos from the computer were added to the website.

## 3D asset

`models/laptop-web.glb` is a 24.19 MB web copy of the original 65.18 MB model, about 63% smaller. Geometry and named parts are retained; textures are limited to 2048 px, encoded as WebP at quality 95, and duplicate data is removed. The original `models/laptop.glb` remains intact. Reproduce with glTF Transform CLI 4.5.1: `resize --width 2048 --height 2048`, `webp --quality 95`, then `dedup`.

## Selected work

Swarm / YiQun and Nudge are featured first, followed by Vertex, TangenAI, Pew Pew, and Goose Patrol. The new descriptions and images come from the public `B-Eddie/swarm-website` and `B-Eddie/nudge` repositories; Swarm’s Hack the North win is owner-provided. Finder and the text portfolio share the same project data.

## Validation

`node --test tests/window-geometry.test.mjs` checks repeated committed movement, viewport limits, minimum dimensions, and anchored corner resizing. Native browser interaction checks cover repeated Arc and Finder titlebar drags, edge resizing, minimize/restore, maximize/restore, Arc page history, project details/search, the default 3D entrance, and responsive layouts.


JavaScript syntax checks and local asset checks; browser checks for desktop/mobile layouts, project search/filter/detail states, icon/list views, single/double click, window controls, Spotlight and focus, saved notes and wallpapers, and memory-game restart. Reduced motion, reduced transparency, increased contrast, and system light/dark appearance have dedicated styles.

GitHub Pages hosting and the original `CNAME` are retained. Changes are local until committed and pushed.
