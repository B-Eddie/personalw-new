# Eddie Bian - Interactive 3D Portfolio

An interactive, immersive portfolio website featuring a 3D animated laptop model built with Three.js, GSAP, and vanilla JavaScript.

**Live:** [eddiebian.me](https://eddiebian.me)

---

## 🎨 Features

- **3D Interactive Experience**: Dynamic 3D laptop model that responds to user interactions
- **Smooth Animations**: Scroll-triggered animations powered by GSAP and ScrollTrigger
- **Responsive Design**: Optimized for desktop, laptop, and mobile devices
- **macOS-Style UI**: Native-looking window components that match system aesthetics
- **Loading Animation**: Engaging code-rain loading overlay
- **Performance Optimized**: High-performance WebGL rendering with adaptive pixel ratios

---

## 🛠️ Tech Stack

### Core Libraries

- **[Three.js](https://threejs.org/)** — 3D graphics rendering
- **[GSAP](https://gsap.com/)** — Animation library with ScrollTrigger plugin
- **[ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)** — Modular JavaScript architecture

### Styling

- Vanilla CSS with responsive design patterns
- Custom animations and transitions

---

## 📁 Project Structure

```
├── index.html          # Main HTML entry point
├── styles.css          # Global styles and animations
├── js/
│   ├── main.js         # Application entry point
│   ├── scene.js        # Three.js scene setup and management
│   ├── laptop.js       # 3D laptop model
│   ├── animations.js   # Animation controller
│   ├── desktop.js      # Desktop/mobile responsive logic
│   ├── config.js       # Configuration constants
│   └── (additional modules)
├── models/             # 3D model assets
├── assets/             # Images and icons
└── CNAME              # Domain configuration for GitHub Pages
```

---

## 🚀 Getting Started

### Prerequisites

- Modern web browser with WebGL support
- Local development server (for CORS compliance with ES6 modules)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/[username]/personalw-new.git
   cd personalw-new
   ```

2. **Start a local development server**

   ```bash
   python -m http.server 8000
   # or
   npx http-server
   # or use your preferred local server
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

---

## 🎭 Key Components

### SceneManager (`js/scene.js`)

Handles Three.js scene initialization, camera setup, and WebGL renderer configuration.

### LaptopModel (`js/laptop.js`)

3D laptop model with interactive elements and responsive positioning based on device type.

### AnimationManager (`js/animations.js`)

Orchestrates scroll-triggered animations and real-time interactions using GSAP and ScrollTrigger.

### App (`js/main.js`)

Main application class that coordinates scene management, model loading, and animations with proper error handling.

---

## ⚙️ Configuration

Core settings can be customized in `js/config.js`:

- Camera position and field of view
- Lighting configuration
- Animation timings and easing functions
- Responsive breakpoints for desktop/laptop/mobile

---

## 🎬 Development

### Adding Animations

Animations are managed through the `AnimationManager` class. Use GSAP timelines and ScrollTrigger for scroll-based effects.

### Modifying 3D Model

Update the `LaptopModel` class to load different models or adjust geometry and materials.

### Styling

Edit `styles.css` to customize colors, layouts, and responsive behavior.

---

## 📱 Browser Support

- Chrome/Chromium (recommended for best performance)
- Firefox
- Safari
- Edge

Requires WebGL support and ES6 module compatibility.

---

## 🔗 Deployment

The site is deployed to GitHub Pages using the custom domain **eddiebian.me**.

To deploy your changes:

```bash
git add .
git commit -m "Update portfolio"
git push origin main
```

---

## 📄 License

© 2024 Eddie Bian. All rights reserved.

---

## 🤝 Contact

For inquiries or collaboration opportunities, visit [eddiebian.me](https://eddiebian.me)
