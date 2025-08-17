// Scroll-based opening + approach animation
export class AnimationManager {
  constructor(sceneManager, laptopModel) {
    this.gsap = window.gsap;
    this.ScrollTrigger = window.ScrollTrigger;
    this.sceneManager = sceneManager;
    this.laptopModel = laptopModel;
    this.init();
  }

  init() {
    this.gsap.registerPlugin(this.ScrollTrigger);
    const root =
      this.laptopModel.getRootGroup && this.laptopModel.getRootGroup();
    if (root) this._initialScale = root.scale.clone();
    this.setupOpenLaptopScroll();
  }

  setupOpenLaptopScroll() {
    const hinge = this.laptopModel.getHingeGroup();
    const root =
      this.laptopModel.getRootGroup && this.laptopModel.getRootGroup();
    if (!hinge || !root) return;

    // Define where the engulf phase begins in timeline progress (0..1 of timeline duration)
    const ENGULF_START = 0.5; // matches the placement of second-phase tweens below

    const tl = this.gsap.timeline({
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          // Start boot progress only once engulf begins; progress 0 until ENGULF_START
          if (this.laptopModel.updateBootScreenProgress) {
            let p = 0;
            if (self.progress > ENGULF_START) {
              p = (self.progress - ENGULF_START) / (1 - ENGULF_START);
              if (p > 1) p = 1;
              else if (p < 0) p = 0;
            }
            this.laptopModel.updateBootScreenProgress(p);
          }
        },
      },
    });

    // Phase 1: Open lid & tilt
    tl.to(
      hinge.rotation,
      {
        x: 0.1,
        ease: "none",
        duration: 0.5,
      },
      0
    );

    tl.to(root.rotation, { x: -0.9, ease: "none", duration: 0.5 }, 0);

    // Move the entire computer down during lid opening
    tl.to(
      root.position,
      {
        z: 1.5,
        ease: "none",
        duration: 0.5,
      },
      0
    );

    // Phase 2: Engulf / approach sequence after fully open
    tl.to(
      root.position,
      {
        z: root.position.z + 4,
        y: 0,
        ease: "power1.out",
        duration: 0.5,
      },
      0.5
    );

    // Additional scale up
    tl.to(
      root.scale,
      {
        x: (this._initialScale ? this._initialScale.x : root.scale.x) * 3,
        y: (this._initialScale ? this._initialScale.y : root.scale.y) * 3,
        z: (this._initialScale ? this._initialScale.z : root.scale.z) * 3,
        ease: "power1.out",
        duration: 0.5,
      },
      0.5
    );

    // Extra tilt for engulf
    tl.to(
      root.rotation,
      {
        x: -1.32,
        ease: "power1.out",
        duration: 0.5,
      },
      0.5
    );
  }

  // Method to reset animations
  reset() {
    this.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    this.init();
  }
}
