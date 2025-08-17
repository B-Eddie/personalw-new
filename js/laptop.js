import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CONFIG } from "./config.js";

// Laptop 3D model creation and management
export class LaptopModel {
  constructor(scene) {
    if (!scene) {
      throw new Error("Scene parameter is required for LaptopModel");
    }

    // Core refs
    this.scene = scene; // three.js Scene
    this.group = new THREE.Group(); // root container for laptop parts
    this.scene.add(this.group);

    // Key parts extracted from model
    this.base = null; // Mesh named 'BaseMesh'
    this.screen = null; // Mesh named 'ScreenMesh'
    this.hinge = null; // Chosen hinge element (base or screen)
    this._screenMaterialTargets = []; // meshes considered screen display
    this._dynamicTexture = null; // THREE.Texture for dynamic canvas
    this._dynamicCanvas = null; // source canvas
    this._dynamicCtx = null; // 2d context
    this._bootPhase = 0; // 0..1 progress of boot animation
    this._bootLogoImage = null; // Image object for boot logo
    this._bootLogoLoaded = false; // load state
    this._screenGeomAspect = null; // width/height of screen mesh for correcting distortion
    this._logoAspectCorrection = null; // scale factor to widen logo drawing if squished

    // State tracking
    this._loaded = false;
    this._initialAngle = 0;
    this._closedAngleApplied = 0;

    // Exposed promise for external await
    this.ready = new Promise((resolve) => (this._resolveReady = resolve));

    this.init();
  }

  init() {
    this.loadCombinedModel();
  }
  loadCombinedModel() {
    const loader = new GLTFLoader();
    loader.load(
      "models/laptop.glb",
      (gltf) => this._onModelLoaded(gltf.scene),
      undefined,
      (err) => console.error("Failed to load models/laptop.glb", err)
    );
  }

  _onModelLoaded(rootScene) {
    // Identify parts
    this._identifyNodes(rootScene);
    // Compute screen aspect before creating dynamic texture
    this._computeScreenAspect();

    if (CONFIG.showModelBoundingBoxes) this._addBoundingBoxes(rootScene);
    // Shadows
    rootScene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    // Put parts under master group in a consistent order
    if (this.screen) this.group.add(this.screen);
    if (this.base) this.group.add(this.base);

    // Config extraction with defaults
    const { laptop = {} } = CONFIG;
    const {
      hingePart = "base",
      startClosedAngleRad,
      flipViewY,
      modelScale,
      initialGroupRotation,
      logoAspectAdjust = 1,
      logoForceSquare = true,
      progressBarOffset = 140,
      logoYOffset = -140,
      nameGap = 30,
      logoManualScaleX = 1,
      logoManualScaleY = 1,
      logoAutoAspect = true,
      logoDebug = false,
      contentYOffset = 0,
      screenAxes = { width: 'x', height: 'y' },
      logoAutoUVComp = true,
      logoAutoTangentComp = true,
    } = laptop;
    this._logoConfig = { logoAspectAdjust, logoForceSquare, progressBarOffset, logoYOffset, nameGap, logoManualScaleX, logoManualScaleY, logoAutoAspect, logoDebug, contentYOffset, screenAxes, logoAutoUVComp, logoAutoTangentComp };

    // Choose hinge: prefer requested part; fall back to whichever exists
    this.hinge =
      hingePart === "screen"
        ? this.screen || this.base
        : this.base || this.screen;

    // Apply either dynamic boot screen or static image
    if (laptop.useBootScreen) {
      this._initBootScreenTexture("VNZklasZKSWjWUk");
    } else {
      this._applyScreenTexture("models/e.jpg", "VNZklasZKSWjWUk");
    }

    // Initial angle logic
    if (this.hinge) {
      if (Number.isFinite(startClosedAngleRad)) {
        this.hinge.rotation.x = startClosedAngleRad;
        this._initialAngle = startClosedAngleRad;
        this._closedAngleApplied = startClosedAngleRad;
      } else {
        this._initialAngle = this.hinge.rotation.x;
        this._closedAngleApplied = this.hinge.rotation.x;
      }
    }

    // Presentation transforms
    if (flipViewY) this.group.rotation.y = Math.PI;
    if (modelScale) this.group.scale.set(modelScale, modelScale, modelScale);
    if (initialGroupRotation) {
      const { x = 0, y = 0, z = 0 } = initialGroupRotation;
      this.group.rotation.set(x, y, z);
    }

    this._loaded = true;
    this._resolveReady?.(this);
  }

  // Attempt to locate base & screen nodes using multiple strategies
  _identifyNodes(rootScene) {
    this.base = null;
    this.screen = null;
    rootScene.traverse((child) => {
      if (!child.name) return;
      const nameLower = child.name.toLowerCase();
      if (nameLower === "basemesh") this.base = child;
      if (nameLower === "screenmesh") this.screen = child;
    });
    // Texture application handled after model load; avoid accessing screen.material here (screen may be a Group)
  }
  _addBoundingBoxes(rootScene) {
    rootScene.traverse((obj) => {
      if (obj.isMesh) {
        const helper = new THREE.BoxHelper(obj, 0x00ff88);
        this.group.add(helper);
      }
    });
  }

  _applyScreenTexture(imagePath, targetMaterialName) {
    if (!this.screen) {
      console.warn("[LaptopModel] _applyScreenTexture: no screen group");
      return;
    }
    new THREE.TextureLoader().load(
      imagePath,
      (tex) => {
        tex.flipY = false;
        if (THREE?.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;

        const candidateMeshes = [];
        this.screen.traverse(
          (child) => child.isMesh && candidateMeshes.push(child)
        );

        let matches = 0;
        candidateMeshes.forEach((mesh) => {
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          if (materials.some((m) => m?.name === targetMaterialName)) {
            mesh.material = new THREE.MeshBasicMaterial({ map: tex });
            mesh.material.name = targetMaterialName + "__Replaced";
            mesh.material.needsUpdate = true;
            matches++;
          }
        });

        if (matches === 0) {
          candidateMeshes.forEach((mesh) => {
            mesh.material = new THREE.MeshBasicMaterial({ map: tex });
            mesh.material.name = "ScreenFallbackMat";
            mesh.material.needsUpdate = true;
          });
          console.warn(
            `[LaptopModel] Target material '${targetMaterialName}' not found (meshes: ${candidateMeshes.length}). Applied fallback to all.`
          );
        } else {
          console.log(
            `[LaptopModel] Applied texture to ${matches} mesh(es) with material '${targetMaterialName}'.`
          );
        }
      },
      undefined,
      (err) =>
        console.error("[LaptopModel] Failed to load texture", imagePath, err)
    );
  }

  // Create a dynamic canvas texture that we can draw "HTML-like" boot sequence onto
  _initBootScreenTexture(targetMaterialName) {
    if (!this.screen) return;
    // Prepare canvas
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    // If we have a screen geometry aspect, use it (aspect = width/height)
    const aspect = this._screenGeomAspect || 1024 / 640; // fallback 16:10
    canvas.height = Math.round(canvas.width / aspect);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Leave totally black initially; content appears when progress > 0

    // Kick off logo image load
    this._loadBootLogo();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._dynamicTexture = tex;
    this._dynamicCanvas = canvas;
    this._dynamicCtx = ctx;

    // Collect candidate screen meshes and replace materials
    const candidates = [];
    this.screen.traverse((child) => child.isMesh && candidates.push(child));
    let applied = 0;
    candidates.forEach((mesh) => {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      if (materials.some((m) => m?.name === targetMaterialName)) {
        mesh.material = new THREE.MeshBasicMaterial({ map: tex });
        mesh.material.name = targetMaterialName + "__BootDynamic";
        mesh.material.needsUpdate = true;
        this._screenMaterialTargets.push(mesh.material);
        applied++;
      }
    });
    if (applied === 0) {
      candidates.forEach((mesh) => {
        mesh.material = new THREE.MeshBasicMaterial({ map: tex });
        mesh.material.name = "ScreenBootFallback";
        mesh.material.needsUpdate = true;
        this._screenMaterialTargets.push(mesh.material);
      });
      console.warn(
        `[LaptopModel] Boot screen: target material '${targetMaterialName}' not found; applied fallback.`
      );
    } else {
      console.log(
        `[LaptopModel] Boot screen dynamic texture applied to ${applied} mesh(es).`
      );
    }
  }

  _computeScreenAspect() {
    if (!this.screen) return;
    let targetMesh = null;
    this.screen.traverse((child) => {
      if (targetMesh) return;
      if (child.isMesh) targetMesh = child;
    });
    if (!targetMesh || !targetMesh.geometry) return;
    const geo = targetMesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return;
    const size = new THREE.Vector3();
    bb.getSize(size);
    // Identify thickness as smallest dimension; width & height are other two
    const { screenAxes = { width: 'x', height: 'y' } } = this._logoConfig || {};
    const widthAxis = screenAxes.width || 'x';
    const heightAxis = screenAxes.height || 'y';
    const width = size[widthAxis];
    const height = size[heightAxis];
    if (width > 0 && height > 0) this._screenGeomAspect = width / height;
    // Reset correction so it recalculates with improved aspect
    this._logoAspectCorrection = null;

    // Attempt UV-based compensation (ratio between geometry aspect and UV aspect)
    if (this._logoConfig?.logoAutoUVComp && geo.attributes?.uv) {
      try {
        const uv = geo.attributes.uv;
        // sample min/max U/V
        let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
        for (let i = 0; i < uv.count; i++) {
          const u = uv.getX(i);
            const v = uv.getY(i);
            if (u < uMin) uMin = u;
            if (u > uMax) uMax = u;
            if (v < vMin) vMin = v;
            if (v > vMax) vMax = v;
        }
        const uvW = uMax - uMin;
        const uvH = vMax - vMin;
        if (uvW > 0 && uvH > 0 && this._screenGeomAspect) {
          const worldAspect = this._screenGeomAspect;
          const uvAspect = uvW / uvH;
          // difference factor (how much geometry differs from UV mapping)
          const uvDiff = worldAspect / uvAspect;
          // store separate UV correction so final draw can use combined factor
          this._logoUVCorrection = 1 / uvDiff; // invert to compensate
        }
      } catch (e) {
        // ignore
      }
    }

    // Tangent-based compensation: sample a few triangles to estimate average stretching
    if (this._logoConfig?.logoAutoTangentComp && geo.index && geo.attributes.position && geo.attributes.uv) {
      try {
        const pos = geo.attributes.position;
        const uv = geo.attributes.uv;
        const indexArr = geo.index.array;
        let accum = 0;
        let count = 0;
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();
        for (let i = 0; i < indexArr.length && count < 300; i += 3) { // sample up to 300 tris
          const a = indexArr[i], b = indexArr[i+1], c = indexArr[i+2];
          vA.fromBufferAttribute(pos, a);
          vB.fromBufferAttribute(pos, b);
          vC.fromBufferAttribute(pos, c);
          const uxA = uv.getX(a), uyA = uv.getY(a);
          const uxB = uv.getX(b), uyB = uv.getY(b);
          const uxC = uv.getX(c), uyC = uv.getY(c);
          // Build two edges in 3D
          const e1 = vB.clone().sub(vA);
          const e2 = vC.clone().sub(vA);
          const du1 = uxB - uxA; const dv1 = uyB - uyA;
          const du2 = uxC - uxA; const dv2 = uyC - uyA;
          const det = du1 * dv2 - du2 * dv1;
          if (Math.abs(det) < 1e-6) continue;
          // Solve for partial derivatives (dPos/du, dPos/dv)
          const invDet = 1 / det;
          const dPos_du = e1.clone().multiplyScalar(dv2).sub(e2.clone().multiplyScalar(dv1)).multiplyScalar(invDet);
          const dPos_dv = e2.clone().multiplyScalar(du1).sub(e1.clone().multiplyScalar(du2)).multiplyScalar(invDet);
          const lenU = dPos_du.length();
          const lenV = dPos_dv.length();
          if (lenV > 0) {
            accum += lenU / lenV; // how world scales relative U vs V
            count++;
          }
        }
        if (count > 0) {
          const avg = accum / count; // if >1: U stretched more
          // Combine with previous corrections (we want to counter horizontal stretch -> divide scaleX by avg)
          this._logoTangentCorrection = 1 / avg;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  _loadBootLogo() {
    const img = new Image();
    img.onload = () => {
      this._bootLogoLoaded = true;
      this._bootLogoImage = img;
      // Force one update so first frame with image appears once progress > 0
      if (this._bootPhase > 0) this.updateBootScreenProgress(this._bootPhase);
    };
    img.onerror = (e) => {
      console.warn("[LaptopModel] Failed to load boot logo image", e);
    };
    img.src = "assets/image.png"; // relative to site root
  }

  // Update boot screen drawing given progress 0..1
  updateBootScreenProgress(p) {
    if (!this._dynamicCtx) return;
    this._bootPhase = Math.min(1, Math.max(0, p));
    const ctx = this._dynamicCtx;
    const w = this._dynamicCanvas.width;
    const h = this._dynamicCanvas.height;

    // Clear
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);
    if (this._bootPhase > 0) {
      // Logo fades in with progress
      const logoAlpha = Math.min(1, this._bootPhase * 2); // quicker fade in
      if (this._bootLogoLoaded && this._bootLogoImage) {
        // Compute aspect correction once (compare world displayed aspect vs canvas aspect)
  if (this._logoAspectCorrection == null && this.screen && this._logoConfig.logoAutoAspect) {
          try {
            // Use world box for screen group
            const worldBox = new THREE.Box3().setFromObject(this.screen);
            const size = new THREE.Vector3();
            worldBox.getSize(size);
            if (size.y > 0) {
              const displayAspect = size.x / size.y; // width/height on model
              const canvasAspect = w / h;
              if (displayAspect > 0) {
                // We want drawn logo to appear square in model space. If model stretches X relative to canvas, we counter-scale.
                const diff = displayAspect / canvasAspect; // how much wider model is vs canvas
                if (Math.abs(1 - diff) > 0.01) {
                  this._logoAspectCorrection = 1 / diff; // inverse to compensate
                } else this._logoAspectCorrection = 1;
              }
            }
          } catch (e) {
            this._logoAspectCorrection = 1;
          }
        }
        const img = this._bootLogoImage;
        // Target max height 160, maintain aspect, cap width to 25% canvas width
        const targetMaxHeight = 160;
        const scaleH = targetMaxHeight / img.naturalHeight;
        let drawW = img.naturalWidth * scaleH;
        let drawH = targetMaxHeight;
        if (this._logoConfig.logoForceSquare) {
          // Use the smaller to enforce square to combat distortion
          const side = Math.min(drawW, drawH);
          drawW = side;
          drawH = side;
        }
        const maxWidth = w * 0.25;
        if (drawW > maxWidth) {
          const s = maxWidth / drawW;
          drawW *= s;
          drawH *= s;
        }
        const cx = w / 2;
  const cy = h / 2 + (this._logoConfig.logoYOffset || -60) + (this._logoConfig.contentYOffset || 0);
        ctx.save();
        ctx.globalAlpha = logoAlpha;
        // Translate to center and apply horizontal correction if needed
        ctx.translate(cx, cy);
        let scaleX = 1;
        let scaleY = 1;
        if (this._logoAspectCorrection && this._logoAspectCorrection !== 1) {
          scaleX *= this._logoAspectCorrection;
        }
        if (this._logoUVCorrection && this._logoUVCorrection !== 1) {
          scaleX *= this._logoUVCorrection;
        }
        if (this._logoTangentCorrection && this._logoTangentCorrection !== 1) {
          scaleX *= this._logoTangentCorrection;
        }
        if (this._logoConfig.logoAspectAdjust !== 1) {
          scaleX *= this._logoConfig.logoAspectAdjust;
        }
        // Apply manual overrides last
        scaleX *= this._logoConfig.logoManualScaleX || 1;
        scaleY *= this._logoConfig.logoManualScaleY || 1;
        if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        if (this._logoConfig.logoDebug) {
          ctx.strokeStyle = "#0f0";
          ctx.lineWidth = 2 / (scaleX || 1); // keep stroke thin after scale
          ctx.beginPath();
          const r = Math.min(drawW, drawH) / 2;
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
  // Draw name under logo
  ctx.save();
  ctx.globalAlpha = logoAlpha; // fade in with logo
  ctx.font = "40px -apple-system,Helvetica,Arial,sans-serif";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textY = cy + drawH / 2 * (this._logoConfig.logoManualScaleY || 1) + (this._logoConfig.nameGap || 35);
  ctx.fillText("Eddie Bian", w / 2, textY);
  ctx.restore();
      } else {
        // Fallback: simple fading rectangle while image loads
        const placeholderSize = 100;
        ctx.save();
        ctx.globalAlpha = logoAlpha * 0.6;
        ctx.fillStyle = "#222";
        ctx.fillRect(
          w / 2 - placeholderSize / 2,
          h / 2 - 60 - placeholderSize / 2,
          placeholderSize,
          placeholderSize
        );
        ctx.restore();
      }

      // Progress bar appears after slight delay
      const barVisibleP = Math.max(0, this._bootPhase - 0.05) / 0.95;
      const barWidth = w * 0.4;
      const barHeight = 8;
      const barX = (w - barWidth) / 2;
  const barY = h / 2 + (this._logoConfig.progressBarOffset || 80) + (this._logoConfig.contentYOffset || 0);
      const radius = barHeight / 2; // pill shape
      ctx.globalAlpha = barVisibleP;
      // Outline
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#444";
      this._roundedRect(ctx, barX, barY, barWidth, barHeight, radius, false);
      ctx.stroke();
      // Fill portion
      const fillWFull = barWidth * barVisibleP;
      if (fillWFull > 0) {
        const fillRadius = Math.min(radius, fillWFull / 2); // avoid overshoot when tiny width
        this._roundedRect(
          ctx,
          barX,
          barY,
          fillWFull,
          barHeight,
          fillRadius,
          true
        );
        ctx.fillStyle = "white";
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Hint text fades in near completion
      if (this._bootPhase > 0.85) {
        ctx.globalAlpha = (this._bootPhase - 0.85) / 0.15;
        ctx.font = "28px -apple-system,Helvetica,Arial,sans-serif";
        ctx.fillStyle = "#bbb";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
  ctx.fillText("Scroll to continue", w / 2, barY + 90);
        ctx.globalAlpha = 1;
      }
    }

    this._dynamicTexture.needsUpdate = true;
  }

  // Draw rounded rectangle path; optionally clip to left side when width < 2r
  _roundedRect(ctx, x, y, w, h, r, noStrokeAdjust) {
    // r = corner radius; ensure not larger than half width/height
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  // Accessors
  getHingeGroup() {
    return this.hinge || this.base;
  }

  getRootGroup() {
    return this.group;
  }
}

// Instantiate via main.js
