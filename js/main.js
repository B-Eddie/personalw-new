import { SceneManager } from "./scene.js";
import { LaptopModel } from "./laptop.js";
import { AnimationManager } from "./animations.js";
import { CONFIG } from "./config.js";

// Main application entry point
class App {
  constructor() {
    this.sceneManager = null;
    this.laptopModel = null;
    this.animationManager = null;

    this.isRunning = false;

    this.init();
  }

  async init() {
    try {
      // Initialize scene manager first
      this.sceneManager = new SceneManager();

      // Ensure scene is properly initialized
      const scene = this.sceneManager.getScene();

      if (!scene) {
        throw new Error("Scene failed to initialize");
      }

      // Initialize laptop model with scene
      this.laptopModel = new LaptopModel(scene);

      // Wait for the model to finish loading before setting up animations
      if (this.laptopModel.ready) {
        this.laptopModel.ready.then(() => {
          this.animationManager = new AnimationManager(
            this.sceneManager,
            this.laptopModel
          );
        });
      }

      this.setupEventListeners();
      // Mark running BEFORE starting loop so first frame renders
      this.isRunning = true;
      this.startRenderLoop();

      window.app = this;
    } catch (error) {
      console.error("Failed to initialize app:", error);
      console.error("Error stack:", error.stack);
    }
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener("resize", () => {
      if (this.sceneManager) {
        this.sceneManager.resize();
      }
    });

    // Handle visibility change (pause/resume on tab switch)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  startRenderLoop() {
    if (this._loopStarted) return; // prevent multiple loops
    this._loopStarted = true;
    const animate = () => {
      requestAnimationFrame(animate);
      if (this.isRunning && this.sceneManager) {
        this.sceneManager.render();
      }
    };
    animate();
  }

  pause() {
    this.isRunning = false;
  }

  resume() {
    this.isRunning = true;
  }

  // Utility method to get app status
  getStatus() {
    return { isRunning: this.isRunning };
  }

  // Display help information
  showHelp() {}
}

// Wait for DOM to be ready and all scripts to load
document.addEventListener("DOMContentLoaded", () => {
  // Small delay to ensure all external libraries are loaded
  setTimeout(() => {
    if (window.gsap && window.ScrollTrigger) {
      window.app = new App();
    } else {
      console.error("Required libraries not loaded");
    }
  }, 100);
});
