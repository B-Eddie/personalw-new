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
      state: { 
        x: 160, 
        y: 120, 
        w: win.offsetWidth || 720, 
        h: win.offsetHeight || 480 
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
            <div style="padding: 32px; background: #ffffff; min-height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: 600;">E</div>
                  <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px 0; letter-spacing: -0.02em;">Eddie</h1>
                  <p style="font-size: 16px; color: #6b7280; margin: 0; font-weight: 400;">Grade 11 IB Student • White Oaks SS</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
                  <div style="background: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
                    <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-size: 20px;">💻</span>
                    </div>
                    <h3 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px 0;">Developer</h3>
                    <p style="font-size: 14px; color: #64748b; margin: 0; line-height: 1.5;">Passionate about creating innovative solutions through code.</p>
                  </div>

                  <div style="background: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
                    <div style="width: 40px; height: 40px; background: #10b981; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-size: 20px;">🏆</span>
                    </div>
                    <h3 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px 0;">Hackathon Enthusiast</h3>
                    <p style="font-size: 14px; color: #64748b; margin: 0; line-height: 1.5;">Love building and competing in coding challenges.</p>
                  </div>
                </div>

                <div style="background: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
                  <h3 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0;">About</h3>
                  <p style="font-size: 15px; color: #374151; margin: 0; line-height: 1.6;">Hi there! I'm Eddie, a passionate developer and Grade 11 IB student at White Oaks Secondary School. I love turning ideas into reality through code, whether it's building web applications, experimenting with new technologies, or competing in hackathons.</p>
                </div>
              </div>
            </div>
          `,
        };
      case "projects":
        return {
          title: "Projects",
          html: `<h2>Projects</h2><p>Some highlighted works:</p><ul><li>Project A – WebGL experiment.</li><li>Project B – Full-stack application.</li><li>Project C – Data visualization.</li></ul>`,
        };
      case "skills":
        return {
          title: "Terminal",
          html: `
            <div id="terminal-container" style="background: #ffffff; color: #000000; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; font-size: 12px; line-height: 1.4; height: 100%; padding: 24px; overflow-y: auto; margin: -20px 0 -28px;">
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
                  <span style="color: #d73a49;">contact</span> - Display contact information
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
                <input id="terminal-input" type="text" style="flex: 1; background: transparent; border: none; outline: none; color: #000000; font-family: inherit; font-size: inherit; margin-left: 4px;" placeholder="Type a command..." />
                <span id="cursor" style="color: #000000;">█</span>
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
              <div style="width: 200px; background: #f5f5f7; border-right: 1px solid #e5e5e7; padding: 16px 0;">
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
              <div style="flex: 1; padding: 32px; display: flex; flex-direction: column;">
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
          html: `<h2>Résumé</h2><p>A concise overview:</p><ul><li>Experience at Company X</li><li>Open-source contributions</li><li>Continuous learner</li></ul><p>Download full résumé (coming soon).</p>`,
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
    const content = win.querySelector('.content');
    if (content) {
      content.addEventListener('mousedown', (e) => {
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
      const newLeft = drag.rect.left + dx;
      const newTop = drag.rect.top + dy;
      
      // Constrain to viewport bounds
      const maxLeft = window.innerWidth - drag.rect.width;
      const maxTop = window.innerHeight - drag.rect.height;
      const constrainedLeft = Math.max(0, Math.min(maxLeft, newLeft));
      const constrainedTop = Math.max(60, Math.min(maxTop, newTop)); // Account for menubar
      
      win.style.left = constrainedLeft + "px";
      win.style.top = constrainedTop + "px";
      
      // Update stored state
      const data = this._openWindows.get(appId);
      if (data) {
        data.state.x = constrainedLeft;
        data.state.y = constrainedTop;
      }
    };
    const onPointerUp = () => {
      drag = null;
      window.removeEventListener("pointermove", onPointerMove);
    };
    titlebar.addEventListener("pointerdown", onPointerDown);

    // Terminal functionality for skills window
    if (appId === "skills") {
      this._initTerminal(win);
    }
  }

  _initTerminal(win) {
    const input = win.querySelector("#terminal-input");
    const output = win.querySelector("#terminal-output");
    const cursor = win.querySelector("#cursor");
    const inputLine = win.querySelector("#terminal-input-line");

    if (!input || !output) return;

    let commandHistory = [];
    let historyIndex = -1;
    let currentCommand = "";

    // Cursor blinking animation
    let cursorVisible = true;
    const blinkCursor = () => {
      cursor.style.opacity = cursorVisible ? "1" : "0";
      cursorVisible = !cursorVisible;
    };
    const cursorInterval = setInterval(blinkCursor, 500);

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
  const commands = ["help", "skills", "experience", "contact", "clear", "whoami", "neofetch"];
        const match = commands.find(cmd => cmd.startsWith(partial));
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
      clearInterval(cursorInterval);
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
          <div style="margin-left: 16px; margin-bottom: 4px;"><span style="color: #d73a49;">contact</span> - Display contact information</div>
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

      case "contact":
        response = `
          <div style="color: #6f42c1; font-weight: 600; margin-bottom: 8px;">Contact Information:</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><strong>Email:</strong> eddie@example.com</div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><strong>GitHub:</strong> <span style="color: #007aff;">https://github.com/B-Eddie</span></div>
          <div style="margin-left: 16px; margin-bottom: 4px;"><strong>Phone:</strong> +1 (555) 123-4567</div>
          <div style="margin-left: 16px;"><strong>Location:</strong> White Oaks Secondary School, Oakville, ON</div>
        `;
        break;

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
Memory: ${(Math.round(performance.memory ? performance.memory.usedJSHeapSize/1048576 : 128))}MB
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

    // Scroll to bottom
    output.scrollTop = output.scrollHeight;
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
    const isInWindowContent = target.closest('.mac-window .content') !== null;
    
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
    const isInWindowContent = target.closest('.mac-window .content') !== null;
    
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
    const isInWindowContent = target.closest('.mac-window .content') !== null;
    
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
