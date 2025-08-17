// macOS-like desktop overlay that appears after scrolling past the 3D intro
// Non-intrusive: doesn't modify first page markup; injects its own root container.

class MacDesktop {
  constructor(options = {}) {
    this.options = Object.assign(
      {
        appearScrollProgress: 0.95, // require near-complete scroll
        disappearThreshold: 0.9, // scroll back above this -> hide
        throttleMs: 80,
        transitionDelayMs: 420, // wait after threshold before enabling pointer events
        appearAfterIdleMs: 160, // user stops scrolling for this long
        requireBottomProximityPx: 60, // also require within X px of bottom
        unlockUpIntentPx: 140, // upward scroll intent needed to dismiss while frozen
      },
      options
    );
    this._root = null;
    this._visible = false;
    this._lastScrollCheck = 0;
    this._winZ = 100; // stacking for active windows
    this._openWindows = new Map();
    this._idleTimer = null;
    this._initDOM();
    this._bindGlobal();
  }

  _initDOM() {
    if (document.getElementById("mac-desktop-root")) return; // already there
    const root = document.createElement("div");
    root.id = "mac-desktop-root";
    root.setAttribute("role", "application");
    root.innerHTML = `
			<div id="mac-menubar">
        <div class="left">
          <span class="apple" style="font-weight:600"></span>
          <span class="menu-item active-app" id="menu-active-app">Finder</span>
          <span class="menu-item">File</span>
          <span class="menu-item">Edit</span>
          <span class="menu-item">View</span>
        </div>
        <div class="center">Scroll back up to return</div>
        <div class="right">
          <span class="status-item" id="mac-clock"></span>
        </div>
			</div>
			<div id="mac-desktop-area" tabindex="-1"></div>
		`;
    document.body.appendChild(root);
    this._root = root;
    this._desktopArea = root.querySelector("#mac-desktop-area");
    this._clockEl = root.querySelector("#mac-clock");
    this._buildIcons();
    this._tickClock();
  }

  _buildIcons() {
    const icons = [
      { id: "about", label: "About Me", emoji: "👤", title: "About Me" },
      { id: "projects", label: "Projects", emoji: "💻", title: "Projects" },
      { id: "skills", label: "Skills", emoji: "🛠️", title: "Skills" },
      { id: "contact", label: "Contact", emoji: "✉️", title: "Contact" },
      { id: "resume", label: "Résumé", emoji: "📄", title: "Résumé" },
    ];
    icons.forEach((icon) => {
      const el = document.createElement("button");
      el.className = "mac-icon";
      el.type = "button";
      el.dataset.appId = icon.id;
      el.innerHTML = `
				<div class="icon-img" aria-hidden="true">${icon.emoji}</div>
				<div class="label-bg">${icon.label}</div>
			`;
      el.addEventListener("click", (e) => this._handleIconClick(e, icon));
      el.addEventListener("dblclick", (e) => this._handleIconDblClick(e, icon));
      this._desktopArea.appendChild(el);
    });
  }

  // Dock removed per user request; related handlers pruned.

  _handleIconClick(e, icon) {
    // Single click just select
    const already = e.currentTarget.classList.contains("selected");
    this._desktopArea
      .querySelectorAll(".mac-icon.selected")
      .forEach((i) => i.classList.remove("selected"));
    if (!already) e.currentTarget.classList.add("selected");
  }

  _handleIconDblClick(e, icon) {
    this._openAppWindow(icon.id);
  }

  _openAppWindow(appId) {
    if (this._openWindows.has(appId)) {
      this._focusWindow(appId);
      return;
    }
    const content = this._getAppContent(appId);
    const win = document.createElement("section");
    win.className = "mac-window";
    win.dataset.appId = appId;
    win.innerHTML = `
			<header class="titlebar" draggable="true">
				<div class="traffic-lights">
					<span class="close" data-action="close"></span>
					<span class="minimize" data-action="minimize"></span>
					<span class="zoom" data-action="zoom"></span>
				</div>
				<div class="title">${content.title}</div>
			</header>
			<div class="content" tabindex="0">${content.html}</div>
		`;
    this._desktopArea.appendChild(win);
    requestAnimationFrame(() => win.classList.add("visible"));
    this._openWindows.set(appId, {
      el: win,
      state: { x: 160, y: 120, w: null, h: null },
    });
    this._attachWindowEvents(win, appId);
    this._focusWindow(appId);
    this._markDockOpen(appId, true);
  }

  _getAppContent(appId) {
    switch (appId) {
      case "about":
        return {
          title: "About Me",
          html: `<h2>About Me</h2><p>Hi, I\'m Eddie. This is a macOS-inspired interactive portfolio. Explore the other apps to learn more.</p>`,
        };
      case "projects":
        return {
          title: "Projects",
          html: `<h2>Projects</h2><p>Some highlighted works:</p><ul><li>Project A – WebGL experiment.</li><li>Project B – Full-stack application.</li><li>Project C – Data visualization.</li></ul>`,
        };
      case "skills":
        return {
          title: "Skills",
          html: `<h2>Skills</h2><h3>Languages</h3><ul><li>JavaScript / TypeScript</li><li>Python</li><li>Go</li></ul><h3>Frameworks</h3><ul><li>React</li><li>Three.js</li><li>Node.js</li></ul>`,
        };
      case "contact":
        return {
          title: "Contact",
          html: `<h2>Contact</h2><p>Feel free to reach out:</p><ul><li>Email: <a href="mailto:eddie@example.com">eddie@example.com</a></li><li>GitHub: <a href="https://github.com/B-Eddie" target="_blank" rel="noopener">B-Eddie</a></li></ul>`,
        };
      case "resume":
        return {
          title: "Résumé",
          html: `<h2>Résumé</h2><p>A concise overview:</p><ul><li>Experience at Company X</li><li>Open-source contributions</li><li>Continuous learner</li></ul><p>Download full résumé (coming soon).</p>`,
        };
      default:
        return { title: "Info", html: `<h2>Info</h2><p>No content yet.</p>` };
    }
  }

  _attachWindowEvents(win, appId) {
    // Focus on click
    win.addEventListener("mousedown", () => this._focusWindow(appId));
    // Buttons
    win.querySelectorAll(".traffic-lights span").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        if (action === "close") this._closeWindow(appId);
        if (action === "minimize") this._minimizeWindow(appId);
        if (action === "zoom") this._zoomWindow(appId);
      });
    });
    // Dragging
    const titlebar = win.querySelector(".titlebar");
    let drag = null;
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      drag = {
        sx: e.clientX,
        sy: e.clientY,
        rect: win.getBoundingClientRect(),
      };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    };
    const onPointerMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      win.style.left = drag.rect.left + dx + "px";
      win.style.top = drag.rect.top + dy + "px";
    };
    const onPointerUp = () => {
      drag = null;
      window.removeEventListener("pointermove", onPointerMove);
    };
    titlebar.addEventListener("pointerdown", onPointerDown);
  }

  _focusWindow(appId) {
    const data = this._openWindows.get(appId);
    if (!data) return;
    this._openWindows.forEach((v) => v.el.classList.remove("active"));
    data.el.classList.add("active");
    data.el.style.zIndex = (++this._winZ).toString();
    // Update menubar active app name
    const appContent = this._getAppContent(appId);
    const activeAppEl = document.getElementById("menu-active-app");
    if (activeAppEl) activeAppEl.textContent = appContent.title || "App";
    // Dock indicator already set when opened; ensure state not lost
    this._markDockOpen(appId, true);
  }

  _closeWindow(appId) {
    const data = this._openWindows.get(appId);
    if (!data) return;
    data.el.classList.remove("visible");
    setTimeout(() => data.el.remove(), 320);
    this._openWindows.delete(appId);
    this._markDockOpen(appId, false);
    // If no windows left, reset active app label
    if (this._openWindows.size === 0) {
      const activeAppEl = document.getElementById("menu-active-app");
      if (activeAppEl) activeAppEl.textContent = "Finder";
    }
  }

  _minimizeWindow(appId) {
    const data = this._openWindows.get(appId);
    if (!data) return;
    data.el.style.transition = "transform 0.35s ease, opacity 0.35s ease";
    data.el.style.transformOrigin = "bottom center";
    data.el.style.transform = "scale(0.1) translateY(400px)";
    data.el.style.opacity = "0";
    setTimeout(() => {
      data.el.style.display = "none";
    }, 360);
  }

  _zoomWindow(appId) {
    const data = this._openWindows.get(appId);
    if (!data) return;
    const maximized = data.el.classList.toggle("zoomed");
    if (maximized) {
      data.prevStyle = {
        left: data.el.style.left,
        top: data.el.style.top,
        width: data.el.style.width,
        height: data.el.style.height,
      };
      data.el.style.left = "5%";
      data.el.style.top = "60px";
      data.el.style.width = "90%";
      data.el.style.height = "calc(100% - 110px)";
    } else if (data.prevStyle) {
      Object.assign(data.el.style, data.prevStyle);
    }
  }

  _markDockOpen(appId, open) {
    /* dock removed: no-op */
  }

  _bindGlobal() {
    window.addEventListener("scroll", () => this._onScroll());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._visible) this.hide();
    });
  }

  _onScroll() {
    const now = performance.now();
    if (now - this._lastScrollCheck < this.options.throttleMs) {
      // Still update idle timer so appearance waits for full idle period
      this._scheduleIdleCheck();
      return;
    }
    this._lastScrollCheck = now;
    const progress = this._getScrollProgress();
    const nearBottom = this._nearBottom();

    if (!this._visible) {
      // Only consider showing when BOTH threshold & bottom proximity satisfied
      if (progress >= this.options.appearScrollProgress && nearBottom) {
        this._scheduleIdleCheck();
      }
    } else {
      // Hide early when user scrolls back up beyond disappear threshold OR leaves bottom zone
      if (progress < this.options.disappearThreshold || !nearBottom) {
        this.hide();
      }
    }
  }

  _scheduleIdleCheck() {
    clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      // Re-evaluate conditions at idle time
      const progress = this._getScrollProgress();
      if (
        !this._visible &&
        progress >= this.options.appearScrollProgress &&
        this._nearBottom()
      ) {
        this.show();
      }
    }, this.options.appearAfterIdleMs);
  }

  _nearBottom() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const remaining =
      document.documentElement.scrollHeight - window.innerHeight - scrollTop;
    return remaining <= this.options.requireBottomProximityPx;
  }

  _getScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? scrollTop / docHeight : 0;
  }

  show() {
    if (!this._root) return;
    this._visible = true;
    this._root.style.opacity = "1";
    this._savedScrollFreezeY = window.scrollY || document.documentElement.scrollTop || 0;
    this._enableScrollIntercept();
    setTimeout(() => {
      if (this._visible) this._root.style.pointerEvents = "auto";
    }, this.options.transitionDelayMs);
  }

  hide() {
    if (!this._root) return;
    this._visible = false;
    this._root.style.opacity = "0";
    this._root.style.pointerEvents = "none";
    this._disableScrollIntercept();
  }

  _enableScrollIntercept() {
    if (this._intercepting) return;
    this._intercepting = true;
    this._upIntent = 0;
    this._wheelHandler = (e) => this._onInterceptWheel(e);
    this._touchStartHandler = (e) => this._onTouchStart(e);
    this._touchMoveHandler = (e) => this._onTouchMove(e);
    this._keyHandler = (e) => this._onKeyScroll(e);
    window.addEventListener("wheel", this._wheelHandler, { passive: false });
    window.addEventListener("touchstart", this._touchStartHandler, { passive: false });
    window.addEventListener("touchmove", this._touchMoveHandler, { passive: false });
    window.addEventListener("keydown", this._keyHandler, true);
  }

  _disableScrollIntercept() {
    if (!this._intercepting) return;
    window.removeEventListener("wheel", this._wheelHandler, { passive: false });
    window.removeEventListener("touchstart", this._touchStartHandler, { passive: false });
    window.removeEventListener("touchmove", this._touchMoveHandler, { passive: false });
    window.removeEventListener("keydown", this._keyHandler, true);
    this._intercepting = false;
  }

  _onInterceptWheel(e) {
    if (!this._visible) return; // safety
    // Freeze background position
    if (typeof this._savedScrollFreezeY === "number") {
      if (window.scrollY !== this._savedScrollFreezeY)
        window.scrollTo(0, this._savedScrollFreezeY);
    }
    const dy = e.deltaY;
    if (dy < 0) {
      this._upIntent += Math.abs(dy);
      if (this._upIntent >= this.options.unlockUpIntentPx) {
        this.hide();
        return; // allow natural scroll after hide
      }
    }
    e.preventDefault();
  }

  _onTouchStart(e) {
    this._touchStartY = e.touches && e.touches.length ? e.touches[0].clientY : null;
  }
  _onTouchMove(e) {
    if (!this._visible) return;
    if (this._touchStartY == null) return;
    const currentY = e.touches && e.touches.length ? e.touches[0].clientY : null;
    if (currentY == null) return;
    const dy = currentY - this._touchStartY; // positive when swiping down (scroll up intent)
    if (dy > 0) {
      this._upIntent += dy;
      this._touchStartY = currentY; // incremental
      if (this._upIntent >= this.options.unlockUpIntentPx) {
        this.hide();
        return;
      }
    }
    // prevent any movement while visible
    e.preventDefault();
  }

  _onKeyScroll(e) {
    if (!this._visible) return;
    const keysUp = ["ArrowUp", "PageUp", "Home", "k"]; // include vim-like k optionally
    if (keysUp.includes(e.key)) {
      this._upIntent += 40; // arbitrary increment
      if (this._upIntent >= this.options.unlockUpIntentPx) {
        this.hide();
        return;
      }
    }
    const blockKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]; // block while visible
    if (blockKeys.includes(e.key)) {
      e.preventDefault();
    }
  }

  _tickClock() {
    if (this._clockEl) {
      const now = new Date();
      const day = now.toLocaleDateString(undefined, { weekday: "short" });
      const time = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      this._clockEl.textContent = `${day} ${time}`;
    }
    requestAnimationFrame(() => this._tickClock());
  }
}

// Lazy init after DOM ready & allow other scripts to load first
document.addEventListener("DOMContentLoaded", () => {
  // Delay creation; ensures initial page unaffected
  setTimeout(() => {
    window.macDesktop = new MacDesktop();
  }, 1200);
});

export { MacDesktop };
