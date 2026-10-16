// Selected public work. Swarm and Nudge descriptions checked against their repositories.
export const projects = [
  {
    id: "swarm", name: "Swarm · YiQun", category: "hackathon",
    kind: "Swarm robotics", image: "assets/projects/swarm.png", color: "#dce7df",
    badge: "Hack the North · winner",
    description: "Small robots. One shared rescue mission.",
    detail: "A simulated search-and-rescue swarm with scouts, diggers, carriers, and relays. Decentralized coordination lets different robots explore uncertain terrain and work together to find and evacuate casualties. Built for Hack the North, where we won with Swarm.",
    stack: ["Python", "Godot", "Robotics", "Multi-agent systems"],
    url: "https://swarm-website-omega.vercel.app/",
    source: "https://github.com/ImperialKoi/swarm-robotics-openJiuwen",
  },
  {
    id: "nudge", name: "Nudge", category: "web", kind: "macOS companion",
    image: "assets/projects/nudge.png", color: "#eee9d8", badge: "Made for macOS",
    description: "A little desktop friend. A healthier screen day.",
    detail: "A desktop companion that gets tired as your work stretch grows, then recovers when you take a break. Nudge pairs expressive pixel-art pets with app-aware reminders, eye rests, stretches, breathing breaks, and activity insights. Pick it up, pet it, or perch it on a window.",
    stack: ["Tauri", "Rust", "TypeScript", "macOS"],
    url: "https://nudge-nine-flame.vercel.app/",
    source: "https://github.com/B-Eddie/nudge",
  },
  {
    id: "vertex",
    name: "Vertex",
    category: "web",
    kind: "Community platform",
    image: "assets/vertex.png",
    color: "#dfeae1",
    badge: "1st place · CNLC",
    description: "Making the first 40 volunteer hours a little easier.",
    detail:
      "A platform connecting Ontario high school students with volunteer opportunities. Search and filtering, real-time applications, ratings, hours tracking, and separate spaces for students, businesses, and educators.",
    stack: ["Next.js", "TypeScript", "Supabase", "PostgreSQL"],
    url: "https://fblc-26.vercel.app/",
  },
  {
    id: "tangenai",
    name: "TangenAI",
    category: "web",
    kind: "Finance & AI",
    image: "assets/tangenai.png",
    color: "#e6e4f2",
    badge: "DECA · ICDC qualified",
    description: "Finding signals in the noise of financial news.",
    detail:
      "An Expo and React Native app that analyzes financial news sentiment to identify stock trend signals. Qualified for the DECA International Career Development Conference.",
    stack: ["React Native", "Expo", "Sentiment analysis"],
    url: "https://tangenai.vercel.app/",
  },
  {
    id: "pewpew",
    name: "Pew Pew",
    category: "hackathon",
    kind: "Security tooling",
    glyph: ">_",
    color: "#202f36",
    badge: "Hack the North · sponsor prize",
    description: "Turning intrusion logs into a story you can follow.",
    detail:
      "A FastAPI security tool that converts legacy CCDC intrusion logs into visual attack timelines, mapping compromised hosts and threat actors. Won a sponsor prize among 850+ hackers at Hack the North.",
    stack: ["Python", "FastAPI", "Data visualization"],
  },
  {
    id: "goose",
    name: "Goose Patrol",
    category: "hackathon",
    kind: "Computer vision",
    glyph: "🪿",
    color: "#e9e5c8",
    badge: "Jamhacks · best marketed",
    description: "An extremely Canadian computer vision problem.",
    detail:
      "The Goose Dropping Detection project: a Raspberry Pi computer vision system detecting goose droppings in real time to help maintain safer paths. Awarded Best Marketed among 200+ participants at Jamhacks.",
    stack: ["Raspberry Pi", "Python", "Computer vision"],
  },

];

const symbols = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  external: '<path d="M13 5h6v6m0-6-9 9M9 5H5v14h14v-4"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  sliders:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  mountain: '<path d="m2 20 8-15 5 9 3-5 5 11Zm5-9 3 2 3-2"/>',
  trophy:
    '<path d="M8 3h8v6a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v6m-4 2h8"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  book: '<path d="M12 6c-3-3-7-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>',
};
export function symbol(name, cls = "") {
  return `<svg class="symbol ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name] || symbols.grid}</svg>`;
}

export const apps = [
  { id: "about", name: "About Me", subtitle: "Meet Eddie", icon: "welcome" },
  {
    id: "projects",
    name: "Projects",
    subtitle: "Things I’ve made",
    icon: "finder",
  },
  {
    id: "terminal",
    name: "Terminal",
    subtitle: "A little under the hood",
    icon: "terminal",
  },
  {
    id: "notes",
    name: "Notes",
    subtitle: "A scratchpad for your visit",
    icon: "notes",
  },
  { id: "contact", name: "Contact", subtitle: "Say hello", icon: "mail" },
  { id: "game", name: "Tiny Break", subtitle: "A memory game", icon: "game" },
  {
    id: "settings",
    name: "Appearance",
    subtitle: "Make yourself at home",
    icon: "settings",
  },
  { id: "resume", name: "Résumé", subtitle: "The PDF version", icon: "resume" },
];

export function appIcon(kind) {
  const files = {
    welcome: "assets/icons/arc.png",
    finder: "assets/icons/native/finder.png",
    terminal: "assets/icons/terminal.png",
    notes: "assets/icons/native/notes.png",
    mail: "assets/icons/native/contacts.png",
    game: "assets/icons/native/games.png",
    settings: "assets/icons/native/settings.png",
    resume: "assets/icons/native/preview.png",
  };
  return `<img class="app-art" src="${files[kind] || files.finder}" alt="" draggable="false"/>`;
}

export function welcomeContent() {
  return `<div class="arc-app">
  <aside class="arc-sidebar">
    <button class="arc-address" data-command="spotlight" aria-label="Search this desktop"><span class="arc-address-label">eddiebian.me</span><span>⌘ K</span></button>
    <div class="arc-favorites"><a href="https://github.com/B-Eddie" target="_blank" rel="noopener" aria-label="GitHub">${symbol("code")}</a><button data-open="contact" aria-label="Contact Eddie">${symbol("mail")}</button><button data-open="resume" aria-label="Open résumé">${symbol("book")}</button></div>
    <p class="arc-space"><span>✳</span> Personal <span class="arc-space-more">···</span></p>
    <nav aria-label="About tabs"><button class="selected" data-about-tab="home"><img src="assets/image.png" alt=""/> Eddie Bian <span class="arc-tab-close">×</span></button><button data-about-tab="story">${symbol("book")} The story so far</button><button data-about-tab="toolkit">${symbol("code")} My toolkit</button><div class="arc-sidebar-rule"></div><span class="arc-folder">${symbol("folder")} Things I’ve built</span><a href="https://swarm-website-omega.vercel.app/" target="_blank" rel="noopener"><img src="assets/projects/swarm.png" alt=""/> Swarm · YiQun ${symbol("external")}</a><a href="https://nudge-nine-flame.vercel.app/" target="_blank" rel="noopener"><img src="assets/projects/nudge.png" alt=""/> Nudge ${symbol("external")}</a><button data-open="projects">${symbol("folder")} All projects</button><button data-open="game">${symbol("grid")} Take a break</button></nav>
    <button class="arc-new-tab" data-command="spotlight"><span>＋</span> New Tab <kbd>⌘ K</kbd></button>
    <div class="arc-sidebar-bottom"><button data-open="notes" aria-label="Open Notes">${symbol("book")}</button><div><button class="selected" data-about-tab="home" aria-label="Personal space">✳</button><button data-about-tab="story" aria-label="Story space">${symbol("book")}</button><button data-about-tab="toolkit" aria-label="Code space">${symbol("code")}</button></div><button data-command="spotlight" aria-label="New tab">＋</button></div>
  </aside>
  <div class="arc-main"><nav class="mobile-about-tabs" aria-label="About sections"><button class="selected" data-about-tab="home" aria-pressed="true">About</button><button data-about-tab="story" aria-pressed="false">Story</button><button data-about-tab="toolkit" aria-pressed="false">Toolkit</button></nav>
   <article class="welcome-page arc-panel" data-panel="home"><div class="welcome-eyebrow"><span class="status-dot"></span> Welcome to my desktop</div><div class="welcome-heading"><div><p>Hey, I’m</p><h1>Eddie Bian<span>.</span></h1></div><img class="profile-avatar" src="assets/image.png" alt="Eddie’s programming avatar"/></div><p class="welcome-intro">Competitive programmer. Full-stack developer.<br>Curious about how things work, and what I can build next.</p><div class="interest-line"><span>${symbol("code")} Building things</span><span>${symbol("trophy")} Hackathons</span><span>${symbol("mountain")} Snowboarding</span></div><div class="welcome-actions"><button class="primary-button" data-open="projects">Open my projects ${symbol("arrow")}</button><button class="text-button" data-open="contact">Get in touch ${symbol("external")}</button></div><div class="welcome-bottom"><div><span class="section-caption">HACK THE NORTH · WINNER</span><strong>A little robot. A bigger purpose.</strong><p>Swarm brings a team of robots together for<br>simulated search and rescue.</p><button class="text-button" data-open="projects" data-project-open="swarm">Take a look ${symbol("arrow")}</button></div><button class="mini-project" data-open="projects" data-project-open="swarm"><img src="assets/projects/swarm.png" alt="Swarm rescue simulation"/></button></div><footer class="browser-footer"><span>Toronto, Canada</span><span>There’s more in the Dock. ↓</span></footer></article>
   <article class="arc-panel story-page" data-panel="story" hidden><p class="eyebrow">About me</p><h1>The story so far.</h1><p>I’m an IB student, competitive programmer, and full-stack developer. I like building useful tools, solving hard problems, and seeing what a small team can make at a hackathon.</p><div class="story-entry"><span>In the classroom</span><h2>Learning, then passing it on.</h2><p>Training Executive for DECA and Computer Science, and Logistics Executive for Robotics. Workshops, programming lessons, team mentoring, and making events happen.</p></div><div class="story-entry"><span>At the hackathon</span><h2>Small teams. Ambitious ideas.</h2><p>A winning swarm robotics project at Hack the North. A security tool that untangles intrusion logs. A computer vision experiment at Jamhacks. I like seeing how far a small team can take an idea.</p></div><div class="story-entry"><span>Away from the keyboard</span><h2>A little mountain time.</h2><p>As a snowboard volunteer at Glen Eden, I coached beginner riders on terrain navigation and safety.</p></div><button class="primary-button" data-open="resume">Read my résumé ${symbol("arrow")}</button></article>
   <article class="arc-panel story-page" data-panel="toolkit" hidden><p class="eyebrow">My toolkit</p><h1>Whatever the problem needs.</h1><p>A few of the languages and tools I work with.</p><div class="toolkit-row"><h2>Languages</h2><p>Python, JavaScript, TypeScript, Java, C++</p></div><div class="toolkit-row"><h2>Web, mobile & desktop</h2><p>React, Next.js, FastAPI, Expo, React Native, Tauri, Rust</p></div><div class="toolkit-row"><h2>Data & tools</h2><p>Supabase, PostgreSQL, Git, Figma, Three.js, GSAP</p></div><button class="text-button" data-open="terminal">Try the interactive terminal ${symbol("arrow")}</button></article>
  </div></div>`;
}

export function projectsContent() {
  return `<div class="finder-app"><aside class="finder-sidebar"><p>Favorites</p><button class="selected" data-filter="all">${symbol("folder")} All Projects <small>${projects.length}</small></button><button data-filter="web">${symbol("code")} Web & Apps</button><button data-filter="hackathon">${symbol("trophy")} Hackathons</button><p>Locations</p><a href="https://github.com/B-Eddie" target="_blank" rel="noopener">${symbol("code")} GitHub ${symbol("external")}</a><button data-open="resume">${symbol("book")} Résumé</button><p>Tags</p><div class="finder-tags"><span><i></i> Built with purpose</span><span><i></i> Just for fun</span></div></aside><div class="finder-main"><div class="finder-toolbar"><strong>Projects</strong><div class="finder-view-switch" aria-label="Project view"><button class="selected" data-project-view="icons" aria-label="Icon view" aria-pressed="true">${symbol("grid")}</button><button data-project-view="list" aria-label="List view" aria-pressed="false">☷</button></div><label class="project-search">${symbol("search")}<input type="search" placeholder="Search" aria-label="Search projects"/></label></div><div class="project-grid"></div><footer class="finder-status"></footer></div></div>`;
}

export function contactContent() {
  return `<div class="contacts-layout"><aside><div class="contacts-search">${symbol("search")} Search</div><p>iCloud</p><button class="selected"><img src="assets/image.png" alt=""/><span>Eddie Bian<small>My Card</small></span></button></aside><article class="contact-app"><header class="contact-hero"><img src="assets/image.png" alt="Eddie’s programming avatar"/><div><h1>Eddie Bian</h1><p>Developer · Toronto, Canada</p></div></header><div class="contact-quick-actions"><a href="mailto:eddie.bian@yahoo.com">${symbol("mail")}<span>Email</span></a><a href="https://github.com/B-Eddie" target="_blank" rel="noopener">${symbol("code")}<span>GitHub</span></a><button data-open="resume">${symbol("book")}<span>Résumé</span></button></div><p class="contact-intro">Have a project idea, a hackathon team, or a good programming problem? Say hello.</p><div class="contact-links"><a href="mailto:eddie.bian@yahoo.com"><span>email</span><strong>eddie.bian@yahoo.com</strong></a><a href="https://github.com/B-Eddie" target="_blank" rel="noopener"><span>GitHub</span><strong>github.com/B-Eddie ↗</strong></a><a href="https://linkedin.com/in/eddiebian" target="_blank" rel="noopener"><span>LinkedIn</span><strong>linkedin.com/in/eddiebian ↗</strong></a></div><button class="text-button copy-email" data-command="copy-email">Copy email address</button></article></div>`;
}
