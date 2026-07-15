# eddiebian.me

Personal site. Scroll through a 3D laptop scene, then land on a desktop UI (Mac on desktop, iPhone-style on mobile). There's also a Fast Mode if you just want the text.

**Live:** [eddiebian.me](https://eddiebian.me)

## Stack

Three.js, GSAP (ScrollTrigger), vanilla JS/CSS. Hosted on GitHub Pages.

## Layout

```
index.html
styles.css
js/
  main.js          # boots the app
  scene.js         # Three.js setup
  laptop.js        # laptop model + screen
  animations.js    # scroll timeline
  desktop.js       # desktop/iOS overlay + apps
  config.js        # knobs for camera, lid, etc.
models/            # glb
assets/            # images, icons, resume
```

## Running locally

Just serve the folder — anything static works:

```bash
npx serve .
```

Then open the URL it prints.
