// Cesium クイズクエスト（日本語版）: W/A/S/D run, mouse or arrow keys look, Esc pause.
window.addEventListener("unhandledrejection", (e) => {
  const status = document.getElementById("status");
  if (status && !document.getElementById("start").hidden) {
    status.textContent = `読み込みに失敗しました: ${e.reason?.message ?? e.reason}。ページを再読み込みしてください。`;
  }
});
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzNzIzNWI1Mi1jZDYxLTQ4M2ItYjc2MS0wYzNiNzVlYTBiMTIiLCJpZCI6MzQ3MzE3LCJpYXQiOjE3NTk2MzAwNzN9.H0uFetAscreBmgvq5sLkrZXhVTgiRnKdLZDZo-svDMA";

const MODEL_URL =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb";
const REMOVE_NODES = ["Hand.R", "Hand.L"];
const SCALE = 0.32;
const HEADING_OFFSET = -Cesium.Math.PI_OVER_TWO; // flip to +PI_OVER_TWO if the robot walks backwards
const CAM_HEIGHT = 1.6;
const CAM_DIST = 20;
const CAM_DIST_MIN = 5; // scroll-wheel zoom limits
const CAM_DIST_MAX = 80;
const CAM_PITCH = Cesium.Math.toRadians(-45);
const RUN_SPEED = 8;
const LOOK_SENS = 0.15; // degrees per pixel of mouse movement
const KEY_TURN_SPEED = 100; // degrees per second for the arrow keys
const FOCUS_OFFSET_PX = 50; // the robot sits this far below the screen center
const EDGE_TURN = 0.06; // cursor within this fraction of the left/right edge keeps turning (no pointer lock)
const TOUCH_LOOK_SENS = 0.3; // degrees per pixel of finger drag
const TOUCH = matchMedia("(pointer: coarse)").matches; // phones/tablets get on-screen controls
const RING_RADIUS = 2.5;
const RING_TRIGGER = 3;
const CLIPS = {
  idle: "Idle",
  walk: "Walking",
  run: "Running",
  fly: "Running",
  wave: "Wave",
  yes: "ThumbsUp",
  no: "No",
  dance: "Dance",
};

const QUESTIONS = [
  {
    text: "Cesium はどの企業の一員でしょう？",
    answers: ["Bentley Systems", "Autodesk", "AVEVA", "Oracle"],
    correct: 0,
  },
  {
    text: "Cesium ion に写真をアップロードすると 3D 再構築ができます。出力されるデータは？",
    answers: ["点群", "3D メッシュ", "ガウシアンスプラット", "上記すべて"],
    correct: 3,
  },
  {
    text: "Cesium は精度にこだわります。元素「セシウム」にちなんで名付けられた理由は？",
    answers: [
      "宇宙から見た地球のように青く光るから",
      "地球上で最も反応性の高い金属だから",
      "セシウム原子が「1 秒」の公式な長さを定義しているから",
      "創業者のお気に入りの元素だから",
    ],
    correct: 2,
  },
  {
    text: "Cesium ion の無料アカウントで使えるストレージ容量は？",
    answers: ["1 GB", "3 GB", "5 GB", "10 GB"],
    correct: 3,
  },
  {
    text: "Cesium が策定した、大規模 3D データをストリーミングするためのオープン標準で、現在 OGC コミュニティ標準となっているものは？",
    answers: ["glTF", "3D Tiles", "CityGML", "IFC"],
    correct: 1,
  },
  {
    text: "Cesium の創業者は？",
    answers: ["ジャック・デンジャモンド", "パトリック・コッツィ", "ジョン・カーマック", "キース・ベントレー"],
    correct: 1,
  },
  {
    text: "Cesium の本社はどこにある？",
    answers: ["フィラデルフィア", "サンフランシスコ", "シアトル", "ボストン"],
    correct: 0,
  },
  {
    text: "Cesium の公式プラグインがある 3D プラットフォームは？",
    answers: ["Unity", "Unreal Engine", "NVIDIA Omniverse", "上記すべて"],
    correct: 3,
  },
  {
    text: "最新版の 3D Tiles では、タイルのコンテンツは主にどの形式で保存される？",
    answers: ["OBJ", "FBX", "glTF", "STL"],
    correct: 2,
  },
  {
    text: "Cesium が始まったのは何年？",
    answers: ["2005 年", "2011 年", "2015 年", "2019 年"],
    correct: 1,
  },
  {
    text: "Bentley が Cesium を買収したのは何年？",
    answers: ["2021 年", "2022 年", "2023 年", "2024 年"],
    correct: 3,
  },
  {
    text: "Cesium 認定開発者（Cesium Certified Developer）になるための費用は？",
    answers: ["99 ドル", "299 ドル", "499 ドル", "無料"],
    correct: 3,
  },
  {
    text: "Cesium ion にアップロードできる BIM/CAD 形式は？",
    answers: ["Revit (.rvt)", "IFC (.ifc)", "AutoCAD (.dwg)", "上記すべて"],
    correct: 3,
  },
  {
    text: "Cesium を使っている日本のプロジェクトは？",
    answers: ["東京都デジタルツイン3Dビューア", "PLATEAU VIEW", "ヒロシマ・アーカイブ", "上記すべて"],
    correct: 3,
  },
];

// center/searchRadius override where the landing zone is searched; otherwise the tileset bounds are used.
const LEVELS = [
  { name: "フランス", tilesetId: 5828953, splat: true, caption: "Cesium のガウシアンスプラット" },
  { name: "ゴールドコースト", tilesetId: 5135751, caption: "Cesium の 3D メッシュ" },
  {
    name: "東京",
    tilesetId: 5135789,
    japanTerrain: true,
    center: [139.7649, 35.6814],
    searchRadius: 45,
    ringDistance: 25,
    caption: "Cesium で見る PLATEAU の CityGML",
  },
  // faceModel: land in line with the flight so the robot arrives facing the building, ring in between.
  { name: "広島", tilesetId: 4912621, faceModel: true, searchRadius: 60, gridStep: 5, caption: "Cesium で見る Revit" },
  {
    name: "富士山",
    japanTerrain: true,
    center: [138.78966820116443, 35.37519677832162],
    faceToward: [138.7274, 35.3606], // summit: the ring sits in this direction so you walk towards the mountain
    searchRadius: 25,
    gridStep: 1,
    ringDistance: 12,
    caption: "Cesium で見る日本の地域地形データ",
  },
];

// Detach named nodes from the scene graph without reindexing, so skin/joint references stay valid.
async function loadGlbWithoutNodes(url, names) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));

  const targets = new Set();
  json.nodes.forEach((n, i) => {
    if (n.name && names.includes(n.name)) targets.add(i);
  });
  if (!targets.size) console.warn(`No nodes named ${names.join(" / ")} found; nothing removed`);

  for (const n of json.nodes) {
    if (n.children) n.children = n.children.filter((c) => !targets.has(c));
  }
  for (const s of json.scenes || []) {
    if (s.nodes) s.nodes = s.nodes.filter((c) => !targets.has(c));
  }

  const rest = new Uint8Array(buf, 20 + jsonLen); // BIN chunk, header included
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonChunk = new Uint8Array(Math.ceil(jsonBytes.length / 4) * 4).fill(0x20);
  jsonChunk.set(jsonBytes);

  const total = 20 + jsonChunk.length + rest.length;
  const out = new Uint8Array(total);
  const o = new DataView(out.buffer);
  o.setUint32(0, 0x46546c67, true); // "glTF"
  o.setUint32(4, 2, true);
  o.setUint32(8, total, true);
  o.setUint32(12, jsonChunk.length, true);
  o.setUint32(16, 0x4e4f534a, true); // "JSON"
  out.set(jsonChunk, 20);
  out.set(rest, 20 + jsonChunk.length);
  return URL.createObjectURL(new Blob([out], { type: "model/gltf-binary" }));
}

// ── UI ────────────────────────────────────────────────────────
// The script builds its own UI so it works whether or not an HTML panel is provided (e.g. Sandcastle).
const UI_CSS = `
html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
/* Sandcastle wraps the container in an unsized div, so pin it to the window instead of using height: 100%. */
#cesiumContainer { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; margin: 0; padding: 0; overflow: hidden; }
[hidden] { display: none !important; }
body { font-family: "Segoe UI", "Yu Gothic UI", Meiryo, "Hiragino Sans", system-ui, sans-serif; }
.qq-overlay { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; background: rgba(5, 10, 25, 0.72); backdrop-filter: blur(4px); color: #fff; text-align: center; z-index: 20;
  font-family: "Segoe UI", "Yu Gothic UI", Meiryo, "Hiragino Sans", system-ui, sans-serif; }
.qq-overlay h1 { margin: 0; font-size: 56px; font-weight: 700 !important; letter-spacing: 3px; text-shadow: 0 4px 18px rgba(0, 150, 255, 0.6); }
.qq-overlay p { margin: 0; opacity: 0.85; font-size: 17px; }
/* ids + !important so host page styles (e.g. Sandcastle's button theme) can't restyle the buttons */
#playBtn, #againBtn { padding: 18px 64px !important; font: 800 30px "Segoe UI", "Yu Gothic UI", Meiryo, "Hiragino Sans", system-ui, sans-serif !important;
  letter-spacing: 3px !important; color: #fff !important; background: linear-gradient(180deg, #ff4d4d, #c40000) !important;
  border: none !important; border-radius: 14px !important; box-shadow: 0 8px 0 #7a0000, 0 12px 30px rgba(255, 0, 0, 0.45) !important;
  cursor: pointer; transition: transform 0.1s; text-transform: none !important; height: auto !important; line-height: normal !important; }
#playBtn:hover:not(:disabled), #againBtn:hover:not(:disabled) { transform: translateY(-2px) scale(1.04); }
#playBtn:active:not(:disabled), #againBtn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 4px 0 #7a0000 !important; }
#playBtn:disabled { filter: grayscale(0.8); opacity: 0.6; cursor: wait; }
#pause { cursor: pointer; }
body.qq-nocursor, body.qq-nocursor * { cursor: none !important; }
#hud { position: fixed; top: 12px; left: 12px; padding: 10px 16px; border-radius: 10px; background: rgba(0, 0, 0, 0.55);
  color: #fff; font-size: 16px; line-height: 1.5; pointer-events: none; z-index: 10; }
#hudHint { color: #ff8a8a; }
#hudCaption { color: #fff; font-weight: 600; }
#help { position: fixed; top: 12px; right: 12px; padding: 10px 16px; border-radius: 10px; background: rgba(0, 0, 0, 0.55);
  color: #fff; font-size: 14px; line-height: 1.7; pointer-events: none; z-index: 10; }
#help b { display: inline-block; min-width: 92px; color: #ffd166; }
#quiz { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.35); z-index: 25; }
#quiz .qq-card { width: min(680px, 92vw); padding: 26px 28px; border-radius: 18px; background: rgba(15, 20, 40, 0.94);
  border: 3px solid #ff3b3b; box-shadow: 0 0 40px rgba(255, 0, 0, 0.35); color: #fff; animation: qqCardIn 0.35s ease-out;
  max-height: 90vh; box-sizing: border-box; overflow-y: auto; touch-action: pan-y; }
#qNum { color: #ff5c5c; font-weight: 800; letter-spacing: 3px; }
#qText { margin: 8px 0 20px; font-size: 22px; line-height: 1.35; }
#answers { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
#answers button { padding: 14px; font-size: 16px; text-align: left; color: #fff; background: #26314f;
  border: 2px solid #3d4a70; border-radius: 10px; cursor: pointer; }
#answers button:hover:not(:disabled) { background: #34436b; }
#answers button.right { background: #11873d; border-color: #3dff7a; }
#answers button.wrong { background: #9b1111; border-color: #ff4545; }
#answers button:disabled { cursor: default; }
@keyframes qqCardIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
#banner { position: fixed; top: 38%; left: 50%; font-size: 110px; font-weight: 900; letter-spacing: 6px; pointer-events: none; opacity: 0; z-index: 30; }
#banner.correct { color: #3dff7a; text-shadow: 0 0 24px #00ff55, 0 7px 0 #0a6b2e; animation: qqPop 2s ease-out forwards; }
#banner.fail { color: #ff4545; text-shadow: 0 0 24px #ff0000, 0 7px 0 #6b0a0a; animation: qqShake 2s ease-out forwards; }
@keyframes qqPop {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(-10deg); }
  15% { opacity: 1; transform: translate(-50%, -50%) scale(1.3) rotate(4deg); }
  25% { transform: translate(-50%, -50%) scale(1) rotate(0); }
  80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); } }
@keyframes qqShake {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
  12% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  16% { transform: translate(-56%, -50%); } 20% { transform: translate(-44%, -50%); }
  24% { transform: translate(-54%, -50%); } 28% { transform: translate(-46%, -50%); }
  32% { transform: translate(-50%, -50%); }
  80% { opacity: 1; transform: translate(-50%, -50%); }
  100% { opacity: 0; transform: translate(-50%, -30%) scale(0.9); } }
#flash { position: fixed; inset: 0; pointer-events: none; opacity: 0; z-index: 29; }
#flash.correct { background: radial-gradient(circle, transparent 40%, rgba(0, 255, 90, 0.55)); animation: qqFlash 1s ease-out forwards; }
#flash.fail { background: radial-gradient(circle, transparent 40%, rgba(255, 0, 0, 0.6)); animation: qqFlash 1s ease-out forwards; }
@keyframes qqFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
/* Touch devices: on-screen stick, touch-specific help text, no page gestures */
body:not(.qq-touch) .qq-mob, body.qq-touch .qq-desk { display: none !important; }
body.qq-touch { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
body.qq-touch #hud { left: calc(8px + env(safe-area-inset-left, 0px)); }
body.qq-touch #help { top: auto; right: calc(8px + env(safe-area-inset-right, 0px)); bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }
#stick { position: fixed; left: calc(28px + env(safe-area-inset-left, 0px)); bottom: calc(44px + env(safe-area-inset-bottom, 0px));
  width: 132px; height: 132px; border-radius: 50%; background: rgba(0, 0, 0, 0.3); border: 2px solid rgba(255, 255, 255, 0.5);
  touch-action: none; z-index: 15; }
#stickKnob { position: absolute; left: 50%; top: 50%; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.8); pointer-events: none; }
/* Small screens (phones, either orientation) */
@media (max-width: 700px), (max-height: 500px) {
  .qq-overlay { gap: 10px; padding: 16px; box-sizing: border-box; }
  .qq-overlay h1 { font-size: 30px; letter-spacing: 2px; }
  .qq-overlay p { font-size: 14px; }
  #playBtn, #againBtn { padding: 12px 40px !important; font-size: 22px !important; }
  #hud { top: 8px; padding: 6px 10px; font-size: 13px; max-width: 60vw; }
  #help { padding: 6px 10px; font-size: 11px; line-height: 1.5; }
  #help b { min-width: 70px; }
  #quiz .qq-card { padding: 16px; }
  #qText { margin: 6px 0 12px; font-size: 17px; }
  #answers { gap: 8px; }
  #answers button { padding: 10px; font-size: 14px; }
  #banner { font-size: 56px; letter-spacing: 3px; }
}
@media (max-width: 500px) { #answers { grid-template-columns: 1fr; } }
`;

const UI_HTML = `
<div id="hud" hidden><div id="hudTitle"></div><div id="hudHint"></div><div id="hudCaption"></div></div>
<div id="help" hidden>
  <div class="qq-desk">
    <div><b>W / S</b>前進 / 後退</div>
    <div><b>A / D</b>左右に移動</div>
    <div><b>マウス</b>向きを変える・見回す</div>
    <div id="helpEdge" hidden><b>画面の端</b>回転し続ける</div>
    <div><b>スクロール</b>ズームイン / アウト</div>
    <div><b>← → ↑ ↓</b>キーで向きを変える・見回す</div>
  </div>
  <div class="qq-mob">
    <div><b>スティック</b>移動</div>
    <div><b>ドラッグ</b>向きを変える・見回す</div>
    <div><b>ピンチ</b>ズームイン / アウト</div>
  </div>
  <div><b>赤いリング</b>入るとクイズが出題</div>
  <div class="qq-desk"><b>1 – 4</b>回答（クリックでも可）</div>
  <div class="qq-mob"><b>タップ</b>回答</div>
  <div id="helpEsc"><b>Esc</b>一時停止</div>
</div>
<div id="start" class="qq-overlay">
  <h1>CESIUM クイズクエスト</h1>
  <p>世界中を飛び回り、赤いリングを見つけて 5 つのクイズに答えよう！</p>
  <p class="qq-desk">W A S D 移動 &middot; マウスまたは矢印キーで見回す &middot; Esc 一時停止</p>
  <p class="qq-mob">スティックで移動 &middot; ドラッグで見回す &middot; ピンチでズーム</p>
  <button id="playBtn" class="qq-btn" disabled>読み込み中…</button>
  <p id="status">読み込み中…</p>
</div>
<div id="pause" class="qq-overlay" hidden><h1>一時停止中</h1><p>クリックで再開</p></div>
<div id="end" class="qq-overlay" hidden>
  <h1 id="endTitle"></h1>
  <p id="endScore" style="font-size: 26px"></p>
  <button id="againBtn" class="qq-btn">もう一度プレイ</button>
</div>
<div id="quiz" hidden>
  <div class="qq-card">
    <div id="qNum"></div>
    <div id="qText"></div>
    <div id="answers"></div>
    <p style="margin: 14px 0 0; opacity: 0.6; font-size: 13px"><span class="qq-desk">回答をクリックするか 1～4 キーを押してください</span><span class="qq-mob">回答をタップしてください</span></p>
  </div>
</div>
<div id="stick" hidden><div id="stickKnob"></div></div>
<div id="flash"></div>
<div id="banner"></div>
`;

for (const id of ["qq-style", "hud", "help", "start", "pause", "end", "quiz", "stick", "flash", "banner"]) {
  document.getElementById(id)?.remove();
}
if (!document.getElementById("cesiumContainer")) {
  const container = document.createElement("div");
  container.id = "cesiumContainer";
  document.body.prepend(container);
}
const styleEl = document.createElement("style");
styleEl.id = "qq-style";
styleEl.textContent = UI_CSS;
document.head.appendChild(styleEl);
document.body.insertAdjacentHTML("beforeend", UI_HTML);
document.body.classList.toggle("qq-touch", TOUCH);

const ui = (id) => document.getElementById(id);
const hudEl = ui("hud");
const hudTitleEl = ui("hudTitle");
const hudHintEl = ui("hudHint");
const hudCaptionEl = ui("hudCaption");
const helpEl = ui("help");
const startEl = ui("start");
const playBtn = ui("playBtn");
const statusEl = ui("status");
const pauseEl = ui("pause");
const endEl = ui("end");
const endTitleEl = ui("endTitle");
const endScoreEl = ui("endScore");
const againBtn = ui("againBtn");
const quizEl = ui("quiz");
const qNumEl = ui("qNum");
const qTextEl = ui("qText");
const bannerEl = ui("banner");
const flashEl = ui("flash");
const stickEl = ui("stick");
const stickKnobEl = ui("stickKnob");
const answerBtns = [0, 1, 2, 3].map((i) => {
  const b = document.createElement("button");
  b.addEventListener("click", () => answer(i));
  ui("answers").appendChild(b);
  return b;
});

// ── Viewer ────────────────────────────────────────────────────
statusEl.textContent = "地形を読み込み中…";
const [worldTerrain, japanTerrain] = await Promise.all([
  Cesium.createWorldTerrainAsync(),
  Cesium.CesiumTerrainProvider.fromIonAssetId(2767062),
]);
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: worldTerrain,
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  infoBox: false,
  selectionIndicator: false,
  fullscreenButton: false,
});
const scene = viewer.scene;
scene.globe.depthTestAgainstTerrain = true;
scene.screenSpaceCameraController.enableInputs = false;

// Tilesets, robot and the lobby spot load in parallel; landing zones are prepared later in the background.
statusEl.textContent = "アセットを読み込み中…";
const [robot, [player]] = await Promise.all([
  loadGlbWithoutNodes(MODEL_URL, REMOVE_NODES).then((url) =>
    Cesium.Model.fromGltfAsync({ url, scale: SCALE, incrementallyLoadTextures: false })
  ),
  Cesium.sampleTerrainMostDetailed(worldTerrain, [Cesium.Cartographic.fromDegrees(139.7649, 35.6814)]),
  ...LEVELS.filter((l) => l.tilesetId).map(async (level) => {
    // Splats: keep requesting tiles while the camera flies in, load a bit coarser, and keep them cached.
    const options = level.splat
      ? { cullRequestsWhileMoving: false, maximumScreenSpaceError: 24, cacheBytes: (TOUCH ? 512 : 1024) * 1024 * 1024 }
      : undefined;
    level.tileset = await Cesium.Cesium3DTileset.fromIonAssetId(level.tilesetId, options);
    scene.primitives.add(level.tileset);
  }),
]);
scene.primitives.add(robot);
viewer.creditDisplay.addStaticCredit(
  new Cesium.Credit(
    'ロボット: 「RobotExpressive」 作者: <a href="https://www.patreon.com/quaternius" target="_blank">Tomás Laulhé (Quaternius)</a>、' +
      '改変: <a href="https://donmccurdy.com/" target="_blank">Don McCurdy</a>、' +
      '<a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank">CC0 1.0</a>',
    true
  )
);
let groundHeight = player.height;
let heading = 0;
let pitch = CAM_PITCH;
let zoomDist = CAM_DIST;

// ── Robot model ───────────────────────────────────────────────
let ready = false;
let currentClip = null;
let desiredClip = "wave";
robot.readyEvent.addEventListener(() => {
  ready = true;
  robot.activeAnimations.animateWhilePaused = true;
  setClip(desiredClip);
});

function setClip(state) {
  desiredClip = state;
  if (!ready || state === currentClip) return;
  currentClip = state;
  const startedAt = performance.now();
  robot.activeAnimations.removeAll();
  robot.activeAnimations.add({
    name: CLIPS[state],
    loop: Cesium.ModelAnimationLoop.REPEAT,
    animationTime: () => (performance.now() - startedAt) / 1000, // wall-clock, independent of viewer clock
  });
}

// ── Landing zones ─────────────────────────────────────────────
function gridAround(center, radius, step) {
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, 0)
  );
  const k = Math.ceil(radius / step);
  const pts = [];
  for (let i = -k; i <= k; i++) {
    for (let j = -k; j <= k; j++) {
      const e = i * step;
      const n = j * step;
      if (Math.hypot(e, n) > radius + 0.01) continue;
      const p = Cesium.Matrix4.multiplyByPoint(enu, new Cesium.Cartesian3(e, n, 0), new Cesium.Cartesian3());
      pts.push({ i, j, e, n, carto: Cesium.Cartographic.fromCartesian(p) });
    }
  }
  return pts;
}

function best(list, score) {
  let result = null;
  let min = Infinity;
  for (const p of list) {
    const s = score(p);
    if (s < min) {
      min = s;
      result = p;
    }
  }
  return result;
}

const percentile = (values, q) => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

// Ray picks run between preUpdate and postUpdate, so the globe is hidden only for them, never on screen.
let assetOnlyPicks = 0;
scene.preUpdate.addEventListener(() => {
  if (assetOnlyPicks) scene.globe.show = false;
});
scene.postUpdate.addEventListener(() => {
  scene.globe.show = true;
});
const sampleExclude = [robot];
let prepView = null; // camera override while the start screen previews the first asset

// verify: sample twice and drop any point where the two runs disagree, so one bad pick can't skew a landing zone.
async function sampleAssetHeights(cartos, verify = false) {
  const run = async () => {
    // Run only while the player isn't walking, so these picks never overlap the per-frame walking picks.
    while (state === "play") await new Promise((resolve) => setTimeout(resolve, 200));
    const copy = cartos.map((c) => Cesium.Cartographic.clone(c));
    assetOnlyPicks++;
    try {
      await scene.sampleHeightMostDetailed(copy, sampleExclude);
    } finally {
      assetOnlyPicks--;
    }
    return copy.map((c) => c?.height);
  };
  const a = await run();
  const b = verify ? await run() : a;
  cartos.forEach((c, i) => {
    const ok = Number.isFinite(a[i]) && Number.isFinite(b[i]) && Math.abs(a[i] - b[i]) < 0.25;
    c.height = ok ? a[i] : undefined;
  });
}

// Most-detailed ray picks over the asset pull its finest tiles into the cache, so it is ready before we arrive.
function warmTiles(level) {
  if (!level.tileset || level.splat) return Promise.resolve();
  const bs = level.tileset.boundingSphere;
  const center = level.center
    ? Cesium.Cartographic.fromDegrees(level.center[0], level.center[1])
    : Cesium.Cartographic.fromCartesian(bs.center);
  const radius = Math.min(bs.radius, (level.searchRadius ?? 60) + 20);
  const probes = gridAround(center, radius, 8).map((p) => p.carto);
  return sampleAssetHeights(probes).catch((e) => console.warn(`Preloading ${level.name} failed`, e));
}

// Gaussian splats can't be picked, so build a 1 m surface grid from the loaded splat positions instead.
function buildSplatSurface(tileset, center, radius) {
  const CELL = 1;
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, 0)
  );
  const inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
  const k = Math.ceil(radius / CELL);
  const size = 2 * k + 1;
  const cols = new Map();
  const m = new Cesium.Matrix4();
  const v = new Cesium.Cartesian3();

  const visit = (tile) => {
    const c = tile.content;
    if (tile.contentReady && c?.positions && c.worldTransform) {
      Cesium.Matrix4.multiply(tile.computedTransform, Cesium.Axis.Y_UP_TO_Z_UP, m);
      Cesium.Matrix4.multiply(m, c.worldTransform, m);
      Cesium.Matrix4.multiply(inv, m, m);
      const p = c.positions;
      for (let s = 0; s < p.length; s += 3) {
        v.x = p[s];
        v.y = p[s + 1];
        v.z = p[s + 2];
        Cesium.Matrix4.multiplyByPoint(m, v, v);
        const ix = Math.round(v.x / CELL) + k;
        const iy = Math.round(v.y / CELL) + k;
        if (ix < 0 || iy < 0 || ix >= size || iy >= size) continue;
        const key = iy * size + ix;
        let col = cols.get(key);
        if (!col) cols.set(key, (col = []));
        col.push(v.z);
      }
    }
    for (const child of tile.children) visit(child);
  };
  visit(tileset.root);

  // Surface = highest dense 25 cm layer, so sparse floaters and wires above the ground are ignored.
  const height = new Float32Array(size * size).fill(NaN);
  const clutter = new Float32Array(size * size).fill(1);
  for (const [key, zs] of cols) {
    if (zs.length < 4) continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (const z of zs) {
      lo = Math.min(lo, z);
      hi = Math.max(hi, z);
    }
    const bins = new Uint32Array(Math.floor((hi - lo) / 0.25) + 1);
    for (const z of zs) bins[Math.floor((z - lo) / 0.25)]++;
    const threshold = Math.max(3, 0.25 * Math.max(...bins));
    let b = bins.length - 1;
    while (b > 0 && bins[b] < threshold) b--;
    const h = lo + (b + 1) * 0.25;
    height[key] = h;
    clutter[key] = zs.filter((z) => z > h + 0.4).length / zs.length;
  }

  const local = new Cesium.Cartesian3();
  return {
    at(e, n) {
      const ix = Math.round(e / CELL) + k;
      const iy = Math.round(n / CELL) + k;
      if (ix < 0 || iy < 0 || ix >= size || iy >= size) return { h: NaN, clutter: 1 };
      return { h: height[iy * size + ix], clutter: clutter[iy * size + ix] };
    },
    heightAt(carto) {
      Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0, undefined, local);
      Cesium.Matrix4.multiplyByPoint(inv, local, local);
      return this.at(local.x, local.y).h;
    },
  };
}

// Samples real surface heights (asset + terrain) and picks a flat, open, ground-level spawn and ring spot.
async function prepareLevel(level) {
  const center = level.center
    ? Cesium.Cartographic.fromDegrees(level.center[0], level.center[1])
    : Cesium.Cartographic.fromCartesian(level.tileset.boundingSphere.center);
  const radius = level.searchRadius ?? Cesium.Math.clamp(level.tileset.boundingSphere.radius * 0.7, 15, 60);
  const step = level.gridStep ?? (level.splat ? 2 : radius / 6);
  const pts = gridAround(center, radius, step);

  const terrainH = pts.map((p) => Cesium.Cartographic.clone(p.carto));
  await Cesium.sampleTerrainMostDetailed(level.japanTerrain ? japanTerrain : worldTerrain, terrainH);
  pts.forEach((p, i) => (p.t = terrainH[i].height));

  if (level.splat) {
    level.surface = buildSplatSurface(level.tileset, center, level.tileset.boundingSphere.radius);
    for (const p of pts) {
      const s = level.surface.at(p.e, p.n);
      p.s = s.h;
      p.clutter = s.clutter;
    }
  } else if (level.tileset && scene.sampleHeightSupported) {
    const tileH = pts.map((p) => Cesium.Cartographic.clone(p.carto));
    try {
      await sampleAssetHeights(tileH, true);
      pts.forEach((p, i) => (p.s = tileH[i].height));
    } catch (e) {
      console.warn(`Asset height sampling failed for ${level.name}`, e);
    }

    // Assets stored with sea-level heights sit tens of metres under the terrain: lift them so their ground meets it.
    // Smaller gaps are just terrain detail (e.g. Japan terrain vs. building footprints), so leave those alone.
    // A real datum gap is consistent across the site; a scattered one means bad samples, so it is ignored.
    const gaps = pts.filter((p) => Number.isFinite(p.s) && Number.isFinite(p.t)).map((p) => p.t - p.s);
    const offset = gaps.length ? percentile(gaps, 0.8) : 0;
    const consistent = gaps.filter((g) => Math.abs(g - offset) < 1.5).length >= gaps.length * 0.3;
    const alreadyMoved = !Cesium.Matrix4.equals(level.tileset.modelMatrix, Cesium.Matrix4.IDENTITY);
    if (offset > 10 && offset < 100 && consistent && !alreadyMoved) {
      const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(level.tileset.boundingSphere.center, new Cesium.Cartesian3());
      level.tileset.modelMatrix = Cesium.Matrix4.fromTranslation(Cesium.Cartesian3.multiplyByScalar(up, offset, up));
      pts.forEach((p) => Number.isFinite(p.s) && (p.s += offset));
    }
  }

  const valid = [];
  const byIndex = new Map();
  for (const p of pts) {
    const hasT = Number.isFinite(p.t);
    const hasS = Number.isFinite(p.s);
    if (!hasT && !hasS) continue;
    p.h = Math.max(hasT ? p.t : -Infinity, hasS ? p.s : -Infinity);
    p.onAsset = hasS && (!hasT || p.s >= p.t - 0.3);
    p.clutter ??= 0;
    valid.push(p);
    byIndex.set(`${p.i},${p.j}`, p);
  }
  if (!valid.length) throw new Error(`No surface found at ${level.name}`);

  // Roughness = biggest height jump to a neighbour; rejects walls, roof edges and equipment.
  // Overhead = worst clutter within ~4 m, so the robot and its camera aren't under trees or wires.
  const flatTol = 0.15 * step + 0.1;
  const reach = Math.max(1, Math.round(4 / step));
  for (const p of valid) {
    p.rough = 0;
    p.overhead = 0;
    for (let di = -reach; di <= reach; di++) {
      for (let dj = -reach; dj <= reach; dj++) {
        const q = byIndex.get(`${p.i + di},${p.j + dj}`);
        if (!q) continue;
        p.overhead = Math.max(p.overhead, q.clutter);
        if (Math.abs(di) <= 1 && Math.abs(dj) <= 1) p.rough = Math.max(p.rough, Math.abs(q.h - p.h));
      }
    }
  }
  const open = (p) => p.rough <= flatTol && p.overhead < 0.2;

  // Stay near the lower surfaces so the robot lands on the ground, not on a roof.
  let pool = valid.filter(open);
  if (!pool.length) pool = valid;
  let groundLevel = -Infinity;
  if (level.tileset) {
    groundLevel = percentile(pool.map((p) => p.h), level.splat ? 0.4 : 0.2);
    const ground = groundLevel + (level.splat ? 1.5 : 1);
    pool = pool.filter((p) => p.h <= ground);
    const onAsset = pool.filter((p) => p.onAsset);
    if (onAsset.length) pool = onAsset;
  }
  const want = level.ringDistance ?? 12;
  const lineUp = level.faceModel && faceModelSpots(level, center, valid, pool, open, groundLevel, want);
  const spawn = lineUp ? lineUp.spawn : best(pool, (p) => Math.hypot(p.e, p.n));

  const others = valid.filter((p) => p !== spawn);
  let toward = null;
  if (level.faceToward) {
    level.faceHeading = new Cesium.EllipsoidGeodesic(
      spawn.carto,
      Cesium.Cartographic.fromDegrees(...level.faceToward)
    ).startHeading;
    const [ex, ny] = [spawn.e + want * Math.sin(level.faceHeading), spawn.n + want * Math.cos(level.faceHeading)];
    toward = best(others, (p) => Math.hypot(p.e - ex, p.n - ny) + (open(p) ? 0 : 2));
  }
  const ringScore = (p, strict) => {
    const d = Math.hypot(p.e - spawn.e, p.n - spawn.n);
    const dh = Math.abs(p.h - spawn.h);
    if (strict && (d < want - 4 || d > want + 8 || dh > 1.5 || !open(p))) return Infinity;
    return Math.abs(d - want) + dh * 4 + (level.tileset && !p.onAsset ? 5 : 0) + (open(p) ? 0 : 10);
  };
  const ring = lineUp
    ? lineUp.ring
    : (toward ?? best(others, (p) => ringScore(p, true)) ?? best(others, (p) => ringScore(p, false)) ?? spawn);

  level.spawn = new Cesium.Cartographic(spawn.carto.longitude, spawn.carto.latitude, spawn.h);
  level.ringCarto = new Cesium.Cartographic(ring.carto.longitude, ring.carto.latitude, ring.h);
  level.ringFlat = Cesium.Cartesian3.fromRadians(ring.carto.longitude, ring.carto.latitude, 0);
}

// Spawn on the ground before the building's near face (as seen along the arrival bearing), ring between them.
function faceModelSpots(level, center, valid, pool, open, groundLevel, want) {
  const building = valid.filter((p) => p.onAsset && p.h > groundLevel + 3);
  if (!building.length) return null;
  const bx = building.reduce((s, p) => s + p.e, 0) / building.length;
  const by = building.reduce((s, p) => s + p.n, 0) / building.length;

  const prev = LEVELS[LEVELS.indexOf(level) - 1];
  const from = prev?.spawn ?? (prev?.center && Cesium.Cartographic.fromDegrees(...prev.center)) ?? prev?.approach;
  if (!from) return null;
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, 0)
  );
  const target = Cesium.Cartographic.fromCartesian(
    Cesium.Matrix4.multiplyByPoint(enu, new Cesium.Cartesian3(bx, by, 0), new Cesium.Cartesian3())
  );
  const b = new Cesium.EllipsoidGeodesic(from, target).endHeading;
  const [dx, dy] = [Math.sin(b), Math.cos(b)];
  const along = (p) => (p.e - bx) * dx + (p.n - by) * dy;
  const side = (p) => (p.n - by) * dx - (p.e - bx) * dy;

  const front = Math.min(...building.map(along));
  const ringAt = front - 6;
  const spawnAt = ringAt - want;
  const spawn = best(pool, (p) => Math.abs(along(p) - spawnAt) + Math.abs(side(p)) * 1.5);
  if (!spawn) return null;
  const ring = best(
    valid.filter((p) => p !== spawn && open(p) && Math.abs(p.h - spawn.h) < 1.5 && along(p) > along(spawn) + 6),
    (p) => Math.abs(along(p) - ringAt) + Math.abs(side(p) - side(spawn)) * 1.5
  );
  return ring ? { spawn, ring } : null;
}

// Ring + light beam as an in-memory glTF: models render relative-to-center, so they stay crisp on every GPU.
function ringGltf() {
  const SEG = 64;
  const INNER = RING_RADIUS - 0.45;
  const BEAM = 6;
  const pos = [];
  const ringIdx = [];
  const beamIdx = [];
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const x = Math.cos(a);
    const y = Math.sin(a);
    pos.push(RING_RADIUS * x, RING_RADIUS * y, 0.12, INNER * x, INNER * y, 0.12);
  }
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    pos.push(RING_RADIUS * Math.cos(a), RING_RADIUS * Math.sin(a), 0);
    pos.push(RING_RADIUS * Math.cos(a), RING_RADIUS * Math.sin(a), BEAM);
  }
  for (let i = 0; i < SEG; i++) {
    const o0 = 2 * i;
    const o1 = 2 * ((i + 1) % SEG);
    ringIdx.push(o0, o1, o0 + 1, o0 + 1, o1, o1 + 1);
    const b0 = 2 * SEG + o0;
    const b1 = 2 * SEG + o1;
    beamIdx.push(b0, b1, b0 + 1, b0 + 1, b1, b1 + 1);
  }

  const posBytes = new Uint8Array(new Float32Array(pos).buffer);
  const ringBytes = new Uint8Array(new Uint16Array(ringIdx).buffer);
  const beamBytes = new Uint8Array(new Uint16Array(beamIdx).buffer);
  const bin = new Uint8Array(posBytes.length + ringBytes.length + beamBytes.length);
  bin.set(posBytes, 0);
  bin.set(ringBytes, posBytes.length);
  bin.set(beamBytes, posBytes.length + ringBytes.length);
  let binary = "";
  for (const b of bin) binary += String.fromCharCode(b);

  const unlit = (rgba, blend) => ({
    pbrMetallicRoughness: { baseColorFactor: rgba, metallicFactor: 0, roughnessFactor: 1 },
    doubleSided: true,
    ...(blend ? { alphaMode: "BLEND" } : {}),
    extensions: { KHR_materials_unlit: {} },
  });
  return {
    asset: { version: "2.0" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          { attributes: { POSITION: 0 }, indices: 1, material: 0 },
          { attributes: { POSITION: 0 }, indices: 2, material: 1 },
        ],
      },
    ],
    materials: [unlit([1, 0.05, 0.05, 1], false), unlit([1, 0.1, 0.1, 0.2], true)],
    buffers: [{ byteLength: bin.length, uri: `data:application/octet-stream;base64,${btoa(binary)}` }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: posBytes.length, byteLength: ringBytes.length, target: 34963 },
      { buffer: 0, byteOffset: posBytes.length + ringBytes.length, byteLength: beamBytes.length, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: pos.length / 3,
        type: "VEC3",
        min: [-RING_RADIUS, -RING_RADIUS, 0],
        max: [RING_RADIUS, RING_RADIUS, BEAM],
      },
      { bufferView: 1, componentType: 5123, count: ringIdx.length, type: "SCALAR" },
      { bufferView: 2, componentType: 5123, count: beamIdx.length, type: "SCALAR" },
    ],
  };
}

async function createRing(level, index) {
  const c = level.ringCarto;
  const h = c.height;
  const model = await Cesium.Model.fromGltfAsync({
    gltf: ringGltf(),
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, h)),
    upAxis: Cesium.Axis.Z,
    forwardAxis: Cesium.Axis.X,
    show: false,
  });
  scene.primitives.add(model);

  const labelPos = new Cesium.Cartesian3();
  const label = viewer.entities.add({
    show: false,
    position: new Cesium.CallbackProperty(
      () =>
        Cesium.Cartesian3.fromRadians(
          c.longitude,
          c.latitude,
          h + 3.6 + 0.3 * Math.sin(performance.now() / 400),
          undefined,
          labelPos
        ),
      false
    ),
    label: {
      text: `Q${index + 1}`,
      font: "bold 34px sans-serif",
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: Cesium.Color.RED.withAlpha(0.9),
      backgroundPadding: new Cesium.Cartesian2(12, 6),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      // Draw over nearby buildings, but let the globe hide it and fade it out from far away.
      disableDepthTestDistance: 3000,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000),
    },
  });
  level.ringParts = [model, label];
  level.ring = {
    set show(v) {
      model.show = v;
      label.show = v;
    },
  };
}

// ── Game flow ─────────────────────────────────────────────────
let state = "lobby"; // lobby | waiting | flying | landing | play | question | result | end
let current = 0;
let score = 0;
let quiz = []; // this round's questions, drawn at random from QUESTIONS
let locked = false;
let noLock = TOUCH; // no pointer lock (touch, or refused e.g. in a sandboxed iframe): free cursor / fingers steer instead
let faceCamera = true;
let resultClip = "yes";
let flight = null;
let landing = null;
let landedAt = 0;

const canvas = viewer.canvas;

function refreshOverlays() {
  pauseEl.hidden = !(state === "play" && !locked && !noLock);
  hudEl.hidden = state === "lobby" || state === "end";
  helpEl.hidden = hudEl.hidden;
  ui("helpEdge").hidden = !noLock;
  ui("helpEsc").hidden = noLock;
  stickEl.hidden = !(TOUCH && state === "play");
  const cursorNeeded = state === "lobby" || state === "question" || state === "end" || !pauseEl.hidden;
  document.body.classList.toggle("qq-nocursor", !cursorNeeded);
}

function setState(s) {
  state = s;
  refreshOverlays();
}

function lockPointer() {
  if (noLock) return;
  try {
    canvas.requestPointerLock()?.catch?.(onLockError);
  } catch {
    onLockError();
  }
  // Sandboxed iframes can refuse pointer lock without any event, so fall back if it never engages.
  setTimeout(() => !locked && onLockError(), 1000);
}

function onLockError() {
  noLock = true;
  refreshOverlays();
}

function startGame() {
  score = 0;
  current = 0;
  quiz = [...QUESTIONS];
  for (let i = quiz.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [quiz[i], quiz[j]] = [quiz[j], quiz[i]];
  }
  quiz.length = LEVELS.length;
  startEl.hidden = true;
  endEl.hidden = true;
  lockPointer();
  if (TOUCH) document.documentElement.requestFullscreen?.()?.catch(() => {}); // hide the mobile browser bars
  startFlight();
}

async function startFlight() {
  const level = LEVELS[current];
  const terrain = level.japanTerrain ? japanTerrain : worldTerrain;
  if (scene.terrainProvider !== terrain) scene.terrainProvider = terrain;
  LEVELS.forEach((l) => l.ring && (l.ring.show = l === level));
  faceCamera = false;

  // Take off only once the destination's landing zone is measured and its tiles are in the cache.
  if (level.ready || level.tileset) {
    setState("waiting");
    await Promise.all([level.ready?.catch(() => {}), warmTiles(level)]);
    if (LEVELS[current] !== level) return; // a restart happened while waiting
  }

  // Fly straight to the landing spot if it is ready, else to a hover point above the asset.
  let target = level.spawn ?? level.approach;
  if (!target) {
    await level.ready;
    target = level.spawn;
  }

  const from = Cesium.Cartographic.clone(player);
  const geo = new Cesium.EllipsoidGeodesic(from, target);
  const dist = geo.surfaceDistance;
  flight = {
    geo,
    from,
    to: target,
    start: performance.now(),
    duration: Cesium.Math.clamp(3 + dist / 1.5e6, 5, 12) * 1000,
    peak: Cesium.Math.clamp(dist * 0.3, 300, 2.5e6),
    bearing: geo.startHeading,
    startHeading: heading,
    startPitch: pitch,
    faceHeading: target === level.spawn ? level.faceHeading : undefined,
  };
  robot.minimumPixelSize = 96; // keep the robot visible from orbit
  setState("flying");
}

const smooth = (a, b, x) => {
  const t = Cesium.Math.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerpAngle = (a, b, k) => a + Cesium.Math.negativePiToPi(b - a) * k;

function bearing(lon1, lat1, lon2, lat2) {
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

const scratchCarto = new Cesium.Cartographic();
const scratchCarto2 = new Cesium.Cartographic();

function updateFlight(now) {
  const raw = Math.min((now - flight.start) / flight.duration, 1);
  const t = raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2;
  const c = flight.geo.interpolateUsingFraction(t, scratchCarto);
  const lon = c.longitude;
  const lat = c.latitude;
  if (t < 0.998) {
    const ahead = flight.geo.interpolateUsingFraction(Math.min(t + 0.002, 1), scratchCarto2);
    flight.bearing = bearing(lon, lat, ahead.longitude, ahead.latitude);
  }
  const lift = flight.peak * Math.sin(Math.PI * t);
  player.longitude = lon;
  player.latitude = lat;
  player.height = Cesium.Math.lerp(flight.from.height, flight.to.height, t) + lift;

  const kIn = smooth(0, 0.12, raw);
  const kOut = smooth(0.8, 1, raw);
  heading = lerpAngle(flight.startHeading, flight.bearing, kIn);
  // Levels with a view to show swing round gradually during the descent, not abruptly at touchdown.
  if (flight.faceHeading !== undefined) heading = lerpAngle(heading, flight.faceHeading, smooth(0.55, 0.95, raw));
  const camPitch = Cesium.Math.lerp(
    Cesium.Math.lerp(flight.startPitch, Cesium.Math.toRadians(-30), kIn),
    CAM_PITCH,
    kOut
  );
  const camDist = zoomDist + lift * 1.2;
  if (raw >= 1) {
    const level = LEVELS[current];
    if (flight.to === level.spawn) land();
    else startLanding(level);
  }
  return { camPitch, camDist };
}

// Hover above the asset until its landing zone is ready, then glide down onto it.
function startLanding(level) {
  flight = null;
  landing = { from: Cesium.Cartographic.clone(player), start: undefined };
  setState("landing");
  level.ready ??= prepareOnSite(level);
  level.ready.then(
    () => {
      level.ring.show = true;
      landing.start = performance.now();
    },
    () => (hudHintEl.textContent = `${level.name} を準備できませんでした。再読み込みしてください。`)
  );
}

// Resolves once the tileset reports all tiles for the current view loaded (after minMs, giving up after maxMs).
async function waitForTiles(tileset, minMs, maxMs) {
  const start = performance.now();
  while (performance.now() - start < maxMs) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (performance.now() - start > minMs && tileset.tilesLoaded) return;
  }
}

// Waits until the asset's tiles for the current view have fully streamed in, then measures the landing zone.
async function prepareOnSite(level) {
  if (level.tileset) await waitForTiles(level.tileset, 2000, 30000);
  await prepareLevel(level);
  await createRing(level, LEVELS.indexOf(level));
  sampleExclude.push(...level.ringParts);
}

function updateLanding(now) {
  const level = LEVELS[current];
  const bs = level.tileset?.boundingSphere;
  const survey = { camPitch: Cesium.Math.toRadians(-55), camDist: bs ? bs.radius * 1.3 : 60 };
  if (landing.start === undefined) return survey;
  const k = smooth(0, 1, (now - landing.start) / 2500);
  player.longitude = Cesium.Math.lerp(landing.from.longitude, level.spawn.longitude, k);
  player.latitude = Cesium.Math.lerp(landing.from.latitude, level.spawn.latitude, k);
  player.height = Cesium.Math.lerp(landing.from.height, level.spawn.height, k);
  const view = {
    camPitch: Cesium.Math.lerp(survey.camPitch, CAM_PITCH, k),
    camDist: Cesium.Math.lerp(survey.camDist, zoomDist, k),
  };
  if (k >= 1) land();
  return view;
}

function land() {
  const level = LEVELS[current];
  Cesium.Cartographic.clone(level.spawn, player);
  groundHeight = level.spawn.height;
  pitch = CAM_PITCH;
  robot.minimumPixelSize = 0;
  landedAt = performance.now();
  flight = null;
  landing = null;
  if (level.ring) level.ring.show = true;
  const next = LEVELS[current + 1];
  const startPlaying = () => {
    setState("play");
    next?.ready?.then(() => warmTiles(next)).catch(() => {});
  };
  // Splats stream in late: stay put (HUD shows "Loading…") until they have, for at most 8 s.
  if (level.splat && !level.tileset.tilesLoaded) {
    setState("waiting");
    waitForTiles(level.tileset, 500, 8000).then(() => state === "waiting" && startPlaying());
  } else {
    startPlaying();
  }
}

// Hold the pre-sampled landing height until the asset's detailed tiles have streamed in.
function surfaceReady(now) {
  const tileset = LEVELS[current].tileset;
  const t = now - landedAt;
  return t > 1500 && (!tileset || tileset.tilesLoaded || t > 6000);
}

function openQuestion() {
  setState("question");
  keys.clear();
  releaseStick();
  document.exitPointerLock();
  const q = quiz[current];
  qNumEl.textContent = `第 ${current + 1} 問 / 全 ${quiz.length} 問`;
  qTextEl.textContent = q.text;
  answerBtns.forEach((b, i) => {
    b.textContent = `${i + 1}. ${q.answers[i]}`;
    b.disabled = false;
    b.className = "";
  });
  quizEl.hidden = false;
}

function answer(i) {
  if (state !== "question") return;
  lockPointer(); // must happen inside the click/key gesture
  const q = quiz[current];
  const ok = i === q.correct;
  if (ok) score++;
  answerBtns.forEach((b, j) => {
    b.disabled = true;
    if (j === q.correct) b.classList.add("right");
    else if (j === i) b.classList.add("wrong");
  });
  playEffect(ok);
  resultClip = ok ? "yes" : "no";
  faceCamera = true;
  LEVELS[current].ring.show = false;
  setState("result");
  setTimeout(() => (quizEl.hidden = true), 1300);
  setTimeout(nextQuestion, 3200);
}

function playEffect(ok) {
  const cls = ok ? "correct" : "fail";
  bannerEl.textContent = ok ? "正解！" : "不正解！";
  for (const el of [bannerEl, flashEl]) {
    el.className = "";
    void el.offsetWidth; // restart the CSS animation
    el.className = cls;
  }
}

function nextQuestion() {
  current++;
  if (current < LEVELS.length) startFlight();
  else endGame();
}

function endGame() {
  setState("end");
  document.exitPointerLock();
  faceCamera = true;
  endTitleEl.textContent = score === quiz.length ? "パーフェクト！" : score >= 3 ? "よくできました！" : "おしい！";
  endScoreEl.textContent = `スコア: ${score} / ${quiz.length}`;
  endEl.hidden = false;
}

function updateHud(ringDist) {
  if (hudEl.hidden) return;
  const level = LEVELS[current];
  const title = `Q${current + 1}/${LEVELS.length} · ${level.name} · スコア ${score}`;
  const hint =
    state === "flying"
      ? `${level.name} へ飛行中…`
      : state === "waiting" || (state === "landing" && landing?.start === undefined)
        ? `${level.name} を読み込み中…`
        : state === "landing"
          ? "着陸中…"
          : state === "play"
            ? `赤いリング Q${current + 1} に入ろう · あと ${Math.round(ringDist)} m`
            : "";
  if (hudTitleEl.textContent !== title) hudTitleEl.textContent = title;
  if (hudHintEl.textContent !== hint && !hudHintEl.textContent.includes("準備できませんでした")) hudHintEl.textContent = hint;
  const caption = state === "flying" || state === "waiting" ? "" : level.caption;
  if (hudCaptionEl.textContent !== caption) hudCaptionEl.textContent = caption;
}

// ── Input ─────────────────────────────────────────────────────
const keys = new Set();
canvas.setAttribute("tabindex", "0"); // iframe canvas must be focusable to receive keys
canvas.focus();
document.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code.startsWith("Arrow")) e.preventDefault();
  if (state === "question") {
    const n = "1234".indexOf(e.key);
    if (n >= 0) answer(n);
  }
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());

document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  if (!locked) keys.clear();
  refreshOverlays();
});
document.addEventListener("pointerlockerror", onLockError);
document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; // Firefox may report lines, not pixels
    zoomDist = Cesium.Math.clamp(zoomDist * Math.exp(dy * 0.001), CAM_DIST_MIN, CAM_DIST_MAX);
  },
  { passive: false }
);
// pointermove, not mousemove: Cesium's canvas handler cancels pointerdown, which suppresses mousemove while dragging.
let cursorX = null; // 0..1 across the screen, null when the cursor is outside
document.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  cursorX = e.clientX / innerWidth;
  if (state !== "play") return;
  if (!locked && !noLock) return;
  heading += Cesium.Math.toRadians(e.movementX * LOOK_SENS);
  pitch = Cesium.Math.clamp(
    pitch - Cesium.Math.toRadians(e.movementY * LOOK_SENS),
    Cesium.Math.toRadians(-80),
    Cesium.Math.toRadians(20)
  );
});
document.documentElement.addEventListener("mouseleave", () => (cursorX = null));

// Touch: the on-screen stick moves; one finger on the view looks around, two pinch to zoom.
const stick = { x: 0, y: 0 };
function moveStick(e) {
  const r = stickEl.getBoundingClientRect();
  const radius = r.width / 2;
  let x = (e.clientX - r.left - radius) / radius;
  let y = (e.clientY - r.top - radius) / radius;
  const m = Math.hypot(x, y);
  if (m > 1) {
    x /= m;
    y /= m;
  }
  stick.x = x;
  stick.y = y;
  stickKnobEl.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
}
function releaseStick() {
  stick.x = 0;
  stick.y = 0;
  stickKnobEl.style.transform = "";
}
stickEl.addEventListener("pointerdown", (e) => {
  stickEl.setPointerCapture(e.pointerId);
  moveStick(e);
});
stickEl.addEventListener("pointermove", (e) => stickEl.hasPointerCapture(e.pointerId) && moveStick(e));
stickEl.addEventListener("lostpointercapture", releaseStick);

const touches = new Map(); // fingers dragging on the 3D view
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
document.addEventListener("pointermove", (e) => {
  const t = touches.get(e.pointerId);
  if (!t) return;
  const [a, b] = touches.values();
  const spread = b && Math.hypot(a.x - b.x, a.y - b.y);
  const dx = e.clientX - t.x;
  const dy = e.clientY - t.y;
  t.x = e.clientX;
  t.y = e.clientY;
  if (b) {
    const now = Math.hypot(a.x - b.x, a.y - b.y);
    if (spread > 0 && now > 0) zoomDist = Cesium.Math.clamp((zoomDist * spread) / now, CAM_DIST_MIN, CAM_DIST_MAX);
  } else if (state === "play") {
    heading += Cesium.Math.toRadians(dx * TOUCH_LOOK_SENS);
    pitch = Cesium.Math.clamp(
      pitch - Cesium.Math.toRadians(dy * TOUCH_LOOK_SENS),
      Cesium.Math.toRadians(-80),
      Cesium.Math.toRadians(20)
    );
  }
});
const dropTouch = (e) => touches.delete(e.pointerId);
document.addEventListener("pointerup", dropTouch);
document.addEventListener("pointercancel", dropTouch);

playBtn.addEventListener("click", startGame);
againBtn.addEventListener("click", startGame);
pauseEl.addEventListener("click", lockPointer);

// ── Per-frame update ──────────────────────────────────────────
const scratchFeet = new Cesium.Cartesian3();
const scratchOffset = new Cesium.Cartesian3();
const scratchLocal = new Cesium.Cartesian3();
const scratchTarget = new Cesium.Cartesian3();
const scratchFlat = new Cesium.Cartesian3();
const scratchEnu = new Cesium.Matrix4();

let lastTime = performance.now();
let lastSample = 0;

scene.preRender.addEventListener(() => {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  let moving = false;
  let camPitch = pitch;
  let camDist = zoomDist;
  let ringDist = 0;

  if (state === "flying") {
    ({ camPitch, camDist } = updateFlight(now));
  } else if (state === "landing") {
    ({ camPitch, camDist } = updateLanding(now));
  } else if (state === "play" && (locked || noLock)) {
    const turn = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
    const tilt = (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0);
    // A free cursor stops at the screen edge, so resting it there keeps the view turning.
    const edge = noLock && cursorX !== null ? (cursorX < EDGE_TURN ? -1 : cursorX > 1 - EDGE_TURN ? 1 : 0) : 0;
    heading += Cesium.Math.toRadians((turn + edge) * KEY_TURN_SPEED * dt);
    pitch = Cesium.Math.clamp(
      pitch + Cesium.Math.toRadians(tilt * KEY_TURN_SPEED * 0.6 * dt),
      Cesium.Math.toRadians(-80),
      Cesium.Math.toRadians(20)
    );
    camPitch = pitch;

    const fwd = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0) - stick.y;
    const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0) + stick.x;
    moving = Math.hypot(fwd, strafe) > 0.2;

    // Move in the local East-North-Up frame (heading 0 = north).
    if (moving) {
      const east = fwd * Math.sin(heading) + strafe * Math.cos(heading);
      const north = fwd * Math.cos(heading) - strafe * Math.sin(heading);
      const step = (RUN_SPEED * dt) / Math.hypot(east, north);
      const feet = Cesium.Cartographic.toCartesian(player, undefined, scratchFeet);
      const enu = Cesium.Transforms.eastNorthUpToFixedFrame(feet, undefined, scratchEnu);
      Cesium.Cartesian3.fromElements(east * step, north * step, 0, scratchLocal);
      Cesium.Matrix4.multiplyByPointAsVector(enu, scratchLocal, scratchOffset);
      const moved = Cesium.Cartographic.fromCartesian(Cesium.Cartesian3.add(feet, scratchOffset, feet));
      player.longitude = moved.longitude;
      player.latitude = moved.latitude;
    }
  }

  if (state === "play") {
    // Walking uses GPU picks too; overlapping them with a background most-detailed pick corrupts both
    // (robot sinking hundreds of metres, assets lifted by mistake), so pause while one is running.
    if (ready && now - lastSample > 120 && surfaceReady(now)) {
      lastSample = now;
      let h;
      if (assetOnlyPicks === 0) {
        if (scene.sampleHeightSupported) h = scene.sampleHeight(player, sampleExclude);
        if (!Cesium.defined(h)) h = scene.globe.getHeight(player);
      }
      const splatH = LEVELS[current].surface?.heightAt(player);
      // A sudden rise in the splat surface is wires or canopy overhead, not a step: stay on the current layer.
      if (Number.isFinite(splatH)) h = splatH > groundHeight + 1 ? groundHeight : Math.max(h ?? splatH, splatH);
      if (Cesium.defined(h)) groundHeight = h;
    }
    player.height = groundHeight;

    const level = LEVELS[current];
    ringDist = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromRadians(player.longitude, player.latitude, 0, undefined, scratchFlat),
      level.ringFlat
    );
    if (ringDist < RING_TRIGGER) openQuestion();
  } else if (state !== "flying" && state !== "landing") {
    player.height = groundHeight;
  }

  // Robot pose + animation.
  const feet = Cesium.Cartographic.toCartesian(player, undefined, scratchFeet);
  robot.modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
    feet,
    new Cesium.HeadingPitchRoll(heading + HEADING_OFFSET + (faceCamera ? Math.PI : 0), 0, 0),
    undefined,
    undefined,
    robot.modelMatrix
  );
  if (state === "flying" || state === "landing") setClip("fly");
  else if (state === "play") setClip(moving ? "run" : "idle");
  else if (state === "result") setClip(resultClip);
  else if (state === "end") setClip("dance");
  else if (state === "lobby") setClip("wave");
  else setClip("idle");

  // Third-person camera, tilted so the robot sits slightly below screen center.
  const camera = scene.camera;
  if (prepView) {
    camera.lookAt(prepView.center, prepView.hpr);
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    return;
  }
  const target = Cesium.Cartesian3.fromRadians(
    player.longitude,
    player.latitude,
    player.height + CAM_HEIGHT,
    undefined,
    scratchTarget
  );
  camera.lookAt(target, new Cesium.HeadingPitchRange(heading, camPitch, camDist));
  camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  const focal = canvas.clientHeight / 2 / Math.tan(camera.frustum.fovy / 2);
  camera.lookUp(Math.atan(FOCUS_OFFSET_PX / focal));

  updateHud(ringDist);
});

// ── Load the first asset before Play; the rest are prepared in the background, in question order ──
for (const level of LEVELS) {
  if (!level.tileset || level.center) continue;
  const bs = level.tileset.boundingSphere;
  const c = Cesium.Cartographic.fromCartesian(bs.center);
  level.approach = new Cesium.Cartographic(c.longitude, c.latitude, c.height + bs.radius + 10);
}

let chain = Promise.resolve();
LEVELS.forEach((level, i) => {
  if (i === 0 || level.splat) return; // first level loads up front; splats are prepared on arrival
  level.ready = chain.then(async () => {
    await prepareLevel(level);
    await createRing(level, i);
    sampleExclude.push(...level.ringParts);
    if (level === LEVELS[current] && state === "play") level.ring.show = true;
  });
  level.ready.catch((e) => console.error(`Preparing ${level.name} failed`, e));
  chain = level.ready.then(() => warmTiles(level)).catch(() => {});
});

// The start screen previews the first asset while its tiles stream in and its landing zone is measured.
const first = LEVELS[0];
statusEl.textContent = `${first.name} を読み込み中…`;
if (first.tileset) {
  const bs = first.tileset.boundingSphere;
  prepView = { center: bs.center, hpr: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-60), bs.radius * 1.5) };
}
first.ready = prepareOnSite(first);
try {
  await first.ready;
  // Second pass from the robot's actual landing view, so the street-level tiles are cached too.
  if (first.tileset) {
    const arrival = new Cesium.EllipsoidGeodesic(player, first.spawn).endHeading;
    const eye = Cesium.Cartesian3.fromRadians(first.spawn.longitude, first.spawn.latitude, first.spawn.height + CAM_HEIGHT);
    prepView = { center: eye, hpr: new Cesium.HeadingPitchRange(arrival, CAM_PITCH, CAM_DIST) };
    await waitForTiles(first.tileset, 1500, 20000);
  }
} finally {
  prepView = null;
}

playBtn.disabled = false;
playBtn.textContent = "プレイ";
statusEl.textContent = "準備完了！";