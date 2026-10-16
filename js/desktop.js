import { moveWindow, resizeWindow } from "./window-geometry.mjs";
import {
  apps,
  projects,
  symbol,
  appIcon,
  welcomeContent,
  projectsContent,
  contactContent,
} from "./content.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const storage = {
  get(key, fallback = "") {
    try {
      return localStorage.getItem(`eddie-os:${key}`) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`eddie-os:${key}`, value);
      return true;
    } catch {
      return false;
    }
  },
};
const intro = !new URLSearchParams(location.search).has("desktop");

class EddieDesktop {
  constructor() {
    this.windows = new Map();
    this.z = 10;
    this.active = null;
    this.wallpaper = storage.get("wallpaper", "forest");
    if (!["alpine", "forest", "dusk"].includes(this.wallpaper))
      this.wallpaper = "forest";
    this.widgets = storage.get("widgets", "on") === "on";
    this.history = [];
    this.autoHideDock = storage.get("autohide", "on") === "on";
    if (storage.get("native-revision") !== "1") {
      this.wallpaper = "forest";
      storage.set("wallpaper", "forest");
      storage.set("native-revision", "1");
    }
    this.mount();
    this.bind();
    this.tick();
    this.applyAppearance();
    if (!intro) {
      this.show();
      this.open("about", { initial: true });
    }
  }

  mount() {
    const root = document.createElement("div");
    root.id = "eddie-os";
    root.setAttribute("aria-label", "Eddie’s personal desktop");
    root.innerHTML = `
      <div class="desktop-wallpaper" aria-hidden="true"></div>
      <header class="os-menubar"><nav class="menu-left" aria-label="Desktop menu">
        <button class="os-mark" data-menu="home" aria-label="Apple menu"></button>
        <button class="active-app" data-menu="home">Finder</button>
        <button class="desktop-menu-item" data-menu="file">File</button>
        <button class="desktop-menu-item" data-menu="edit">Edit</button><button class="desktop-menu-item" data-menu="view">View</button><button class="desktop-menu-item" data-menu="go">Go</button>
        <button class="desktop-menu-item" data-menu="window">Window</button>
        <button class="desktop-menu-item" data-menu="help">Help</button>
      </nav><div class="menu-right"><svg class="status-battery" viewBox="0 0 28 13" aria-label="Battery full"><rect x="1" y="2" width="22" height="9" rx="2" fill="none" stroke="white" stroke-width="1.2"/><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M25 4v5" stroke="white" stroke-width="2"/></svg><svg class="status-wifi" viewBox="0 0 20 16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 4q8-7 16 0M5 8q5-4 10 0m-7 4q2-2 4 0"/><circle cx="10" cy="15" r="1" fill="white" stroke="none"/></svg><button data-command="spotlight" aria-label="Search apps">${symbol("search")}</button><button data-command="controls" aria-label="Control Center">${symbol("sliders")}</button><time class="menu-clock"></time></div></header>
      <main id="desktop-windows" tabindex="-1">
        <aside class="desktop-widgets" aria-label="Desktop widgets">
          <div class="time-widget"><div class="analog-clock" aria-hidden="true"><i class="clock-hour"></i><i class="clock-minute"></i><b></b><span class="clock-12">12</span><span class="clock-3">3</span><span class="clock-6">6</span><span class="clock-9">9</span></div><div class="widget-date"><span class="widget-weekday"></span><strong class="widget-day"></strong><small class="widget-month"></small></div><div class="widget-city">Toronto, Canada <span>Local time</span></div></div>
          <button class="desktop-note" data-open="notes"><span class="note-pin"></span><span class="note-kicker">a note to self</span><strong>Stay curious.<br>Build useful things.<br>Have a little fun.</strong><span class="note-signature">— Eddie</span><span class="note-corner">↗</span></button>

        </aside>
        <nav class="desktop-files" aria-label="Desktop files">
          <button data-open="projects" class="desktop-file"><img src="assets/icons/native/folder.png" alt="" draggable="false"/><span>Projects</span><small>${projects.length} items</small></button>
          <button data-open="resume" class="desktop-file"><img src="assets/icons/native/document.png" alt="" draggable="false"/><span>Résumé.pdf</span></button>
          <button data-open="terminal" class="desktop-file">${appIcon("terminal")}<span>hello_world.sh</span></button>
          <button data-command="trash" class="desktop-file trash-file">${symbol("trash")}<span>Trash</span></button>
        </nav>

      </main>
      <div class="dock-reveal-zone" aria-hidden="true"></div>
      <nav class="os-dock" aria-label="App dock">${apps.map((app, i) => `<button class="dock-app ${i === 7 ? "dock-separated" : ""}" data-open="${app.id}" aria-label="${app.name}" title="${app.name}">${appIcon(app.icon)}<span class="dock-tooltip">${app.name}</span><i class="dock-dot"></i></button>`).join("")}<div class="dock-minimized"></div><button class="dock-app dock-trash dock-separated" data-command="trash" aria-label="Trash"><img class="app-art" src="assets/icons/native/empty-trash.png" alt=""/><span class="dock-tooltip">Trash</span></button></nav>
      <div class="os-popover" hidden></div>
      <div class="spotlight-backdrop" hidden><section class="spotlight" role="dialog" aria-modal="true" aria-label="Search apps"><div class="spotlight-input">${symbol("search")}<input type="search" placeholder="Spotlight Search" aria-label="Search apps and projects" autocomplete="off"/><button data-command="dismiss" aria-label="Close search">esc</button></div><div class="spotlight-results"></div><footer><span>↑ ↓ to navigate</span><span>↵ to open</span></footer></section></div>
      <div class="os-toast" role="status" aria-live="polite"></div>`;
    document.body.append(root);
    this.root = root;
    this.area = $("#desktop-windows");
  }

  bind() {
    $(".skip-link").addEventListener("click", (e) => {
      e.preventDefault();
      this.show();
      this.area.focus();
    });
    window.addEventListener("blur", () => this.endGesture());
    this.root.addEventListener("pointerdown", () => { this.suppressClickUntil = 0; }, true);
    this.root.addEventListener("click", (e) => {
      if (e.detail > 0 && performance.now() < (this.suppressClickUntil || 0)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    this.root.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open]");
      const cmd = e.target.closest("[data-command]");
      const menu = e.target.closest("[data-menu]");
      if (opener) {
        if (
          opener.classList.contains("desktop-file") &&
          (innerWidth > 760 || matchMedia("(pointer: fine)").matches) &&
          e.detail === 1
        ) {
          $$(".desktop-file").forEach((el) =>
            el.classList.toggle("selected", el === opener),
          );
          return;
        }
        if (this.desktopRevealed) this.toggleDesktop();
        this.dismiss();
        this.open(opener.dataset.open);
        if (opener.dataset.projectOpen) this.projectDetail(this.windows.get("projects").el, opener.dataset.projectOpen);
      } else if (cmd) this.command(cmd.dataset.command);
      else if (menu) this.menu(menu.dataset.menu, menu);
      else if (!e.target.closest(".os-popover")) {
        this.closePopover();
        if (
          e.target === this.area ||
          e.target.classList.contains("desktop-wallpaper")
        ) {
          $$(".desktop-file").forEach((el) => el.classList.remove("selected"));
          this.toggleDesktop();
        }
      }
    });
    this.revealDock(5500);
    $(".dock-reveal-zone").addEventListener("pointerenter", () =>
      this.revealDock(),
    );
    $(".os-dock").addEventListener("pointerenter", () => this.revealDock());
    $(".os-dock").addEventListener("pointerleave", () => this.revealDock(650));
    this.root.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".os-window, input, textarea, a")) return;
      e.preventDefault();
      this.menu("view", null, { x: e.clientX, y: e.clientY });
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.spotlight();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "m" &&
        this.active
      ) {
        e.preventDefault();
        this.minimize(this.active);
      }
      if (e.key === "Escape") {
        this.dismiss();
        this.closePopover();
      }
      if (e.key === "Tab" && !$(".spotlight-backdrop").hidden) {
        const controls = $$("input, button", $(".spotlight")).filter(
          (el) => !el.hidden,
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "w" &&
        this.active
      ) {
        e.preventDefault();
        this.close(this.active);
      }
    });
    $(".spotlight-backdrop").addEventListener("click", (e) => {
      if (e.target.classList.contains("spotlight-backdrop")) this.dismiss();
    });
    $(".spotlight input").addEventListener("input", (e) =>
      this.search(e.target.value),
    );
    $(".spotlight input").addEventListener("keydown", (e) => {
      const rows = $$(".spotlight-result");
      let index = rows.findIndex((row) =>
        row.classList.contains("highlighted"),
      );
      if (["ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        index =
          (index + (e.key === "ArrowDown" ? 1 : -1) + rows.length) %
          rows.length;
        rows.forEach((row, i) =>
          row.classList.toggle("highlighted", i === index),
        );
        rows[index]?.scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        (rows[index] || rows[0])?.click();
      }
    });
    window.addEventListener("resize", () => {
      this.endGesture();
      this.constrainWindows();
      this.updateDock();
    });
    $("#fast-mode-btn").addEventListener("click", () => this.textVersion());
    $("#exit-fast-mode").addEventListener("click", () =>
      this.closeTextVersion(),
    );
    $("#fast-mode-back-to-3d").addEventListener("click", () =>
      this.closeTextVersion(),
    );
    window.addEventListener(
      "scroll",
      () => {
        if (
          intro &&
          !this.visible &&
          window.scrollY >=
            document.documentElement.scrollHeight - innerHeight - 40
        )
          this.show();
      },
      { passive: true },
    );
    if (intro) {
      const jump = document.createElement("button");
      jump.className = "skip-intro";
      jump.textContent = "Enter desktop ↗";
      jump.addEventListener("click", () => this.show());
      document.body.append(jump);
    }
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    window.app?.animationManager?.destroy();
    window.app?.pause();
    window.scrollTo(0, 0);
    document.body.classList.add("desktop-ready");
    document.body.classList.remove("is-loading");
    this.root.classList.add("visible");
    this.root.inert = false;
    this.closeTextVersion();
    this.revealDock(5500);
    if (intro && !this.windows.size) this.open("about", { initial: true });
  }

  open(id, options = {}) {
    if (!apps.some((app) => app.id === id)) return;
    const existing = this.windows.get(id);
    if (existing) {
      existing.minimizeAnimation?.cancel();
      existing.minimizing = false;
      existing.el.hidden = false;
      existing.minimized = false;
      existing.revealHidden = false;
      this.focus(id);
      return;
    }
    const meta = apps.find((app) => app.id === id);
    const win = document.createElement("section");
    win.className = `os-window window-${id}`;
    win.dataset.app = id;
    win.setAttribute("role", "region");
    win.setAttribute("aria-label", `${meta.name} window`);
    win.tabIndex = -1;
    win.innerHTML = `<header class="window-titlebar"><div class="window-controls"><button class="traffic close" aria-label="Close ${meta.name}">×</button><button class="traffic minimize" aria-label="Minimize ${meta.name}">−</button><button class="traffic maximize" aria-label="Maximize ${meta.name}">⤢</button></div><div class="window-title">${id === "about" ? "Eddie Bian — Arc" : `${symbol(id === "projects" ? "folder" : id === "terminal" ? "code" : "grid")} ${meta.name}`}</div><span class="window-title-extra">${id === "about" ? "⌁" : ""}</span></header><div class="window-body">${this.content(id)}</div><button class="window-resize" tabindex="-1" aria-label="Resize window"></button>`;
    if (id === "about") {
      $(".window-title", win).remove();
      $(".window-title-extra", win).remove();
      $(".window-titlebar", win).insertAdjacentHTML("beforeend", `<div class="arc-toolbar"><button data-arc="sidebar" aria-label="Hide sidebar">◧</button><button data-arc="back" aria-label="Back" disabled>‹</button><button data-arc="forward" aria-label="Forward" disabled>›</button><button data-arc="reload" aria-label="Reload page">↻</button></div>`);
    }
    this.area.append(win);
    const compact = innerWidth <= 760;
    const width = Math.min(
      id === "projects"
        ? 900
        : id === "about"
          ? 900
          : id === "contact"
            ? 720
            : id === "game"
              ? 480
              : 650,
      innerWidth - 48,
    );
    const height = Math.min(
      id === "about"
        ? 660
        : id === "projects"
          ? 610
          : id === "contact"
            ? 560
            : id === "game"
              ? 610
              : 530,
      innerHeight - (this.autoHideDock ? 100 : 160),
    );
    const offset = options.initial ? 0 : (this.windows.size % 4) * 22;
    const x =
      options.initial && innerWidth > 1100
        ? Math.min(326, innerWidth - width - 155)
        : (innerWidth - width) / 2 + offset;
    const y = Math.min(
      options.initial
        ? Math.max(30, (innerHeight - height - 80) / 2)
        : Math.max(32, (innerHeight - height - 100) / 2) + offset,
      Math.max(12, innerHeight - height - (this.autoHideDock ? 60 : 124)),
    );
    Object.assign(win.style, {
      left: `${Math.max(12, x)}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    this.windows.set(id, {
      el: win,
      x: Math.max(12, x),
      y,
      width,
      height,
      createdCompact: compact,
    });
    $(".close", win).addEventListener("click", () => this.close(id));
    $(".minimize", win).addEventListener("click", () => this.minimize(id));
    $(".maximize", win).addEventListener("click", () => this.maximize(id));
    $(".window-titlebar", win).addEventListener("dblclick", (e) => {
      if (!e.target.closest("button")) this.maximize(id);
    });
    win.addEventListener("pointerdown", () => this.focus(id, false));
    win.addEventListener("focusin", () => this.focus(id, false));
    this.drag(win, id);
    this.resize(win, id);
    this.setupApp(id, win);
    this.focus(id, !options.initial);
    if (compact) this.area.scrollTop = 0;
    this.updateDock();
  }

  content(id) {
    switch (id) {
      case "about":
        return welcomeContent();
      case "projects":
        return projectsContent();
      case "contact":
        return contactContent();
      case "terminal":
        return `<div class="terminal-app"><div class="terminal-output" role="log" aria-live="polite"><p class="terminal-muted">Last login: just now, from somewhere on the internet</p><div class="terminal-banner"><pre aria-hidden="true">  ___   ___   ___   _   ___
 / _ \\ / _ \\ / _ \\ | | / _ \\
|  __/| | | | | | || ||  __/
 \\___||_| |_| |_|_||_| \\___|</pre><p><strong>eddieOS</strong> v1.0<br>A tiny shell. A lot of curiosity.</p></div><p>Welcome in. Try <button class="terminal-suggestion" data-term="help">help</button>, <button class="terminal-suggestion" data-term="skills">skills</button>, or <button class="terminal-suggestion" data-term="neofetch">neofetch</button>.</p></div><form class="terminal-prompt"><label for="terminal-command"><span>eddie</span><b>~</b> ❯</label><input id="terminal-command" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false"/></form></div>`;
      case "notes":
        return `<div class="notes-app"><aside><p>On this desktop</p><button class="selected">A little scratchpad<small>Just for your visit</small></button><span>${symbol("book")} Notes stay in this browser</span></aside><div class="note-editor"><div class="note-editor-toolbar"><span>Personal note</span><span class="save-status" role="status">Saved locally</span></div><label for="personal-note">A little scratchpad</label><textarea id="personal-note" spellcheck="false" aria-label="Personal note"></textarea><div class="note-editor-footer">Leave an idea. Make a list. Write a terrible haiku.<button class="text-button" data-command="reset-note">Reset note</button></div></div></div>`;
      case "settings":
        return `<div class="settings-app"><p class="eyebrow">Make yourself at home</p><h1>Wallpaper</h1><p>Choose a wallpaper for Eddie’s desktop.</p><div class="wallpaper-options">${["alpine", "forest", "dusk"].map((name, i) => `<button data-wallpaper="${name}" aria-pressed="${this.wallpaper === name}"><span class="wallpaper-preview ${name}"></span><strong>${["Alpine daydream", "Forest friend", "After hours"][i]}</strong><small>${["A little mountain air", "The original Totoro wallpaper", "For the late-night builders"][i]}</small><i>${symbol("check")}</i></button>`).join("")}</div><div class="setting-row"><div><strong>Desktop Widgets</strong><span>Show the clock and Notes widget.</span></div><button class="toggle" role="switch" aria-checked="${this.widgets}" aria-label="Desktop widgets" data-command="widgets"><span></span></button></div><div class="setting-row"><div><strong>Automatically Hide Dock</strong><span>Move the pointer to the bottom edge to reveal it.</span></div><button class="toggle" role="switch" aria-checked="${this.autoHideDock}" aria-label="Automatically Hide Dock" data-command="autohide"><span></span></button></div><div class="settings-footnote">Preferences are saved on this device.</div></div>`;
      case "resume":
        return `<div class="resume-toolbar"><span>Eddie Bian · Résumé</span><a href="assets/resume.pdf" target="_blank" rel="noopener">Open PDF ↗</a><a href="assets/resume.pdf" download>Download ↓</a></div><object class="resume-viewer" data="assets/resume.pdf" type="application/pdf" aria-label="Eddie Bian résumé"><p>Your browser can’t preview this PDF. <a href="assets/resume.pdf">Read or download the résumé</a>.</p></object>`;
      case "game":
        return `<div class="game-app"><span class="game-eyebrow">A small reset for your brain</span><h1>Take a tiny break.</h1><p>Find the pairs. No leaderboard. No pressure.</p><div class="game-score"><span>Moves <strong class="game-moves">0</strong></span><span>Pairs <strong class="game-pairs">0 / 8</strong></span><button class="text-button game-restart">Start over ↻</button></div><div class="memory-grid" aria-label="Memory game"></div><p class="game-message" role="status" aria-live="polite">Pick any two cards to get started.</p></div>`;
      default:
        return "";
    }
  }

  setupApp(id, win) {
    if (id === "about") {
      const history = ["home"];
      let historyIndex = 0;
      const select = (name, push = true) => {
        if (push && history[historyIndex] !== name) {
          history.splice(historyIndex + 1);
          history.push(name);
          historyIndex++;
        }
        $$("[data-about-tab]", win).forEach((tab) => {
          const selected = tab.dataset.aboutTab === name;
          tab.classList.toggle("selected", selected);
          tab.setAttribute("aria-pressed", selected);
        });
        $$("[data-panel]", win).forEach((panel) => panel.hidden = panel.dataset.panel !== name);
        $('[data-arc="back"]', win).disabled = historyIndex === 0;
        $('[data-arc="forward"]', win).disabled = historyIndex === history.length - 1;
        $(".arc-address-label", win).textContent = name === "home" ? "eddiebian.me" : `eddiebian.me/${name}`;
      };
      $$("[data-about-tab]", win).forEach((button) => button.addEventListener("click", () => select(button.dataset.aboutTab)));
      $$("[data-arc]", win).forEach((button) => button.addEventListener("click", () => {
        switch (button.dataset.arc) {
          case "back": select(history[--historyIndex], false); break;
          case "forward": select(history[++historyIndex], false); break;
          case "reload": $(".arc-panel:not([hidden])", win).scrollTo({ top: 0 }); break;
          case "sidebar": {
            const hidden = win.classList.toggle("sidebar-hidden");
            button.setAttribute("aria-label", hidden ? "Show sidebar" : "Hide sidebar");
            break;
          }
        }
      }));
      select("home", false);
    }
    if (id === "projects") {
      $$("[data-project-view]", win).forEach((button) =>
        button.addEventListener("click", () => {
          $(".project-grid", win).classList.toggle(
            "list-view",
            button.dataset.projectView === "list",
          );
          $$("[data-project-view]", win).forEach((el) => {
            el.classList.toggle("selected", el === button);
            el.setAttribute("aria-pressed", el === button);
          });
        }),
      );
      let filter = "all";
      let query = "";
      const render = () => this.renderProjects(win, filter, query);
      $$("[data-filter]", win).forEach((button) =>
        button.addEventListener("click", () => {
          filter = button.dataset.filter;
          $$("[data-filter]", win).forEach((el) =>
            el.classList.toggle("selected", el === button),
          );
          render();
        }),
      );
      $('input[type="search"]', win).addEventListener("input", (e) => {
        query = e.target.value;
        render();
      });
      render();
    }
    if (id === "terminal") this.setupTerminal(win);
    if (id === "notes") {
      const textarea = $("textarea", win);
      textarea.value = storage.get(
        "note",
        "A note to self\n\nStay curious.\nBuild useful things.\nHave a little fun.\n\n— Eddie\n\n____________________________\n\nYour turn. What would you build?",
      );
      textarea.addEventListener("input", () => {
        const ok = storage.set("note", textarea.value);
        $(".save-status", win).textContent = ok
          ? "Saved locally"
          : "Changes last until this tab closes";
      });
    }
    if (id === "settings")
      $$("[data-wallpaper]", win).forEach((button) =>
        button.addEventListener("click", () =>
          this.setWallpaper(button.dataset.wallpaper),
        ),
      );
    if (id === "game") {
      this.startGame(win);
      $(".game-restart", win).addEventListener("click", () =>
        this.startGame(win),
      );
    }
  }

  renderProjects(win, filter, query) {
    $(".project-detail", win)?.remove();
    [".finder-toolbar", ".project-grid", ".finder-status"].forEach(
      (selector) => ($(selector, win).hidden = false),
    );
    const filtered = projects.filter(
      (p) =>
        (filter === "all" || p.category === filter) &&
        `${p.name} ${p.kind} ${p.stack.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    $(".project-grid", win).innerHTML = filtered.length
      ? filtered
          .map(
            (p) =>
              `<button class="project-tile" data-project="${p.id}"><span class="project-preview" style="--project-color:${p.color}">${p.image ? `<img src="${p.image}" alt="${p.name} preview" loading="lazy"/>` : `<b class="project-glyph">${p.glyph}</b>`}${p.badge ? `<span class="project-badge">${p.badge}</span>` : ""}</span><strong>${p.name} <span>↗</span></strong><span class="project-kind">${p.kind}</span><span class="project-caption">${p.description}</span></button>`,
          )
          .join("")
      : `<div class="project-empty">${symbol("search")}<h2>No projects found</h2><p>Try a name or technology, like “Python”.</p></div>`;
    $(".finder-status", win).textContent =
      `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`;
    $$("[data-project]", win).forEach((button) => {
      button.addEventListener("click", (e) => {
        if (
          (innerWidth > 760 || matchMedia("(pointer: fine)").matches) &&
          e.detail === 1
        ) {
          $$("[data-project]", win).forEach((el) => {
            el.classList.toggle("selected", el === button);
            el.setAttribute("aria-pressed", el === button);
          });
          return;
        }
        this.projectDetail(win, button.dataset.project);
      });
      button.addEventListener("keydown", (e) => {
        if (e.key === " ") {
          e.preventDefault();
          this.projectDetail(win, button.dataset.project);
        }
      });
    });
  }

  projectDetail(win, id) {
    const p = projects.find((project) => project.id === id);
    if (!p) return;
    $(".project-detail", win)?.remove();
    const detail = document.createElement("article");
    detail.className = "project-detail";
    detail.dataset.project = id;
    detail.innerHTML = `<button class="text-button project-back">${symbol("back")} Back to projects</button><div class="detail-art" style="--project-color:${p.color}">${p.image ? `<img src="${p.image}" alt="${p.name} project preview"/>` : `<b>${p.glyph}</b>`}</div><p class="eyebrow">${p.badge || p.kind}</p><h1>${p.name}</h1><p>${p.detail}</p><div class="tech-tags">${p.stack.map((t) => `<span>${t}</span>`).join("")}</div>${p.url ? `<a class="primary-button" href="${p.url}" target="_blank" rel="noopener">${p.url.includes("github") ? "View source" : "Visit project"} ${symbol("external")}</a>` : '<p class="detail-note">Built at a hackathon. Ask me about it sometime.</p>'}${p.source ? `<a class="text-button project-source" href="${p.source}" target="_blank" rel="noopener">View source ${symbol("code")}</a>` : ""}`;
    [".finder-toolbar", ".project-grid", ".finder-status"].forEach(
      (selector) => ($(selector, win).hidden = true),
    );
    $(".finder-main", win).append(detail);
    $(".project-back", detail).addEventListener("click", () => {
      detail.remove();
      [".finder-toolbar", ".project-grid", ".finder-status"].forEach(
        (selector) => ($(selector, win).hidden = false),
      );
      $(`[data-project="${id}"]`, win)?.focus();
    });
    $(".project-back", detail).focus();
  }

  setupTerminal(win) {
    const form = $("form", win);
    const input = $("input", form);
    let historyIndex = this.history.length;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      this.history.push(value);
      historyIndex = this.history.length;
      input.value = "";
      this.runTerminal(win, value);
    });
    $$("[data-term]", win).forEach((button) =>
      button.addEventListener("click", () => {
        this.runTerminal(win, button.dataset.term);
        input.focus();
      }),
    );
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        historyIndex = Math.min(
          this.history.length,
          Math.max(0, historyIndex + (e.key === "ArrowUp" ? -1 : 1)),
        );
        input.value = this.history[historyIndex] || "";
      }
      if (e.key === "Tab") {
        e.preventDefault();
        input.value =
          [
            "help",
            "skills",
            "whoami",
            "projects",
            "contact",
            "experience",
            "neofetch",
            "clear",
            "ls",
            "snow",
          ].find((command) => command.startsWith(input.value)) || input.value;
      }
    });
  }

  runTerminal(win, value) {
    const output = $(".terminal-output", win);
    const command = value.toLowerCase();
    if (command === "clear") {
      output.replaceChildren();
      return;
    }
    const line = document.createElement("p");
    line.className = "terminal-command-line";
    line.textContent = `eddie ~ ❯ ${value}`;
    output.append(line);
    const result = document.createElement("div");
    result.className = "terminal-response";
    const responses = {
      help: "Available commands\n\n  whoami       A short introduction\n  skills       The tools in my toolkit\n  experience   What I’ve been up to\n  projects     Open my project folder\n  contact      Say hello\n  neofetch     System information, sort of\n  ls           Look around\n  snow         A little mountain weather\n  clear        Start fresh\n\nTip: ↑ ↓ for history. Tab to autocomplete.",
      whoami:
        "Eddie Bian\nCompetitive programmer & full-stack developer.\nIB student. Hackathon builder. Snowboard volunteer.\nBased in Toronto, Canada.",
      skills:
        "Languages    Python · JavaScript · TypeScript · Java · C++\nWeb          React · Next.js · FastAPI\nDesktop      Tauri · Rust\nMobile       Expo · React Native\nData         Supabase · PostgreSQL\nTools        Git · Figma · Three.js · GSAP",
      experience:
        "A few highlights from the original résumé:\n\nDECA / Computer Science — Training Executive\nRobotics — Logistics Executive\nGlen Eden — Snowboard Volunteer\n\nWinner — Hack the North, Swarm\n1st — FBLC National, Coding & Programming\nTop 9 / 126 — DECA Provincials, Finance Operations Research\nTop 25 / 1460 — DECA National, Stock Market Game",
      neofetch:
        "eddie@internet\n────────────────────────────\nOS       eddieOS (browser edition)\nShell    curiosity.sh\nTheme    " +
        this.wallpaper +
        `\nProjects ${projects.length} selected\nLocation Toronto, Canada\nFuel     One more idea\nUptime   Long enough for a tiny break`,
      ls: "about.md     projects/     résumé.pdf\nnotes.txt    tiny-break/   a-little-curiosity/",
      pwd: "/Users/eddie/a-little-corner-of-the-internet",
      sudo: "Nice try. You already have permission to be curious.",
    };
    if (responses[command]) result.textContent = responses[command];
    else if (command === "projects" || command === "contact") {
      this.open(command);
      result.textContent = `Opening ${command}…`;
    } else if (command === "snow") {
      this.snow();
      result.textContent =
        "Forecast: a brief flurry. A good day to think about snowboarding.";
    } else if (command.startsWith("echo ")) result.textContent = value.slice(5);
    else if (command.startsWith("sudo ")) result.textContent = responses.sudo;
    else
      result.textContent = `Command not found: ${value}\nTry “help” to see what this little shell can do.`;
    output.append(result);
    $(".terminal-app", win).scrollTop = $(".terminal-app", win).scrollHeight;
  }

  startGame(win) {
    clearTimeout(win.gameTimer);
    const glyphs = ["🪿", "🏂", "💻", "🌲", "🍵", "🛠️", "⛰️", "🌻"];
    const deck = [...glyphs, ...glyphs];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    let flipped = [];
    let moves = 0;
    let pairs = 0;
    let locked = false;
    $(".game-moves", win).textContent = "0";
    $(".game-pairs", win).textContent = "0 / 8";
    $(".game-message", win).textContent = "Pick any two cards to get started.";
    const grid = $(".memory-grid", win);
    grid.innerHTML = deck
      .map(
        (glyph, i) =>
          `<button class="memory-card" aria-label="Reveal card ${i + 1}" data-index="${i}"><span class="card-back">✳</span><span class="card-front" aria-hidden="true">${glyph}</span></button>`,
      )
      .join("");
    $$(".memory-card", grid).forEach((button) =>
      button.addEventListener("click", () => {
        if (
          locked ||
          button.classList.contains("flipped") ||
          button.classList.contains("matched")
        )
          return;
        button.classList.add("flipped");
        button.setAttribute(
          "aria-label",
          `Card ${Number(button.dataset.index) + 1}: ${deck[button.dataset.index]}`,
        );
        flipped.push(button);
        if (flipped.length !== 2) return;
        moves++;
        $(".game-moves", win).textContent = moves;
        if (deck[flipped[0].dataset.index] === deck[flipped[1].dataset.index]) {
          flipped.forEach((card) => {
            card.classList.add("matched");
            card.setAttribute("aria-disabled", "true");
          });
          pairs++;
          $(".game-pairs", win).textContent = `${pairs} / 8`;
          flipped = [];
          $(".game-message", win).textContent =
            pairs === 8
              ? `All paired up in ${moves} moves. Nicely done. Take a breath.`
              : "A little match. Keep going.";
        } else {
          locked = true;
          win.gameTimer = setTimeout(() => {
            flipped.forEach((card) => {
              card.classList.remove("flipped");
              card.setAttribute(
                "aria-label",
                `Reveal card ${Number(card.dataset.index) + 1}`,
              );
            });
            flipped = [];
            locked = false;
          }, 850);
        }
      }),
    );
  }

  focus(id, moveFocus = true) {
    const data = this.windows.get(id);
    if (!data || data.el.hidden) return;
    if (this.active === id) {
      if (moveFocus) (id === "terminal" ? $("#terminal-command", data.el) : data.el).focus({ preventScroll: true });
      return;
    }
    this.active = id;
    this.windows.forEach((w) => w.el.classList.remove("is-active"));
    data.el.classList.add("is-active");
    data.el.style.zIndex = ++this.z;
    $(".active-app").textContent =
      id === "about"
        ? "Arc"
        : id === "projects"
          ? "Finder"
          : id === "contact"
            ? "Contacts"
            : id === "resume"
              ? "Preview"
              : apps.find((app) => app.id === id).name;
    this.updateDock();
    if (moveFocus) {
      const target =
        id === "terminal" ? $("#terminal-command", data.el) : data.el;
      target.focus({ preventScroll: true });
    }
  }

  frontWindow() {
    return [...this.windows.entries()]
      .filter(([, data]) => !data.el.hidden && !data.minimizing)
      .sort((a, b) => Number(b[1].el.style.zIndex) - Number(a[1].el.style.zIndex))[0]?.[0];
  }

  close(id) {
    const data = this.windows.get(id);
    if (!data) return;
    if (this.gesture?.data === data) this.endGesture();
    data.minimizeAnimation?.cancel();
    clearTimeout(data.el.gameTimer);
    data.el.remove();
    this.windows.delete(id);
    const remaining = this.frontWindow();
    if (remaining) this.focus(remaining, this.active === id);
    else {
      this.active = null;
      $(".active-app").textContent = "Finder";
      $(`.dock-app[data-open="${id}"]`)?.focus();
    }
    this.updateDock();
  }

  minimize(id) {
    const data = this.windows.get(id);
    if (!data || data.minimizing) return;
    if (this.gesture?.data === data) this.endGesture();
    if (innerWidth <= 760 && !matchMedia("(pointer: fine)").matches) {
      this.close(id);
      return;
    }
    data.minimizing = true;
    this.revealDock(1200);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = data.el.animate(
      [
        {
          transform: "translateY(0) scale(1)",
          opacity: 1,
          borderRadius: "16px",
        },
        {
          transform: "translateY(60px) scale(.65,.9)",
          opacity: 1,
          borderRadius: "16px",
          offset: 0.35,
        },
        {
          transform: `translateY(${innerHeight - data.y - data.height / 2 - 95}px) scale(.08,.06)`,
          opacity: 0.1,
          borderRadius: "4px",
        },
      ],
      { duration: reduced ? 0 : 350, easing: "cubic-bezier(.4,0,.8,.5)" },
    );
    data.minimizeAnimation = animation;
    animation.onfinish = () => {
      if (!this.windows.has(id)) return;
      data.el.hidden = true;
      data.minimized = true;
      data.minimizing = false;
      if (this.active === id) {
        this.active = null;
        const remaining = this.frontWindow();
        if (remaining) this.focus(remaining, false);
        else $(".active-app").textContent = "Finder";
      }
      this.updateDock();
    };
  }

  revealDock(duration = 2200) {
    this.root.classList.add("dock-visible");
    clearTimeout(this.dockTimer);
    this.dockTimer = setTimeout(() => {
      if (!$(".os-dock").matches(":hover"))
        this.root.classList.remove("dock-visible");
    }, duration);
  }

  toggleDesktop() {
    if (innerWidth <= 760) return;
    this.desktopRevealed = !this.desktopRevealed;
    if (this.desktopRevealed) {
      this.previousActive = this.active;
      this.windows.forEach((data) => {
        data.revealHidden = !data.el.hidden;
        if (data.revealHidden) data.el.hidden = true;
      });
      this.active = null;
      $(".active-app").textContent = "Finder";
    } else {
      this.windows.forEach((data) => {
        if (data.revealHidden) {
          data.el.hidden = false;
          data.revealHidden = false;
        }
      });
      if (this.previousActive && this.windows.has(this.previousActive))
        this.focus(this.previousActive, false);
    }
    this.updateDock();
  }

  maximize(id) {
    const data = this.windows.get(id);
    if (!data) return;
    if (this.gesture?.data === data) this.endGesture();
    if (innerWidth <= 760) {
      const filled = data.el.classList.toggle("compact-zoomed");
      $(".maximize", data.el).setAttribute(
        "aria-label",
        `${filled ? "Restore" : "Maximize"} ${apps.find((app) => app.id === id).name}`,
      );
      return;
    }
    if (!data.maximized) {
      data.previous = {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      };
      Object.assign(data, {
        x: 12,
        y: 12,
        width: innerWidth - 24,
        height: innerHeight - (this.autoHideDock ? 53 : 124),
      });
    } else Object.assign(data, data.previous);
    data.maximized = !data.maximized;
    this.position(data);
    $(".maximize", data.el).setAttribute(
      "aria-label",
      `${data.maximized ? "Restore" : "Maximize"} ${apps.find((app) => app.id === id).name}`,
    );
  }

  position(data) {
    Object.assign(data.el.style, {
      left: `${data.x}px`,
      top: `${data.y}px`,
      width: `${data.width}px`,
      height: `${data.height}px`,
    });
  }

  startGesture(e, win, id, direction = null) {
    const data = this.windows.get(id);
    if (this.gesture || e.button !== 0 || !e.isPrimary || innerWidth <= 760 || data.maximized || data.minimizing) return;
    e.preventDefault();
    e.stopPropagation();
    this.focus(id, false);
    // The window owns capture for both titlebar and edge gestures. There is
    // no transform offset to reconcile when capture ends or is interrupted.
    win.setPointerCapture(e.pointerId);
    this.gesture = {
      data, win, direction, pointerId: e.pointerId,
      clientX: e.clientX, clientY: e.clientY,
      start: { x: data.x, y: data.y, width: data.width, height: data.height },
      bounds: { width: this.area.clientWidth, height: this.area.clientHeight },
      moved: false,
    };
    win.classList.add("dragging");
    this.root.classList.add("window-gesture");
  }

  endGesture(e) {
    const gesture = this.gesture;
    if (!gesture || (e && e.pointerId !== gesture.pointerId)) return;
    this.gesture = null;
    if (gesture.moved) this.suppressClickUntil = performance.now() + 250;
    gesture.win.classList.remove("dragging");
    this.root.classList.remove("window-gesture");
    if (gesture.win.hasPointerCapture(gesture.pointerId)) gesture.win.releasePointerCapture(gesture.pointerId);
  }

  drag(win, id) {
    const start = (e) => {
      if (!e.target.closest("button, input, a, textarea")) this.startGesture(e, win, id);
    };
    $(".window-titlebar", win).addEventListener("pointerdown", start);
    if (id === "about") $(".arc-sidebar", win).addEventListener("pointerdown", start);
    if (id === "projects") {
      $(".finder-toolbar", win).addEventListener("pointerdown", start);
      $(".finder-toolbar", win).addEventListener("dblclick", (e) => {
        if (!e.target.closest("button, input, a")) this.maximize(id);
      });
    }
    win.addEventListener("pointermove", (e) => {
      const gesture = this.gesture;
      if (!gesture || gesture.win !== win || e.pointerId !== gesture.pointerId) return;
      const dx = e.clientX - gesture.clientX;
      const dy = e.clientY - gesture.clientY;
      if (Math.hypot(dx, dy) < 3 && !gesture.moved) return;
      gesture.moved = true;
      const next = gesture.direction
        ? resizeWindow(gesture.start, dx, dy, gesture.direction, gesture.bounds)
        : moveWindow(gesture.start, dx, dy, gesture.bounds);
      Object.assign(gesture.data, next);
      this.position(gesture.data);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((event) =>
      win.addEventListener(event, (e) => this.endGesture(e)));
  }

  resize(win, id) {
    for (const direction of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      const handle = document.createElement("div");
      handle.className = `window-edge edge-${direction}`;
      handle.setAttribute("aria-hidden", "true");
      win.append(handle);
      handle.addEventListener("pointerdown", (e) => this.startGesture(e, win, id, direction));
    }
    $(".window-resize", win).remove();
  }

  constrainWindows() {
    if (innerWidth <= 760) return;
    this.windows.forEach((data, id) => {
      if (data.createdCompact) {
        const sizes = {
          about: [900, 660],
          projects: [900, 610],
          contact: [720, 560],
          game: [480, 610],
        };
        const [preferredWidth, preferredHeight] = sizes[id] || [650, 530];
        data.width = Math.min(preferredWidth, innerWidth - 48);
        data.height = Math.min(preferredHeight, innerHeight - 100);
        data.x = (innerWidth - data.width) / 2;
        data.y = Math.max(12, (innerHeight - data.height - 80) / 2);
        data.createdCompact = false;
      }
      if (data.maximized) {
        Object.assign(data, {
          x: 12,
          y: 12,
          width: innerWidth - 24,
          height: innerHeight - (this.autoHideDock ? 53 : 124),
        });
        this.position(data);
        return;
      }
      data.width = Math.min(data.width, innerWidth - 24);
      data.height = Math.min(
        data.height,
        innerHeight - (this.autoHideDock ? 65 : 138),
      );
      data.x = Math.max(0, Math.min(data.x, innerWidth - data.width));
      data.y = Math.max(
        0,
        Math.min(
          data.y,
          innerHeight - data.height - (this.autoHideDock ? 40 : 130),
        ),
      );
      this.position(data);
    });
  }

  updateDock() {
    const minimizedMarkup = [...this.windows.entries()]
      .filter(([, data]) => data.minimized)
      .map(([id]) => {
        const app = apps.find((app) => app.id === id);
        return `<button class="dock-app dock-window" data-open="${id}" aria-label="Restore ${app.name}"><span class="minimized-thumbnail">${app.name}${appIcon(app.icon)}</span><span class="dock-tooltip">${app.name}</span></button>`;
      })
      .join("");
    if ($(".dock-minimized").innerHTML !== minimizedMarkup) $(".dock-minimized").innerHTML = minimizedMarkup;
    const compact = innerWidth <= 760;
    const hasVisibleWindow = [...this.windows.values()].some(
      (win) => !win.el.hidden,
    );
    this.windows.forEach((win, id) => {
      win.el.inert = compact && id !== this.active;
    });
    $(".desktop-widgets").inert = compact && hasVisibleWindow;
    $(".desktop-files").inert = compact && hasVisibleWindow;
    $$(".dock-app").forEach((button) => {
      const win = this.windows.get(button.dataset.open);
      button.classList.toggle("running", Boolean(win));
      button.classList.toggle(
        "frontmost",
        Boolean(win && !win.el.hidden && button.dataset.open === this.active),
      );
    });
  }

  spotlight() {
    this.closePopover();
    this.previousFocus = document.activeElement;
    $(".spotlight-backdrop").hidden = false;
    this.search("");
    $(".spotlight input").value = "";
    $(".spotlight input").focus();
  }
  search(query) {
    const results = apps.filter((app) =>
      `${app.name} ${app.subtitle}`.toLowerCase().includes(query.toLowerCase()),
    );
    $(".spotlight-results").innerHTML = results.length
      ? results
          .map(
            (app, i) =>
              `<button class="spotlight-result ${i === 0 ? "highlighted" : ""}" data-open="${app.id}">${appIcon(app.icon)}<span><strong>${app.name}</strong><small>${app.subtitle}</small></span><span class="search-return">↵</span></button>`,
          )
          .join("")
      : '<p class="search-empty">No apps found. Try “Projects” or “Terminal”.</p>';
  }
  dismiss() {
    const wasOpen = !$(".spotlight-backdrop").hidden;
    $(".spotlight-backdrop").hidden = true;
    if (wasOpen && this.previousFocus?.isConnected)
      this.previousFocus.focus({ preventScroll: true });
  }

  menu(name, anchor, point) {
    const popover = $(".os-popover");
    if (!popover.hidden && popover.dataset.menu === name) {
      this.closePopover();
      return;
    }
    const item = (label, cmd, shortcut = "") =>
      `<button data-command="${cmd}">${label}<kbd>${shortcut}</kbd></button>`;
    const menus = {
      home: `<strong>Eddie’s Mac</strong>${item("About Eddie", "about")}<hr>${item("Appearance…", "settings")}${item("Text version", "text")}<hr>${item("Visit the 3D desk ↗", "intro")}`,
      edit: `${item("Copy Email Address", "copy-email")}${item("Copy Website Address", "copy-url")}<hr>${item("Open Notes", "notes")}`,
      go: `${item("About Eddie", "about")}${item("Projects", "projects")}${item("Contact", "contact")}${item("Résumé", "resume")}`,
      file: `${item("Open Projects", "projects")}${item("New note", "notes")}${item("Open Résumé", "resume")}<hr>${item("Close Window", "close", "⌘ W")}`,
      view: `${item("Search apps…", "spotlight", "⌘ K")}${item("Show Desktop", "desktop")}<hr>${item(this.widgets ? "Hide Widgets" : "Show Widgets", "widgets")}${item("Change Wallpaper…", "settings")}`,
      window: `${item("Minimize", "minimize")}${item("Zoom", "maximize")}<hr>${[...this.windows.keys()].map((id) => `<button data-open="${id}">${id === this.active ? "✓ " : ""}${apps.find((a) => a.id === id).name}</button>`).join("") || "<span>No windows open</span>"}`,
      help: `<strong>Make yourself at home.</strong><p>Click an app to open it. Double-click desktop files to open them. Drag a title bar to move a window. Double-click it to zoom. Click the wallpaper to reveal the desktop.</p>${item("Search apps", "spotlight", "⌘ K")}${item("Take a tiny break", "game")}`,
      controls: `<strong>Control Center</strong><p>A little room to make your own.</p>${item(this.widgets ? "✓ Desktop widgets" : "Desktop widgets", "widgets")}${item("Show Desktop", "desktop")}${item(this.autoHideDock ? "✓ Automatically Hide Dock" : "Automatically Hide Dock", "autohide")}${item("Appearance…", "settings")}`,
    };
    popover.innerHTML = menus[name];
    popover.hidden = false;
    popover.dataset.menu = name;
    const rect = anchor?.getBoundingClientRect();
    const left = point?.x ?? rect?.left ?? innerWidth - 290;
    popover.style.left = `${Math.max(8, Math.min(left, innerWidth - 290))}px`;
    popover.style.top = `${Math.min(point?.y ?? 37, innerHeight - popover.offsetHeight - 10)}px`;
    $("button", popover)?.focus();
  }
  closePopover() {
    $(".os-popover").hidden = true;
  }

  command(cmd) {
    this.closePopover();
    if (apps.some((app) => app.id === cmd)) this.open(cmd);
    else if (cmd === "spotlight") this.spotlight();
    else if (cmd === "controls") this.menu("controls");
    else if (cmd === "dismiss") this.dismiss();
    else if (cmd === "close" && this.active) this.close(this.active);
    else if (cmd === "minimize" && this.active) this.minimize(this.active);
    else if (cmd === "maximize" && this.active) this.maximize(this.active);
    else if (cmd === "desktop") this.toggleDesktop();
    else if (cmd === "autohide") {
      this.autoHideDock = !this.autoHideDock;
      storage.set("autohide", this.autoHideDock ? "on" : "off");
      this.applyAppearance();
      this.revealDock();
    } else if (cmd === "widgets") {
      this.widgets = !this.widgets;
      storage.set("widgets", this.widgets ? "on" : "off");
      this.applyAppearance();
    } else if (cmd === "text") this.textVersion();
    else if (cmd === "intro") location.href = "./";
    else if (cmd === "trash")
      this.toast("Nothing here. Even my bad ideas get a second chance.");
    else if (cmd === "copy-email") this.copyEmail();
    else if (cmd === "copy-url") {
      navigator.clipboard
        .writeText("https://eddiebian.me")
        .then(() => this.toast("Website address copied."))
        .catch(() => this.toast("eddiebian.me"));
    } else if (cmd === "reset-note") {
      storage.set("note", "");
      const win = this.windows.get("notes");
      if (win) {
        $("textarea", win.el).value = "";
        $("textarea", win.el).focus();
      }
    }
  }
  async copyEmail() {
    try {
      await navigator.clipboard.writeText("eddie.bian@yahoo.com");
      this.toast("Email address copied. Say hello sometime.");
    } catch {
      this.toast("Email: eddie.bian@yahoo.com");
    }
  }
  textVersion() {
    document.body.classList.add("text-open");
    window.app?.pause();
    this.previousTextFocus = document.activeElement;
    $("#fast-mode").style.display = "block";
    $("#fast-mode").scrollTop = 0;
    this.root.inert = true;
    $("#exit-fast-mode").textContent = this.visible ? "Back to desktop" : "Back to 3D";
    $("#intro-hud").inert = true;
    $("#exit-fast-mode").focus();
  }
  closeTextVersion() {
    document.body.classList.remove("text-open");
    if (!this.visible) window.app?.resume();
    $("#fast-mode").style.display = "none";
    this.root.inert = !this.visible;
    $("#intro-hud").inert = this.visible;
    if (this.previousTextFocus?.isConnected && !this.previousTextFocus.closest("[inert]")) this.previousTextFocus.focus();
  }
  setWallpaper(name) {
    this.wallpaper = name;
    storage.set("wallpaper", name);
    this.applyAppearance();
  }
  applyAppearance() {
    this.root.dataset.wallpaper = this.wallpaper;
    $$('.toggle[data-command="autohide"]').forEach((button) =>
      button.setAttribute("aria-checked", this.autoHideDock),
    );
    this.root.classList.toggle("dock-autohide", this.autoHideDock);
    this.root.classList.toggle("widgets-hidden", !this.widgets);
    $$("[data-wallpaper]").forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        button.dataset.wallpaper === this.wallpaper,
      ),
    );
    $$('.toggle[data-command="widgets"]').forEach((button) =>
      button.setAttribute("aria-checked", this.widgets),
    );
  }
  toast(message) {
    $(".os-toast").textContent = message;
    $(".os-toast").classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => $(".os-toast").classList.remove("show"),
      3800,
    );
  }
  snow() {
    $(".snowfall")?.remove();
    const snow = document.createElement("div");
    snow.className = "snowfall";
    snow.setAttribute("aria-hidden", "true");
    snow.innerHTML = Array.from(
      { length: 36 },
      (_, i) =>
        `<i style="--x:${(i * 47) % 100}%;--delay:${(i % 8) * -0.6}s;--duration:${5 + (i % 4)}s">✳</i>`,
    ).join("");
    this.root.append(snow);
    setTimeout(() => snow.remove(), 8000);
  }
  tick() {
    const now = new Date();
    const opts = { timeZone: "America/Toronto" };
    const date = now.toLocaleDateString("en-CA", {
      ...opts,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const time = now.toLocaleTimeString("en-CA", {
      ...opts,
      hour: "numeric",
      minute: "2-digit",
    });
    $(".menu-clock").innerHTML =
      `<span class="clock-date">${date}</span><span>${time}</span>`;
    $(".widget-weekday").textContent = now.toLocaleDateString("en-CA", {
      ...opts,
      weekday: "long",
    });
    $(".widget-day").textContent = now.toLocaleDateString("en-CA", {
      ...opts,
      day: "numeric",
    });
    $(".widget-month").textContent = now.toLocaleDateString("en-CA", {
      ...opts,
      month: "long",
    });
    const parts = new Intl.DateTimeFormat("en-US", {
      ...opts,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour").value);
    const minute = Number(parts.find((p) => p.type === "minute").value);
    $(".clock-hour").style.transform = `rotate(${hour * 30 + minute / 2}deg)`;
    $(".clock-minute").style.transform = `rotate(${minute * 6}deg)`;
    setTimeout(() => this.tick(), 15000);
  }
}

$("#text-projects").innerHTML = projects.map((p) => `<li><h3>${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${p.name}</a>` : p.name}</h3><p class="fm-meta-line">${p.badge || p.kind}</p><p>${p.detail}</p><p class="fm-meta-line">${p.stack.join(" · ")}</p></li>`).join("");
window.macDesktop = new EddieDesktop();
window.macDesktop.root.inert = intro;
if (intro) {
  document.body.classList.add("intro-mode", "is-loading");
  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  const script = (src) =>
    new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = reject;
      document.head.append(el);
    });
  try {
    await script("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js");
    await script(
      "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js",
    );
    const { App } = await import("./main.js");
    window.app = new App();
  } catch (error) {
    console.warn("The 3D intro could not load.", error);
    window.macDesktop.show();
    window.macDesktop.toast(
      "The 3D desk couldn’t load. The desktop is ready to explore.",
    );
  }
}
