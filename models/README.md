# Custom 3D Models for Laptop Animation

This directory is where you place your custom 3D models for the laptop base and screen.

## Supported File Formats

- **GLTF/GLB** (recommended) - Most modern and efficient format
- **OBJ** - Widely supported format
- **Fallback** - Basic Three.js geometries if models fail to load

## File Structure

Place your model files in this directory:

```
models/
├── laptop_base.glb    # Laptop base/keyboard model
├── laptop_screen.glb  # Laptop screen model
└── README.md          # This file
```

## Model Requirements

### Base Model (laptop_base.glb)

- Should represent the keyboard/base portion of the laptop
- Will be positioned at the origin (0, 0, 0)
- Should be properly oriented (keyboard facing up)

### Screen Model (laptop_screen.glb)

- Should represent the screen/display portion
- Will be added to the hinge group for rotation
- Should be positioned so the bottom edge aligns with the hinge

## Configuration

You can customize how your models are loaded by editing the `modelConfig` object in `js/laptop.js`:

```javascript
this.modelConfig = {
  base: {
    path: "models/laptop_base.glb", // Your model file path
    type: "gltf", // "gltf", "obj", or "geometry"
    scale: 1.0, // Scale factor
    position: { x: 0, y: 0, z: 0 }, // Position offset
    rotation: { x: 0, y: 0, z: 0 }, // Rotation offset
  },
  screen: {
    path: "models/laptop_screen.glb", // Your model file path
    type: "gltf", // "gltf", "obj", or "geometry"
    scale: 1.0, // Scale factor
    position: { x: 0, y: 1.25, z: 0 }, // Position offset
    rotation: { x: 0, y: 0, z: 0 }, // Rotation offset
  },
};
```

## Tips for Best Results

1. **Scale**: Make sure your models are appropriately sized. You may need to adjust the `scale` value.

2. **Origin**: Position your models so they align properly with the hinge point.

3. **Materials**: Your models can include their own materials and textures.

4. **Polygon Count**: Keep models reasonably optimized for web performance.

5. **File Size**: Compress your models to reduce loading time.

## Troubleshooting

- If models don't load, check the browser console for error messages
- Ensure file paths are correct relative to the project root
- Verify your model files are valid and not corrupted
- The app will automatically fall back to basic geometries if loading fails

## Example Model Sources

- **Blender**: Export as GLTF/GLB
- **Maya/3DS Max**: Export as OBJ or GLTF
- **Online**: Sites like Sketchfab, TurboSquid, etc.
- **AI Generated**: Tools like Leonardo.ai, Midjourney, etc.
