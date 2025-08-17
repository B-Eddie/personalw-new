import * as THREE from "three";
import { CONFIG } from "./config.js";

// Scene setup and configuration
export class SceneManager {
  constructor() {
    this.canvas = document.getElementById("webgl");

    this.scene = new THREE.Scene();

    this.camera = null;
    this.renderer = null;
    this.lights = {};

    this.init();
  }

  init() {
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    const camCfg = CONFIG.camera || {};
    const p = camCfg.initialPosition || { x: 0, y: 6, z: 0.01 };
    const l = camCfg.initialLookAt || { x: 0, y: 0, z: 0 };
    this.camera.position.set(p.x, p.y, p.z);
    this.camera.up.set(0, 0, -1); // orient so Z points toward screen if needed
    this.camera.lookAt(l.x, l.y, l.z);
    this.scene.add(this.camera);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x20232a, 1);
    // Improved lighting/shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Use new color space property for three.js v0.152+
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (this.renderer.toneMappingExposure !== undefined)
      this.renderer.toneMappingExposure = 1.0;
  }

  setupLights() {
    // Key light
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 25;
    this.scene.add(key);
    this.lights.key = key;

    // Fill (hemisphere) for soft ambient sky/ground contrast
    const hemi = new THREE.HemisphereLight(0xddddff, 0x221100, 0.6);
    this.scene.add(hemi);
    this.lights.hemi = hemi;

    // Rim/back light to highlight silhouette
    const rim = new THREE.DirectionalLight(0xffe4c0, 0.6);
    rim.position.set(-3, 3.5, -4);
    this.scene.add(rim);
    this.lights.rim = rim;
  }

  // Add simple debug helpers so we can see something even if models fail to render
  addDebugHelpers() {}

  // Getter method to ensure scene is available
  getScene() {
    if (!this.scene) {
      throw new Error("Scene not initialized");
    }
    return this.scene;
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    // Add debug helpers once (call-safe)
    this.renderer.render(this.scene, this.camera);
  }
}
