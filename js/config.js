// Minimal configuration used by scene, laptop, and animation.
export const CONFIG = {
  laptop: {
    // Leave undefined/null to respect model's imported (closed) pose.
    // Provide a Number to explicitly override the model's closed angle.
    startClosedAngleRad: null,
    endOpenAngleRad: 2.094, // 120° open target
    openCompleteAt: 0.55, // scroll fraction when fully open
    // Direction multiplier: set to -1 if lid opens the wrong way
    hingeDirectionMultiplier: -1, // flipped back to -1 to correct backward opening
    // Engulf effect (after fully open move toward user & grow)
    engulfMoveDistance: 6, // world units toward camera after open
    engulfExtraScale: 4, // additional scale factor applied after open (multiplicative)
    engulfEase: "power1.out",
    engulfTiltX: -0.9, // final tilt during/after engulf
    // Legacy params kept for fallback if engulf* not used
    finalRootPosition: { z: -4, y: 0.4 },
    finalScale: 10,
    finalCamera: { z: 4.5, y: 1.1 },
    modelScale: 0.1,
    finalTiltX: -0.9, // body tilt after opening
    hingePart: "screen", // ensure screen rotates, not base
    useBootScreen: true, // render dynamic boot screen instead of static jpg
  logoAspectAdjust: 1, // manual horizontal stretch factor ( >1 widens, <1 narrows )
  logoForceSquare: true, // clamp drawn logo to a square to resist distortion
  progressBarOffset: 140, // vertical offset from vertical center (was 80) to push bar lower
  logoYOffset: -140, // vertical offset from canvas center for logo (negative = higher)
  nameGap: 60, // gap between logo bottom and name text (increased)
  logoManualScaleX: 1, // manual post-correction horizontal scale (tweak if still oval)
  logoManualScaleY: 1, // manual post-correction vertical scale
  logoAutoAspect: true, // toggle automatic aspect compensation
  logoDebug: false, // when true draws a thin test circle outline for visual calibration
  contentYOffset: 0, // global shift applied to ALL boot content (logo, name, bar)
  screenAxes: { width: 'x', height: 'y' }, // which geometry axes represent screen width & height
  logoAutoUVComp: true, // auto compensate for UV vs world aspect distortion
  logoAutoTangentComp: true, // deeper geometric UV tangent compensation
  },
  camera: {
    initialPosition: { x: 0, y: 6, z: 0.01 },
    initialLookAt: { x: 0, y: 0, z: 0 },
  },
};
