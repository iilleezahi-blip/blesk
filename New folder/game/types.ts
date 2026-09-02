import type { AudioEngine } from "./audio";

export type GamePhase =
  | "catalog"
  | "scan"
  | "work"
  | "snap"
  | "replay"
  | "alive"
  | "payout"
  | "complete";

export type ToolId = 1 | 2 | 3;

/** «Рецепт грязи» артефакта — делает каждую реликвию своей головоломкой. */
export interface DirtConfig {
  resin?: {
    /** плотность сетки кусков смолы (по умолчанию 7) */
    grid?: number;
    /** доля ячеек, которые остаются чистыми — 0..1 (по умолчанию 0) */
    skip?: number;
  };
  oxide?: {
    /** множитель количества ржавчины (по умолчанию 1) */
    amount?: number;
    /** сужение «окна идеальной скорости» лазера: 1 = обычно, <1 = требовательнее */
    window?: number;
    /** число хрупких эмалевых зон, которые трескаются от быстрого лазера */
    fragile?: number;
  };
  grease?: {
    /** множитель количества жира/налёта (по умолчанию 1) */
    amount?: number;
  };
  /** сколько кусков смолы прячут секрет (клеймо/камень) */
  secrets?: number;
}

export interface PointerState {
  x: number;
  y: number;
  lx: number;
  ly: number;
  down: boolean;
  inside: boolean;
}

export interface LayerHud {
  resin: number;   // 0..1 очищено
  oxide: number;
  grease: number;
  foam: number;    // покрытие пеной
}

export interface HudSnapshot {
  phase: GamePhase;
  paused: boolean;
  muted: boolean;
  artifactId: string | null;
  clean: number;          // 0..100
  layers: LayerHud;
  tool: ToolId;
  unlocked: [boolean, boolean, boolean];
  combo: number;
  heat: number;           // 0..1
  overheated: boolean;
  foamPhase: 1 | 2;
  hint: string;
  credits: number;
  timeStr: string;
  replayT: number;
  replayDur: number;
  hasReplay: boolean;
  restoredIds: string[];
  unlockedIds: string[];
  payout: PayoutInfo | null;
  allDone: boolean;
}

export interface PayoutInfo {
  rating: "S" | "A" | "B" | "C";
  base: number;
  precisionBonus: number;
  speedBonus: number;
  total: number;
  precision: number;
  timeStr: string;
}

export type PKind = "shard" | "spark" | "bubble" | "drop" | "star" | "smoke" | "dust" | "pixel";

export interface EngineApi {
  S: number;
  t: number;
  audio: AudioEngine;
  pointer: PointerState;
  spawn: (kind: PKind, x: number, y: number, n: number, color?: string) => void;
  shake: (a: number) => void;
  flash: (a: number) => void;
}

export interface ArtifactDef {
  id: string;
  name: string;
  collection: "vintage" | "nostalgia" | "treasure" | "toys" | "music" | "tech" | "sea";
  collectionLabel: string;
  materialLabel: string;
  tagline: string;
  base: number;
  par: number; // сек, цель по времени
  boundsMul: number; // полуразмер в единицах S
  aliveHint: string;
  /** Заполняет силуэт артефакта (объединение фигур) — используется как маска слоёв грязи. */
  drawMask(ctx: CanvasRenderingContext2D, S: number): void;
  createAnim(): Record<string, any>;
  update(anim: Record<string, any>, dt: number, api: EngineApi): void;
  draw(ctx: CanvasRenderingContext2D, S: number, anim: Record<string, any>, t: number, phase: GamePhase): void;
  onPointer(api: EngineApi, anim: Record<string, any>, type: "down" | "move" | "up", x: number, y: number): void;
}
