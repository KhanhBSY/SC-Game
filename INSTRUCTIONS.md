# Cesium Sandcastle Template

A minimal template for building [CesiumJS](https://cesium.com/platform/cesiumjs/) Sandcastle-style apps locally.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The HTML shell. Holds the `cesiumContainer`, loads the CesiumJS library, styles, and `script.js`. In official Sandcastle this is the **HTML/CSS** panel. |
| `script.js` | The JavaScript panel. Contains the Cesium app logic (viewer setup, entities, camera, etc.). In official Sandcastle this is the **JavaScript** panel. |

Both files start blank — paste Cesium Sandcastle code into them.

## How Cesium Sandcastle Splits Code

On [sandcastle.cesium.com](https://sandcastle.cesium.com/) an example is split into two editors:

1. **HTML/CSS** → goes into the `<body>` (and a `<style>` block) of `index.html`.
2. **JavaScript** → goes into `script.js`.

When copying an example locally, put each part in the matching file below.

## Setup Steps (When Adding Code)

### 1. `index.html`

Use this scaffold, then paste the Sandcastle **HTML/CSS** into the marked spots:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Set this to a short name describing the example being built -->
    <title>Cesium App</title>

    <!-- CesiumJS from CDN (pin a version for stability) -->
    <script src="https://cesium.com/downloads/cesiumjs/releases/1.135/Build/Cesium/Cesium.js"></script>
    <link
      href="https://cesium.com/downloads/cesiumjs/releases/1.135/Build/Cesium/Widgets/widgets.css"
      rel="stylesheet"
    />

    <style>
      html,
      body,
      #cesiumContainer {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      /* Paste Sandcastle CSS here */
    </style>
  </head>
  <body>
    <div id="cesiumContainer"></div>
    <!-- Paste Sandcastle HTML (toolbars, buttons, etc.) here -->

    <script src="script.js"></script>
  </body>
</html>
```

### 2. `script.js`

Add your Cesium access token, then paste the Sandcastle **JavaScript**:

```js
// Required for Cesium ion assets (imagery, terrain, 3D Tiles).
// Get a free token at https://cesium.com/ion/tokens
Cesium.Ion.defaultAccessToken = "YOUR_TOKEN_HERE";

const viewer = new Cesium.Viewer("cesiumContainer");

// Paste Sandcastle JavaScript below this line
```

> Sandcastle examples usually already start with `const viewer = new Cesium.Viewer("cesiumContainer");`. If the pasted code includes that line, don't duplicate it.

## Running Locally

Cesium needs to be served over HTTP (not opened via `file://`). Pick one:

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

Then open `http://localhost:8080`.

> VS Code tip: the **Live Server** extension works well — right-click `index.html` → "Open with Live Server".

## Browser Tab Title

The tab name comes from the `<title>` tag in `index.html`.

**Agent rule:** whenever you paste new Cesium code, always update `<title>` to a short, descriptive name based on what the example does (e.g. `3D Tiles Inspector`, `Flight Path Animation`, `Terrain Clamping`). Don't leave it as the generic `Cesium App`. If unsure, derive the name from the Sandcastle example's title or the main feature being demonstrated.

To change it dynamically at runtime instead, set `document.title = "My Title";` anywhere in `script.js`.

## Vibe Coding Notes

- Keep the CesiumJS version pinned in `index.html` so examples don't break on updates.
- Always set a descriptive `<title>` (see [Browser Tab Title](#browser-tab-title)).
- The Ion access token is required for most default imagery/terrain. Without it you'll see auth errors in the console.
- One example per template copy: overwrite `index.html` + `script.js`, or duplicate this folder per experiment.
- Common `Viewer` options to tweak: `terrain`, `baseLayerPicker`, `timeline`, `animation`, `sceneModePicker`.
- Check the browser console for Cesium errors first — they're usually descriptive.

## Useful Links

- Sandcastle examples: https://sandcastle.cesium.com/
- CesiumJS API docs: https://cesium.com/learn/cesiumjs/ref-doc/
- Ion tokens: https://cesium.com/ion/tokens
