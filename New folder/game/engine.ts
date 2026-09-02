import { AudioEngine } from "./audio";
import { ARTIFACT_BY_ID, ARTIFACTS } from "./artifacts";
import { mulberry32, clamp, lerp, pointInPoly, fmtTime } from "./rng";
import type {
  GamePhase, ToolId, HudSnapshot, PointerState, PKind, ArtifactDef, PayoutInfo, EngineApi,
  DirtConfig,
} from "./types";

/** Рецепты грязи: каждая реликвия чистится по-своему (сложность, количество слоёв,
 *  хрупкая эмаль, спрятанные секреты). Винтаж — скребок, Ностальгия — лазер, Сокровища — пена. */
const DIRT_RECIPES: Record<string, DirtConfig> = {
  // ── ВИНТАЖ: толстая смола, механика ──
  watch:   { resin: { grid: 6, skip: 0.12 }, oxide: { amount: 0.85 }, grease: { amount: 0.7 }, secrets: 1 },
  compass: { resin: { grid: 5, skip: 0.08 }, oxide: { amount: 0.9 },  grease: { amount: 0.6 }, secrets: 1 },
  zippo:   { resin: { grid: 8, skip: 0.02 }, oxide: { amount: 0.6 },  grease: { amount: 1.15 }, secrets: 0 },
  key:     { resin: { grid: 7, skip: 0.0 },  oxide: { amount: 1.0 },  grease: { amount: 0.65 }, secrets: 1 },
  // ── НОСТАЛЬГИЯ: плотная ржавчина, точный лазер ──
  console: { resin: { grid: 6, skip: 0.32 }, oxide: { amount: 1.3, window: 0.85 }, grease: { amount: 1.0 }, secrets: 0 },
  walkman: { resin: { grid: 6, skip: 0.28 }, oxide: { amount: 1.25, window: 0.8 }, grease: { amount: 1.05 }, secrets: 0 },
  camera:  { resin: { grid: 6, skip: 0.24 }, oxide: { amount: 1.1, window: 0.85, fragile: 2 }, grease: { amount: 1.2 }, secrets: 0 },
  // ── СОКРОВИЩА: налёт/патина, пена, секреты, хрупкая филигрань ──
  ring:    { resin: { grid: 6, skip: 0.38 }, oxide: { amount: 0.7, fragile: 1 }, grease: { amount: 1.4 }, secrets: 1 },
  scarab:  { resin: { grid: 7, skip: 0.18 }, oxide: { amount: 1.0 }, grease: { amount: 1.35 }, secrets: 1 },
  crown:   { resin: { grid: 7, skip: 0.08 }, oxide: { amount: 1.2, window: 0.8, fragile: 2 }, grease: { amount: 1.3 }, secrets: 1 },
  box:     { resin: { grid: 8, skip: 0.04 }, oxide: { amount: 1.2, window: 0.75, fragile: 2 }, grease: { amount: 1.3 }, secrets: 2 },
  // ── МЕХАНИКА: игрушки, толстая короста, секреты ──
  top:     { resin: { grid: 6, skip: 0.1 },  oxide: { amount: 0.8 },  grease: { amount: 0.9 },  secrets: 1 },
  roly:    { resin: { grid: 6, skip: 0.15 }, oxide: { amount: 0.85 }, grease: { amount: 0.95 }, secrets: 1 },
  duck:    { resin: { grid: 7, skip: 0.05 }, oxide: { amount: 0.95 }, grease: { amount: 1.0 },  secrets: 1 },
  robot:   { resin: { grid: 7, skip: 0.1 },  oxide: { amount: 1.1, window: 0.85 }, grease: { amount: 1.15 }, secrets: 0 },
  cuckoo:  { resin: { grid: 8, skip: 0.02 }, oxide: { amount: 1.0 },  grease: { amount: 1.1 },  secrets: 1 },
  // ── МУЗЫКА: нежная поверхность, хрупкие детали ──
  organ:   { resin: { grid: 7, skip: 0.08 }, oxide: { amount: 0.9, fragile: 1 }, grease: { amount: 1.0 }, secrets: 1 },
  gram:    { resin: { grid: 7, skip: 0.06 }, oxide: { amount: 1.05, window: 0.85, fragile: 1 }, grease: { amount: 1.1 }, secrets: 1 },
  juke:    { resin: { grid: 6, skip: 0.2 },  oxide: { amount: 1.0, window: 0.9 }, grease: { amount: 1.2 }, secrets: 0 },
  // ── ТЕХНИКА: плотная ржавчина, точный лазер ──
  radio:   { resin: { grid: 6, skip: 0.25 }, oxide: { amount: 1.2, window: 0.8, fragile: 1 }, grease: { amount: 1.15 }, secrets: 0 },
  tv:      { resin: { grid: 6, skip: 0.22 }, oxide: { amount: 1.25, window: 0.8 }, grease: { amount: 1.2 }, secrets: 0 },
  phone:   { resin: { grid: 7, skip: 0.12 }, oxide: { amount: 1.1, window: 0.85 }, grease: { amount: 1.1 }, secrets: 1 },
  vinyl:   { resin: { grid: 6, skip: 0.3 },  oxide: { amount: 1.0, window: 0.9 }, grease: { amount: 1.3 }, secrets: 0 },
  // ── МОРЕ: налёт и патина, пена, хрупкая эмаль ──
  scope:   { resin: { grid: 6, skip: 0.18 }, oxide: { amount: 0.9, fragile: 1 }, grease: { amount: 1.25 }, secrets: 1 },
  ship:    { resin: { grid: 6, skip: 0.2 },  oxide: { amount: 0.85, fragile: 2 }, grease: { amount: 1.3 }, secrets: 1 },
  shell:   { resin: { grid: 6, skip: 0.28 }, oxide: { amount: 0.8, fragile: 1 }, grease: { amount: 1.35 }, secrets: 1 },
  lighthouse:{ resin: { grid: 7, skip: 0.06 }, oxide: { amount: 1.15, window: 0.8, fragile: 1 }, grease: { amount: 1.25 }, secrets: 1 },
};

interface Pt { x: number; y: number }
interface ResinPoly { pts: Pt[]; cx: number; cy: number; alive: boolean; idx: number; chip: number; secret?: boolean }
interface Ev { t: number; k: string; i?: number; x?: number; y?: number; e?: number; pts?: { x: number; y: number; e: number }[]; nx?: number; ny?: number }
interface Particle {
  kind: PKind; x: number; y: number; vx: number; vy: number;
  px: number; py: number;
  rot: number; vr: number; life: number; ttl: number; size: number; color: string;
}
interface Sweep { nx: number; ny: number; prog: number }
interface Cloud { x: number; y: number; s: number; v: number }
interface Sparkle { x: number; y: number; r: number; ph: number; color: string; star: boolean }

const TOP_H = 118;
const BOTTOM_H = 150;
const COV = 84;
const COCOA = "#5b3b1e";
const PASTELS = ["#ffd166", "#7fdcff", "#ff9dcb", "#b7f0a8", "#c9b3ff"];

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  W = 0; H = 0;
  raf = 0; last = 0; time = 0;
  audio = new AudioEngine();
  onHud: ((s: HudSnapshot) => void) | null = null;

  phase: GamePhase = "catalog";
  paused = false;
  muted = false;

  artifact: ArtifactDef | null = null;
  anim: Record<string, any> = {};
  S = 220; cx = 0; cy = 0; size = 0;

  seed = 1;
  maskC!: HTMLCanvasElement;
  maskTiny!: ImageData;
  resinC!: HTMLCanvasElement; resinX!: CanvasRenderingContext2D;
  polys: ResinPoly[] = []; resinDone = false;
  oxideC!: HTMLCanvasElement; oxideX!: CanvasRenderingContext2D;
  oxideCovC!: HTMLCanvasElement; oxideCovX!: CanvasRenderingContext2D;
  oxideMaskPx = 1; oxideFrac = 1; oxideDirty = false; oxideDone = false; oxideFadeT = 0;
  greaseC!: HTMLCanvasElement; greaseX!: CanvasRenderingContext2D; greaseDone = false;
  foamC!: HTMLCanvasElement; foamX!: CanvasRenderingContext2D;
  foamCovC!: HTMLCanvasElement; foamCovX!: CanvasRenderingContext2D;
  foamFrac = 0; foamPhase: 1 | 2 = 1;

  tool: ToolId = 1;
  unlocked: [boolean, boolean, boolean] = [true, false, false];

  pointer: PointerState = { x: 0, y: 0, lx: 0, ly: 0, down: false, inside: false };
  hist: { t: number; x: number; y: number }[] = [];
  vSmooth = 0;
  heat = 0; overheated = false; overheatT = 0;
  stroke: { x: number; y: number; e: number }[] = [];
  lastErase: Pt | null = null;
  lastLaserPt: Pt | null = null;
  laserDown = false;
  missAcc = 0;

  swirlC: Pt = { x: 0, y: 0 }; swirlA = 0; swirlInit = false; swirlRate = 0; lastStamp = 0;
  foamLast: Pt | null = null;
  swipe: { pts: { x: number; y: number; t: number }[] } | null = null;
  sweep: Sweep | null = null;
  foamStamps = 0;
  wetT = 0;
  swipeNudge = 0;
  tapPulse = 0; tapPulseGray = false;
  combo = 0; comboT = 0; lastActionT = 0; laserTickAcc = 0;
  chipPoly: ResinPoly | null = null; scrapeAcc = 0;
  popups: { x: number; y: number; txt: string; col: string; life: number; ttl: number; big: boolean }[] = [];
  layerStamp: { txt: string; col: string; t: number } | null = null;
  hitStop = 0; zoomPulse = 0;
  gleamC: HTMLCanvasElement | null = null; gleamX: CanvasRenderingContext2D | null = null;
  toolLean = 0; toolJab = 0; spongeSquish = 0;
  sqX = 0; sqY = 0; sqA = 0; sqOn = false;
  private lastPtrX = 0;
  bobT = 0;
  /** Плавный 3D-наклон предмета к курсору (-1..1), чтобы реликвия ощущалась объектом, а не картинкой. */
  tiltX = 0; tiltY = 0;
  edgeShadeC: HTMLCanvasElement | null = null;
  glossC: HTMLCanvasElement | null = null;
  /** Канвас блуждающего блика (перерисовывается каждый кадр, маскируется по силуэту). */
  specC: HTMLCanvasElement | null = null; specX: CanvasRenderingContext2D | null = null;
  /** Последняя точка свайпа-смыва для стирания отрезком. */
  wipeLast: Pt | null = null;
  replayWpLast: Pt | null = null;
  /** Маска отполированных зон (белое = блестит и реагирует на свет). */
  polishC!: HTMLCanvasElement; polishX!: CanvasRenderingContext2D; polishMaskOps = 0;
  /** Водяные разводы после дворника (сохнут). */
  streakC!: HTMLCanvasElement; streakX!: CanvasRenderingContext2D;
  /** Раскалённые следы лазера (остывают). */
  heatC!: HTMLCanvasElement; heatX!: CanvasRenderingContext2D;
  /** Копии силуэта для бегущего рельефа: светлая (overlay) и тёмная (multiply). */
  rimLightC!: HTMLCanvasElement; rimDarkC!: HTMLCanvasElement;
  /** Скретч-канвасы: рельеф обрезается по силуэту, чтобы не красить коврик. */
  rimAC!: HTMLCanvasElement; rimAX!: CanvasRenderingContext2D;
  rimBC!: HTMLCanvasElement; rimBX!: CanvasRenderingContext2D;
  /** Световой проход: один источник света на предмет И грязь (убирает «наклейку»). */
  lightC!: HTMLCanvasElement; lightX!: CanvasRenderingContext2D;
  /** Мусор на коврике: осколки и комки пены, которые остаются лежать. */
  debris: { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; kind: "shard" | "foam"; landed: boolean }[] = [];
  /** Хрупкие эмалевые зоны: трескаются от быстрого/горячего лазера. */
  fragile: { x: number; y: number; r: number; cracked: boolean; gentle: number; rewarded: boolean }[] = [];
  crackC: HTMLCanvasElement | null = null; crackX: CanvasRenderingContext2D | null = null;
  greaseCovC!: HTMLCanvasElement; greaseCovX!: CanvasRenderingContext2D;
  greaseMaskPx = 1; greaseFrac = 1; greaseDirty = false;
  /** Таймер финального дотаяния пены/жира (слой завершается, когда исчез визуально). */
  greaseFadeT = 0;
  foamCreepT = 0;
  /** Страховка «ребёнок застрял»: сколько секунд нет прогресса по активному слою. */
  stallT = 0; prevFrac = 1;

  particles: Particle[] = [];
  clouds: Cloud[] = [];
  sparkles: Sparkle[] = [];
  shakeA = 0; flashA = 0; flashColor = "255,255,255";
  stampT = -1; heatFlash = 0;

  workT = 0; scanT = 0; snapT = 0;
  scanDustDone = false;

  log: Ev[] = [];
  hits = 0; misses = 0; overheats = 0;

  replay: { evs: Ev[]; i: number; t: number; dur: number; T: number; sweep: Sweep | null; beam: Pt[] } | null = null;
  replayUrl: string | null = null;
  recorder: MediaRecorder | null = null;
  recChunks: Blob[] = [];

  credits = 0;
  restored: Record<string, { rating: string; credits: number }> = {};
  payout: PayoutInfo | null = null;
  hintShake = 0;
  hudAcc = 0;

  api: EngineApi;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.api = {
      S: this.S, t: 0, audio: this.audio, pointer: this.pointer,
      spawn: (k, x, y, n, c) => this.spawn(k, x, y, n, c),
      shake: (a) => this.shake(a),
      flash: (a, color = "255,255,255") => this.flash(color, a),
    };
    this.loadSave();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    canvas.addEventListener("pointerdown", (e) => this.onDown(e));
    canvas.addEventListener("pointermove", (e) => this.onMove(e));
    window.addEventListener("pointerup", (e) => this.onUp(e));
    canvas.addEventListener("pointerleave", () => { this.pointer.inside = false; });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", (e) => this.onKey(e));
    window.addEventListener("blur", () => {
      if (this.phase === "work" || this.phase === "alive") {
        this.paused = true;
        this.audio.laserStop();
        this.laserDown = false;
      }
    });
    this.last = performance.now();
    const loop = (ts: number) => {
      let dt = clamp((ts - this.last) / 1000, 0, 0.05);
      this.last = ts;
      // хитстоп: на мгновение замираем в момент удара — вес каждого действия
      if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.12; }
      if (!this.paused) { this.time += dt; this.update(dt); }
      this.render();
      this.hudAcc += dt;
      if (this.hudAcc > 0.12) { this.hudAcc = 0; this.pushHud(); }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() { cancelAnimationFrame(this.raf); }

  /* ================= прогресс: последовательные уровни + сохранение ================= */
  private static STORE_KEY = "pristine2d-save-v1";

  private loadSave() {
    try {
      const raw = localStorage.getItem(Game.STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as {
        restored?: Record<string, { rating: string; credits: number }>;
        credits?: number;
      };
      if (s && typeof s === "object") {
        if (s.restored && typeof s.restored === "object") this.restored = s.restored;
        if (typeof s.credits === "number") this.credits = s.credits;
      }
    } catch { /* повреждённое сохранение — начинаем с чистого листа */ }
  }

  private saveSave() {
    try {
      localStorage.setItem(Game.STORE_KEY, JSON.stringify({ restored: this.restored, credits: this.credits }));
    } catch { /* приватный режим — играем без сохранения */ }
  }

  /** Открытые реликвии: первая доступна всегда, каждая следующая — после прохождения предыдущей. */
  unlockedIds(): string[] {
    const out: string[] = [];
    for (const a of ARTIFACTS) {
      out.push(a.id);
      if (!this.restored[a.id]) break;
    }
    return out;
  }

  /* ================= layout ================= */
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.canvas.style.width = this.W + "px";
    this.canvas.style.height = this.H + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx = this.W / 2;
    const availH = this.H - TOP_H - BOTTOM_H - 24;
    const availW = this.W - 40;
    const fit = Math.min(availW / 2.15, availH / 2.0);
    this.S = clamp(fit, 150, 320);
    this.cy = TOP_H + (this.H - TOP_H - BOTTOM_H) / 2;
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * this.W,
        y: 30 + Math.random() * this.H * 0.5,
        s: 0.5 + Math.random() * 1.1,
        v: 4 + Math.random() * 8,
      });
    }
    this.sparkles = [];
    for (let i = 0; i < 42; i++) {
      this.sparkles.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        r: 1.4 + Math.random() * 3.2,
        ph: Math.random() * Math.PI * 2,
        color: PASTELS[i % PASTELS.length],
        star: Math.random() < 0.5,
      });
    }
    if (this.artifact) this.computeLayerSize();
    this.api.S = this.S;
  }

  computeLayerSize() {
    if (!this.artifact) return;
    this.size = this.S * 2 * this.artifact.boundsMul + this.S * 0.3;
  }

  /* ================= flow ================= */
  startArtifact(id: string) {
    const def = ARTIFACT_BY_ID[id];
    if (!def) return;
    // реликвия должна быть открыта по порядку
    if (!this.unlockedIds().includes(id)) return;
    this.audio.init();
    this.audio.ui();
    if (this.replayUrl) { URL.revokeObjectURL(this.replayUrl); this.replayUrl = null; }
    this.artifact = def;
    this.anim = def.createAnim();
    this.api.S = this.S;
    this.computeLayerSize();
    this.seed = (Math.random() * 1e9) | 0;
    this.buildLayers();
    this.log = [];
    this.hits = 0; this.misses = 0; this.overheats = 0; this.missAcc = 0;
    this.tool = 1; this.unlocked = [true, false, false];
    this.foamPhase = 1; this.greaseDone = false; this.oxideDone = false; this.resinDone = false;
    this.oxideFadeT = 0; this.oxideFrac = 1;
    this.chipPoly = null; this.scrapeAcc = 0;
    this.heat = 0; this.overheated = false; this.sweep = null; this.swipe = null;
    this.greaseFadeT = 0; this.foamCreepT = 0; this.wipeLast = null;
    this.stallT = 0; this.prevFrac = 1;
    this.particles = []; this.debris = []; this.workT = 0; this.scanT = 0; this.scanDustDone = false;
    this.stampT = -1; this.flashA = 0; this.payout = null;
    this.replay = null;
    this.phase = "scan";
    this.paused = false;
    this.pushHud();
  }

  restartArtifact() { if (this.artifact) this.startArtifact(this.artifact.id); }

  toCatalog() {
    this.audio.laserStop();
    this.phase = "catalog";
    this.particles = [];
    this.replay = null;
    this.pushHud();
  }

  finishOrder() {
    if (!this.artifact || this.phase !== "alive") return;
    const def = this.artifact;
    const precision = clamp(Math.round(100 - (this.misses * 3.2 + this.overheats * 9 + this.missAcc * 2)), 40, 100);
    const rating: PayoutInfo["rating"] = precision >= 95 ? "S" : precision >= 85 ? "A" : precision >= 70 ? "B" : "C";
    const precisionBonus = Math.round(((precision - 40) / 60) * 80);
    const speedBonus = this.workT <= def.par ? Math.round(40 * (1 - this.workT / (def.par * 1.4))) : 0;
    const total = def.base + precisionBonus + Math.max(0, speedBonus);
    this.credits += total;
    this.restored[def.id] = { rating, credits: total };
    this.saveSave(); // прогресс не теряется при перезагрузке
    this.payout = {
      rating, base: def.base, precisionBonus, speedBonus: Math.max(0, speedBonus),
      total, precision, timeStr: fmtTime(this.workT),
    };
    this.audio.coin();
    this.spawn("star", 0, -this.S * 0.3, 16, "#ffd166");
    this.phase = "payout";
    this.pushHud();
  }

  nextOrder() {
    if (!this.artifact) return this.toCatalog();
    const rest = ARTIFACTS.filter((a) => !this.restored[a.id]);
    if (rest.length === 0) { this.toCatalog(); return; }
    this.startArtifact(rest[0].id);
  }

  newShift() {
    this.restored = {};
    this.credits = 0;
    try { localStorage.removeItem(Game.STORE_KEY); } catch { /* noop */ }
    this.toCatalog();
  }

  togglePause() {
    if (this.phase !== "work" && this.phase !== "alive") return;
    this.paused = !this.paused;
    this.audio.ui();
    if (this.paused) this.audio.laserStop();
    this.pushHud();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.audio.setMuted(this.muted);
    this.pushHud();
  }

  selectTool(t: ToolId) {
    if (!this.unlocked[t - 1] || this.phase !== "work") return;
    if (this.tool === t) return;
    this.tool = t;
    this.audio.ui();
    if (this.laserDown) { this.audio.laserStop(); this.laserDown = false; }
    this.pushHud();
  }

  /* ================= layers build ================= */
  private mkCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement("canvas");
    c.width = Math.round(w); c.height = Math.round(h);
    return [c, c.getContext("2d")!];
  }

  /** Строит маску силуэта из drawMask артефакта (чистая векторная геометрия — грязь всегда ложится точно по форме). */
  private prepareMask(def: ArtifactDef) {
    const R = this.dpr, sz = this.size;
    const [c, x] = this.mkCanvas(sz * R, sz * R);
    x.scale(R, R);
    x.translate(sz / 2, sz / 2);
    x.fillStyle = "#fff";
    def.drawMask(x, this.S);
    this.maskC = c;
  }

  buildLayers() {
    const R = this.dpr, sz = this.size;
    const rng = mulberry32(this.seed);
    {
      this.prepareMask(this.artifact!);
      const [tc, tx] = this.mkCanvas(COV, COV);
      tx.drawImage(this.maskC, 0, 0, COV, COV);
      this.maskTiny = tx.getImageData(0, 0, COV, COV);
      // внутренняя тень по кромке силуэта (объём)
      {
        const [ec, ex] = this.mkCanvas(sz * R, sz * R);
        ex.scale(R, R);
        const g = ex.createRadialGradient(sz / 2, sz * 0.4, sz * 0.12, sz / 2, sz * 0.5, sz * 0.52);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.72, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.42)");
        ex.fillStyle = g;
        ex.fillRect(0, 0, sz, sz);
        this.applyMaskTo(ex);
        this.edgeShadeC = ec;
      }
      // верхний свет (глянец)
      {
        const [gc, gx2] = this.mkCanvas(sz * R, sz * R);
        gx2.scale(R, R);
        const g = gx2.createLinearGradient(0, 0, 0, sz);
        g.addColorStop(0, "rgba(255,255,255,0.34)");
        g.addColorStop(0.42, "rgba(255,255,255,0.06)");
        g.addColorStop(0.55, "rgba(255,255,255,0)");
        gx2.fillStyle = g;
        gx2.fillRect(0, 0, sz, sz);
        this.applyMaskTo(gx2);
        this.glossC = gc;
      }
    }
    const inMask = (x: number, y: number) => {
      const ix = clamp(Math.floor((x / sz) * COV), 0, COV - 1);
      const iy = clamp(Math.floor((y / sz) * COV), 0, COV - 1);
      return this.maskTiny.data[(iy * COV + ix) * 4 + 3] > 128;
    };
    // ЛИПУЧКА (смола) — полигональные соты
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      x.scale(R, R);
      this.resinC = c; this.resinX = x;
      this.polys = [];
      const dcfg = this.dirtConfig();
      const n = dcfg.resin?.grid ?? 7;
      const skip = dcfg.resin?.skip ?? 0;
      const pad = sz * 0.045;
      const cell = (sz - pad * 2) / n;
      const grid: Pt[][] = [];
      for (let j = 0; j <= n; j++) {
        grid[j] = [];
        for (let i = 0; i <= n; i++) {
          const edge = i === 0 || j === 0 || i === n || j === n;
          grid[j][i] = {
            x: pad + i * cell + (edge ? 0 : (rng() - 0.5) * cell * 0.62),
            y: pad + j * cell + (edge ? 0 : (rng() - 0.5) * cell * 0.62),
          };
        }
      }
      let idx = 0;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const pts = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
          const cxp = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
          const cyp = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
          if (!inMask(cxp, cyp)) continue;
          // часть ячеек остаётся чистой — грязь лежит островками, а не сплошняком
          if (skip > 0 && rng() < skip) continue;
          this.polys.push({ pts, cx: cxp, cy: cyp, alive: true, idx: idx++, chip: 0 });
        }
      }
      // СЕКРЕТЫ: несколько кусков смолы прячут клеймо/камень
      const nSecrets = Math.min(dcfg.secrets ?? 0, this.polys.length);
      const secretIdx = new Set<number>();
      while (secretIdx.size < nSecrets && this.polys.length > 0) {
        secretIdx.add(Math.floor(rng() * this.polys.length));
      }
      secretIdx.forEach((i) => { if (this.polys[i]) this.polys[i].secret = true; });
      this.drawResin(rng);
    }
    // РЖАВЫЕ ПЯТНА (оксид)
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      x.scale(R, R);
      this.oxideC = c; this.oxideX = x;
      const S = this.S;
      const dcfgO = this.dirtConfig();
      const oAmt = dcfgO.oxide?.amount ?? 1;
      // выпуклые пятна ржавчины: светлый ободок + тёмный центр-кратер
      for (let i = 0; i < Math.round(26 * oAmt); i++) {
        const bx = sz * (0.15 + rng() * 0.7), by = sz * (0.15 + rng() * 0.7);
        const br = S * (0.045 + rng() * 0.1);
        const tone = rng();
        const col = tone < 0.4 ? "198,92,38" : tone < 0.75 ? "172,72,28" : "214,120,50";
        // светлый приподнятый ободок
        x.strokeStyle = `rgba(240,170,90,${0.25 + rng() * 0.2})`;
        x.lineWidth = br * 0.22;
        x.beginPath(); x.arc(bx, by, br * 0.85, 0, Math.PI * 2); x.stroke();
        // тело пятна
        const g = x.createRadialGradient(bx - br * 0.2, by - br * 0.25, br * 0.1, bx, by, br);
        g.addColorStop(0, `rgba(${col},${0.5 + rng() * 0.2})`);
        g.addColorStop(0.7, `rgba(${col},${0.32 + rng() * 0.15})`);
        g.addColorStop(1, `rgba(${col},0)`);
        x.fillStyle = g;
        x.beginPath(); x.arc(bx, by, br, 0, Math.PI * 2); x.fill();
        // тёмные кратеры-выбоины
        for (let k = 0; k < 3; k++) {
          const cx = bx + (rng() - 0.5) * br, cy = by + (rng() - 0.5) * br;
          x.fillStyle = `rgba(110,48,18,${0.25 + rng() * 0.2})`;
          x.beginPath(); x.arc(cx, cy, br * (0.1 + rng() * 0.16), 0, Math.PI * 2); x.fill();
        }
      }
      // общая рыжая плёнка
      x.fillStyle = `rgba(203,116,52,${clamp(0.22 * oAmt, 0.05, 0.4)})`;
      x.fillRect(0, 0, sz, sz);
      // грубое зерно
      for (let i = 0; i < Math.round(520 * oAmt); i++) {
        x.fillStyle = `rgba(${150 + rng() * 80},${70 + rng() * 45},${22 + rng() * 22},${0.2 + rng() * 0.32})`;
        const s = 1 + rng() * 2.6;
        x.fillRect(rng() * sz, rng() * sz, s, s);
      }
      // ХРУПКАЯ ЭМАЛЬ: жемчужные зоны среди ржавчины — чистить только медленно и нежно
      this.fragile = [];
      const nFrag = dcfgO.oxide?.fragile ?? 0;
      let guard = 0;
      while (this.fragile.length < nFrag && guard++ < 200) {
        const fx = sz * (0.2 + rng() * 0.6), fy = sz * (0.2 + rng() * 0.6);
        if (!inMask(fx, fy)) continue;
        const fr = S * (0.07 + rng() * 0.05);
        // жемчужная эмаль: светлое пятно с переливом
        const fg = x.createRadialGradient(fx - fr * 0.25, fy - fr * 0.3, fr * 0.1, fx, fy, fr);
        fg.addColorStop(0, "rgba(238,246,255,0.95)");
        fg.addColorStop(0.55, "rgba(198,220,245,0.8)");
        fg.addColorStop(1, "rgba(168,196,232,0.55)");
        x.fillStyle = fg;
        x.beginPath(); x.arc(fx, fy, fr, 0, Math.PI * 2); x.fill();
        x.strokeStyle = "rgba(120,150,190,0.5)";
        x.lineWidth = 1.4;
        x.beginPath(); x.arc(fx, fy, fr * 0.92, 0, Math.PI * 2); x.stroke();
        // тонкая трещинка-намёк, что зона хрупкая
        x.strokeStyle = "rgba(120,150,190,0.6)";
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(fx - fr * 0.5, fy - fr * 0.2);
        x.lineTo(fx + fr * 0.1, fy + fr * 0.15);
        x.lineTo(fx + fr * 0.5, fy - fr * 0.1);
        x.stroke();
        this.fragile.push({ x: fx, y: fy, r: fr, cracked: false, gentle: 0, rewarded: false });
      }
      this.applyMaskTo(x);
      // канвас для необратимых трещин
      {
        const [fc, fx2] = this.mkCanvas(sz * R, sz * R);
        fx2.scale(R, R);
        this.crackC = fc; this.crackX = fx2;
      }
      const [cc, cx2] = this.mkCanvas(COV, COV);
      cx2.drawImage(this.maskC, 0, 0, COV, COV);
      this.oxideCovC = cc; this.oxideCovX = cx2;
      this.oxideMaskPx = this.countCovered(cx2, 128);
      this.oxideFrac = 1; this.oxideDirty = false;
    }
    // ПЫЛЬНЫЕ ЗАЙЦЫ (жир/копоть)
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      x.scale(R, R);
      this.greaseC = c; this.greaseX = x;
      const gAmt = this.dirtConfig().grease?.amount ?? 1;
      x.fillStyle = `rgba(128,116,148,${clamp(0.42 * gAmt, 0.1, 0.6)})`;
      x.fillRect(0, 0, sz, sz);
      // маслянистые разводы: тёмное пятно + радужная плёнка + блик
      for (let i = 0; i < Math.round(24 * gAmt); i++) {
        x.save();
        x.translate(rng() * sz, rng() * sz);
        x.rotate(rng() * Math.PI);
        const rw = this.S * (0.05 + rng() * 0.13), rh = this.S * (0.02 + rng() * 0.05);
        // тёмное масляное пятно
        x.fillStyle = `rgba(98,88,120,${0.2 + rng() * 0.2})`;
        x.beginPath();
        x.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
        x.fill();
        // радужная нефтяная плёнка
        const sheen = x.createLinearGradient(-rw, 0, rw, 0);
        const h0 = Math.floor(rng() * 360);
        sheen.addColorStop(0, `hsla(${h0},70%,70%,0)`);
        sheen.addColorStop(0.35, `hsla(${h0},75%,72%,0.28)`);
        sheen.addColorStop(0.55, `hsla(${(h0 + 70) % 360},75%,72%,0.3)`);
        sheen.addColorStop(1, `hsla(${(h0 + 140) % 360},70%,70%,0)`);
        x.fillStyle = sheen;
        x.beginPath();
        x.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
        x.fill();
        // жирный блик
        x.fillStyle = "rgba(255,255,255,0.3)";
        x.beginPath();
        x.ellipse(-rw * 0.3, -rh * 0.3, rw * 0.3, rh * 0.3, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
      }
      for (let i = 0; i < Math.round(520 * gAmt); i++) {
        x.fillStyle = `rgba(100,90,125,${0.16 + rng() * 0.22})`;
        const s = 0.8 + rng() * 1.8;
        x.fillRect(rng() * sz, rng() * sz, s, s);
      }
      // пыльные зайчики
      for (let f = 0; f < Math.round(4 * gAmt); f++) {
        const bx = sz * (0.2 + rng() * 0.6), by = sz * (0.2 + rng() * 0.6);
        const bs = this.S * (0.05 + rng() * 0.03);
        x.fillStyle = "rgba(120,106,148,0.5)";
        x.beginPath(); x.ellipse(bx, by, bs, bs * 0.85, 0, 0, Math.PI * 2); x.fill();
        // ушки
        x.beginPath(); x.ellipse(bx - bs * 0.4, by - bs * 1.1, bs * 0.22, bs * 0.6, -0.3, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.ellipse(bx + bs * 0.35, by - bs * 1.15, bs * 0.22, bs * 0.62, 0.3, 0, Math.PI * 2); x.fill();
        // глазки
        x.fillStyle = "rgba(255,255,255,0.75)";
        x.beginPath(); x.arc(bx - bs * 0.28, by - bs * 0.1, bs * 0.14, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(bx + bs * 0.28, by - bs * 0.1, bs * 0.14, 0, Math.PI * 2); x.fill();
        x.fillStyle = "rgba(60,50,80,0.8)";
        x.beginPath(); x.arc(bx - bs * 0.25, by - bs * 0.08, bs * 0.06, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(bx + bs * 0.31, by - bs * 0.08, bs * 0.06, 0, Math.PI * 2); x.fill();
      }
      this.applyMaskTo(x);
    }
    // coverage proxy жира (для фазы смыва)
    {
      const [gcc, gcx] = this.mkCanvas(COV, COV);
      gcx.drawImage(this.maskC, 0, 0, COV, COV);
      this.greaseCovC = gcc; this.greaseCovX = gcx;
      this.greaseMaskPx = this.countCovered(gcx, 128);
      this.greaseFrac = 1; this.greaseDirty = false;
    }
    // ПЕНА
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      x.scale(R, R);
      this.foamC = c; this.foamX = x;
      const [cc, cx2] = this.mkCanvas(COV, COV);
      this.foamCovC = cc; this.foamCovX = cx2;
      this.foamFrac = 0;
    }
    // БЛЕСК «только что отполировано»
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      x.scale(R, R);
      this.gleamC = c; this.gleamX = x;
    }
    // БЛУЖДАЮЩИЙ БЛИК (объём)
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      this.specC = c; this.specX = x;
    }
    // МАСКА ПОЛИРОВКИ + РАЗВОДЫ + НАКАЛ
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      this.polishC = c; this.polishX = x;
    }
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      this.streakC = c; this.streakX = x;
    }
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      this.heatC = c; this.heatX = x;
    }
    // КОПИИ СИЛУЭТА для бегущего рельефа (свет/тень за курсором)
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      x.drawImage(this.maskC, 0, 0);
      x.globalCompositeOperation = "source-in";
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, sz * R, sz * R);
      this.rimLightC = c;
      const [c2, x2] = this.mkCanvas(sz * R, sz * R);
      x2.drawImage(this.maskC, 0, 0);
      x2.globalCompositeOperation = "source-in";
      x2.fillStyle = "#3a2308";
      x2.fillRect(0, 0, sz * R, sz * R);
      this.rimDarkC = c2;
    }
    // скретч-канвасы рельефа (обрезка по силуэту каждый кадр)
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      this.rimAC = c; this.rimAX = x;
      const [c2, x2] = this.mkCanvas(sz * R, sz * R);
      this.rimBC = c2; this.rimBX = x2;
    }
    // канвас светового прохода (один свет на предмет и грязь)
    {
      const [c, x] = this.mkCanvas(sz * R, sz * R);
      this.lightC = c; this.lightX = x;
    }
  }

  private applyMaskTo(x: CanvasRenderingContext2D) {
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(this.maskC, 0, 0);
    x.restore();
    x.globalCompositeOperation = "source-over";
  }

  private countCovered(x: CanvasRenderingContext2D, threshold: number): number {
    const d = x.getImageData(0, 0, COV, COV).data;
    let c = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > threshold) c++;
    return Math.max(1, c);
  }

  drawResin(rng: () => number) {
    const x = this.resinX;
    x.save();
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.clearRect(0, 0, this.size, this.size);
    const polyPath = (p: ResinPoly) => {
      x.beginPath();
      p.pts.forEach((pt, i) => (i === 0 ? x.moveTo(pt.x, pt.y) : x.lineTo(pt.x, pt.y)));
      x.closePath();
    };
    for (const p of this.polys) {
      if (!p.alive) continue;
      // тень-подложка (кусочек лежит объёмно)
      x.save();
      x.translate(0, 3.5);
      polyPath(p);
      x.fillStyle = "rgba(90,50,8,0.4)";
      x.fill();
      x.restore();
      // тело с градиентом по диагонали
      const g = x.createLinearGradient(p.pts[0].x, p.pts[0].y, p.pts[2].x, p.pts[2].y);
      g.addColorStop(0, "#ffc65e");
      g.addColorStop(0.5, "#e8962c");
      g.addColorStop(1, "#b56a12");
      x.fillStyle = g;
      polyPath(p);
      x.fill();
      // глянцевый бугор в центре (объём)
      const hg = x.createRadialGradient(p.cx - 4, p.cy - 5, 1, p.cx, p.cy, this.S * 0.075);
      hg.addColorStop(0, "rgba(255,236,170,0.75)");
      hg.addColorStop(0.5, "rgba(255,214,120,0.25)");
      hg.addColorStop(1, "rgba(255,214,120,0)");
      x.fillStyle = hg;
      polyPath(p);
      x.fill();
      // тёмная кромка снизу-справа (фаска)
      x.strokeStyle = "#8a5510";
      x.lineWidth = 2.2;
      polyPath(p);
      x.stroke();
      // светлая фаска сверху-слева
      x.strokeStyle = "rgba(255,240,180,0.8)";
      x.lineWidth = 1.8;
      x.beginPath();
      x.moveTo(p.pts[3].x, p.pts[3].y);
      x.lineTo(p.pts[0].x, p.pts[0].y);
      x.lineTo(p.pts[1].x, p.pts[1].y);
      x.stroke();
      // specular-точка
      x.fillStyle = "rgba(255,255,235,0.9)";
      x.beginPath();
      x.arc(p.cx - 4, p.cy - 6, 2.2, 0, Math.PI * 2);
      x.fill();
      // трещинка
      x.strokeStyle = "rgba(122,72,18,0.55)";
      x.lineWidth = 1;
      x.beginPath();
      const m1 = { x: (p.pts[0].x + p.pts[1].x) / 2, y: (p.pts[0].y + p.pts[1].y) / 2 };
      const m2 = { x: (p.pts[2].x + p.pts[3].x) / 2, y: (p.pts[2].y + p.pts[3].y) / 2 };
      x.moveTo(m1.x, m1.y);
      x.lineTo(p.cx + (rng() - 0.5) * 7, p.cy + (rng() - 0.5) * 7);
      x.lineTo(m2.x, m2.y);
      x.stroke();
    }
    x.restore();
    if (this.maskC) this.applyMaskTo(this.resinX);
  }

  /** Живой оверлей: трещины и подпрыгивание кусочка, который сейчас откалывают. */
  drawChipOverlay(hs: number) {
    const { ctx } = this;
    const any = this.polys.some((p) => p.alive && p.chip > 0.02);
    if (!any) return;
    ctx.save();
    ctx.translate(-hs, -hs);
    for (const p of this.polys) {
      if (!p.alive || p.chip <= 0.02) continue;
      const active = p === this.chipPoly;
      const jitter = active ? 1.6 : 0;
      const ox = (Math.random() - 0.5) * jitter, oy = (Math.random() - 0.5) * jitter;
      ctx.save();
      ctx.translate(ox, oy);
      // подсветка раскалываемого
      const g = ctx.createLinearGradient(p.pts[0].x, p.pts[0].y, p.pts[2].x, p.pts[2].y);
      g.addColorStop(0, `rgba(255,235,170,${0.5 * p.chip})`);
      g.addColorStop(1, `rgba(255,235,170,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      p.pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.fill();
      // растущие трещины из центра
      const rng = mulberry32(this.seed + p.idx * 77);
      ctx.strokeStyle = `rgba(60,35,8,${0.55 * p.chip + (active ? 0.2 : 0)})`;
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const ang = rng() * Math.PI * 2;
        const len = this.S * 0.09 * p.chip * (0.6 + rng() * 0.6);
        ctx.beginPath();
        ctx.moveTo(p.cx, p.cy);
        ctx.lineTo(p.cx + Math.cos(ang) * len * 0.5, p.cy + Math.sin(ang) * len * 0.5);
        ctx.lineTo(p.cx + Math.cos(ang + 0.5) * len, p.cy + Math.sin(ang + 0.5) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ================= actions ================= */
  layerPt(clientX: number, clientY: number): Pt {
    return { x: clientX - (this.cx - this.size / 2), y: clientY - (this.cy - this.size / 2) };
  }

  private findPolyAt(px: number, py: number): ResinPoly | null {
    for (let i = this.polys.length - 1; i >= 0; i--) {
      const p = this.polys[i];
      if (p.alive && pointInPoly(px, py, p.pts)) return p;
    }
    // мягкий автозахват ближайшего кусочка
    let target: ResinPoly | null = null;
    let best = Infinity;
    for (const p of this.polys) {
      if (!p.alive) continue;
      const d = Math.hypot(p.cx - px, p.cy - py);
      if (d < best) { best = d; target = p; }
    }
    return best <= this.S * 0.17 ? target : null;
  }

  /** Нажатие: стартовый «тык» скребком — кусочек сразу трескается, дальше работает удержание. */
  tapResin(px: number, py: number) {
    if (this.resinDone) return;
    this.tapPulse = 1;
    const target = this.findPolyAt(px, py);
    if (target) {
      this.tapPulseGray = false;
      target.chip = Math.min(0.999, target.chip + 0.3);
      this.chipPoly = target;
      this.toolJab = 1;
      this.audio.chink(0.55);
      this.shake(1.6);
      this.spawn("dust", target.cx - this.size / 2, target.cy - this.size / 2, 2, "#e8c98a");
      if (target.chip >= 1) this.breakPoly(target);
    } else {
      this.tapPulseGray = true;
      this.spawn("dust", px - this.size / 2, py - this.size / 2, 3, "#cbbfa8");
      this.audio.thud();
    }
  }

  /** Удержание: пока палец зажат над кусочком — он откалывается (~0.4 с), прогресс сохраняется. */
  updateScrapeHold(dt: number) {
    if (this.resinDone || !this.pointer.down) { this.chipPoly = null; return; }
    const p = this.layerPt(this.pointer.x, this.pointer.y);
    const target = this.findPolyAt(p.x, p.y);
    this.chipPoly = target;
    if (!target) return;
    target.chip += dt / 0.3;
    this.lastActionT = this.time;
    // скрежещущие тики и крошки
    this.scrapeAcc += dt;
    if (this.scrapeAcc > 0.085) {
      this.scrapeAcc = 0;
      this.audio.scrape();
      if (Math.random() < 0.7) {
        this.spawn("dust", target.cx - this.size / 2 + (Math.random() - 0.5) * 20, target.cy - this.size / 2 + (Math.random() - 0.5) * 20, 1, "#e8c98a");
      }
    }
    if (target.chip >= 1) this.breakPoly(target);
  }

  private breakPoly(target: ResinPoly) {
    target.alive = false;
    target.chip = 0;
    this.drawResin(mulberry32(this.seed + target.idx));
    const wx = target.cx - this.size / 2, wy = target.cy - this.size / 2;
    this.spawn("shard", wx, wy, 9, "#e08f2a");
    this.spawn("star", wx, wy, 3, "#fff3c4");
    // осколки падают на коврик и остаются там до конца заказа
    if (this.debris.length < 48) {
      const n = 1 + (Math.random() < 0.6 ? 1 : 0);
      for (let d = 0; d < n; d++) {
        this.debris.push({
          x: wx + (Math.random() - 0.5) * 22, y: wy,
          vx: (Math.random() - 0.5) * 170, vy: -70 - Math.random() * 130,
          rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 11,
          size: 3 + Math.random() * 5, kind: "shard", landed: false,
        });
      }
    }
    this.audio.chink(0.8 + Math.random() * 0.4);
    this.audio.pop();
    this.shake(3.2);
    this.hitStop = 0.05;
    this.zoomPulse = 1;
    // вспышка блеска на месте откола
    if (this.gleamX) {
      const gx = this.gleamX;
      gx.save();
      gx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const gg = gx.createRadialGradient(target.cx, target.cy, 0, target.cx, target.cy, this.S * 0.12);
      gg.addColorStop(0, "rgba(255,248,214,0.6)");
      gg.addColorStop(1, "rgba(255,248,214,0)");
      gx.fillStyle = gg;
      gx.beginPath(); gx.arc(target.cx, target.cy, this.S * 0.12, 0, Math.PI * 2); gx.fill();
      gx.restore();
    }
    this.hits++;
    this.bumpCombo();
    this.popup(wx, wy - 26, `+${5 + this.combo * 2}`, "#e08f2a");
    // СЕКРЕТ: под этим куском смолы было спрятано клеймо мастера или камешек
    if (target.secret) {
      target.secret = false;
      this.audio.chime();
      this.audio.coin();
      this.credits += 30;
      this.popup(wx, wy - 62, "СЕКРЕТ! +30", "#9b6bff", true);
      this.spawn("star", wx, wy, 12, "#d9c6ff");
      this.flash("155,107,255", 0.15);
      this.pushHud();
    }
    if (this.combo > 0 && this.combo % 4 === 0) {
      const praise = ["КЛАСС!", "УРА!", "ОПА!", "ЧИСТО!", "ДАВАЙ!"];
      this.popup(wx + 40, wy - 50, praise[(this.combo / 4) % praise.length], "#2fc98a", true);
    }
    this.log.push({ t: this.workT, k: "tap", i: target.idx });
    if (this.polys.every((p) => !p.alive)) {
      this.resinDone = true;
      this.chipPoly = null;
      this.log.push({ t: this.workT, k: "dn", i: 0 });
      this.unlocked[1] = true;
      this.tool = 2;
      this.laserDown = false;
      this.stampLayer("ЛИПУЧКА СНЯТА! ТЕПЕРЬ ЛАЗЕР", "#e08f2a");
      this.audio.unlock();
      this.flash("255,198,61", 0.2);
      this.spawn("star", 0, 0, 14, "#ffd166");
    }
  }

  /** Активный «рецепт грязи» текущего артефакта. */
  dirtConfig(): DirtConfig {
    return (this.artifact && DIRT_RECIPES[this.artifact.id]) || {};
  }

  private laserWindow() {
    const w = this.dirtConfig().oxide?.window ?? 1;
    // чем меньше w, тем уже «зелёная зона» — требует более ровного ведения
    const t = clamp(1 - w, 0, 0.6);
    return { vMin: this.S * (0.3 + t * 1.0), vMax: this.S * (3.2 - t * 2.4) };
  }

  eraseOxideAt(x: number, y: number, r: number, alpha: number) {
    const x2 = this.oxideX;
    x2.save();
    x2.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x2.globalCompositeOperation = "destination-out";
    const g = x2.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x2.fillStyle = g;
    x2.beginPath(); x2.arc(x, y, r, 0, Math.PI * 2); x2.fill();
    x2.restore();
    const c = this.oxideCovX;
    const k = COV / this.size;
    c.globalCompositeOperation = "destination-out";
    const g2 = c.createRadialGradient(x * k, y * k, r * k * 0.2, x * k, y * k, r * k);
    g2.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g2.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g2;
    c.beginPath(); c.arc(x * k, y * k, r * k, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = "source-over";
    this.oxideDirty = true;
    // сияющий след свежей полировки
    if (this.gleamX) {
      const gx = this.gleamX;
      gx.save();
      gx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const gg = gx.createRadialGradient(x, y, 0, x, y, r * 1.5);
      gg.addColorStop(0, "rgba(255,244,200,0.5)");
      gg.addColorStop(1, "rgba(255,244,200,0)");
      gx.fillStyle = gg;
      gx.beginPath(); gx.arc(x, y, r * 1.5, 0, Math.PI * 2); gx.fill();
      gx.restore();
    }
    // ПОСТОЯННАЯ маска полировки (эта зона теперь блестит и следит за светом)
    if (this.polishX) {
      const px = this.polishX;
      px.save();
      px.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const pg = px.createRadialGradient(x, y, 0, x, y, r * 1.15);
      pg.addColorStop(0, "rgba(255,255,255,0.9)");
      pg.addColorStop(1, "rgba(255,255,255,0)");
      px.fillStyle = pg;
      px.beginPath(); px.arc(x, y, r * 1.15, 0, Math.PI * 2); px.fill();
      px.restore();
    }
    // раскалённый след (остывает)
    if (this.heatX) {
      const hx = this.heatX;
      hx.save();
      hx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const hg = hx.createRadialGradient(x, y, 0, x, y, r * 0.7);
      hg.addColorStop(0, "rgba(255,170,80,0.5)");
      hg.addColorStop(1, "rgba(255,120,50,0)");
      hx.fillStyle = hg;
      hx.beginPath(); hx.arc(x, y, r * 0.7, 0, Math.PI * 2); hx.fill();
      hx.restore();
    }
    // периодически обрезали полировку/блеск по силуэту (чтобы не вылезали за предмет)
    this.polishMaskOps++;
    if (this.polishMaskOps % 24 === 0) this.clipToMask(this.polishX);
    if (this.polishMaskOps % 40 === 0) this.clipToMask(this.gleamX);
  }

  /** Ограничивает содержимое канваса силуэтом предмета. */
  private clipToMask(x: CanvasRenderingContext2D | null) {
    if (!x) return;
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(this.maskC, 0, 0);
    x.restore();
    x.globalCompositeOperation = "source-over";
  }

  /** Каждый кадр обрезает все «эффектные» слои по силуэту предмета, чтобы
   *  блеск/накал/пена/полировка никогда не вылезали на коврик рядом с предметом. */
  private clipEffects() {
    if (!this.maskC) return;
    this.clipToMask(this.foamX);
    this.clipToMask(this.gleamX);
    this.clipToMask(this.heatX);
    this.clipToMask(this.polishX);
  }

  /** Точка (в координатах слоя) лежит внутри силуэта предмета? */
  private inMaskAt(x: number, y: number): boolean {
    if (!this.maskTiny) return true;
    const ix = clamp(Math.floor((x / this.size) * COV), 0, COV - 1);
    const iy = clamp(Math.floor((y / this.size) * COV), 0, COV - 1);
    return this.maskTiny.data[(iy * COV + ix) * 4 + 3] > 128;
  }

  laserMove(p: Pt, dt: number) {
    const now = performance.now();
    this.hist.push({ t: now, x: p.x, y: p.y });
    if (this.hist.length > 10) this.hist.shift();
    const h0 = this.hist[0];
    const d = Math.hypot(p.x - h0.x, p.y - h0.y);
    const tSpan = Math.max(1, now - h0.t) / 1000;
    const v = d / tSpan;
    this.vSmooth = lerp(this.vSmooth, v, clamp(dt * 14, 0, 1));
    if (this.overheated) { this.audio.laserUpdate(0.3, false, 1); this.lastLaserPt = p; return; }
    const { vMin, vMax } = this.laserWindow();
    const vs = this.vSmooth;
    // Лазер СТИРАЕТ ВСЕГДА (при любой скорости) — вне «зелёной зоны» лишь ниже
    // эффективность. Игрок никогда не упирается в «не стирает».
    let rate = 1;
    if (vs > vMax) rate = 0.5;        // быстро — стирает, но слабее
    else if (vs < vMin) rate = 0.55;  // медленно — стирает, но греет
    // Лазер работает ТОЛЬКО по предмету: на коврике рядом он не стирает, не греет
    // и не даёт очков — ребёнок сразу понимает, что светить нужно на вещь.
    const onArtifact = this.inMaskAt(p.x, p.y);
    if (rate > 0 && onArtifact) {
      const r = this.S * 0.12;
      const from = this.lastErase ?? p;
      const dd = Math.hypot(p.x - from.x, p.y - from.y);
      const steps = Math.max(1, Math.ceil(dd / (r * 0.4)));
      for (let s = 1; s <= steps; s++) {
        const ix = lerp(from.x, p.x, s / steps);
        const iy = lerp(from.y, p.y, s / steps);
        this.eraseOxideAt(ix, iy, r, 0.5 * rate);
      }
      this.lastErase = p;
      this.hits += dt * 6 * rate;
      this.lastActionT = this.time;
      this.handleFragileAt(p, dt, vs, vMax, rate);
      const wx = p.x - this.size / 2, wy = p.y - this.size / 2;
      if (rate >= 1) {
        this.laserTickAcc += dt;
        if (this.laserTickAcc > 0.5) {
          this.laserTickAcc = 0;
          this.popup(wx, wy - 30, "+5", "#e05a39", false);
          if (Math.random() < 0.3) this.popup(wx + 34, wy - 6, "РОВНО!", "#2fc98a", false);
        }
      }
      if (Math.random() < 0.55) this.spawn("spark", wx, wy, 1, this.heat > 0.6 ? "#ff9d5c" : "#ffd166");
    } else if (vs > vMax && onArtifact) {
      this.missAcc += dt;
      const wx = p.x - this.size / 2, wy = p.y - this.size / 2;
      if (Math.random() < 0.3) this.spawn("spark", wx, wy, 1, "#c9c2b2");
    }
    // нагрев очень мягкий: перегрев — редкость, а не блокировка
    if (!onArtifact) this.heat -= dt * 0.4;   // в воздухе лазер остывает
    else if (vs < vMin * 0.6) this.heat += dt * 0.12;
    else if (vs > vMax) this.heat -= dt * 0.45;
    else this.heat -= dt * 0.3;
    this.heat = clamp(this.heat, 0, 1);
    if (this.heat >= 1) this.triggerOverheat();
    this.audio.laserUpdate(clamp(vs / vMax, 0, 1.2), rate > 0.5, this.heat);
    this.lastLaserPt = p;
    this.stroke.push({ x: p.x, y: p.y, e: rate >= 1 ? 1 : 0 });
  }

  /** Хрупкая эмаль: быстрый/горячий лазер оставляет трещину, нежный — даёт бонус. */
  private handleFragileAt(p: Pt, dt: number, vs: number, vMax: number, rate: number) {
    for (const z of this.fragile) {
      if (z.cracked || z.rewarded) continue;
      if (Math.hypot(p.x - z.x, p.y - z.y) > z.r) continue;
      // слишком быстро или слишком горячо — трещина
      if (vs > vMax * 0.8 || this.heat > 0.55) {
        z.cracked = true;
        this.combo = 0;
        this.misses++;
        this.audio.crack();
        this.shake(4);
        this.popup(z.x - this.size / 2, z.y - this.size / 2 - 30, "ТРЕЩИНА!", "#e03c28", true);
        if (this.crackX) {
          const cx = this.crackX;
          cx.save();
          cx.strokeStyle = "rgba(70,60,90,0.75)";
          cx.lineWidth = 1.6;
          cx.lineCap = "round";
          for (let k = 0; k < 3; k++) {
            cx.beginPath();
            let px = z.x, py = z.y;
            cx.moveTo(px, py);
            let ang = Math.random() * Math.PI * 2;
            for (let sgm = 0; sgm < 4; sgm++) {
              ang += (Math.random() - 0.5) * 1.2;
              px += Math.cos(ang) * z.r * 0.32;
              py += Math.sin(ang) * z.r * 0.32;
              cx.lineTo(px, py);
            }
            cx.stroke();
          }
          cx.restore();
        }
      } else if (rate >= 1) {
        // нежно и ровно — копим прогресс и награждаем
        z.gentle += dt * 1.4;
        if (z.gentle >= 1) {
          z.rewarded = true;
          this.audio.chime();
          this.popup(z.x - this.size / 2, z.y - this.size / 2 - 30, "НЕЖНО! +15", "#4a7bd8", true);
          this.spawn("star", z.x - this.size / 2, z.y - this.size / 2, 6, "#cfe0ff");
        }
      }
    }
  }

  triggerOverheat() {
    if (this.overheated) return;
    this.overheated = true;
    this.overheatT = 0.8;
    this.overheats++;
    this.audio.alarm();
    this.audio.poof();
    this.shake(3);
    this.flash("255,122,89", 0.3);
    this.heatFlash = 1;
    this.combo = 0;
    this.log.push({ t: this.workT, k: "ovh" });
    this.spawn("bubble", this.pointer.lx, this.pointer.ly, 8, "#ffffff");
    this.spawn("smoke", this.pointer.lx, this.pointer.ly, 7, "#cfc9bd");
    this.popup(this.pointer.lx, this.pointer.ly - 40, "ОЙ-ОЙ!", "#e05a39", true);
  }

  stampFoam(x: number, y: number, silent = false) {
    const S = this.S;
    const fx = this.foamX;
    fx.save();
    fx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (let i = 0; i < 6; i++) {
      const bx = x + (Math.random() - 0.5) * S * 0.1;
      const by = y + (Math.random() - 0.5) * S * 0.1;
      const br = S * (0.022 + Math.random() * 0.038);
      // объёмный пузырь: белое ядро, голубоватый край, specular
      const bg = fx.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br);
      bg.addColorStop(0, "rgba(255,255,255,0.98)");
      bg.addColorStop(0.7, "rgba(245,250,255,0.92)");
      bg.addColorStop(1, "rgba(190,215,245,0.85)");
      fx.fillStyle = bg;
      fx.beginPath(); fx.arc(bx, by, br, 0, Math.PI * 2); fx.fill();
      fx.strokeStyle = "rgba(150,190,235,0.55)";
      fx.lineWidth = 1.1;
      fx.beginPath(); fx.arc(bx, by, br - 0.5, 0, Math.PI * 2); fx.stroke();
      fx.fillStyle = "rgba(255,255,255,0.95)";
      fx.beginPath(); fx.arc(bx - br * 0.32, by - br * 0.35, br * 0.22, 0, Math.PI * 2); fx.fill();
    }
    fx.restore();
    const c = this.foamCovX;
    const k = COV / this.size;
    // в зачёт покрытия идёт только пена НА предмете (пена на коврике не считается)
    if (this.inMaskAt(x, y)) {
      c.fillStyle = "rgba(255,255,255,0.95)";
      c.beginPath(); c.arc(x * k, y * k, S * 0.085 * k, 0, Math.PI * 2); c.fill();
    }
    this.oxideDirty = true;
    // пена не должна расползаться за предмет
    this.foamStamps++;
    if (this.foamStamps % 14 === 0) this.clipToMask(this.foamX);
    if (!silent) {
      if (Math.random() < 0.5) this.audio.foamStamp();
      if (Math.random() < 0.25) this.audio.bubble();
      if (Math.random() < 0.3) this.spawn("bubble", x - this.size / 2, y - this.size / 2, 1);
    }
  }

  /** Смыв: держишь и ведёшь — стирает полосу пены+жира между точками. */
  wipeSegment(from: Pt, to: Pt, silent = false) {
    const S = this.S;
    const r = S * 0.18;
    const dd = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(dd / (r * 0.35)));
    const k = COV / this.size;
    const brush = (x: CanvasRenderingContext2D, ix: number, iy: number, rr: number) => {
      const g = x.createRadialGradient(ix, iy, rr * 0.2, ix, iy, rr);
      g.addColorStop(0, "rgba(0,0,0,0.5)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(ix, iy, rr, 0, Math.PI * 2); x.fill();
    };
    for (let s = 0; s <= steps; s++) {
      const ix = lerp(from.x, to.x, s / steps), iy = lerp(from.y, to.y, s / steps);
      for (const x of [this.foamX, this.greaseX]) {
        x.save();
        x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        x.globalCompositeOperation = "destination-out";
        brush(x, ix, iy, r);
        x.restore();
      }
      this.greaseCovX.globalCompositeOperation = "destination-out";
      brush(this.greaseCovX, ix * k, iy * k, r * k);
      this.greaseCovX.globalCompositeOperation = "source-over";
    }
    this.greaseDirty = true;

    // ФИЗИКА ДВОРНИКА: резинка толкает пену перед собой комками
    const ddx = to.x - from.x, ddy = to.y - from.y;
    const ddl = Math.max(1, Math.hypot(ddx, ddy));
    const nxx = -ddy / ddl, nyy = ddx / ddl;
    if (this.foamX) {
      const fx = this.foamX;
      fx.save();
      fx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      fx.fillStyle = "rgba(255,255,255,0.88)";
      for (let b = 0; b < 3; b++) {
        const bx = to.x + nxx * (8 + b * 5) + (Math.random() - 0.5) * 12;
        const by = to.y + nyy * (8 + b * 5) + (Math.random() - 0.5) * 12;
        fx.beginPath(); fx.arc(bx, by, S * 0.012 + Math.random() * S * 0.013, 0, Math.PI * 2); fx.fill();
      }
      fx.restore();
    }
    // водяные разводы за резинкой (высохнут)
    if (this.streakX) {
      const sx = this.streakX;
      sx.save();
      sx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      sx.strokeStyle = "rgba(215,238,255,0.35)";
      sx.lineWidth = S * 0.013;
      sx.lineCap = "round";
      sx.beginPath(); sx.moveTo(from.x, from.y); sx.lineTo(to.x, to.y); sx.stroke();
      sx.restore();
      this.clipToMask(this.streakX);
    }
    // дворник тоже полирует
    if (this.polishX) {
      const px = this.polishX;
      px.save();
      px.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const pg = px.createRadialGradient(to.x, to.y, 0, to.x, to.y, r);
      pg.addColorStop(0, "rgba(255,255,255,0.5)");
      pg.addColorStop(1, "rgba(255,255,255,0)");
      px.fillStyle = pg;
      px.beginPath(); px.arc(to.x, to.y, r, 0, Math.PI * 2); px.fill();
      px.restore();
      this.polishMaskOps++;
      if (this.polishMaskOps % 8 === 0) this.clipToMask(this.polishX);
    }
    if (!silent) {
      const mx = (from.x + to.x) / 2 - this.size / 2, my = (from.y + to.y) / 2 - this.size / 2;
      if (Math.random() < 0.45) this.spawn("drop", mx, my, 2, "#bfe4ff");
      if (Math.random() < 0.25) this.spawn("bubble", mx, my, 1, "#ffffff");
      // комок пены слетает с резинки на коврик
      if (this.debris.length < 48 && Math.random() < 0.25) {
        this.debris.push({
          x: mx, y: my,
          vx: nxx * 90 + (Math.random() - 0.5) * 70,
          vy: -50 - Math.random() * 90,
          rot: 0, vr: 5, size: 2 + Math.random() * 3.2, kind: "foam", landed: false,
        });
      }
      if (Math.random() < 0.2) this.audio.wipe();
    }
  }

  trySwipe() {
    if (!this.swipe) return;
    const pts = this.swipe.pts;
    this.swipe = null;
    if (pts.length < 3) return;
    const first = pts[0], last = pts[pts.length - 1];
    let pathLen = 0;
    for (let i = 1; i < pts.length; i++) pathLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const endDist = Math.hypot(last.x - first.x, last.y - first.y);
    const dur = Math.max(0.016, (last.t - first.t) / 1000);
    const speed = pathLen / dur;
    const need = this.size * 0.22;
    const ok = endDist > need && speed > this.S * 0.4 && endDist / Math.max(1, pathLen) > 0.12;
    if (ok) {
      const nx = (last.x - first.x) / Math.max(1, endDist), ny = (last.y - first.y) / Math.max(1, endDist);
      this.sweep = { nx, ny, prog: 0 };
      this.swipeNudge = 0;
      this.audio.swish();
      this.audio.splat();
      this.shake(4.5);
      this.hitStop = 0.06;
      this.zoomPulse = 1;
      this.popup(0, -this.S * 0.15, "ВЖУХ!", "#1e93dd", true);
      this.log.push({ t: this.workT, k: "sw", nx, ny });
      const mx = (first.x + last.x) / 2 - this.size / 2, my = (first.y + last.y) / 2 - this.size / 2;
      this.spawn("drop", mx, my, 18, "#bfe4ff");
      this.spawn("bubble", mx, my, 8, "#ffffff");
    } else {
      this.misses++;
      this.swipeNudge = 1.5;
      this.audio.thud();
      this.shake(2.5);
      this.hintShake = 1;
    }
  }

  updateSweep(dt: number, live: boolean) {
    const sw = live ? this.sweep : this.replay?.sweep;
    if (!sw) return;
    sw.prog += dt / (live ? 0.4 : 0.34);
    const span = this.size * 0.75;
    const lineD = lerp(-span, span, clamp(sw.prog, 0, 1));
    const ang = Math.atan2(sw.ny, sw.nx);
    const cut = (x: CanvasRenderingContext2D) => {
      x.save();
      x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      x.translate(this.size / 2, this.size / 2);
      x.rotate(ang);
      x.globalCompositeOperation = "destination-out";
      x.fillStyle = "#000";
      x.fillRect(-span * 2, -span * 2, span * 2 + lineD, span * 4);
      x.restore();
      x.globalCompositeOperation = "source-over";
    };
    cut(this.foamX);
    cut(this.greaseX);
    if (live && Math.random() < 0.8) {
      const wx = Math.cos(ang + Math.PI / 2) * (Math.random() - 0.5) * this.size * 0.7;
      const wy = Math.sin(ang + Math.PI / 2) * (Math.random() - 0.5) * this.size * 0.7;
      this.spawn("drop", Math.cos(ang) * lineD + wx, Math.sin(ang) * lineD + wy, 1, "#d6efff");
    }
    if (sw.prog >= 1) {
      if (live) {
        this.sweep = null;
        // гарантированно дочиста: убираем все остатки пены и грязи
        for (const x of [this.foamX, this.greaseX]) {
          x.save();
          x.setTransform(1, 0, 0, 1, 0, 0);
          x.clearRect(0, 0, x.canvas.width, x.canvas.height);
          x.restore();
        }
        this.greaseDone = true;
        this.wetT = 1.4;
        this.log.push({ t: this.workT, k: "dn", i: 2 });
        this.audio.bubble();
        this.checkSnap();
      } else if (this.replay) {
        this.replay.sweep = null;
      }
    }
  }

  checkSnap() {
    if (this.phase !== "work") return;
    if (this.resinDone && this.oxideDone && this.greaseDone) {
      this.phase = "snap";
      this.snapT = 0;
      this.stampT = 0;
      this.flashA = 1; this.flashColor = "255,255,255";
      this.audio.snapClean();
      this.shake(7);
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const r = this.S * (0.35 + Math.random() * 0.35);
        this.spawn("star", Math.cos(a) * r, Math.sin(a) * r, 1, i % 3 === 0 ? "#ffd166" : "#7fdcff");
      }
      if (this.laserDown) { this.audio.laserStop(); this.laserDown = false; }
      this.pushHud();
    }
  }

  /* ================= replay ================= */
  startReplay() {
    this.buildLayers();
    this.foamPhase = 1;
    const T = Math.max(0.5, (this.log.length ? this.log[this.log.length - 1].t : 1) + 0.2);
    this.replay = { evs: [...this.log], i: 0, t: 0, dur: 2.7, T, sweep: null, beam: [] };
    this.replayWpLast = null;
    this.phase = "replay";
    this.startRec();
    this.pushHud();
  }

  private warp(t: number): number {
    const r = this.replay!;
    return Math.pow(clamp(t / r.T, 0, 1), 0.52) * r.dur;
  }

  skipReplay() {
    if (!this.replay || this.phase !== "replay") return;
    this.replay.t = this.replay.dur + 0.4;
  }

  applyReplayEvent(ev: Ev) {
    const r = this.replay!;
    if (ev.k === "tap" && ev.i !== undefined) {
      const p = this.polys.find((q) => q.idx === ev.i);
      if (p && p.alive) {
        p.alive = false;
        this.drawResin(mulberry32(this.seed + p.idx));
        if (Math.random() < 0.4) this.spawn("shard", p.cx - this.size / 2, p.cy - this.size / 2, 2, "#e08f2a");
        if (p.idx % 3 === 0) this.audio.chink(0.5);
      }
    } else if (ev.k === "lz") {
      for (const pt of ev.pts ?? []) {
        if (pt.e) this.eraseOxideAt(pt.x, pt.y, this.S * 0.1, 0.55);
        r.beam.push({ x: pt.x, y: pt.y });
        if (r.beam.length > 14) r.beam.shift();
        if (pt.e && Math.random() < 0.12) this.spawn("spark", pt.x - this.size / 2, pt.y - this.size / 2, 1, "#ffd166");
      }
    } else if (ev.k === "fm") {
      this.stampFoam(ev.x!, ev.y!, true);
      if (Math.random() < 0.2) this.audio.bubble();
    } else if (ev.k === "wp") {
      const to = { x: ev.x!, y: ev.y! };
      const from = this.replayWpLast ?? to;
      this.wipeSegment(from, to, true);
      this.replayWpLast = to;
      if (Math.random() < 0.25) this.spawn("drop", to.x - this.size / 2, to.y - this.size / 2, 1, "#bfe4ff");
    } else if (ev.k === "dn") {
      this.flash("255,255,255", 0.18);
      this.audio.blip(1200);
      // слой готов — дочиста убираем его остатки, чтобы не осталось «полугрязи»
      if (ev.i === 1) this.clearLayer(this.oxideX);
      if (ev.i === 2) { this.clearLayer(this.greaseX); this.clearLayer(this.foamX); }
    } else if (ev.k === "ovh") {
      this.flash("255,122,89", 0.2);
    } else if (ev.k === "p2") {
      this.audio.bubble();
    }
  }

  /** Полностью стирает холст слоя (делает его прозрачным). */
  private clearLayer(x: CanvasRenderingContext2D) {
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, x.canvas.width, x.canvas.height);
    x.restore();
  }

  /** Гарантирует, что предмет показан идеально чистым (никакой остаточной грязи). */
  private wipeAllDirt() {
    this.clearLayer(this.foamX);
    this.clearLayer(this.greaseX);
    this.clearLayer(this.oxideX);
    this.clearLayer(this.resinX);
    // никаких «фломастерных» следов на чистом предмете
    this.clearLayer(this.streakX);
    this.clearLayer(this.heatX);
    this.oxideFrac = 0; this.greaseFrac = 0; this.foamFrac = 0;
    this.resinDone = true; this.oxideDone = true; this.greaseDone = true;
  }

  /** Ржавчина исчезла полностью — завершаем слой и переключаем на пену. */
  private completeOxide() {
    this.oxideDone = true;
    this.clearLayer(this.oxideX);
    this.log.push({ t: this.workT, k: "dn", i: 1 });
    this.unlocked[2] = true;
    this.tool = 3;
    if (this.laserDown) { this.audio.laserStop(); this.laserDown = false; }
    this.stampLayer("РЖАВЧИНА СНЯТА ДОЧИСТА! ТЕПЕРЬ ПЕНА", "#e05a39");
    this.audio.unlock();
    this.flash("255,198,61", 0.2);
    this.spawn("star", 0, 0, 12, "#ffd166");
    this.pushHud();
  }

  /** Пена и грязь исчезли полностью — завершаем смыв. */
  private completeGrease() {
    this.greaseDone = true;
    this.clearLayer(this.foamX);
    this.clearLayer(this.greaseX);
    this.greaseFrac = 0;
    this.wetT = 1.6;
    this.log.push({ t: this.workT, k: "dn", i: 2 });
    this.stampLayer("ДО БЛЕСКА!", "#1e93dd");
    this.audio.swish();
    this.spawn("star", 0, 0, 16, "#7fdcff");
    this.checkSnap();
    this.pushHud();
  }

  finishReplay() {
    this.stopRec();
    this.replay = null;
    this.wipeAllDirt();
    this.phase = "alive";
    this.flashA = 0.8; this.flashColor = "255,255,255";
    this.audio.bassDrop();
    this.shake(6);
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr2 = this.S * (0.2 + Math.random() * 0.5);
      this.spawn("star", Math.cos(a) * rr2, Math.sin(a) * rr2, 1, PASTELS[i % PASTELS.length]);
    }
    this.pushHud();
  }

  startRec() {
    try {
      const cv = this.canvas as any;
      if (typeof MediaRecorder === "undefined" || !cv.captureStream) return;
      const stream: MediaStream = cv.captureStream(60);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      this.recChunks = [];
      this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.recChunks.push(e.data); };
      this.recorder.onstop = () => {
        if (this.recChunks.length > 0) {
          const blob = new Blob(this.recChunks, { type: "video/webm" });
          if (this.replayUrl) URL.revokeObjectURL(this.replayUrl);
          this.replayUrl = URL.createObjectURL(blob);
        }
        this.pushHud();
      };
      this.recorder.start(250);
    } catch {
      this.recorder = null;
    }
  }

  stopRec() {
    try {
      if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    } catch { /* noop */ }
  }

  downloadReplay() {
    if (!this.replayUrl) return;
    const a = document.createElement("a");
    a.href = this.replayUrl;
    a.download = `pristine-${this.artifact?.id ?? "artifact"}-replay.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ================= input ================= */
  private setPointer(e: PointerEvent) {
    this.pointer.x = e.clientX; this.pointer.y = e.clientY;
    this.pointer.lx = e.clientX - this.cx; this.pointer.ly = e.clientY - this.cy;
    this.pointer.inside = true;
  }

  onDown(e: PointerEvent) {
    this.audio.init();
    this.setPointer(e);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
    if (this.paused) return;
    if (this.phase === "scan") { this.scanT = 1.49; return; }
    if (this.phase === "work") {
      this.pointer.down = true;
      const p = this.layerPt(e.clientX, e.clientY);
      if (this.tool === 1) this.tapResin(p.x, p.y);
      else if (this.tool === 2) {
        this.laserDown = true;
        this.stroke = [];
        this.lastErase = p;
        this.hist = [{ t: performance.now(), x: p.x, y: p.y }];
        this.vSmooth = this.S * 1.2;
        this.audio.laserStart();
      } else if (this.tool === 3) {
        if (this.foamPhase === 1) {
          this.swirlC = { x: p.x, y: p.y };
          this.swirlInit = false;
          this.swirlRate = 0;
          this.foamLast = p;
          this.stampFoam(p.x, p.y);
        } else {
          // фаза смыва: начинаем вести дворник
          this.wipeLast = p;
          this.sqOn = true;
          this.audio.wipe();
        }
      }
    } else if (this.phase === "alive" && this.artifact) {
      this.pointer.down = true;
      this.artifact.onPointer(this.api, this.anim, "down", this.pointer.lx, this.pointer.ly);
    }
  }

  onMove(e: PointerEvent) {
    this.setPointer(e);
    if (this.paused) return;
    const dt = 1 / 60;
    if (this.phase === "work" && this.pointer.down) {
      const p = this.layerPt(e.clientX, e.clientY);
      if (this.tool === 2 && this.laserDown) {
        this.laserMove(p, dt);
      } else if (this.tool === 3 && this.foamPhase === 1) {
        // НАМЫЛИВАНИЕ: любое ведение губки оставляет непрерывный пенный след —
        // никаких «кругов по науке», просто вози губкой по предмету
        const from = this.foamLast ?? p;
        const dd = Math.hypot(p.x - from.x, p.y - from.y);
        if (dd > this.S * 0.028) {
          const steps = Math.max(1, Math.ceil(dd / (this.S * 0.04)));
          for (let s = 1; s <= steps; s++) {
            this.stampFoam(lerp(from.x, p.x, s / steps), lerp(from.y, p.y, s / steps), true);
          }
          this.foamLast = p;
          this.hits += 0.1 * steps;
          this.lastActionT = this.time;
          this.log.push({ t: this.workT, k: "fm", x: p.x, y: p.y });
          // звуки отдельно троттлим, чтобы не трещали
          const now = performance.now();
          if (now - this.lastStamp > 75) { this.lastStamp = now; this.audio.foamStamp(); }
          if (Math.random() < 0.06) this.audio.bubble();
          if (Math.random() < 0.25) {
            this.spawn("bubble", p.x - this.size / 2, p.y - this.size / 2, 1);
          }
        }
        // интенсивность кругов всё ещё сжимает губку (чисто для сочности)
        this.swirlC.x = lerp(this.swirlC.x, p.x, 0.1);
        this.swirlC.y = lerp(this.swirlC.y, p.y, 0.1);
        const ang = Math.atan2(p.y - this.swirlC.y, p.x - this.swirlC.x);
        if (this.swirlInit) {
          const dA = Math.abs(((ang - this.swirlA + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          this.swirlRate = lerp(this.swirlRate, dA / dt, 0.15);
        } else {
          this.swirlInit = true;
        }
        this.swirlA = ang;
      } else if (this.tool === 3 && this.foamPhase === 2 && this.wipeLast) {
        // ведём дворник — стираем полосу пены и жира
        if (Math.hypot(p.x - this.wipeLast.x, p.y - this.wipeLast.y) > this.S * 0.02) {
          this.wipeSegment(this.wipeLast, p);
          this.hits += 0.05;
          this.lastActionT = this.time;
          this.log.push({ t: this.workT, k: "wp", x: p.x, y: p.y });
          this.wipeLast = p;
          this.sqX = p.x; this.sqY = p.y;
        }
      }
    } else if (this.phase === "alive" && this.artifact && this.pointer.down) {
      this.artifact.onPointer(this.api, this.anim, "move", this.pointer.lx, this.pointer.ly);
    }
  }

  onUp(_e: PointerEvent) {
    if (this.phase === "work" && this.pointer.down) {
      if (this.tool === 2 && this.laserDown) {
        this.laserDown = false;
        this.audio.laserStop();
        if (this.stroke.length > 1) this.log.push({ t: this.workT, k: "lz", pts: [...this.stroke] });
        this.stroke = [];
        this.lastErase = null;
        this.clipToMask(this.polishX);
        this.clipToMask(this.gleamX);
      } else if (this.tool === 3 && this.foamPhase === 2) {
        this.wipeLast = null;
        this.sqOn = false;
      }
    } else if (this.phase === "alive" && this.artifact) {
      this.artifact.onPointer(this.api, this.anim, "up", this.pointer.lx, this.pointer.ly);
    }
    this.pointer.down = false;
  }

  onKey(e: KeyboardEvent) {
    if (e.key === "1") this.selectTool(1);
    else if (e.key === "2") this.selectTool(2);
    else if (e.key === "3") this.selectTool(3);
    else if (e.key === "Escape" || e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") this.togglePause();
    else if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") this.toggleMute();
  }

  /* ================= fx ================= */
  spawn(kind: PKind, x: number, y: number, n: number, color = "#ffffff") {
    for (let i = 0; i < n; i++) {
      if (this.particles.length > 420) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = kind === "shard" ? 90 + Math.random() * 220
        : kind === "spark" ? 60 + Math.random() * 200
        : kind === "drop" ? 80 + Math.random() * 260
        : kind === "star" ? 30 + Math.random() * 130
        : kind === "bubble" ? 20 + Math.random() * 40
        : 20 + Math.random() * 50;
      this.particles.push({
        kind, x, y, px: x, py: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === "bubble" ? 60 : kind === "star" ? 40 : 0),
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 12,
        life: 0,
        ttl: kind === "shard" ? 0.7 : kind === "spark" ? 0.38 : kind === "bubble" ? 0.9 : kind === "drop" ? 0.55 : kind === "dust" ? 1.1 : kind === "pixel" ? 0.6 : 0.85,
        size: kind === "shard" ? 3 + Math.random() * 6 : kind === "spark" ? 1.5 + Math.random() * 2.5 : kind === "bubble" ? 2 + Math.random() * 4 : kind === "drop" ? 1.5 + Math.random() * 2.5 : kind === "pixel" ? 3 : 3 + Math.random() * 4,
        color,
      });
    }
  }

  shake(a: number) { this.shakeA = Math.min(14, this.shakeA + a); }
  flash(color: string, a: number) { this.flashColor = color; this.flashA = Math.max(this.flashA, a); }

  /** летящая надпись-очко */
  popup(x: number, y: number, txt: string, col: string, big = false) {
    if (this.popups.length > 14) this.popups.shift();
    this.popups.push({ x, y, txt, col, life: 0, ttl: big ? 1.1 : 0.75, big });
  }

  /** большой штамп по центру (слой готов) */
  stampLayer(txt: string, col: string) {
    this.layerStamp = { txt, col, t: 0 };
    this.audio.stampHit();
    this.shake(4);
  }

  bumpCombo() {
    this.combo++;
    this.comboT = 1.2;
    this.lastActionT = this.time;
    this.audio.comboPop(this.combo);
    // веха серии — маленький праздник, подпитывает поток
    if (this.combo > 0 && this.combo % 6 === 0) {
      this.audio.unlock();
      this.popup(this.pointer.lx, this.pointer.ly - 66, `СЕРИЯ ×${this.combo}!`, "#ffc63d", true);
      this.spawn("star", this.pointer.lx, this.pointer.ly, 8, "#ffe9a8");
      this.zoomPulse = Math.max(this.zoomPulse, 0.7);
    }
  }

  /* ================= update ================= */
  update(dt: number) {
    // гарантия: лазерный гул звучит, только когда лазер реально ведётся по предмету
    const laserShouldPlay =
      this.phase === "work" && !this.paused && this.tool === 2 && this.laserDown && this.pointer.down;
    if (!laserShouldPlay && this.audio.laserActive()) {
      this.audio.laserStop();
      this.laserDown = false;
    }
    this.shakeA = Math.max(0, this.shakeA - dt * 22);
    this.zoomPulse = Math.max(0, this.zoomPulse - dt * 4.5);
    this.toolJab = Math.max(0, this.toolJab - dt * 7);
    // наклон скребка следует за движением руки
    const pdx = this.pointer.x - this.lastPtrX;
    this.lastPtrX = this.pointer.x;
    this.toolLean = lerp(this.toolLean, clamp(pdx * 0.05, -0.5, 0.5), 0.18);
    // сжатие губки от интенсивности кругов
    const wantSquish = this.tool === 3 && this.foamPhase === 1 && this.pointer.down ? clamp(this.swirlRate * 0.14, 0, 1) : 0;
    this.spongeSquish = lerp(this.spongeSquish, wantSquish, 0.2);
    // блеск «только что отполировано» медленно тает
    if (this.gleamX && this.gleamC) {
      const gx = this.gleamX;
      gx.save();
      gx.setTransform(1, 0, 0, 1, 0, 0);
      gx.globalCompositeOperation = "destination-out";
      gx.fillStyle = "rgba(0,0,0,0.55)";
      gx.fillRect(0, 0, this.gleamC.width, this.gleamC.height);
      gx.restore();
    }
    this.flashA = Math.max(0, this.flashA - dt * 2.4);
    this.heatFlash = Math.max(0, this.heatFlash - dt * 1.6);
    this.tapPulse = Math.max(0, this.tapPulse - dt * 6);
    this.hintShake = Math.max(0, this.hintShake - dt * 2.5);
    this.wetT = Math.max(0, this.wetT - dt);
    this.swipeNudge = Math.max(0, this.swipeNudge - dt * 0.9);
    this.bobT += dt;
    // плавный наклон к курсору (реликвия «следит» за рукой);
    // во время работы предмет «прижимается» к столу, чтобы маска грязи не разъезжалась
    const tiltScale = this.pointer.down ? 0.22 : 1;
    const tTX = this.pointer.inside ? clamp(this.pointer.lx / (this.W * 0.5), -1, 1) * tiltScale : 0;
    const tTY = this.pointer.inside ? clamp(this.pointer.ly / (this.H * 0.5), -1, 1) * tiltScale : 0;
    this.tiltX = lerp(this.tiltX, tTX, Math.min(1, dt * 5));
    this.tiltY = lerp(this.tiltY, tTY, Math.min(1, dt * 5));
    // остывание раскалённых следов лазера
    if (this.heatX) {
      this.heatX.save();
      this.heatX.setTransform(1, 0, 0, 1, 0, 0);
      this.heatX.globalCompositeOperation = "destination-out";
      this.heatX.fillStyle = `rgba(0,0,0,${clamp(dt * 2.4, 0, 0.25)})`;
      this.heatX.fillRect(0, 0, this.heatC.width, this.heatC.height);
      this.heatX.restore();
    }
    // высыхание водяных разводов
    if (this.streakX) {
      this.streakX.save();
      this.streakX.setTransform(1, 0, 0, 1, 0, 0);
      this.streakX.globalCompositeOperation = "destination-out";
      this.streakX.fillStyle = `rgba(0,0,0,${clamp(dt * 1.4, 0, 0.12)})`;
      this.streakX.fillRect(0, 0, this.streakC.width, this.streakC.height);
      this.streakX.restore();
    }
    // мусор на коврике: падает и остаётся лежать
    if (this.artifact && this.debris.length > 0) {
      const landY = this.S * this.artifact.boundsMul * 0.95;
      for (const d of this.debris) {
        if (d.landed) continue;
        d.vy += 950 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
        if (d.y >= landY) { d.y = landY; d.landed = true; d.vr = 0; }
      }
    }
    this.comboT -= dt;
    if (this.comboT <= 0 && this.combo > 0) { this.combo = 0; this.pushHud(); }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].life += dt;
      if (this.popups[i].life >= this.popups[i].ttl) this.popups.splice(i, 1);
    }
    if (this.layerStamp) {
      this.layerStamp.t += dt;
      if (this.layerStamp.t > 1.35) this.layerStamp = null;
    }
    if (this.stampT >= 0) this.stampT += dt;
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > this.W + 160) { c.x = -160; c.y = 30 + Math.random() * this.H * 0.5; }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.ttl) { this.particles.splice(i, 1); continue; }
      const g = p.kind === "bubble" ? -70 : p.kind === "star" ? -18 : p.kind === "dust" ? -6 : p.kind === "smoke" ? -40 : 760;
      p.vy += g * dt;
      p.vx *= Math.pow(0.3, dt * (p.kind === "star" ? 2 : 1));
      p.px = p.x; p.py = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }

    switch (this.phase) {
      case "scan": {
        this.scanT += dt;
        if (this.scanT > 0.35 && !this.scanDustDone) {
          this.scanDustDone = true;
          this.audio.thud();
          this.shake(3);
          this.spawn("dust", 0, this.S * 0.4, 16, "#cbbfa8");
        }
        if (this.scanT >= 1.55) { this.phase = "work"; this.workT = 0; this.pushHud(); }
        break;
      }
      case "work": {
        this.workT += dt;
        // ФИНАЛЬНОЕ ДОТАЯНИЕ: когда от слоя остались только мелкие крупинки (≤6%),
        // они тают на глазах ~0.5с — и только после их исчезновения слой завершается
        if (this.oxideFadeT > 0) {
          this.oxideFadeT -= dt;
          const fade = (x: CanvasRenderingContext2D, w: number) => {
            x.save();
            x.globalCompositeOperation = "destination-out";
            x.fillStyle = "rgba(0,0,0,0.22)";
            x.fillRect(0, 0, w, w);
            x.restore();
          };
          fade(this.oxideX, this.size);
          fade(this.oxideCovX, COV);
          if (this.oxideFadeT <= 0) {
            this.oxideFrac = 0;
            this.oxideDirty = true;
            if (!this.oxideDone) this.completeOxide();
          }
        }
        if (this.greaseFadeT > 0) {
          this.greaseFadeT -= dt;
          const fade2 = (x: CanvasRenderingContext2D, w: number, h: number) => {
            x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
            x.globalCompositeOperation = "destination-out";
            x.fillStyle = "rgba(0,0,0,0.22)";
            x.fillRect(0, 0, w, h);
            x.restore();
          };
          fade2(this.greaseX, this.greaseC.width, this.greaseC.height);
          fade2(this.foamX, this.foamC.width, this.foamC.height);
          fade2(this.greaseCovX, COV, COV);
          if (this.greaseFadeT <= 0) {
            this.greaseFrac = 0;
            this.greaseDirty = true;
            if (!this.greaseDone) this.completeGrease();
          }
        }
        if (this.overheated) {
          this.overheatT -= dt;
          this.heat = Math.max(0.3, this.heat - dt * 0.6);
          if (this.overheatT <= 0) this.overheated = false;
        }
        if (this.tool === 2 && !this.overheated && !this.pointer.down) {
          this.heat = Math.max(0, this.heat - dt * 0.5);
        }
        if (this.tool === 1) this.updateScrapeHold(dt);
        // пена «доползает» до уголков: когда покрыто почти всё, она сама
        // дотекает в непокрытые точки маски — намылить предмет можно целиком
        if (this.foamPhase === 1 && !this.greaseDone && this.foamFrac > 0.8) {
          this.foamCreepT += dt;
          if (this.foamCreepT > 0.12) {
            this.foamCreepT = 0;
            const cov = this.foamCovX.getImageData(0, 0, COV, COV).data;
            let stamped = 0;
            for (let tries = 0; tries < 90 && stamped < 8; tries++) {
              const ix = Math.floor(Math.random() * COV);
              const iy = Math.floor(Math.random() * COV);
              const idx = iy * COV + ix;
              const inMask = this.maskTiny.data[idx * 4 + 3] > 128;
              const hasFoam = cov[idx * 4 + 3] > 40;
              if (inMask && !hasFoam) {
                this.stampFoam(((ix + 0.5) / COV) * this.size, ((iy + 0.5) / COV) * this.size, true);
                stamped++;
              }
            }
          }
        }
        // Проверка завершённости идёт ВСЕГДА 3 раза в секунду (не зависит от того,
        // двигает ли игрок инструментом прямо сейчас) — чистка не может «зависнуть»:
        // слой сам дотает и переключит инструмент, даже если держать кнопку зажатой.
        if (Math.floor(this.time * 3) !== Math.floor((this.time - dt) * 3)) {
          if (!this.oxideDone) {
            const prevFrac = this.oxideFrac;
            this.oxideFrac = this.countCovered(this.oxideCovX, 128) / this.oxideMaskPx;
            // осталось ≤15% — финальное дотаяние дочистит слой полностью
            if (this.oxideFrac <= 0.15) this.oxideFadeT = Math.max(this.oxideFadeT, 0.6);
            // защита от зависания: если фракция очень маленькая но больше 0.1, всё равно запускаем fade
            if (this.oxideFrac > 0 && this.oxideFrac < 0.2 && prevFrac === this.oxideFrac) {
              this.oxideFadeT = Math.max(this.oxideFadeT, 0.6);
            }
            // защита от минимального значения countCovered (возвращает минимум 1)
            // если oxideFrac застрял на минимуме (1/oxideMaskPx), запускаем завершение
            const minFrac = 1 / this.oxideMaskPx;
            if ((this.oxideFrac <= minFrac + 0.001 || this.oxideFrac < 0.01) && this.oxideFadeT <= 0) {
              this.oxideFadeT = 0.5;
            }
          }
          if (this.foamPhase === 1 && !this.greaseDone) {
            this.foamFrac = this.countCovered(this.foamCovX, 40) / this.oxideMaskPx;
            // пена готова, когда покрыт почти весь предмет (94%+; уголки дотекают сами)
            if (this.foamFrac >= 0.94) {
              this.foamPhase = 2;
              this.log.push({ t: this.workT, k: "p2" });
              this.audio.bubble();
              this.audio.blip(1400);
              this.popup(0, -this.S * 0.35, "ПЕНА ГОТОВА!", "#38b6ff", true);
              this.pushHud();
            }
          }
          if (this.foamPhase === 2 && !this.greaseDone) {
            this.greaseFrac = this.countCovered(this.greaseCovX, 128) / this.greaseMaskPx;
            // осталось ≤10% — финальное дотаяние уберёт всё «до блеска»
            if (this.greaseFrac <= 0.1) this.greaseFadeT = Math.max(this.greaseFadeT, 0.6);
          }
          this.oxideDirty = false;
          this.greaseDirty = false;
        }
        // СТРАХОВКА ОТ «БЕСКОНЕЧНОЙ ЧИСТКИ»: если ребёнок застрял (5 секунд без
        // прогресса), но слой уже отмыт больше чем наполовину — игра мягко домывает
        // остаток и идёт дальше. Никто не застревает навсегда.
        let activeFrac = -1;
        if (this.tool === 1 && !this.resinDone) {
          const total = this.polys.length || 1;
          let alive = 0;
          for (const p of this.polys) if (p.alive) alive++;
          activeFrac = alive / total;
        } else if (this.tool === 2 && !this.oxideDone) activeFrac = this.oxideFrac;
        else if (this.tool === 3 && !this.greaseDone)
          activeFrac = this.foamPhase === 1 ? 1 - this.foamFrac : this.greaseFrac;
        if (activeFrac >= 0) {
          if (activeFrac < this.prevFrac - 0.004) this.stallT = 0; // есть прогресс
          else this.stallT += dt;
          this.prevFrac = activeFrac;
          if (this.stallT >= 5 && activeFrac <= 0.5) {
            this.popup(0, -this.S * 0.42, "ДАВАЙ ДОМОЮ!", "#2fc98a", true);
            this.audio.unlock();
            this.audio.blip(1100);
            if (this.tool === 1) {
              for (const p of this.polys) if (p.alive) this.breakPoly(p);
            } else if (this.tool === 2) {
              this.oxideFadeT = Math.max(this.oxideFadeT, 0.7);
            } else if (this.foamPhase === 1) {
              this.foamPhase = 2;
              this.log.push({ t: this.workT, k: "p2" });
              this.popup(0, -this.S * 0.35, "ПЕНА ГОТОВА!", "#38b6ff", true);
            } else {
              this.greaseFadeT = Math.max(this.greaseFadeT, 0.7);
            }
            this.stallT = 0;
            this.prevFrac = 1;
          }
        }
        break;
      }
      case "snap": {
        this.snapT += dt;
        if (this.snapT >= 0.95) this.startReplay();
        break;
      }
      case "replay": {
        const r = this.replay;
        if (!r) break;
        r.t += dt;
        while (r.i < r.evs.length && this.warp(r.evs[r.i].t) <= r.t) {
          this.applyReplayEvent(r.evs[r.i]);
          r.i++;
        }
        this.updateSweep(dt, false);
        if (r.t >= r.dur + 0.55) this.finishReplay();
        break;
      }
      case "alive": {
        if (this.artifact) this.artifact.update(this.anim, dt, this.api);
        break;
      }
      default: break;
    }
    // гарантируем, что ни один эффект не вылезает за силуэт предмета
    if (this.phase === "work" || this.phase === "replay") this.clipEffects();
    this.api.t = this.time;
  }

  /* ================= render ================= */
  render() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    // небо
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#6ec9f5");
    sky.addColorStop(0.45, "#a9e2fb");
    sky.addColorStop(1, "#e3f6ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // солнышко
    const sunX = W * 0.86, sunY = H * 0.12;
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(this.time * 0.05);
    ctx.fillStyle = "rgba(255,214,90,0.5)";
    for (let i = 0; i < 10; i++) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(0, -34); ctx.lineTo(9, -78); ctx.lineTo(-9, -78);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    const sunG = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
    sunG.addColorStop(0, "rgba(255,236,150,0.95)");
    sunG.addColorStop(0.4, "rgba(255,220,110,0.75)");
    sunG.addColorStop(1, "rgba(255,220,110,0)");
    ctx.fillStyle = sunG;
    ctx.beginPath(); ctx.arc(sunX, sunY, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd95c";
    ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.arc(sunX - 9, sunY - 10, 9, 0, Math.PI * 2); ctx.fill();
    // облака
    for (const c of this.clouds) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const s = c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 26 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 26 * s, c.y + 6 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(c.x - 26 * s, c.y + 7 * s, 18 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 4 * s, c.y - 14 * s, 20 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // искорки
    for (const sp of this.sparkles) {
      const tw = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(this.time * 2 + sp.ph));
      ctx.globalAlpha = tw;
      ctx.fillStyle = sp.color;
      if (sp.star) {
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(this.time * 0.6 + sp.ph);
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2;
          const rad = k % 2 === 0 ? sp.r * 1.6 : sp.r * 0.6;
          const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * 0.7, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    const inGame = this.phase !== "catalog";
    if (inGame) this.drawFrame();
    if (this.artifact && inGame) this.drawScene();

    if (this.flashA > 0) {
      ctx.fillStyle = `rgba(${this.flashColor},${clamp(this.flashA, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawFrame() {
    const { ctx } = this;
    const fw = Math.min(this.W - 24, this.size + this.S * 1.05);
    const fh = this.H - TOP_H - BOTTOM_H - 4;
    const fx = this.cx - fw / 2, fy = this.cy - fh / 2;
    // медовый стол
    ctx.fillStyle = COCOA;
    rrPath(ctx, fx - 7, fy - 7, fw + 14, fh + 14, 30);
    ctx.fill();
    const wood = ctx.createLinearGradient(0, fy, 0, fy + fh);
    wood.addColorStop(0, "#f7c873");
    wood.addColorStop(0.5, "#f0b45c");
    wood.addColorStop(1, "#e29b3f");
    ctx.fillStyle = wood;
    rrPath(ctx, fx, fy, fw, fh, 26);
    ctx.fill();
    // доски
    ctx.strokeStyle = "rgba(160,105,35,0.28)";
    ctx.lineWidth = 2;
    const planks = 4;
    for (let i = 1; i < planks; i++) {
      const y = fy + (fh / planks) * i;
      ctx.beginPath(); ctx.moveTo(fx + 14, y); ctx.lineTo(fx + fw - 14, y); ctx.stroke();
    }
    // кремовый коврик
    const mx = fx + 16, my = fy + 16, mw = fw - 32, mh = fh - 32;
    ctx.fillStyle = COCOA;
    rrPath(ctx, mx - 4, my - 4, mw + 8, mh + 8, 22);
    ctx.fill();
    const mat = ctx.createLinearGradient(0, my, 0, my + mh);
    mat.addColorStop(0, "#fffdf5");
    mat.addColorStop(1, "#f6ecd6");
    ctx.fillStyle = mat;
    rrPath(ctx, mx, my, mw, mh, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(91,59,30,0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    rrPath(ctx, mx + 10, my + 10, mw - 20, mh - 20, 14);
    ctx.stroke();
    ctx.setLineDash([]);
    // пуговки-винтики
    const screw = (x: number, y: number, col: string) => {
      ctx.fillStyle = COCOA;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath(); ctx.arc(x - 1.6, y - 1.8, 2, 0, Math.PI * 2); ctx.fill();
    };
    screw(fx + 20, fy + 20, "#ff7a59");
    screw(fx + fw - 20, fy + 20, "#38b6ff");
    screw(fx + 20, fy + fh - 20, "#2fc98a");
    screw(fx + fw - 20, fy + fh - 20, "#ffc63d");
    if (this.artifact) {
      ctx.font = '700 10px "Nunito", sans-serif';
      ctx.fillStyle = "rgba(91,59,30,0.75)";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText(`МАТЕРИАЛ: ${this.artifact.materialLabel.toUpperCase()}`, mx + 26, my + mh - 14);
      ctx.textAlign = "right";
      ctx.fillText(`ЗАКАЗ #${String(this.seed).slice(0, 5)}`, mx + mw - 26, my + mh - 14);
      // звёздочки-«штрих-код»
      let bx = mx + 26;
      const rng = mulberry32(this.seed ^ 0x5f5f);
      ctx.fillStyle = "rgba(91,59,30,0.5)";
      for (let i = 0; i < 5; i++) {
        const r2 = 2 + rng() * 2.4;
        ctx.beginPath(); ctx.arc(bx, my + 18, r2, 0, Math.PI * 2); ctx.fill();
        bx += r2 * 2 + 4 + rng() * 4;
      }
      ctx.textAlign = "left";
    }
  }

  drawScene() {
    const { ctx } = this;
    const sx = (Math.random() - 0.5) * this.shakeA;
    const sy = (Math.random() - 0.5) * this.shakeA;
    ctx.save();
    ctx.translate(this.cx + sx, this.cy + sy);
    // зум-пульс на ударах + лёгкое вращение от тряски
    const zoom = 1 + this.zoomPulse * 0.02;
    ctx.scale(zoom, zoom);
    ctx.rotate((Math.random() - 0.5) * this.shakeA * 0.0025);
    let drop = 0, scale = 1;
    if (this.phase === "scan") {
      const k = clamp(this.scanT / 0.35, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      drop = -46 * (1 - e);
      scale = 1.07 - 0.07 * e;
    }
    ctx.translate(0, drop);
    ctx.scale(scale, scale);

    const phaseDraw = this.phase === "alive" || this.phase === "payout" ? "alive" : this.phase === "catalog" ? "catalog" : "work";
    const floating = phaseDraw === "alive";
    const bobY = floating ? Math.sin(this.bobT * 2.3) * 4.5 : Math.sin(this.bobT * 1.3) * 1.2;
    const bobR = floating ? Math.sin(this.bobT * 1.7) * 0.014 : 0;

    // мягкая тень на коврике: смещается и скашивается ПРОТИВ наклона — якорит предмет в 3D
    ctx.save();
    const shR = this.S * this.artifact!.boundsMul;
    const shScale = 1 - bobY / 90;
    ctx.translate(-this.tiltX * this.S * 0.05, 0);
    ctx.transform(1, 0, -this.tiltX * 0.28, 1, 0, 0);
    const sh = ctx.createRadialGradient(0, shR * 0.95, 2, 0, shR * 0.95, shR * 1.05 * shScale);
    sh.addColorStop(0, "rgba(66,38,12,0.42)");
    sh.addColorStop(0.55, "rgba(66,38,12,0.24)");
    sh.addColorStop(1, "rgba(66,38,12,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(0, shR * 0.95, shR * 1.05 * shScale, shR * 0.24 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // МУСОР НА КОВРИКЕ: осколки смолы и комки пены, которые упали и остались лежать
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      if (!d.landed) ctx.globalAlpha = 0.95;
      if (d.kind === "shard") {
        ctx.fillStyle = "#e08f2a";
        ctx.strokeStyle = "rgba(90,50,8,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-d.size, d.size * 0.7);
        ctx.lineTo(d.size * 0.8, d.size * 0.5);
        ctx.lineTo(0, -d.size);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,220,150,0.6)";
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.4, d.size * 0.3);
        ctx.lineTo(0, -d.size * 0.6);
        ctx.lineTo(d.size * 0.2, d.size * 0.2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath(); ctx.arc(0, 0, d.size, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(150,190,235,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, d.size, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, bobY);
    ctx.rotate(bobR);
    // 3D-наклон к курсору: лёгкий сдвиг + аффинный сдвиг оси — предмет «поворачивается» к руке
    ctx.translate(this.tiltX * this.S * 0.03, this.tiltY * this.S * 0.015);
    ctx.transform(1, -this.tiltY * 0.035, this.tiltX * 0.05, 1 - Math.abs(this.tiltY) * 0.02, 0, 0);
    // «толщина» предмета: тёмный силуэт со смещением вниз
    ctx.save();
    ctx.translate(0, this.S * 0.035);
    ctx.fillStyle = "rgba(58,33,10,0.55)";
    this.artifact!.drawMask(ctx, this.S);
    ctx.restore();
    this.artifact!.draw(ctx, this.S, this.anim, this.time, phaseDraw as GamePhase);

    const hs = this.size / 2;
    // грязь «въедается» в поверхность: multiply тонирует спрайт, а не ложится сверху
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    if (!this.greaseDone) ctx.drawImage(this.greaseC, -hs, -hs, this.size, this.size);
    ctx.drawImage(this.oxideC, -hs, -hs, this.size, this.size);
    ctx.drawImage(this.resinC, -hs, -hs, this.size, this.size);
    ctx.restore();
    // КРОМКА-БЛИК: тонкая светлая линия со стороны курсора и тёмная — напротив.
    // Рисуется ПОСЛЕ грязи, поэтому металл и грязь освещены одной кромкой —
    // грязь читается как часть поверхности, а не наклейка. Только край, без пересвета.
    if (this.rimAC) {
      const rimAmt = clamp(Math.hypot(this.tiltX, this.tiltY), 0, 1);
      if (rimAmt > 0.04) {
        const d = 8 * rimAmt;
        const lox = this.tiltX * d, loy = this.tiltY * d;
        const R = this.dpr;
        // светлая кромка со стороны курсора = маска МИНУС маска, сдвинутая от курсора
        const ax = this.rimAX;
        ax.setTransform(1, 0, 0, 1, 0, 0);
        ax.clearRect(0, 0, this.rimAC.width, this.rimAC.height);
        ax.drawImage(this.rimLightC, 0, 0);
        ax.globalCompositeOperation = "destination-out";
        ax.drawImage(this.maskC, -lox * R, -loy * R);
        ax.globalCompositeOperation = "source-over";
        // тёмная кромка напротив = маска МИНУС маска, сдвинутая к курсору
        const bx = this.rimBX;
        bx.setTransform(1, 0, 0, 1, 0, 0);
        bx.clearRect(0, 0, this.rimBC.width, this.rimBC.height);
        bx.drawImage(this.rimDarkC, 0, 0);
        bx.globalCompositeOperation = "destination-out";
        bx.drawImage(this.maskC, lox * R, (loy + 1) * R);
        bx.globalCompositeOperation = "source-over";
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.5 * rimAmt;
        ctx.drawImage(this.rimAC, -hs, -hs, this.size, this.size);
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.32 * rimAmt;
        ctx.drawImage(this.rimBC, -hs, -hs, this.size, this.size);
        ctx.restore();
      }
    }
    this.drawChipOverlay(hs);
    ctx.drawImage(this.foamC, -hs, -hs, this.size, this.size);
    // сияние свежей полировки (тает со временем)
    if (this.gleamC && (this.phase === "work" || this.phase === "replay")) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.75;
      ctx.drawImage(this.gleamC, -hs, -hs, this.size, this.size);
      ctx.restore();
    }
    // объём: внутренняя тень + верхний свет по силуэту (тонко, без «призрачности»)
    if (this.edgeShadeC) {
      ctx.globalAlpha = 0.32;
      ctx.drawImage(this.edgeShadeC, -hs, -hs, this.size, this.size);
      ctx.globalAlpha = 1;
    }
    if (this.glossC) {
      ctx.globalAlpha = 0.26;
      ctx.drawImage(this.glossC, -hs, -hs, this.size, this.size);
      ctx.globalAlpha = 1;
    }
    // РАСКАЛЁННЫЕ СЛЕДЫ ЛАЗЕРА (остывают за полсекунды) — в координатах предмета
    if (this.heatC && (this.phase === "work" || this.phase === "replay")) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.65;
      ctx.drawImage(this.heatC, -hs, -hs, this.size, this.size);
      ctx.restore();
    }
    // ВОДЯНЫЕ РАЗВОДЫ после дворника (сохнут на глазах) — только во время работы,
    // на чистом предмете результата их быть не должно
    if (this.streakC && (this.phase === "work" || this.phase === "replay")) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.09;
      ctx.drawImage(this.streakC, -hs, -hs, this.size, this.size);
      ctx.restore();
    }
    // ТРЕЩИНЫ на хрупкой эмали (необратимы — напоминание об аккуратности)
    if (this.crackC && this.phase !== "catalog") {
      ctx.drawImage(this.crackC, -hs, -hs, this.size, this.size);
    }
    // ВЕЧНЫЙ БЛЕСК ОТПОЛИРОВАННЫХ ЗОН: блик живёт только там, где ты уже почистил,
    // и перекатывается вслед за рукой. Нечищеное — матовое, чищеное — играет светом.
    if (this.phase !== "catalog" && this.specX && this.polishC) {
      const sx2 = this.specX;
      const R = this.dpr;
      sx2.setTransform(1, 0, 0, 1, 0, 0);
      sx2.clearRect(0, 0, this.specC!.width, this.specC!.height);
      sx2.setTransform(R, 0, 0, R, 0, 0);
      const lx = hs - this.tiltX * this.S * 0.5;
      const ly = hs - this.tiltY * this.S * 0.42 - this.S * 0.18;
      const lr = this.S * 0.5;
      const spec = sx2.createRadialGradient(lx, ly, 0, lx, ly, lr);
      spec.addColorStop(0, "rgba(255,253,240,0.4)");
      spec.addColorStop(0.5, "rgba(255,251,230,0.1)");
      spec.addColorStop(1, "rgba(255,251,230,0)");
      sx2.fillStyle = spec;
      sx2.fillRect(0, 0, this.size, this.size);
      // блик остаётся ТОЛЬКО на отполированных зонах
      sx2.setTransform(1, 0, 0, 1, 0, 0);
      sx2.globalCompositeOperation = "destination-in";
      sx2.drawImage(this.polishC, 0, 0);
      sx2.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.3;
      ctx.drawImage(this.specC!, -hs, -hs, this.size, this.size);
      ctx.restore();
    }
    ctx.restore(); // конец покачивания предмета
    if (this.wetT > 0) {
      // мокрый блеск — только по силуэту предмета, не затрагивая коврик
      const wx = this.rimBX;
      const R = this.dpr;
      wx.setTransform(1, 0, 0, 1, 0, 0);
      wx.clearRect(0, 0, this.rimBC.width, this.rimBC.height);
      wx.setTransform(R, 0, 0, R, 0, 0);
      const g = wx.createLinearGradient(0, 0, this.size, this.size);
      g.addColorStop(0, "rgba(190,230,255,0)");
      g.addColorStop(0.5, "rgba(230,248,255,1)");
      g.addColorStop(1, "rgba(190,230,255,0)");
      wx.fillStyle = g;
      wx.fillRect(0, 0, this.size, this.size);
      wx.setTransform(1, 0, 0, 1, 0, 0);
      wx.globalCompositeOperation = "destination-in";
      wx.drawImage(this.maskC, 0, 0);
      wx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.globalAlpha = this.wetT * 0.2;
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(this.rimBC, -hs, -hs, this.size, this.size);
      ctx.restore();
    }
    // фаза 2: подсказки смыва + дворник за пальцем
    if (this.phase === "work" && this.tool === 3 && this.foamPhase === 2) {
      const S = this.S;
      const nudge = this.swipeNudge > 0;
      // двунаправленные шевроны: стирать можно В ЛЮБУЮ сторону
      const t01 = (this.time * 1.4) % 1;
      for (let k = 0; k < 3; k++) {
        const alpha = Math.sin(((t01 + k / 3) % 1) * Math.PI);
        ctx.strokeStyle = nudge ? `rgba(224,60,40,${0.85 * alpha})` : `rgba(30,147,221,${0.85 * alpha})`;
        ctx.lineWidth = 0.035 * S;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        // вправо (верхний ряд)
        const pr = -0.42 * S + ((t01 + k / 3) % 1) * 0.84 * S;
        ctx.beginPath();
        ctx.moveTo(pr - 0.05 * S, -0.16 * S - 0.07 * S);
        ctx.lineTo(pr + 0.05 * S, -0.16 * S);
        ctx.lineTo(pr - 0.05 * S, -0.16 * S + 0.07 * S);
        ctx.stroke();
        // влево (нижний ряд)
        const pl = 0.42 * S - ((t01 + k / 3) % 1) * 0.84 * S;
        ctx.beginPath();
        ctx.moveTo(pl + 0.05 * S, 0.16 * S - 0.07 * S);
        ctx.lineTo(pl - 0.05 * S, 0.16 * S);
        ctx.lineTo(pl + 0.05 * S, 0.16 * S + 0.07 * S);
        ctx.stroke();
      }
      ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      // надпись
      const jx = nudge ? (Math.random() - 0.5) * 6 * this.swipeNudge : 0;
      ctx.font = `900 ${0.105 * S}px "Balsamiq Sans", cursive`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 0.028 * S;
      ctx.strokeStyle = "#fffdf5";
      ctx.strokeText(nudge ? "ВЕДИ ДАЛЬШЕ!" : "СТИРАЙ В ЛЮБУЮ СТОРОНУ", jx, -0.55 * S);
      ctx.fillStyle = nudge ? "#e03c28" : "#1e93dd";
      ctx.fillText(nudge ? "ВЕДИ ДАЛЬШЕ!" : "СТИРАЙ В ЛЮБУЮ СТОРОНУ", jx, -0.55 * S);
      // дворник под курсором, пока ведёшь
      if (this.pointer.down) {
        const lx = this.pointer.lx, ly = this.pointer.ly;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(0.35);
        ctx.fillStyle = "#5b3b1e";
        rrPath(ctx, -0.028 * S - 2, -0.13 * S - 2, 0.056 * S + 4, 0.11 * S + 4, 8);
        ctx.fill();
        ctx.fillStyle = "#ffc63d";
        rrPath(ctx, -0.028 * S, -0.13 * S, 0.056 * S, 0.11 * S, 7);
        ctx.fill();
        ctx.fillStyle = "#5b3b1e";
        rrPath(ctx, -0.1 * S - 2, -0.016 * S - 2, 0.2 * S + 4, 0.05 * S + 4, 8);
        ctx.fill();
        ctx.fillStyle = "#7fdcff";
        rrPath(ctx, -0.1 * S, -0.016 * S, 0.2 * S, 0.032 * S, 6);
        ctx.fill();
        ctx.fillStyle = "#38b6ff";
        rrPath(ctx, -0.1 * S, 0.012 * S, 0.2 * S, 0.02 * S, 5);
        ctx.fill();
        ctx.restore();
      }
    }
    // частицы
    for (const p of this.particles) {
      const k = 1 - p.life / p.ttl;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(k * 1.4, 0, 1);
      if (p.kind === "shard") {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "#8a5510";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-p.size, p.size * 0.7);
        ctx.lineTo(p.size * 0.8, p.size * 0.4);
        ctx.lineTo(p.size * 0.2, -p.size * 0.9);
        ctx.lineTo(-p.size * 0.4, -p.size * 0.3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // блик на осколке
        ctx.fillStyle = "rgba(255,240,190,0.8)";
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.5, p.size * 0.3);
        ctx.lineTo(-p.size * 0.1, -p.size * 0.4);
        ctx.lineTo(p.size * 0.1, p.size * 0.1);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.globalCompositeOperation = "lighter";
        // трейл от предыдущей позиции
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.9;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.px - p.x, p.py - p.y);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = "butt";
      } else if (p.kind === "bubble") {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === "drop") {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === "pixel") {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.kind === "smoke") {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = k * 0.4;
        ctx.beginPath(); ctx.arc(0, 0, p.size * (0.6 + p.life * 1.8), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === "star") {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        const s = p.size * (0.6 + 0.4 * Math.sin(p.life * 14));
        ctx.beginPath();
        ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
        ctx.moveTo(0, -s); ctx.lineTo(0, s);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = k * 0.5;
        ctx.beginPath(); ctx.arc(0, 0, p.size * (1.4 - k * 0.4), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (this.phase === "scan") this.drawScan();
    if (this.phase === "work" && !this.paused) this.drawGesture();
    if ((this.phase === "work" || this.phase === "replay") && this.pointer.inside && !this.paused) this.drawTools();
    // летящие очки и похвалы
    for (const p of this.popups) {
      const k = p.life / p.ttl;
      const popIn = Math.min(1, p.life * 9);
      const alpha = k < 0.12 ? k / 0.12 : 1 - Math.max(0, (k - 0.6) / 0.4);
      ctx.save();
      ctx.translate(p.x, p.y - p.life * 52);
      ctx.rotate(Math.sin(p.life * 6) * 0.06);
      ctx.scale(0.7 + 0.3 * popIn, 0.7 + 0.3 * popIn);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.font = `900 ${(p.big ? 0.13 : 0.075) * this.S}px "Balsamiq Sans", cursive`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = (p.big ? 0.03 : 0.018) * this.S;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#fffdf5";
      ctx.strokeText(p.txt, 0, 0);
      ctx.fillStyle = p.col;
      ctx.fillText(p.txt, 0, 0);
      ctx.restore();
    }
    // большой штамп «слой готов»
    if (this.layerStamp) {
      const t = this.layerStamp.t;
      const aIn = Math.min(1, t * 5);
      const aOut = t > 0.95 ? clamp((1.35 - t) / 0.4, 0, 1) : 1;
      const scl = 1 + (1 - aIn) * 1.4;
      ctx.save();
      ctx.rotate(-0.1);
      ctx.scale(scl, scl);
      ctx.globalAlpha = aIn * aOut;
      ctx.font = `900 ${0.15 * this.S}px "Balsamiq Sans", cursive`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 0.035 * this.S;
      ctx.strokeStyle = "#fffdf5";
      ctx.strokeText(this.layerStamp.txt, 0, 0);
      ctx.fillStyle = this.layerStamp.col;
      ctx.fillText(this.layerStamp.txt, 0, 0);
      ctx.restore();
    }
    // штамп PRISTINE
    if (this.stampT >= 0 && this.stampT < 1.5) {
      const k = clamp(this.stampT * 3.2, 0, 1);
      const alpha = this.stampT > 1.05 ? clamp((1.5 - this.stampT) / 0.45, 0, 1) : 1;
      ctx.save();
      ctx.rotate(-0.13);
      const fs = this.S * 0.16 * (1 + (1 - k) * 1.7);
      ctx.font = `700 ${fs}px "Balsamiq Sans", cursive`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 26;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#e8a413";
      ctx.lineWidth = fs * 0.06;
      ctx.strokeText("БЛЕСК!", 0, -this.S * 0.02);
      ctx.fillText("БЛЕСК!", 0, -this.S * 0.02);
      ctx.restore();
    }
    ctx.restore();
    if ((this.heat > 0.5 && this.tool === 2 && this.phase === "work") || this.heatFlash > 0) {
      const a = Math.max(this.heatFlash * 0.4, this.heat > 0.5 ? (this.heat - 0.5) * 0.4 : 0);
      const g = ctx.createRadialGradient(this.cx, this.cy, Math.min(this.W, this.H) * 0.25, this.cx, this.cy, Math.max(this.W, this.H) * 0.7);
      g.addColorStop(0, "rgba(255,122,89,0)");
      g.addColorStop(1, `rgba(255,122,89,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  drawScan() {
    const { ctx } = this;
    const S = this.S, t = this.scanT;
    const hs = this.size / 2;
    const k = clamp((t - 0.38) / 0.85, 0, 1);
    if (k > 0 && k < 1) {
      const y = lerp(-hs * 0.92, hs * 0.92, k);
      const g = ctx.createLinearGradient(0, y - 26, 0, y + 26);
      g.addColorStop(0, "rgba(56,182,255,0)");
      g.addColorStop(0.5, "rgba(56,182,255,0.4)");
      g.addColorStop(1, "rgba(56,182,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-hs, y - 26, this.size, 52);
      ctx.strokeStyle = "rgba(56,182,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-hs * 0.95, y); ctx.lineTo(hs * 0.95, y); ctx.stroke();
    }
    const labels: [string, string, string, string][] = [
      ["1", "ЛИПУЧКА", "ДЕРЖИ И ВЕДИ СКРЕБКОМ", "#e08f2a"],
      ["2", "РЖАВЫЕ ПЯТНА", "ВЕДИ ЛАЗЕРОМ", "#e05a39"],
      ["3", "ПЫЛЬНЫЕ ЗАЙЦЫ", "ПЕНА + СВАЙП", "#1e93dd"],
    ];
    const baseX = S * 0.72;
    labels.forEach((l, i) => {
      const a = clamp((t - 0.45 - i * 0.22) / 0.25, 0, 1);
      if (a <= 0) return;
      const y = -S * 0.42 + i * S * 0.42;
      ctx.globalAlpha = a;
      ctx.strokeStyle = "rgba(91,59,30,0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(-S * 0.1 + i * S * 0.08, y);
      ctx.lineTo(baseX - 12, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COCOA;
      ctx.beginPath(); ctx.arc(baseX - 12, y, 3, 0, Math.PI * 2); ctx.fill();
      // кружок с номером
      ctx.fillStyle = l[3];
      ctx.beginPath(); ctx.arc(baseX + 2, y - 6, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COCOA; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(baseX + 2, y - 6, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = '900 12px "Nunito", sans-serif';
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(l[0], baseX + 2, y - 5);
      ctx.fillStyle = COCOA;
      ctx.font = '700 14px "Balsamiq Sans", cursive';
      ctx.textAlign = "left";
      ctx.fillText(l[1], baseX + 18, y - 6);
      ctx.fillStyle = "rgba(91,59,30,0.65)";
      ctx.font = '700 10px "Nunito", sans-serif';
      ctx.fillText(l[2], baseX + 18, y + 8);
      ctx.globalAlpha = 1;
    });
    if (Math.floor(t * 4) % 2 === 0) {
      ctx.fillStyle = "#1e93dd";
      ctx.font = '900 12px "Nunito", sans-serif';
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText("СМОТРИМ, ЧТО ТУТ НАЛИПЛО…", 0, hs + 24);
    }
    // ОСОБЕННОСТИ этой реликвии — сразу понятно, что за головоломка
    const dc = this.dirtConfig();
    const traits: [string, string][] = [];
    if ((dc.oxide?.fragile ?? 0) > 0) traits.push([`ХРУПКАЯ ЭМАЛЬ ×${dc.oxide!.fragile}`, "#4a7bd8"]);
    if ((dc.secrets ?? 0) > 0) traits.push(["ГДЕ-ТО СПРЯТАН СЕКРЕТ", "#9b6bff"]);
    if ((dc.oxide?.window ?? 1) < 0.9) traits.push(["НУЖЕН ТОЧНЫЙ ЛАЗЕР", "#e05a39"]);
    if ((dc.grease?.amount ?? 1) >= 1.25) traits.push(["СИЛЬНЫЙ НАЛЁТ — ПЕНА", "#1e93dd"]);
    if ((dc.resin?.grid ?? 7) >= 8) traits.push(["ТОЛСТАЯ КОРОСТА", "#e08f2a"]);
    const ta = clamp((t - 1.0) / 0.3, 0, 1);
    if (ta > 0 && traits.length > 0) {
      ctx.globalAlpha = ta;
      ctx.font = '900 11px "Nunito", sans-serif';
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      const totalW = traits.reduce((w, tr) => w + ctx.measureText(tr[0]).width + 34, 0) - 12;
      let tx = -totalW / 2;
      traits.forEach((tr) => {
        const w = ctx.measureText(tr[0]).width + 22;
        ctx.fillStyle = "rgba(255,253,245,0.92)";
        rrTool(ctx, tx, hs + 32, w, 22, 11);
        ctx.fill();
        ctx.strokeStyle = tr[1]; ctx.lineWidth = 2;
        rrTool(ctx, tx, hs + 32, w, 22, 11);
        ctx.stroke();
        ctx.fillStyle = tr[1];
        ctx.fillText(tr[0], tx + w / 2, hs + 47);
        tx += w + 12;
      });
      ctx.globalAlpha = 1;
    }
  }

  drawGesture() {
    const { ctx } = this;
    const bx = -this.size / 2 + 40, by = -this.size / 2 + 40;
    const bob = Math.sin(this.time * 3.4) * 4;
    ctx.save();
    ctx.translate(bx, by + bob);
    // подложка
    ctx.fillStyle = COCOA;
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffdf5";
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    if (this.tool === 1) {
      // наведи и держи: заполняющееся кольцо
      ctx.strokeStyle = "rgba(224,143,42,0.25)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#e08f2a";
      ctx.beginPath(); ctx.arc(0, 0, 11, -Math.PI / 2, -Math.PI / 2 + (this.time % 1) * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#e08f2a";
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (this.tool === 2) {
      ctx.strokeStyle = "#e05a39";
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -this.time * 30;
      ctx.beginPath();
      ctx.moveTo(-13, 8);
      ctx.quadraticCurveTo(0, -14, 13, 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#e05a39";
      ctx.beginPath();
      ctx.moveTo(17, 8); ctx.lineTo(9, 10); ctx.lineTo(13, 2);
      ctx.closePath(); ctx.fill();
    } else if (this.foamPhase === 1) {
      ctx.strokeStyle = "#1e93dd";
      ctx.rotate(this.time * 2);
      ctx.beginPath(); ctx.arc(0, 0, 12, -0.5, Math.PI * 1.4); ctx.stroke();
      ctx.fillStyle = "#1e93dd";
      const ea = Math.PI * 1.4;
      ctx.save();
      ctx.translate(Math.cos(ea) * 12, Math.sin(ea) * 12);
      ctx.rotate(ea + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(6, 0); ctx.lineTo(-3, -5); ctx.lineTo(-3, 5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      // двунаправленная стрелка: стирать можно в любую сторону
      const off = Math.sin(this.time * 4) * 4;
      ctx.strokeStyle = "#1e93dd";
      ctx.beginPath();
      ctx.moveTo(-12 + off, 0); ctx.lineTo(12 + off, 0);
      ctx.stroke();
      ctx.fillStyle = "#1e93dd";
      ctx.beginPath();
      ctx.moveTo(17 + off, 0); ctx.lineTo(8 + off, -6); ctx.lineTo(8 + off, 6);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-17 + off, 0); ctx.lineTo(-8 + off, -6); ctx.lineTo(-8 + off, 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= НОВЫЕ ИНСТРУМЕНТЫ (объёмные, в кадре) ================= */
  drawTools() {
    const { ctx } = this;
    if (this.phase === "replay") return;
    const px = this.pointer.lx, py = this.pointer.ly;
    ctx.save();
    ctx.translate(px, py);
    if (this.tool === 1) this.drawChisel();
    else if (this.tool === 2) this.drawLaserGun();
    else if (this.foamPhase === 1) this.drawSponge();
    else this.drawSqueegeeCursor();
    ctx.restore();
  }

  /** Стамеска-скребок: пухлая деревянная ручка, латунная обойма, блестящее жало. */
  private drawChisel() {
    const { ctx } = this;
    const holding = this.pointer.down;
    const vib = holding && this.chipPoly ? 1 : 0;
    const vx = vib ? (Math.random() - 0.5) * 3.4 : 0;
    const vy = vib ? (Math.random() - 0.5) * 3.4 : 0;
    const jab = this.toolJab * 7;
    ctx.save();
    ctx.translate(vx, vy + jab);
    ctx.rotate(-0.55 + this.toolLean);
    const sq = 1 - this.toolJab * 0.14;
    ctx.scale(1, sq);
    // тень
    ctx.fillStyle = "rgba(90,58,20,0.28)";
    ctx.beginPath(); ctx.ellipse(4, 5, 17, 7, 0.5, 0, Math.PI * 2); ctx.fill();
    // стальное жало (крупное, с градиентом)
    const steel = ctx.createLinearGradient(-10, 0, 10, 0);
    steel.addColorStop(0, "#f4f7fb"); steel.addColorStop(0.45, "#c3cbd8"); steel.addColorStop(1, "#8b95a5");
    ctx.fillStyle = steel;
    ctx.strokeStyle = COCOA;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-9, -30); ctx.lineTo(9, -30); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // блик на жале
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(-5, -26); ctx.lineTo(-2, -26); ctx.closePath(); ctx.fill();
    // режущая кромка
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3.6, -11); ctx.lineTo(3.6, -11); ctx.closePath(); ctx.fill();
    // латунная обойма
    ctx.fillStyle = lin(ctx, -10, 0, 10, 0, [[0, "#ffe1a0"], [0.5, "#e8a413"], [1, "#b06f14"]]);
    rrTool(ctx, -10, -40, 20, 11, 4);
    ctx.fill();
    ctx.strokeStyle = COCOA; ctx.lineWidth = 2;
    rrTool(ctx, -10, -40, 20, 11, 4);
    ctx.stroke();
    // деревянная ручка с кольцами-упорами
    const wood = lin(ctx, -11, 0, 11, 0, [[0, "#f2b566"], [0.45, "#dd9440"], [1, "#b06f24"]]);
    ctx.fillStyle = wood;
    rrTool(ctx, -11, -78, 22, 40, 10);
    ctx.fill();
    ctx.strokeStyle = COCOA; ctx.lineWidth = 2.2;
    rrTool(ctx, -11, -78, 22, 40, 10);
    ctx.stroke();
    // кольца
    ctx.strokeStyle = "rgba(120,70,20,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-11, -68); ctx.lineTo(11, -68); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -48); ctx.lineTo(11, -48); ctx.stroke();
    // блик
    ctx.fillStyle = "rgba(255,240,200,0.65)";
    rrTool(ctx, -7, -74, 5, 32, 2.5);
    ctx.fill();
    ctx.restore();
    // искорка на кончике при работе
    if (vib) {
      ctx.fillStyle = "#fff3c4";
      star4(ctx, 0, -2, 5 + Math.random() * 3);
      ctx.fill();
    }
    // кольцо прогресса откалывания
    if (this.chipPoly && holding) {
      const c = clamp(this.chipPoly.chip, 0, 1);
      ctx.strokeStyle = "rgba(91,59,30,0.25)";
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#e08f2a";
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + c * Math.PI * 2); ctx.stroke();
      ctx.lineCap = "butt";
    }
  }

  /** Лазерный пистолет: игрушечный бластер с плавниками, бегущим энергетическим лучом и лампой-индикатором. */
  private drawLaserGun() {
    const { ctx } = this;
    const { vMin, vMax } = this.laserWindow();
    const perfect = this.laserDown && this.vSmooth >= vMin && this.vSmooth <= vMax;
    const tooFast = this.laserDown && this.vSmooth > vMax;
    const nozzle = { x: 34, y: -52 };
    // ---- луч от сопла к точке контакта ----
    if (this.laserDown && !this.overheated) {
      const beamCol = perfect ? "255,198,61" : tooFast ? "178,184,196" : "255,122,89";
      // внешнее свечение
      ctx.strokeStyle = `rgba(${beamCol},0.22)`;
      ctx.lineWidth = 11; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(nozzle.x, nozzle.y); ctx.lineTo(0, 0); ctx.stroke();
      // ядро
      const grad = ctx.createLinearGradient(nozzle.x, nozzle.y, 0, 0);
      grad.addColorStop(0, `rgba(${beamCol},0.5)`);
      grad.addColorStop(1, `rgba(${beamCol},1)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = perfect ? 4.5 : 3;
      ctx.beginPath(); ctx.moveTo(nozzle.x, nozzle.y); ctx.lineTo(0, 0); ctx.stroke();
      // бегущие «заряды» вдоль луча
      const dx = -nozzle.x, dy = -nozzle.y;
      const len = Math.hypot(dx, dy);
      for (let k = 0; k < 3; k++) {
        const ph = ((this.time * 2.2) + k / 3) % 1;
        const gx = nozzle.x + dx * ph, gy = nozzle.y + dy * ph;
        ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - Math.abs(ph - 0.5) * 1.4)})`;
        ctx.beginPath(); ctx.arc(gx, gy, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineCap = "butt";
      // звезда в точке контакта + расходящиеся кольца
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, perfect ? 24 : 14);
      cg.addColorStop(0, "rgba(255,255,255,0.95)");
      cg.addColorStop(0.35, `rgba(${beamCol},0.7)`);
      cg.addColorStop(1, `rgba(${beamCol},0)`);
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, 0, perfect ? 24 : 14, 0, Math.PI * 2); ctx.fill();
      const rr2 = ((this.time * 1.6) % 1);
      ctx.strokeStyle = `rgba(${beamCol},${0.6 * (1 - rr2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 6 + rr2 * 24, 0, Math.PI * 2); ctx.stroke();
    }
    // ---- корпус-бластер ----
    ctx.save();
    ctx.translate(nozzle.x, nozzle.y);
    ctx.rotate(0.55);
    ctx.fillStyle = "rgba(90,58,20,0.26)";
    ctx.beginPath(); ctx.ellipse(3, 8, 20, 8, 0.4, 0, Math.PI * 2); ctx.fill();
    // плавники сверху
    ctx.fillStyle = "#b03a1e";
    ctx.strokeStyle = COCOA; ctx.lineWidth = 2;
    rrTool(ctx, -14, -34, 7, 14, 3); ctx.fill(); ctx.stroke();
    rrTool(ctx, -3, -37, 7, 17, 3); ctx.fill(); ctx.stroke();
    rrTool(ctx, 8, -34, 7, 14, 3); ctx.fill(); ctx.stroke();
    // тело
    const body = lin(ctx, 0, -16, 0, 16, [[0, "#ffb37e"], [0.45, "#f0603c"], [1, "#c23f1f"]]);
    ctx.fillStyle = body;
    ctx.lineWidth = 2.4;
    rrTool(ctx, -12, -30, 24, 52, 10);
    ctx.fill(); ctx.stroke();
    // блик
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    rrTool(ctx, -8, -26, 6, 44, 3);
    ctx.fill();
    // сопло
    ctx.fillStyle = lin(ctx, -8, 0, 8, 0, [[0, "#e8ecf2"], [0.5, "#b8c0cc"], [1, "#8d97a5"]]);
    rrTool(ctx, -8, 20, 16, 12, 4);
    ctx.fill(); ctx.stroke();
    // кончик сопла светится
    ctx.fillStyle = this.laserDown && !this.overheated ? "#ffe9a8" : "#5c6572";
    rrTool(ctx, -5, 30, 10, 5, 2);
    ctx.fill();
    // лампа-индикатор
    const lamp = perfect ? "#2fc98a" : this.overheated ? "#8d97a5" : tooFast ? "#c9c2b2" : "#ffc63d";
    ctx.fillStyle = lamp;
    ctx.beginPath(); ctx.arc(0, -16, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COCOA; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, -16, 6, 0, Math.PI * 2); ctx.stroke();
    if (perfect) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.time * 10);
      ctx.fillStyle = "#2fc98a";
      ctx.beginPath(); ctx.arc(0, -16, 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // ---- дуга-спидометр ----
    const frac = clamp(this.vSmooth / (vMax * 1.12), 0, 1);
    const fMin = vMin / (vMax * 1.12), fMax = vMax / (vMax * 1.12);
    const R0 = 36;
    const zone = (a0: number, a1: number, col: string) => {
      ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(0, 0, R0, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI); ctx.stroke();
      ctx.lineCap = "butt";
    };
    ctx.globalAlpha = 0.9;
    zone(0, fMin, "#ff7a59"); zone(fMin, fMax, "#2fc98a"); zone(fMax, 1, "#c9c2b2");
    ctx.globalAlpha = 1;
    const na = Math.PI + frac * Math.PI;
    ctx.strokeStyle = COCOA; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(na) * (R0 - 9), Math.sin(na) * (R0 - 9));
    ctx.lineTo(Math.cos(na) * (R0 + 9), Math.sin(na) * (R0 + 9));
    ctx.stroke();
    if (this.overheated) {
      ctx.font = '900 12px "Nunito", sans-serif';
      ctx.fillStyle = "#e05a39"; ctx.textAlign = "center";
      ctx.fillText("ПШ-Ш-Ш…", 0, 56);
    }
  }

  /** Губка для пены: пухлая, с мордочкой и пузырями; сжимается от интенсивности кругов. */
  private drawSponge() {
    const { ctx } = this;
    const sq = this.spongeSquish;
    const wob = this.pointer.down ? 1 : 0.25;
    // пузырьки вокруг
    for (let k = 0; k < 4; k++) {
      const a = this.time * 2.5 + k * 1.6;
      const bx = Math.cos(a) * 30, by = -8 + Math.sin(a * 1.7) * 14 - ((this.time * 14 + k * 9) % 26);
      const br = 3 + (k % 3);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(150,190,235,0.7)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath(); ctx.arc(bx - br * 0.3, by - br * 0.35, br * 0.28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.scale(1 + sq * 0.28, 1 - sq * 0.32);
    ctx.rotate(Math.sin(this.time * 8) * 0.07 * wob);
    ctx.fillStyle = "rgba(90,58,20,0.26)";
    ctx.beginPath(); ctx.ellipse(4, 18, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    // зелёный абразив снизу (рисуем первым, он выглядывает)
    ctx.fillStyle = lin(ctx, 0, 6, 0, 16, [[0, "#5fe3a8"], [1, "#23a874"]]);
    rrTool(ctx, -25, 5, 50, 11, 5);
    ctx.fill();
    ctx.strokeStyle = COCOA; ctx.lineWidth = 2;
    rrTool(ctx, -25, 5, 50, 11, 5);
    ctx.stroke();
    // жёлтое тело
    const body = lin(ctx, 0, -20, 0, 8, [[0, "#ffe9a8"], [0.55, "#ffd35c"], [1, "#eda92b"]]);
    ctx.fillStyle = body;
    ctx.lineWidth = 2.4;
    rrTool(ctx, -25, -18, 50, 28, 11);
    ctx.fill(); ctx.stroke();
    // блик сверху
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    rrTool(ctx, -20, -15, 40, 6, 3);
    ctx.fill();
    // поры
    ctx.fillStyle = "rgba(190,130,30,0.45)";
    for (const [hx, hy, hr] of [[-15, -4, 2.6], [-4, -8, 2.2], [8, -3, 2.8], [17, -7, 2], [-9, 2, 2], [4, 3, 2.4], [15, 2, 2]]) {
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
    }
    // мордочка
    const lookX = clamp(this.pointer.lx * 0.01, -2.5, 2.5);
    ctx.fillStyle = "#5b3b1e";
    ctx.beginPath(); ctx.arc(-8 + lookX, -5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8 + lookX, -5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-7.2 + lookX, -5.8, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.8 + lookX, -5.8, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5b3b1e"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0 + lookX, -1, 5.5, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
    // стрелка «крути»
    ctx.strokeStyle = "rgba(30,147,221,0.75)";
    ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 0, 34, this.time * 2.4, this.time * 2.4 + 2.2); ctx.stroke();
    const ea = this.time * 2.4 + 2.2;
    ctx.save();
    ctx.translate(Math.cos(ea) * 34, Math.sin(ea) * 34);
    ctx.rotate(ea + Math.PI / 2);
    ctx.fillStyle = "#1e93dd";
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.lineCap = "butt";
  }

  /** Дворник под пальцем в фазе смыва (следит за направлением движения). */
  private drawSqueegeeCursor() {
    const { ctx } = this;
    let ang = 0;
    if (this.pointer.down && this.wipeLast) {
      const dx = this.pointer.x - this.wipeLast.x, dy = this.pointer.y - this.wipeLast.y;
      if (Math.hypot(dx, dy) > 2) ang = Math.atan2(dy, dx);
    }
    ctx.save();
    ctx.rotate(ang);
    this.drawSqueegeeShape(1);
    ctx.restore();
  }

  /** Дворник: жёлтая T-ручка, стальной зажим и широкая резиновая кромка с мокрым блеском. */
  private drawSqueegeeShape(scale: number) {
    const { ctx } = this;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "rgba(90,58,20,0.24)";
    ctx.beginPath(); ctx.ellipse(4, 14, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
    // ручка
    const handle = lin(ctx, -7, 0, 7, 0, [[0, "#ffe27a"], [0.5, "#ffc63d"], [1, "#e09a1e"]]);
    ctx.fillStyle = handle;
    ctx.strokeStyle = COCOA;
    ctx.lineWidth = 2.2;
    rrTool(ctx, -7, -46, 14, 36, 7);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    rrTool(ctx, -4, -42, 4, 28, 2);
    ctx.fill();
    // стальной зажим
    ctx.fillStyle = lin(ctx, 0, -12, 0, 0, [[0, "#e8ecf2"], [1, "#9aa4b2"]]);
    rrTool(ctx, -27, -12, 54, 11, 5);
    ctx.fill(); ctx.stroke();
    // резиновая кромка (гнётся)
    const flex = Math.sin(this.time * 9) * 2.5;
    const rub = lin(ctx, 0, -2, 0, 9, [[0, "#63c8ff"], [1, "#2b8fd6"]]);
    ctx.fillStyle = rub;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, -1);
    ctx.quadraticCurveTo(0, 8 + flex, 32, -1);
    ctx.lineTo(32, 6);
    ctx.quadraticCurveTo(0, 15 + flex, -32, 6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // мокрый блеск резинки
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-26, 2.5);
    ctx.quadraticCurveTo(0, 10 + flex, 26, 2.5);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
  }

  drawCursor() {
    const { ctx } = this;
    const px = this.pointer.lx, py = this.pointer.ly;
    ctx.save();
    ctx.translate(px, py);
    if (this.tool === 1) {
      const s = 1 + this.tapPulse * (this.tapPulseGray ? 0.15 : 0.4);
      ctx.scale(s, s);
      ctx.rotate(-0.65);
      ctx.fillStyle = COCOA;
      ctx.beginPath();
      ctx.moveTo(0, 2); ctx.lineTo(-5.5, -14); ctx.lineTo(5.5, -14);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#c8ccd6";
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-4, -13); ctx.lineTo(4, -13);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffc63d";
      ctx.strokeStyle = COCOA;
      ctx.lineWidth = 1.6;
      ctx.fillRect(-4.5, -27, 9, 13);
      ctx.strokeRect(-4.5, -27, 9, 13);
      ctx.rotate(0.65);
      // кольцо прогресса откалывания
      if (this.chipPoly && this.pointer.down) {
        const c = clamp(this.chipPoly.chip, 0, 1);
        ctx.strokeStyle = "rgba(91,59,30,0.3)";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#e08f2a";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + c * Math.PI * 2); ctx.stroke();
        ctx.lineCap = "butt";
      } else {
        ctx.strokeStyle = "rgba(91,59,30,0.45)";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (this.tool === 2) {
      const { vMin, vMax } = this.laserWindow();
      const frac = clamp(this.vSmooth / (vMax * 1.12), 0, 1);
      const fMin = vMin / (vMax * 1.12), fMax = vMax / (vMax * 1.12);
      const R0 = 26;
      const zone = (a0: number, a1: number, col: string) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, R0, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI);
        ctx.stroke();
        ctx.lineCap = "butt";
      };
      ctx.globalAlpha = 0.9;
      zone(0, fMin, "#ff7a59");
      zone(fMin, fMax, "#2fc98a");
      zone(fMax, 1, "#c9c2b2");
      ctx.globalAlpha = 1;
      const na = Math.PI + frac * Math.PI;
      ctx.strokeStyle = COCOA;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(na) * (R0 - 7), Math.sin(na) * (R0 - 7));
      ctx.lineTo(Math.cos(na) * (R0 + 7), Math.sin(na) * (R0 + 7));
      ctx.stroke();
      if (this.overheated) {
        ctx.strokeStyle = "#e05a39";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
        ctx.moveTo(8, -8); ctx.lineTo(-8, 8);
        ctx.stroke();
        ctx.lineCap = "butt";
        ctx.font = '900 10px "Nunito", sans-serif';
        ctx.fillStyle = "#e05a39";
        ctx.textAlign = "center";
        ctx.fillText("ПШ-Ш-Ш…", 0, 44);
      } else {
        const hot = this.laserDown && this.vSmooth >= vMin && this.vSmooth <= vMax;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, hot ? 18 : 10);
        g.addColorStop(0, hot ? "rgba(255,255,255,0.95)" : "rgba(255,198,61,0.85)");
        g.addColorStop(0.4, hot ? "rgba(255,198,61,0.75)" : "rgba(255,198,61,0.3)");
        g.addColorStop(1, "rgba(255,198,61,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, hot ? 18 : 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.heat > 0.65 ? "#ff9d5c" : "#ffd166";
        ctx.strokeStyle = COCOA;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else {
      if (this.foamPhase === 1) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#a8d8ff";
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const a = this.time * 3 + i * 2.1;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8 - 4, 5.5 - i, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        ctx.strokeStyle = "rgba(30,147,221,0.6)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(0, -2, 15, 0.4, 2.4); ctx.stroke();
        ctx.lineCap = "butt";
        ctx.font = '900 10px "Nunito", sans-serif';
        ctx.fillStyle = "#1e93dd";
        ctx.textAlign = "center";
        ctx.fillText("НАМЫЛИВАЙ!", 0, 24);
      } else if (!this.pointer.down) {
        ctx.rotate(0.35);
        ctx.fillStyle = "#ffc63d";
        ctx.strokeStyle = COCOA;
        ctx.lineWidth = 1.6;
        ctx.fillRect(-3.5, -24, 7, 21);
        ctx.strokeRect(-3.5, -24, 7, 21);
        ctx.fillStyle = "#c8ccd6";
        ctx.fillRect(-17, -3, 34, 6);
        ctx.strokeRect(-17, -3, 34, 6);
        ctx.fillStyle = "#38b6ff";
        ctx.fillRect(-17, 3, 34, 4);
        ctx.rotate(-0.35);
        const blink = Math.floor(this.time * 4) % 2 === 0;
        ctx.font = '900 11px "Nunito", sans-serif';
        ctx.fillStyle = blink ? "#2fc98a" : "#1ea76e";
        ctx.textAlign = "center";
        ctx.fillText("СТИРАЙ! ↔", 0, 28);
      }
    }
    ctx.restore();
  }

  /* ================= HUD ================= */
  private hint(): string {
    switch (this.phase) {
      case "scan": return "РАЗГЛЯДЫВАЕМ ГРЯЗЬ…";
      case "work":
        if (this.overheated) return "ПШ-Ш-Ш… ЛАЗЕР ОСТЫВАЕТ, СЕКНДОЧКУ!";
        if (this.tool === 1) {
          if (this.resinDone) return "ЛИПУЧКА ГОТОВА! БЕРИ ЛАЗЕР [2]";
          const hasSecret = (this.dirtConfig().secrets ?? 0) > 0 && this.polys.some((p) => p.alive && p.secret);
          return hasSecret
            ? "СКРЕБКИ ЛИПУЧКУ… ГОВОРЯТ, ПОД НЕЙ ЧТО-ТО СПРЯТАНО!"
            : "НАВЕДИ НА ЛИПУЧКУ И ДЕРЖИ — ОНА ОТКОВЫРНЁТСЯ!";
        }
        if (this.tool === 2) {
          const { vMin, vMax } = this.laserWindow();
          const hasFragile = this.fragile.some((f) => !f.cracked && !f.rewarded);
          if (this.oxideDone) return "РЖАВЧИНЫ БОЛЬШЕ НЕТ! ЖМИ [3] — ВРЕМЯ ПЕНЫ";
          if (this.vSmooth > vMax && this.pointer.down) return "ОЙ, СЛИШКОМ БЫСТРО! ПОМЕДЛЕННЕЕ…";
          if (this.vSmooth < vMin * 0.7 && this.pointer.down) return "МЕДЛЕННЕЕ — МЕТАЛЛ НАГРЕВАЕТСЯ!";
          if (this.heat > 0.6) return "ОСТОРОЖНО: ЛАЗЕР ТЕПЛЕЕТ!";
          return hasFragile
            ? "РОВНО И НЕ СПЕШИ! ГОЛУБАЯ ЭМАЛЬ — НЕЖНО, А ТО ТРЕСНЕТ!"
            : "ВЕДИ РОВНО И НЕ СПЕШИ — ЗЕЛЁНАЯ ЗОНА!";
        }
        return this.foamPhase === 1
          ? "ВОЗИ ГУБКОЙ ПО ПРЕДМЕТУ — НАМЫЛИВАЙ ПЕНУ!"
          : "ТЕПЕРЬ ВОЗИ ДВОРНИКОМ — СТИРАЙ ПЕНУ В ЛЮБУЮ СТОРОНУ!";
      case "snap": return "ВОТ ЭТО БЛЕСК!";
      case "replay": return "СМОТРИ, КАК ТЫ ЭТО СДЕЛАЛ!";
      case "alive": return this.artifact?.aliveHint ?? "";
      case "payout": return "ЗАКАЗ ВЫПОЛНЕН!";
      default: return "";
    }
  }

  pushHud() {
    if (!this.onHud) return;
    const resinFrac = this.polys.length ? 1 - this.polys.filter((p) => p.alive).length / this.polys.length : 0;
    const greaseFrac = this.greaseDone ? 1 : clamp((1 - this.greaseFrac) + (this.foamPhase === 1 ? this.foamFrac * 0.12 : 0), 0, 0.99);
    const clean = Math.round(100 * (0.34 * resinFrac + 0.33 * (1 - this.oxideFrac) + 0.33 * greaseFrac));
    const s: HudSnapshot = {
      phase: this.phase,
      paused: this.paused,
      muted: this.muted,
      artifactId: this.artifact?.id ?? null,
      clean: clamp(clean, 0, this.phase === "work" ? 98 : 100),
      layers: {
        resin: resinFrac,
        oxide: 1 - this.oxideFrac,
        grease: greaseFrac,
        foam: clamp(this.foamFrac / 0.94, 0, 1),
      },
      tool: this.tool,
      unlocked: [...this.unlocked] as [boolean, boolean, boolean],
      combo: this.combo,
      heat: this.heat,
      overheated: this.overheated,
      foamPhase: this.foamPhase,
      hint: this.hint(),
      credits: this.credits,
      timeStr: fmtTime(this.workT),
      replayT: this.replay ? Math.min(this.replay.t, this.replay.dur) : 0,
      replayDur: this.replay ? this.replay.dur : 0,
      hasReplay: !!this.replayUrl,
      restoredIds: Object.keys(this.restored),
      unlockedIds: this.unlockedIds(),
      payout: this.payout,
      allDone: Object.keys(this.restored).length >= ARTIFACTS.length,
    };
    this.onHud(s);
  }
}

function rrTool(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
function lin(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = k % 2 === 0 ? r : r * 0.38;
    const px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* Мини-рендер для витрины */
export function renderThumbnail(def: ArtifactDef, canvas: HTMLCanvasElement, px: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = px * dpr; canvas.height = px * dpr;
  canvas.style.width = px + "px"; canvas.style.height = px + "px";
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, px, px);
  const S = px / (def.boundsMul * 2.4);
  ctx.save();
  ctx.translate(px / 2, px / 2 + S * 0.04);
  def.draw(ctx, S, def.createAnim(), 1.2, "alive");
  ctx.restore();
}
