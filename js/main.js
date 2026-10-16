import { SceneManager } from "./scene.js";
import { LaptopModel } from "./laptop.js";

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
        this.laptopModel.ready
          .then(async () => {
            // Hide loading overlay once model is loaded
            const loading = document.getElementById("loading");
            if (loading) {
              loading.style.display = "none";
              document.body.classList.remove("is-loading");
              window.dispatchEvent(new Event("app-models-loaded"));
            }

            document.body.classList.add("scene-ready");
            const status = document.querySelector(".loading-progress");
            if (status) status.textContent = "3D desk ready. Scroll to open the laptop.";
            if (window.macDesktop?.visible) return;
            try {
              await window.gsapReady;
              if (window.macDesktop?.visible) return;
              const { AnimationManager } = await import("./animations.js");
              this.animationManager = new AnimationManager(
                this.sceneManager,
                this.laptopModel,
              );
            } catch (err) {
              console.error("Failed to initialize animations:", err);
            }
          })
          .catch((error) => {
            console.warn("The laptop model could not load.", error);
            window.macDesktop.show();
            window.macDesktop.toast(
              "The 3D desk couldn’t load. The desktop is ready to explore.",
            );
          });
      }

      this.setupEventListeners();
      // Mark running BEFORE starting loop so first frame renders
      this.isRunning = !window.macDesktop?.visible;
      this.startRenderLoop();

      window.app = this;
    } catch (error) {
      console.error("Failed to initialize app:", error);
      window.macDesktop.show();
      window.macDesktop.toast(
        "The 3D desk couldn’t load. The desktop is ready to explore.",
      );
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
        if (!window.macDesktop?.visible && !document.body.classList.contains("text-open")) this.resume();
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

export { App };
