// macOS-like desktop overlay that appears after scrolling past the 3D intro
// Non-intrusive: doesn't modify first page markup; injects its own root container.

class MacDesktop {
  constructor(options = {}) {
    this.options = Object.assign(
      {
        appearScrollProgress: 0.95, // require near-complete scroll
        disappearThreshold: 0.7, // must scroll much farther up to hide
        throttleMs: 80,
        transitionDelayMs: 420, // wait after threshold before enabling pointer events
        appearAfterIdleMs: 160, // user stops scrolling for this long
        requireBottomProximityPx: 220, // consider near bottom within a larger range
        unlockUpIntentPx: 300, // upward scroll intent needed to dismiss while frozen (increased)
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
      <div id="mac-dock" aria-label="Minimized Apps" role="menubar"></div>
		`;
    document.body.appendChild(root);
    this._root = root;
    this._desktopArea = root.querySelector("#mac-desktop-area");
    this._dockEl = root.querySelector("#mac-dock");
    this._clockEl = root.querySelector("#mac-clock");
    this._buildIcons();
    this._tickClock();
  }

  _buildIcons() {
    const icons = [
      {
        id: "about",
        label: "About Me",
        image: "assets/icons/arc.png",
        title: "About Me",
      },
      {
        id: "projects",
        label: "Projects",
        image: "assets/icons/stickies.png",
        title: "Projects",
      },
      {
        id: "skills",
        label: "Skills",
        image: "assets/icons/terminal.png",
        title: "Skills",
      },
      {
        id: "contact",
        label: "Contact",
        image: "assets/icons/contacts.png",
        title: "Contact",
      },
      {
        id: "resume",
        label: "Résumé",
        image: "assets/icons/textedit.png",
        title: "Résumé",
      },
    ];
    // Store for dock usage
    this._appMeta = Object.fromEntries(icons.map((i) => [i.id, i]));
    icons.forEach((icon) => {
      const el = document.createElement("div");
      el.className = "mac-icon";
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.dataset.appId = icon.id;
      el.innerHTML = `
        <div class="icon-img" aria-hidden="true"><img src="${icon.image}" alt="${icon.label}" /></div>
        <div class="label-bg">${icon.label}</div>
      `;
      el.addEventListener("click", (e) => this._handleIconClick(e, icon));
      el.addEventListener("dblclick", (e) => this._handleIconDblClick(e, icon));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._handleIconClick(e, icon);
        }
      });
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
    // Special-case: Projects should not create a window; launch the flow instead
    if (appId === "projects") {
      this._launchProjectsFlow();
      return;
    }
    if (this._openWindows.has(appId)) {
      const data = this._openWindows.get(appId);
      if (data && data.minimized) {
        this._restoreWindow(appId);
      } else {
        this._focusWindow(appId);
      }
      return;
    }
    const content = this._getAppContent(appId);
    const win = document.createElement("section");
    win.className = "mac-window";
    win.dataset.appId = appId;
    win.innerHTML = `
      <header class="titlebar">
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
    // Set initial inline styles for consistent positioning
    win.style.position = "absolute";
    win.style.left = "160px";
    win.style.top = "120px";
    win.style.width = "720px";
    win.style.height = "480px";
    requestAnimationFrame(() => win.classList.add("visible"));
    this._openWindows.set(appId, {
      el: win,
      state: {
        x: 160,
        y: 120,
        w: 720,
        h: 480,
      },
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
          html: `
            <div class="about-root">
              <div class="about-sections">
                <section id="about-section-eddie" class="about-section active" role="tabpanel" aria-labelledby="tab-eddie">
                  <div class="about-split">
                    <div class="about-photo">
                      <img src="assets/image.png" alt="Eddie" />
                    </div>
                    <div class="about-details">
                      <div class="detail-row">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">Eddie</div>
                      </div>
                      <div class="detail-row">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">email@gmail.com</div>
                      </div>
                      
                      <div class="detail-row">
                        <div class="detail-label">School</div>
                        <div class="detail-value">White Oaks SS (IB)</div>
                      </div>
                      <div class="detail-row">
                        <div class="detail-label">Location</div>
                        <div class="detail-value">Toronto, Ontario</div>
                      </div>
                      <div class="detail-row">
                        <div class="detail-label">About</div>
                        <div class="detail-value">I'm a Grade 11 IB student and developer who loves building. I love hackathons, sports, and exploring new technologies.</div>
                      </div>
                    </div>
                  </div>
                </section>

                
              </div>
            </div>
          `,
        };
      case "projects":
        // No window content; handled by _launchProjectsFlow
        return { title: "Projects", html: `<div></div>` };
      case "skills":
        return {
          title: "Terminal",
          html: `
            <div id="terminal-container" style="background: #ffffff; color: #000000; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; font-size: 12px; line-height: 1.4; height: 100%; padding: 24px 24px 0; overflow-y: auto; margin: -20px 0 0;">
              <div id="terminal-output">
                <div style="margin-bottom: 12px;">
                  <span style="color: #007aff;">Eddie@MacBook</span>
                  <span style="color: #000000;"> ~ % </span>
                  <span style="color: #d73a49;">help</span>
                </div>
                <div style="margin-bottom: 12px; color: #6f42c1; font-weight: 600;">Available Commands:</div>
                <div style="margin-bottom: 8px; margin-left: 16px;">
                  <span style="color: #d73a49;">skills</span> - Display programming skills and technologies
                </div>
                <div style="margin-bottom: 8px; margin-left: 16px;">
                  <span style="color: #d73a49;">experience</span> - Show work experience and projects
                </div>
                <div style="margin-bottom: 8px; margin-left: 16px;">
                  <span style="color: #d73a49;">contact</span> - Open Contact window
                </div>
                <div style="margin-bottom: 8px; margin-left: 16px;">
                  <span style="color: #d73a49;">clear</span> - Clear the terminal screen
                </div>
                <div style="margin-bottom: 8px; margin-left: 16px;">
                  <span style="color: #d73a49;">neofetch</span> - Show system information (ASCII)
                </div>
                <div style="margin-bottom: 8px; margin-left: 16px;">
                  <span style="color: #d73a49;">whoami</span> - Display user information
                </div>
                <div style="margin-bottom: 12px; margin-left: 16px;">
                  <span style="color: #d73a49;">help</span> - Show this help message
                </div>
              </div>
              <div id="terminal-input-line" style="display: flex; align-items: center;">
                <span style="color: #007aff;">Eddie@MacBook</span>
                <span style="color: #000000;"> ~ % </span>
                <input id="terminal-input" type="text" style="flex: 1; background: transparent; border: none; outline: none; color: #000000; font-family: inherit; font-size: inherit; margin-left: 4px; caret-color: #000000;" placeholder="Type a command..." />
              </div>
            </div>
          `,
        };
      case "contact":
        return {
          title: "Contacts",
          html: `
            <div style="background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif; height: 100%; display: flex;">
              <!-- Sidebar -->
              <div style="width: 200px; background: #f5f5f7; border-right: 1px solid #e5e5e7; padding: 16px 0; height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;">
                <div style="padding: 0 16px 16px; border-bottom: 1px solid #e5e5e7; margin-bottom: 16px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 16px;">E</div>
                    <div>
                      <div style="font-weight: 600; font-size: 13px; color: #1d1d1f;">Eddie</div>
                      <div style="font-size: 11px; color: #86868b;">Me</div>
                    </div>
                  </div>
                </div>
                <div style="padding: 0 16px;">
                  <div style="font-size: 11px; font-weight: 600; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">All Contacts</div>
                  <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #e3f2fd; border-radius: 6px; margin-bottom: 4px;">
                    <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px;">E</div>
                    <div style="font-size: 13px; color: #1d1d1f;">Eddie</div>
                  </div>
                </div>
              </div>
              
              <!-- Main Content -->
              <div style="flex: 1; padding: 32px; display: flex; flex-direction: column; height: 100%; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 32px;">
                  <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: 600;">E</div>
                  <div>
                    <h1 style="font-size: 28px; font-weight: 700; color: #1d1d1f; margin: 0 0 4px 0;">Eddie</h1>
                    <p style="font-size: 16px; color: #86868b; margin: 0;">Grade 11 IB Student</p>
                  </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                  <div>
                    <h3 style="font-size: 16px; font-weight: 600; color: #1d1d1f; margin: 0 0 12px 0;">Phone</h3>
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0;">
                      <span style="font-size: 14px; color: #86868b;">mobile</span>
                      <span style="font-size: 14px; color: #1d1d1f;">+1 (555) 123-4567</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 style="font-size: 16px; font-weight: 600; color: #1d1d1f; margin: 0 0 12px 0;">Email</h3>
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0;">
                      <span style="font-size: 14px; color: #86868b;">work</span>
                      <a href="mailto:eddie@example.com" style="font-size: 14px; color: #007aff; text-decoration: none;">eddie@example.com</a>
                    </div>
                  </div>
                  
                  <div>
                    <h3 style="font-size: 16px; font-weight: 600; color: #1d1d1f; margin: 0 0 12px 0;">Social</h3>
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0;">
                      <span style="font-size: 14px; color: #86868b;">GitHub</span>
                      <a href="https://github.com/B-Eddie" target="_blank" rel="noopener" style="font-size: 14px; color: #007aff; text-decoration: none;">@B-Eddie</a>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0;">
                      <span style="font-size: 14px; color: #86868b;">LinkedIn</span>
                      <a href="#" style="font-size: 14px; color: #007aff; text-decoration: none;">Eddie Smith</a>
                    </div>
                  </div>
                  
                  <div>
                    <h3 style="font-size: 16px; font-weight: 600; color: #1d1d1f; margin: 0 0 12px 0;">Address</h3>
                    <div style="font-size: 14px; color: #1d1d1f; line-height: 1.4;">
                      White Oaks Secondary School<br>
                      1330 Rebecca St<br>
                      Oakville, ON L6L 1Z7
                    </div>
                  </div>
                </div>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e7;">
                  <h3 style="font-size: 16px; font-weight: 600; color: #1d1d1f; margin: 0 0 12px 0;">Notes</h3>
                  <p style="font-size: 14px; color: #86868b; margin: 0; line-height: 1.4;">
                    Passionate developer and Grade 11 IB student. Love creating innovative solutions through code and participating in hackathons.
                  </p>
                </div>
              </div>
            </div>
          `,
        };
      case "resume":
        return {
          title: "Résumé",
          html: `
            <div class="resume-root" style="position: relative; inset: 0; height: 100%; width: 100%; background: #ffffff;">
              <object data="assets/resume.pdf" type="application/pdf" style="width: 100%; height: 100%;">
                <iframe src="assets/resume.pdf" style="width: 100%; height: 100%; border: none;">
                </iframe>
                <div style="padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;">
                  Your browser can't display PDFs here. 
                  <a href="assets/resume.pdf" target="_blank" rel="noopener">Open the resume</a>.
                </div>
              </object>
            </div>
          `,
        };
      default:
        return { title: "Info", html: `<h2>Info</h2><p>No content yet.</p>` };
    }
  }

  _attachWindowEvents(win, appId) {
    // Focus on click (including content area)
    const focusHandler = () => this._focusWindow(appId);
    win.addEventListener("mousedown", focusHandler);

    // Ensure content area can receive focus and scroll
    const content = win.querySelector(".content");
    if (content) {
      content.addEventListener("mousedown", (e) => {
        // Allow content to be focused when clicked
        content.focus();
        focusHandler();
      });
    }
    // Buttons
    win.querySelectorAll(".traffic-lights span").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        if (action === "close") this._closeWindow(appId);
        if (action === "minimize") this._minimizeWindow(appId);
        if (action === "zoom") this._zoomWindow(appId);
      });
    });

    // Titlebar element and prevent native dragstart (avoids ghost drag jump)
    const titlebar = win.querySelector(".titlebar");
    if (titlebar)
      titlebar.addEventListener("dragstart", (ev) => ev.preventDefault());

    // Dragging (transform-based to avoid layout shifts/jump)
    let drag = null;
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      // Only start dragging when pressing on the titlebar background (not the window controls)
      if (!e.target.closest(".titlebar")) return;
      if (e.target.closest(".traffic-lights")) return;
      e.preventDefault();
      const rect = win.getBoundingClientRect();
      // starting positions
      const styleLeft = parseFloat(win.style.left || rect.left) || rect.left;
      const styleTop = parseFloat(win.style.top || rect.top) || rect.top;
      drag = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: styleLeft,
        startTop: styleTop,
        rectWidth: rect.width,
        rectHeight: rect.height,
        pointerId: e.pointerId,
        _prevTransition: win.style.transition || "",
        // capture current computed transform so we can compose our translate
        baseTransform: getComputedStyle(win).transform || "none",
        lastLeft: styleLeft,
        lastTop: styleTop,
      };
      // lock inline position to avoid layout recalculation shifting the element
      win.style.left = `${drag.startLeft}px`;
      win.style.top = `${drag.startTop}px`;
      // prepare for transform-based dragging
      try {
        if (titlebar && e.pointerId && titlebar.setPointerCapture)
          titlebar.setPointerCapture(e.pointerId);
      } catch (err) {}
      win.style.willChange = "transform";
      // temporarily disable transform transitions to make dragging immediate
      win.style.transition = "none";
      win.classList.add("dragging");
      // Cursor feedback while dragging
      try {
        document.body.style.cursor = "grabbing";
      } catch (_) {}
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    };

    const onPointerMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      // desired (unclamped) positions
      let desiredLeft = drag.startLeft + dx;
      let desiredTop = drag.startTop + dy;
      // constraints
      const maxLeft = window.innerWidth - drag.rectWidth;
      const maxTop = window.innerHeight - drag.rectHeight;
      desiredLeft = Math.max(0, Math.min(maxLeft, desiredLeft));
      desiredTop = Math.max(60, Math.min(maxTop, desiredTop)); // account for menubar
      const translateX = desiredLeft - drag.startLeft;
      const translateY = desiredTop - drag.startTop;
      // apply transform composed with any base transform the window had
      const base =
        drag.baseTransform && drag.baseTransform !== "none"
          ? drag.baseTransform + " "
          : "";
      win.style.transform = `${base}translate(${translateX}px, ${translateY}px)`;
      drag.lastLeft = desiredLeft;
      drag.lastTop = desiredTop;
    };

    const onPointerUp = () => {
      if (!drag) return;
      try {
        if (
          titlebar &&
          drag &&
          drag.pointerId &&
          titlebar.releasePointerCapture
        )
          titlebar.releasePointerCapture(drag.pointerId);
      } catch (err) {}
      // commit using the last computed desired positions (avoids parsing transforms)
      const finalLeft = Math.round(
        drag.lastLeft != null ? drag.lastLeft : drag.startLeft
      );
      const finalTop = Math.round(
        drag.lastTop != null ? drag.lastTop : drag.startTop
      );
      // commit without visual jump: set inline left/top, force reflow, then remove transform
      win.style.left = finalLeft + "px";
      win.style.top = finalTop + "px";
      void win.offsetWidth;
      // remove only the translate we added; since we composed baseTransform + translate,
      // we can restore baseTransform (if any) or clear transform entirely.
      if (drag.baseTransform && drag.baseTransform !== "none") {
        win.style.transform = drag.baseTransform;
      } else {
        win.style.transform = "";
      }
      requestAnimationFrame(() => {
        try {
          win.style.transition = drag._prevTransition || "";
        } catch (err) {}
      });
      win.style.willChange = "";
      win.classList.remove("dragging");
      // update stored state
      const data = this._openWindows.get(appId);
      if (data) Object.assign(data.state, { x: finalLeft, y: finalTop });
      drag = null;
      try {
        document.body.style.cursor = "";
      } catch (_) {}
      window.removeEventListener("pointermove", onPointerMove);
    };
    if (titlebar) titlebar.addEventListener("pointerdown", onPointerDown);

    // Resizing by edge (no visible handles) -------------------------------------------------
    const edgeThreshold = 12; // px - increased for better usability
    let resizing = null;

    // Hover helper: change cursor when pointer is near an edge so users know
    // the window is resizable. This applies to all windows.
    const onWinHover = (e) => {
      // don't change cursor while actively dragging or resizing
      if (drag || resizing) return;
      const rect = win.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Use client dimensions to exclude scrollbar area
      const clientWidth = win.clientWidth;
      const clientHeight = win.clientHeight;
      const onLeft = x < edgeThreshold;
      const onRight = x > clientWidth - edgeThreshold;
      const onTop = y < edgeThreshold;
      const onBottom = y > clientHeight - edgeThreshold;
      let cursor = "";
      if ((onLeft && onTop) || (onRight && onBottom)) cursor = "nwse-resize";
      else if ((onRight && onTop) || (onLeft && onBottom))
        cursor = "nesw-resize";
      else if (onLeft || onRight) cursor = "ew-resize";
      else if (onTop || onBottom) cursor = "ns-resize";
      else cursor = "";
      win.style.cursor = cursor || "";
    };
    const onWinPointerLeave = () => {
      if (drag || resizing) return;
      win.style.cursor = "";
    };
    win.addEventListener("pointermove", onWinHover);
    win.addEventListener("pointerleave", onWinPointerLeave);

    const onWinPointerDown = (e) => {
      if (e.button !== 0) return;
      // ignore if clicking titlebar (drag) or controls
      if (e.target.closest(".titlebar")) return;
      const rect = win.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Use client dimensions to exclude scrollbar area for accurate resize detection
      const clientWidth = win.clientWidth;
      const clientHeight = win.clientHeight;
      const onLeft = x < edgeThreshold;
      const onRight = x > clientWidth - edgeThreshold;
      const onTop = y < edgeThreshold;
      const onBottom = y > clientHeight - edgeThreshold;
      if (!(onLeft || onRight || onTop || onBottom)) return;
      e.preventDefault();
      const resizeRect = win.getBoundingClientRect();
      // Store original styles and DOM position
      const originalTransition = win.style.transition;
      const originalBackdropFilter = win.style.backdropFilter;
      const nextSibling = win.nextSibling;
      const parent = win.parentNode;

      // Temporarily remove from DOM to isolate from layout interference
      parent.removeChild(win);

      // Set up for isolated resize
      win.style.position = "fixed";
      win.style.left = resizeRect.left + "px";
      win.style.top = resizeRect.top + "px";
      win.style.width = resizeRect.width + "px";
      win.style.height = resizeRect.height + "px";
      win.style.transform = "none";
      win.style.transition = "none !important";
      win.style.backdropFilter = "none";
      win.style.zIndex = "9999";
      // Disable content scrolling during resize to prevent layout shifts
      const content = win.querySelector(".content");
      if (content) {
        content.style.overflow = "hidden";
      }

      // Re-insert at end of body for isolation
      document.body.appendChild(win);

      resizing = {
        startX: e.clientX,
        startY: e.clientY,
        startRect: resizeRect,
        onLeft,
        onRight,
        onTop,
        onBottom,
        minWidth: 240,
        minHeight: 160,
        originalTransition,
        originalBackdropFilter,
        nextSibling,
        parent,
        pointerId: e.pointerId,
      };

      try {
        if (win.setPointerCapture) win.setPointerCapture(e.pointerId);
      } catch (err) {}
      win.classList.add("resizing");
      window.addEventListener("pointermove", onResizeMove);
      window.addEventListener("pointerup", onResizeUp, { once: true });
    };

    const onResizeMove = (e) => {
      if (!resizing) return;
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      let newLeft = resizing.startRect.left;
      let newTop = resizing.startRect.top;
      let newWidth = resizing.startRect.width;
      let newHeight = resizing.startRect.height;

      if (resizing.onLeft) {
        newLeft = resizing.startRect.left + dx;
        newWidth = resizing.startRect.width - dx;
      }
      if (resizing.onRight) {
        newWidth = resizing.startRect.width + dx;
      }
      if (resizing.onTop) {
        newTop = resizing.startRect.top + dy;
        newHeight = resizing.startRect.height - dy;
      }
      if (resizing.onBottom) {
        newHeight = resizing.startRect.height + dy;
      }

      // Apply constraints
      newWidth = Math.max(resizing.minWidth, newWidth);
      newHeight = Math.max(resizing.minHeight, newHeight);
      newLeft = Math.max(0, Math.min(window.innerWidth - newWidth, newLeft));
      newTop = Math.max(60, Math.min(window.innerHeight - newHeight, newTop));

      win.style.left = newLeft + "px";
      win.style.top = newTop + "px";
      win.style.width = newWidth + "px";
      win.style.height = newHeight + "px";
    };

    const onResizeUp = () => {
      if (!resizing) return;

      // Get final values from fixed positioning
      const finalLeft = parseFloat(win.style.left);
      const finalTop = parseFloat(win.style.top);
      const finalWidth = parseFloat(win.style.width);
      const finalHeight = parseFloat(win.style.height);

      // Calculate position relative to desktop container
      const desktopRect = resizing.parent.getBoundingClientRect();
      const relativeLeft = finalLeft - desktopRect.left;
      const relativeTop = finalTop - desktopRect.top;

      // Remove from body
      document.body.removeChild(win);

      // Restore original styles with corrected position
      win.style.position = "absolute";
      win.style.left = relativeLeft + "px";
      win.style.top = relativeTop + "px";
      win.style.width = finalWidth + "px";
      win.style.height = finalHeight + "px";
      win.style.zIndex = "";

      // Restore content scrolling
      const content = win.querySelector(".content");
      if (content) {
        content.style.overflow = "";
      }

      // Re-insert in original position
      if (resizing.nextSibling) {
        resizing.parent.insertBefore(win, resizing.nextSibling);
      } else {
        resizing.parent.appendChild(win);
      }

      // release pointer capture
      try {
        if (win.releasePointerCapture && resizing.pointerId)
          win.releasePointerCapture(resizing.pointerId);
      } catch (err) {}

      // Force layout and restore original styles
      void win.offsetWidth;
      requestAnimationFrame(() => {
        win.style.transition = resizing?.originalTransition || "";
        win.style.backdropFilter = resizing?.originalBackdropFilter || "";
      });

      win.classList.remove("resizing");

      // update stored state
      const data = this._openWindows.get(appId);
      if (data)
        Object.assign(data.state, {
          x: Math.round(relativeLeft),
          y: Math.round(relativeTop),
          w: Math.round(finalWidth),
          h: Math.round(finalHeight),
        });

      resizing = null;
      window.removeEventListener("pointermove", onResizeMove);
    };

    win.addEventListener("pointerdown", onWinPointerDown);

    // Terminal functionality for skills window
    if (appId === "skills") {
      this._initTerminal(win);
    }

    // About window tab interactions
    if (appId === "about") {
      this._initAboutTabs(win);
      this._initAboutTilt(win);
    }
  }

  _initAboutTabs(win) {
    const tabs = Array.from(win.querySelectorAll(".about-tab"));
    const sections = Array.from(win.querySelectorAll(".about-section"));
    if (!tabs.length || !sections.length) return;
    if (tabs.length === 1) {
      tabs[0].classList.add("active");
      tabs[0].setAttribute("aria-selected", "true");
      sections.forEach((s) => s.classList.add("active"));
      return;
    }
    const setActive = (key) => {
      tabs.forEach((t) => {
        const active = t.dataset.tab === key;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      sections.forEach((s) => {
        const idKey = s.id.replace("about-section-", "");
        s.classList.toggle("active", idKey === key);
      });
    };
    // Ensure first tab reflects active state
    const initial =
      tabs.find((t) => t.classList.contains("active"))?.dataset.tab ||
      tabs[0]?.dataset.tab;
    if (initial) setActive(initial);
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => setActive(tab.dataset.tab));
      tab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActive(tab.dataset.tab);
        }
      });
    });
    // Keyboard left/right navigation
    win.addEventListener("keydown", (e) => {
      if (!tabs.includes(document.activeElement)) return;
      const idx = tabs.indexOf(document.activeElement);
      if (e.key === "ArrowRight") {
        const next = tabs[(idx + 1) % tabs.length];
        next.focus();
      } else if (e.key === "ArrowLeft") {
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        prev.focus();
      }
    });
  }

  _initAboutTilt(win) {
    const img = win.querySelector(".about-photo img");
    const frame = win.querySelector(".about-photo");
    if (!img || !frame) return;
    frame.style.perspective = "800px";
    img.style.transformStyle = "preserve-3d";
    img.style.transition = "transform 120ms ease, box-shadow 120ms ease";
    const maxTilt = 10; // degrees
    const onMove = (e) => {
      const rect = frame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const y = (e.clientY - rect.top) / rect.height; // 0..1
      const tiltX = (0.5 - y) * (maxTilt * 2);
      const tiltY = (x - 0.5) * (maxTilt * 2);
      img.style.transform = `rotateX(${tiltX.toFixed(
        2
      )}deg) rotateY(${tiltY.toFixed(2)}deg) translateZ(8px)`;
      img.style.boxShadow = "0 12px 28px rgba(0,0,0,0.35)";
    };
    const onLeave = () => {
      img.style.transform = "rotateX(0) rotateY(0) translateZ(0)";
      img.style.boxShadow = "none";
    };
    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerleave", onLeave);
  }

  _initTerminal(win) {
    const input = win.querySelector("#terminal-input");
    const output = win.querySelector("#terminal-output");
    const inputLine = win.querySelector("#terminal-input-line");

    if (!input || !output) return;

    let commandHistory = [];
    let historyIndex = -1;
    let currentCommand = "";

    // No custom cursor element; rely on native input caret
    let cursorInterval = null;

    // Focus input when terminal is clicked
    win.addEventListener("click", () => {
      input.focus();
    });

    // Handle input events
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const command = input.value.trim();
        if (command) {
          commandHistory.unshift(command);
          historyIndex = -1;
          this._executeCommand(command, output);
        }
        input.value = "";
        currentCommand = "";
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length > 0) {
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            input.value = commandHistory[historyIndex];
          }
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          input.value = commandHistory[historyIndex];
        } else if (historyIndex === 0) {
          historyIndex = -1;
          input.value = currentCommand;
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        // Basic tab completion for common commands
        const partial = input.value.toLowerCase();
        const commands = [
          "help",
          "skills",
          "experience",
          "contact",
          "clear",
          "whoami",
          "neofetch",
        ];
        const match = commands.find((cmd) => cmd.startsWith(partial));
        if (match) {
          input.value = match;
        }
      }
    });

    input.addEventListener("input", () => {
      currentCommand = input.value;
    });

    // Focus input on window focus
    const focusHandler = () => {
      setTimeout(() => input.focus(), 100);
    };
    win.addEventListener("focus", focusHandler);

    // Clean up on window close
    const cleanup = () => {
      if (cursorInterval) clearInterval(cursorInterval);
    };
    win.addEventListener("close", cleanup);
  }

  _executeCommand(command, output) {
    const cmd = command.toLowerCase().trim();
    let response = "";

    // Add command to output
    const commandLine = document.createElement("div");
    commandLine.style.marginBottom = "8px";
    commandLine.innerHTML = `<span style="color: #007aff;">Eddie@MacBook</span> <span style="color: #000000;">~ % </span><span style="color: #d73a49;">${command}</span>`;
    output.appendChild(commandLine);

    // Execute command
    switch (cmd) {
      case "help":
        response = `
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Available Commands:</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">skills</span> - Display programming skills and technologies</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">experience</span> - Show work experience and projects</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">contact</span> - Open Contact window</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">clear</span> - Clear the terminal screen</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">whoami</span> - Display user information</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">help</span> - Show this help message</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">neofetch</span> - Show system information (ASCII)</div>
        `;
        break;

      case "skills":
        response = `
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Programming Languages:</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• JavaScript / TypeScript</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• Python</div>
          <div style="margin-left: 16px; margin-bottom: 8px;">• Go</div>
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Frameworks & Libraries:</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• React / Next.js</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• Three.js / WebGL</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• Node.js / Express</div>
          <div style="margin-left: 16px; margin-bottom: 8px;">• GSAP</div>
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Tools & Technologies:</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• Git / GitHub</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• Docker</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• VS Code</div>
          <div style="margin-left: 16px; margin-bottom: 8px;">• Figma</div>
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Currently Learning:</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• Advanced 3D Graphics</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• Machine Learning</div>
          <div style="margin-left: 16px;">• Cloud Architecture</div>
        `;
        break;

      case "experience":
        response = `
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Work Experience:</div>
          <div style="margin-left: 16px; margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">Grade 11 IB Student</div>
            <div style="color: #666; margin-bottom: 4px;">White Oaks Secondary School</div>
            <div>• Developing full-stack web applications</div>
            <div>• Participating in hackathons and coding competitions</div>
            <div>• Learning advanced programming concepts</div>
          </div>
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Projects:</div>
          <div style="margin-left: 16px;">
            <div>• <strong>Personal Portfolio</strong> - Interactive 3D website with macOS desktop simulation</div>
            <div>• <strong>WebGL Experiments</strong> - 3D graphics and animations</div>
            <div>• <strong>Full-Stack Applications</strong> - React, Node.js, and database projects</div>
          </div>
        `;
        break;

      case "contact": {
        // Open or focus the Contact window
        if (this._openWindows.has("contact")) {
          this._focusWindow("contact");
        } else {
          this._openAppWindow("contact");
        }
        response = `<div style="color: #6f42c1;">Opening Contact window…</div>`;
        break;
      }

      case "whoami":
        response = `
          <div style="margin-left: 16px;">
            <div style="font-weight: 600; margin-bottom: 4px;">Eddie</div>
            <div>Grade 11 IB Student</div>
            <div>White Oaks Secondary School</div>
            <div>Passionate Developer & Hackathon Enthusiast</div>
          </div>
        `;
        break;

      case "neofetch":
        response = `
          <pre style="font-family: monospace; color: #000; line-height: 1.05; margin: 0;">
  ____  _                 _               _
 |  _ \\| | ___   ___ __ _| |__  _   _ ___| |__
 | |_) | |/ _ \\ / __/ _\` | '_ \\| | | / __| '_ \\
 |  __/| | (_) | (_| (_| | |_) | |_| \\__ \\ | | |
 |_|   |_|\\___/ \\___\\__,_|_.__/ \\__,_|___/_| |_|

OS: macOS
Host: MacBook
Kernel: web-term
Uptime: 1 min
Packages: 42
Shell: web-terminal
Resolution: ${window.innerWidth}x${window.innerHeight}
CPU: WebGL (simulated)
Memory: ${Math.round(
          performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 128
        )}MB
          </pre>
        `;
        break;

      case "clear":
        // Clear all output except the current command line
        while (output.firstChild) {
          output.removeChild(output.firstChild);
        }
        return; // Don't add response for clear

      default:
        response = `<div style="color: #d73a49;">Command not found: ${command}</div><div style="color: #666;">Type 'help' to see available commands.</div>`;
    }

    if (response) {
      const responseDiv = document.createElement("div");
      responseDiv.style.marginBottom = "12px";
      responseDiv.innerHTML = response;
      output.appendChild(responseDiv);
    }

    // Scroll to bottom (use the scrollable container)
    const container = output && output.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else if (output) {
      output.scrollTop = output.scrollHeight;
    }
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
    this._removeDockItem(appId);
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
      data.minimized = true;
      this._addDockItem(appId);
      this._updateDockVisibility();
    }, 360);
  }

  _zoomWindow(appId) {
    const data = this._openWindows.get(appId);
    if (!data) return;
    const maximized = data.el.classList.toggle("zoomed");
    if (maximized) {
      // Save current state
      data.prevState = { ...data.state };
      // Maximize window
      data.state.x = window.innerWidth * 0.05;
      data.state.y = 60;
      data.state.w = window.innerWidth * 0.9;
      data.state.h = window.innerHeight - 110;

      data.el.style.left = data.state.x + "px";
      data.el.style.top = data.state.y + "px";
      data.el.style.width = data.state.w + "px";
      data.el.style.height = data.state.h + "px";
    } else if (data.prevState) {
      // Restore previous state
      data.state = { ...data.prevState };
      data.el.style.left = data.state.x + "px";
      data.el.style.top = data.state.y + "px";
      data.el.style.width = data.state.w + "px";
      data.el.style.height = data.state.h + "px";
      delete data.prevState;
    }
  }

  _markDockOpen(appId, open) {
    // No-op for highlighting open apps; we only show minimized ones
  }

  _launchProjectsFlow() {
    // Hide the desktop overlay, then drive the 3D zoom and show projects panel
    this.hide();
    // Prevent page scroll so the desktop overlay won't reappear during projects view
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      if (window.app && window.app.animationManager) {
        const anim = window.app.animationManager;
        const runner = anim.moveDownThenEngulf
          ? "moveDownThenEngulf"
          : anim.zoomOutRotateAndZoomIn
          ? "zoomOutRotateAndZoomIn"
          : "zoomToNotebook";
        anim[runner](() => {
          const existing = document.getElementById("projects-overlay-panel");
          if (existing) existing.remove();
          // Ensure handwriting font is loaded
          if (!document.getElementById("handwritten-font")) {
            const link = document.createElement("link");
            link.id = "handwritten-font";
            link.rel = "stylesheet";
            link.href =
              "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap";
            document.head.appendChild(link);
          }

          const panel = document.createElement("div");
          panel.id = "projects-overlay-panel";
          panel.style.position = "fixed";
          panel.style.inset = "0"; // full-screen overlay, background stays as 3D notebook
          panel.style.background = "transparent";
          panel.style.color = "#111";
          panel.style.zIndex = "12";
          panel.style.pointerEvents = "auto";
          panel.innerHTML = `
            <style>
              #projects-overlay-panel { font-family: 'Caveat', 'Patrick Hand', cursive; }
              #projects-overlay-panel .hand-header {
                position: fixed; top: 16px; left: 20px; right: 20px;
                display: flex; align-items: center; justify-content: space-between;
                pointer-events: none;
                z-index: 2;
              }
              #projects-overlay-panel .hand-title {
                font-size: clamp(26px, 4vw, 40px);
                font-weight: 700; letter-spacing: 0.5px;
                text-shadow: 0 1px 0 rgba(0,0,0,0.15);
              }
              #projects-overlay-panel .hand-actions { display: flex; gap: 10px; pointer-events: auto; }
              #projects-overlay-panel .hand-btn {
                background: #fffbcc; border: 2px solid #222; border-radius: 8px;
                padding: 6px 12px; cursor: pointer; font-weight: 700; font-size: 18px;
                box-shadow: 2px 2px 0 #222; transform: rotate(-1deg);
              }
              #projects-overlay-panel .hand-btn:hover { transform: rotate(1deg) translateY(-1px); }
              #projects-overlay-panel .hand-notes { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
              #projects-overlay-panel .note-card {
                position: absolute; width: clamp(180px, 22vw, 260px);
                background: #fffdf7;
                border: 2px solid rgba(0,0,0,0.85);
                border-radius: 10px; padding: 12px 14px 14px;
                box-shadow: 4px 4px 0 rgba(0,0,0,0.65);
                filter: contrast(0.98) saturate(1.02);
                cursor: pointer;
                pointer-events: auto;
                transition: box-shadow 120ms ease;
                transform: rotate(var(--tilt, 0deg));
              }
              #projects-overlay-panel .note-card:hover { transform: rotate(var(--tilt-opposite, 0deg)); }
              #projects-overlay-panel .note-title { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
              #projects-overlay-panel .note-body { font-size: 20px; line-height: 1.1; opacity: 0.9; }
              #projects-overlay-panel .note-img {
                width: 100%; height: auto; display: block; margin-bottom: 8px;
                background: #fff; border: 2px solid rgba(0,0,0,0.85); border-radius: 8px;
                box-shadow: 2px 2px 0 rgba(0,0,0,0.65);
              }
              #projects-overlay-panel .note-desc {
                display: none; margin-top: 6px; font-size: 18px; line-height: 1.15; opacity: 0.95;
              }
              #projects-overlay-panel .note-card.open { box-shadow: 6px 6px 0 rgba(0,0,0,0.75); }
              #projects-overlay-panel .note-card.open .note-desc { display: block; }
              @media (max-width: 820px) {
                #projects-overlay-panel .note-card { width: clamp(160px, 42vw, 220px); }
              }
            </style>
            <div class="hand-header">
              <div class="hand-title">Projects</div>
              <div class="hand-actions">
                <button id="projects-overlay-back" class="hand-btn">Go Back</button>
              </div>
            </div>
            <div class="hand-notes">
              <div class="note-card" style="left: 18%; top: 28%; --tilt: -3deg; --tilt-opposite: 3deg;" data-project="webgl">
                <img class="note-img" src="assets/image.png" alt="WebGL Experiment preview" />
                <div class="note-title">WebGL Experiment</div>
                <div class="note-body">Interactive shader toy and particle effects.</div>
                <div class="note-desc">Built with Three.js and GLSL. Features custom shaders, post-processing, and user-controlled parameters. Click again to collapse.</div>
              </div>
              <div class="note-card" style="left: 45%; top: 40%; --tilt: 2deg; --tilt-opposite: -2deg;" data-project="fullstack">
                <img class="note-img" src="assets/icons/terminal.png" alt="Full-Stack App preview" />
                <div class="note-title">Full-Stack App</div>
                <div class="note-body">React + Node with real-time features.</div>
                <div class="note-desc">End-to-end app with authentication, websockets, and a REST API. Deployed with CI/CD and containerized services.</div>
              </div>
              <div class="note-card" style="left: 68%; top: 24%; --tilt: -1.5deg; --tilt-opposite: 1.5deg;" data-project="dataviz">
                <img class="note-img" src="assets/icons/arc.png" alt="Data Viz preview" />
                <div class="note-title">Data Viz</div>
                <div class="note-body">D3/Plotly dashboards for insights.</div>
                <div class="note-desc">Interactive charts with tooltips, zooming, and filters. Optimized rendering for large datasets and responsive layouts.</div>
              </div>
            </div>
          `;
          document.body.appendChild(panel);
          const backBtn = panel.querySelector("#projects-overlay-back");
          if (backBtn) {
            backBtn.addEventListener("click", () => {
              try {
                if (
                  window.app &&
                  window.app.animationManager &&
                  window.app.animationManager.timeline &&
                  window.app.animationManager.timeline.scrollTrigger
                ) {
                  window.app.animationManager.timeline.scrollTrigger.enable();
                }
              } catch (_) {}
              if (window.macDesktop) window.macDesktop.show();
              panel.remove();
              document.body.style.overflow = prevBodyOverflow || "";
            });
          }
          // Toggle description on note click; only one open at a time
          const cards = panel.querySelectorAll(".note-card");
          cards.forEach((card) => {
            card.addEventListener("click", (e) => {
              // Ignore clicks on header buttons
              if (e.target.closest("#projects-overlay-back")) return;
              cards.forEach((c) => {
                if (c !== card) c.classList.remove("open");
              });
              card.classList.toggle("open");
            });
          });
        });
      } else {
        console.warn("Animation manager not available to zoom to notebook.");
      }
    } catch (err) {
      console.error("Failed to launch projects flow", err);
      document.body.style.overflow = prevBodyOverflow || "";
    }
  }

  _restoreWindow(appId) {
    const data = this._openWindows.get(appId);
    if (!data) return;
    data.minimized = false;
    const el = data.el;
    el.style.display = "block";
    // Animate back to normal
    el.style.transition = "transform 0.28s ease, opacity 0.28s ease";
    el.style.transformOrigin = "bottom center";
    // Force reflow to ensure transition applies
    void el.offsetWidth;
    el.style.transform = "scale(1) translateY(0)";
    el.style.opacity = "1";
    setTimeout(() => {
      el.style.transition = "";
    }, 300);
    this._removeDockItem(appId);
    this._updateDockVisibility();
    this._focusWindow(appId);
  }

  _addDockItem(appId) {
    if (!this._dockEl) return;
    const existing = this._dockEl.querySelector(`[data-app-id="${appId}"]`);
    if (existing) return;
    const meta = (this._appMeta && this._appMeta[appId]) || { label: appId };
    const btn = document.createElement("button");
    btn.className = "dock-item";
    btn.type = "button";
    btn.dataset.appId = appId;
    btn.setAttribute("role", "menuitem");
    btn.title = meta.title || meta.label || appId;
    btn.innerHTML = `
      <span class="dock-icon">${
        meta.image ? `<img src="${meta.image}" alt="">` : ""
      }</span>
      <span class="dock-label">${meta.label || appId}</span>
    `;
    btn.addEventListener("click", () => this._restoreWindow(appId));
    this._dockEl.appendChild(btn);
  }

  _removeDockItem(appId) {
    if (!this._dockEl) return;
    const el = this._dockEl.querySelector(`[data-app-id="${appId}"]`);
    if (el) el.remove();
  }

  _updateDockVisibility() {
    if (!this._dockEl) return;
    const hasItems = this._dockEl.children.length > 0;
    this._dockEl.style.display = hasItems ? "flex" : "none";
    if (this._root) {
      this._root.classList.toggle("has-dock", hasItems);
    }
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
    this._savedScrollFreezeY =
      window.scrollY || document.documentElement.scrollTop || 0;
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
    window.addEventListener("touchstart", this._touchStartHandler, {
      passive: false,
    });
    window.addEventListener("touchmove", this._touchMoveHandler, {
      passive: false,
    });
    window.addEventListener("keydown", this._keyHandler, true);
  }

  _disableScrollIntercept() {
    if (!this._intercepting) return;
    window.removeEventListener("wheel", this._wheelHandler, { passive: false });
    window.removeEventListener("touchstart", this._touchStartHandler, {
      passive: false,
    });
    window.removeEventListener("touchmove", this._touchMoveHandler, {
      passive: false,
    });
    window.removeEventListener("keydown", this._keyHandler, true);
    this._intercepting = false;
  }

  _onInterceptWheel(e) {
    if (!this._visible) return; // safety

    // Check if the scroll event originated from within a window's content area
    const target = e.target;
    const isInWindowContent = target.closest(".mac-window .content") !== null;

    if (isInWindowContent) {
      // Allow scroll events within window content to pass through
      return;
    }

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
    this._touchStartY =
      e.touches && e.touches.length ? e.touches[0].clientY : null;
  }
  _onTouchMove(e) {
    if (!this._visible) return;
    if (this._touchStartY == null) return;

    // Check if the touch event originated from within a window's content area
    const target = e.target;
    const isInWindowContent = target.closest(".mac-window .content") !== null;

    if (isInWindowContent) {
      // Allow touch events within window content to pass through
      return;
    }

    const currentY =
      e.touches && e.touches.length ? e.touches[0].clientY : null;
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

    // Check if the keyboard event originated from within a window's content area
    const target = e.target;
    const isInWindowContent = target.closest(".mac-window .content") !== null;

    if (isInWindowContent) {
      // Allow keyboard events within window content to pass through
      return;
    }

    const keysUp = ["ArrowUp", "PageUp", "Home", "k"]; // include vim-like k optionally
    if (keysUp.includes(e.key)) {
      this._upIntent += 40; // arbitrary increment
      if (this._upIntent >= this.options.unlockUpIntentPx) {
        this.hide();
        return;
      }
    }
    const blockKeys = [
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
    ]; // block while visible
    if (blockKeys.includes(e.key)) {
      e.preventDefault();
    }
  }

  _tickClock() {
    if (this._clockEl) {
      const now = new Date();
      const weekday = now.toLocaleDateString(undefined, { weekday: "short" });
      const month = now.toLocaleDateString(undefined, { month: "short" });
      const day = now.getDate();
      const dateStr = `${weekday} ${month} ${day}`;
      const time = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      this._clockEl.textContent = `${dateStr}\u2003${time}`;
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

  // Fast Mode Toggle
  const fastBtn = document.getElementById("fast-mode-btn");
  const fastMode = document.getElementById("fast-mode");
  const exitBtn = document.getElementById("exit-fast-mode");

  if (fastBtn && fastMode && exitBtn) {
    // Initially show the button
    fastBtn.style.opacity = "1";
    fastBtn.style.transform = "translate(-50%, -50%) scale(1)";

    fastBtn.addEventListener("click", () => {
      fastMode.style.display = "block";
      document.body.style.overflow = "hidden"; // Prevent background scroll
      // Hide the button after clicking
      fastBtn.style.opacity = "0";
      fastBtn.style.transform = "translate(-50%, -50%) scale(0)";
    });

    exitBtn.addEventListener("click", () => {
      fastMode.style.display = "none";
      document.body.style.overflow = "auto";
      // Show the button again when exiting fast mode
      const scrollProgress =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollProgress > 0.2 && scrollProgress < 0.9) {
        fastBtn.style.opacity = "1";
        fastBtn.style.transform = "translate(-50%, -50%) scale(1)";
      }
    });

    // Show/hide button based on scroll progress
    let buttonVisible = true; // Start as visible
    const showButton = () => {
      if (!buttonVisible) {
        buttonVisible = true;
        fastBtn.style.opacity = "1";
        fastBtn.style.transform = "translate(-50%, -50%) scale(1)";
      }
    };

    const hideButton = () => {
      if (buttonVisible) {
        buttonVisible = false;
        fastBtn.style.opacity = "0";
        fastBtn.style.transform = "translate(-50%, -50%) scale(0)";
      }
    };

    // Control button visibility based on scroll progress
    window.addEventListener("scroll", () => {
      const scrollProgress =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      console.log(scrollProgress);
      if (scrollProgress >= 0 && scrollProgress < 0.3) {
        showButton();
      } else {
        hideButton();
      }
    });
  }
});

export { MacDesktop };
