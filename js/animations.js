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
    if (root) {
      this._initialScale = root.scale.clone();
      this._initialTransform = {
        pos: root.position.clone(),
        rot: root.rotation.clone(),
        scale: root.scale.clone(),
      };
    }
    this.setupOpenLaptopScroll();
  }

  // Restore the laptop root to the initial transform captured at init()
  resetRootToInitialTransform() {
    const root =
      this.laptopModel.getRootGroup && this.laptopModel.getRootGroup();
    if (!root || !this._initialTransform) return;
    root.position.copy(this._initialTransform.pos);
    root.rotation.copy(this._initialTransform.rot);
    root.scale.copy(this._initialTransform.scale);
  }

  setupOpenLaptopScroll() {
    const hinge = this.laptopModel.getHingeGroup();
    const root =
      this.laptopModel.getRootGroup && this.laptopModel.getRootGroup();
    if (!hinge || !root) return;

    // Define where the engulf phase begins in timeline progress (0..1 of timeline duration)
    const ENGULF_START = 0.5; // matches the placement of second-phase tweens below
    this.ENGULF_START = ENGULF_START;

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
    // Keep a reference for programmatic control
    this.timeline = tl;

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
        // Because we start farther away (negative z), move slightly forward but still distant
        z: root.position.z + 1.5,
        ease: "none",
        duration: 0.5,
      },
      0
    );

    // Phase 2: Engulf / approach sequence after fully open
    tl.to(
      root.position,
      {
        z: root.position.z + 8, // y value when zooming in
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

    // Precompute end-state targets for manual programmatic animations
    if (!this._engulfTarget) {
      const baseZ = this._initialTransform
        ? this._initialTransform.pos.z
        : root.position.z;
      this._engulfTarget = {
        z: baseZ + 1.5 + 8,
        y: 0,
        rotX: -1.32,
        scaleX: (this._initialScale ? this._initialScale.x : root.scale.x) * 3,
        scaleY: (this._initialScale ? this._initialScale.y : root.scale.y) * 3,
        scaleZ: (this._initialScale ? this._initialScale.z : root.scale.z) * 3,
      };
    }
  }

  // Method to reset animations
  reset() {
    this.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    this.init();
  }

  // Programmatically drive the zoom to the notebook (engulf end)
  zoomToNotebook(onComplete) {
    const seq = gsap.timeline();
    // Use relative offsets to guarantee visible change
    const dy = -1.0; // downwards in world Y
    const dz = 1.2; // slight push-in
    const dx = -0.2; // small left nudge (negative = left)
    const s = 1.12; // slight scale up
    seq.to(root.position, {
      y: root.position.y + dy,
      duration: 0.45,
      ease: "power2.out",
    });
    seq.to(
      root.position,
      { z: root.position.z + dz, duration: 0.6, ease: "power2.inOut" },
      "<+0.05"
    );
    seq.to(
      root.position,
      { x: root.position.x + dx, duration: 0.6, ease: "power2.inOut" },
      "<"
    );
    seq.to(
      root.scale,
      {
        x: root.scale.x * s,
        y: root.scale.y * s,
        z: root.scale.z * s,
        duration: 0.6,
        ease: "power2.inOut",
      },
      "<"
    );
    seq.add(() => {
      if (typeof onComplete === "function") onComplete();
    });
    // Step 2: rotate forward to align with notebook
    seq.to(
      root.rotation,
      { x: targetRotX, duration: 0.5, ease: "power2.inOut" },
      ">-=0.05"
    );
    // Step 3: move towards notebook and scale up to engulf
    if (end) {
      seq.to(
        root.position,
        { z: end.z, y: end.y, duration: 0.9, ease: "power2.in" },
        ">-=0.05"
      );
      seq.to(
        root.scale,
        {
          x: end.scaleX,
          y: end.scaleY,
          z: end.scaleZ,
          duration: 0.9,
          ease: "power2.in",
        },
        "<"
      );
      // Keep facing forward; optionally micro-adjust at the end
      seq.to(
        root.rotation,
        { x: targetRotX, duration: 0.2, ease: "none" },
        "<"
      );
    }
    seq.add(() => {
      if (typeof onComplete === "function") onComplete();
    });
  }

  // Simplified click-driven sequence: only move down on Y, then engulf
  moveDownThenEngulf(onComplete) {
    const gsap = this.gsap;
    const root =
      this.laptopModel.getRootGroup && this.laptopModel.getRootGroup();
    if (!gsap || !root) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    // Normalize: reset to initial pose, then snap timeline to a fixed baseline
    this.resetRootToInitialTransform();
    if (this.timeline) {
      try {
        const baseline =
          typeof this.ENGULF_START === "number" ? this.ENGULF_START : 0.5;
        if (this.timeline.invalidate) this.timeline.invalidate();
        if (this.timeline.progress) this.timeline.progress(baseline);
        if (this.timeline.scrollTrigger) this.timeline.scrollTrigger.disable();
        if (this.timeline.pause) this.timeline.pause();
      } catch (_) {}
    }
    const seq = gsap.timeline();
    // Capture baseline pose after snapping timeline
    const startPos = {
      x: root.position.x,
      y: root.position.y,
      z: root.position.z,
    };
    const startScale = { x: root.scale.x, y: root.scale.y, z: root.scale.z };
    // Fixed offsets for a deterministic end pose
    const dx = -0.25;
    const dy = 16;
    const dz = -1;
    const s = 1.35;
    seq.to(root.position, {
      y: startPos.y + dy,
      duration: 0.45,
      ease: "power2.out",
      overwrite: "auto",
    });
    seq.to(
      root.position,
      {
        z: startPos.z + dz,
        duration: 0.6,
        ease: "power2.inOut",
        overwrite: "auto",
      },
      "<+0.05"
    );
    seq.to(
      root.position,
      {
        x: startPos.x + dx,
        duration: 0.6,
        ease: "power2.inOut",
        overwrite: "auto",
      },
      "<"
    );
    seq.to(
      root.scale,
      {
        x: startScale.x * s,
        y: startScale.y * s,
        z: startScale.z * s,
        duration: 0.6,
        ease: "power2.inOut",
        overwrite: "auto",
      },
      "<"
    );
    seq.add(() => {
      if (typeof onComplete === "function") onComplete();
    });
  }
}
