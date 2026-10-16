# eddiebian.me

A personal website built as a small macOS desktop. Vanilla JavaScript and CSS; no build step.

## Run locally

```sh
cd /Users/eddieb/Coding_Projects/personalw-new
python3 -m http.server 4173
```

Open http://localhost:4173. On laptops and desktops the Three.js laptop scene is the entrance: the hero (name, role, **Enter the desktop**) shows immediately while the model streams in with a progress bar, then scroll opens the lid and carries you into the screen. Enter (the key) or **Skip to desktop** jumps straight in.

Phones, Save-Data connections, and visitors with reduced motion land directly on the desktop, which on phones is an iOS-style home screen (intro card, featured project, app grid, four-app Dock; apps open as full-screen sheets with a Home button, and browser Back/Forward restores app navigation). `?3d=1` forces the 3D entrance anywhere; `?desktop=1` skips it anywhere. The Apple menu and the phone's 3D Desk icon go to `?3d=1`.

## Explore

- Open apps from the Dock or with Spotlight (`⌘ K`, or `Ctrl K`).
- Desktop files and project cards open with a single click.
- Drag window title bars, resize any edge, double-click the title bar to zoom, and use the traffic lights to close, minimize, or zoom. `⌘ W` closes a window; `⌘ M` minimizes.
- Click empty wallpaper to reveal the desktop; click again to restore windows.
- The Dock is visible by default so first-time visitors can find the apps; turn on auto-hide in Appearance / Control Center. Minimized windows appear as separate Dock tiles.
- Projects shows scannable cards (preview, award, kind, one-line pitch) with icon/list views, categories, and search. Click a card for details with Visit/Source buttons up top.
- The Arc-inspired About Me window has sidebar tabs, working back/forward history, a collapsible sidebar, and a New Tab app search; Contacts links to the original public profiles and email.
- Notes and appearance preferences save only in local storage on the visitor’s device.
- Tiny Break is a 16-card memory game. Terminal supports `help`, `skills`, `whoami`, `experience`, `projects`, `contact`, `neofetch`, `ls`, `pwd`, `echo`, `snow`, and `clear`, with history and completion.
- A text-only portfolio and the résumé PDF remain available through the menus.

## Source map

- `js/desktop.js` — window manager, desktop interactions, and app behavior
- `js/content.js` — public biography, project data, and app markup
- `desktop.css` — desktop, native-style app surfaces, responsive layout, and accessibility preferences
- `refresh.css` — the redesign layer loaded last: entrance hero, type scale, project cards, phone home screen, motion preferences
- `styles.css` — text portfolio and 3D entrance styles
- `js/main.js`, `scene.js`, `laptop.js`, `animations.js`, `config.js` — original 3D scene
- `assets/icons/native/` — macOS icons converted from local system ICNS resources for this visual prototype; existing Arc and Terminal images are retained from the original repo

The visual reference pass used Finder, System Settings, and the owner’s normal Arc window on the owner’s Mac: neutral light/dark surfaces, blue selections, default icon styling, clear materials, auto-hidden Dock, separate minimized windows, title-bar double-click to zoom, and wallpaper-click desktop reveal. Arc’s sidebar address field, favorites, pinned tabs, bottom space controls, and inset page frame informed the browser layout. No personal documents or account photos from the computer were added to the website.

## 3D asset

`models/laptop-web.glb` is a 6.85 MB web copy of the original 65.18 MB model (it was 24.19 MB before the redesign). Steps with glTF Transform 4.x, starting from the earlier 24 MB copy: `resize --width 1024 --height 1024 --pattern "{TBL0003*,Notebook*}"` and `webp --quality 82` with the same pattern (desk and notebook textures only; the laptop's sticker and screen textures keep full size); then move the mesh of the `ScreenMesh` and `BaseMesh` nodes onto a child node so the hinge pivot survives quantization; then `meshopt --level medium`. `js/laptop.js` registers three.js's `MeshoptDecoder`. The original `models/laptop.glb` remains intact.

The default wallpaper is `assets/totoro.webp` (169 KB, was a 5.1 MB PNG), and the Swarm preview is WebP too.

## Selected work

Swarm / YiQun and Nudge are featured first, followed by Vertex, TangenAI, Pew Pew, and Goose Patrol. The new descriptions and images come from the public `B-Eddie/swarm-website` and `B-Eddie/nudge` repositories; Swarm’s Hack the North win is owner-provided. Finder and the text portfolio share the same project data.

## Validation

`node --test tests/window-geometry.test.mjs` checks repeated committed movement, viewport limits, minimum dimensions, and anchored corner resizing. Native browser interaction checks cover repeated Arc and Finder titlebar drags, edge resizing, minimize/restore, maximize/restore, Arc page history, project details/search, the default 3D entrance, and responsive layouts.


JavaScript syntax checks and local asset checks; browser checks for desktop/mobile layouts, project search/filter/detail states, icon/list views, single/double click, window controls, Spotlight and focus, saved notes and wallpapers, and memory-game restart. Reduced motion, reduced transparency, increased contrast, and system light/dark appearance have dedicated styles.

GitHub Pages hosting and the original `CNAME` are retained. The redesign is integrated on `main`. Mobile Home closes all app sheets; Back/Forward and reloading an app entry restore the correct app.

The ZIP integration review verified the smaller model and hinge animation, project cards, single-click details, mobile Back/Forward, restoring an app after reload, and Home closing all sheets. Window entrance animations use opacity so they do not change drag coordinates; delayed 3D setup checks whether the desktop is already open.
