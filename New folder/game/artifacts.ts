import type { ArtifactDef } from "./types";
import { wrapAngle, clamp } from "./rng";

export const OUT = "#4a2f14";

/* ---------- градиентные помощники (экспортируются для новых коллекций) ---------- */
export function lin(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
export function rad(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
export function circ(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
/** Выпуклый диск: радиальный градиент со смещением к свету (свет слева-сверху) + тёмный обод. */
export function raisedDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hi: string, mid: string, lo: string, rim: string) {
  ctx.fillStyle = rim;
  circ(ctx, x, y, r); ctx.fill();
  ctx.fillStyle = rad(ctx, x - r * 0.35, y - r * 0.4, r * 0.05, r * 1.08, [[0, hi], [0.55, mid], [1, lo]]);
  circ(ctx, x, y, r * 0.96); ctx.fill();
}
function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s, -s * 0.45, -s * 0.5, -s * 1.1, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 1.1, s, -s * 0.45, 0, s * 0.35);
  ctx.closePath();
}
export function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const rad2 = k % 2 === 0 ? r : r * 0.38;
    const px = x + Math.cos(ang) * rad2, py = y + Math.sin(ang) * rad2;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
export function octPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
export function drawGear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, ang: number, fill: string, dark: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = fill;
  for (let i = 0; i < teeth; i++) {
    ctx.save();
    ctx.rotate((i / teeth) * Math.PI * 2);
    rr(ctx, -r * 0.16, -r * 1.22, r * 0.32, r * 0.45, r * 0.08);
    ctx.fill();
    ctx.restore();
  }
  circ(ctx, 0, 0, r); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = r * 0.14;
  circ(ctx, 0, 0, r * 0.55); ctx.stroke();
  ctx.fillStyle = dark;
  circ(ctx, 0, 0, r * 0.18); ctx.fill();
  ctx.restore();
}

const PET: number[][] = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 0, 1],
  [1, 1, 0, 0, 0, 0, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
];
const HEART: number[][] = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];

/* ================================================================
   01 — ЧАСИКИ «ТИК-ТАК»
   ================================================================ */
const watch: ArtifactDef = {
  id: "watch",
  name: "Часики «Тик-Так»",
  collection: "vintage",
  collectionLabel: "Винтаж",
  materialLabel: "золото · эмаль",
  tagline: "Стрелки уснули 60 лет назад. Разбуди их!",
  base: 130,
  par: 90,
  boundsMul: 0.78,
  aliveHint: "КРУТИ ЖЁЛТУЮ ГОЛОВКУ — ЗАВОДИ ЧАСИКИ!",
  drawMask(ctx, S) {
    circ(ctx, 0, 0, 0.52 * S); ctx.fill();
    circ(ctx, 0, -0.585 * S, 0.06 * S); ctx.fill();
    circ(ctx, 0, -0.675 * S, 0.055 * S); ctx.fill();
    ctx.fillRect(-0.03 * S, -0.62 * S, 0.06 * S, 0.08 * S);
  },
  createAnim() {
    return {
      crownA: 0, wind: 0, winding: false, lastA: 0, rachetAcc: 0,
      secA: 0, minA: 0.9, hourA: 2.2, tickAcc: 0, prevTickStep: 0, woundOnce: false, tickAcc2: 0,
    };
  },
  update(a, dt, api) {
    const S = api.S;
    if (!a.winding) a.wind = Math.max(0, a.wind - dt * 0.085);
    const spinning = a.wind > 0.03;
    if (spinning) {
      a.woundOnce = true;
      a.secA += dt * (2 + a.wind * 22);
      a.minA += dt * (0.3 + a.wind * 4);
      a.hourA += dt * (0.1 + a.wind * 1.3);
      a.tickAcc += dt * (2 + a.wind * 9);
      if (a.tickAcc > 1) { a.tickAcc = 0; api.audio.tick(); }
    } else if (a.woundOnce) {
      a.secA += dt * (Math.PI / 30);
      const step = Math.floor(a.secA / (Math.PI / 30));
      if (step !== a.prevTickStep) { a.prevTickStep = step; api.audio.tick(); }
      a.minA += dt * (Math.PI / 1800);
    }
    a.tickAcc2 += dt;
    if (a.tickAcc2 > 0.8 && a.wind > 0.02) {
      a.tickAcc2 = 0;
      const ang = Math.random() * Math.PI * 2;
      api.spawn("star", Math.cos(ang) * 0.3 * S, Math.sin(ang) * 0.3 * S, 1, "#7fdcff");
    }
  },
  draw(ctx, S, a, t, phase) {
    const alive = phase === "alive";
    const R = 0.5 * S;

    /* ---- заводная головка и ушко ---- */
    ctx.fillStyle = OUT;
    circ(ctx, 0, -0.675 * S, 0.056 * S); ctx.fill();
    ctx.strokeStyle = lin(ctx, -0.05 * S, -0.72 * S, 0.05 * S, -0.63 * S, [[0, "#ffe9a8"], [0.5, "#f2b03a"], [1, "#c97f10"]]);
    ctx.lineWidth = 0.03 * S;
    circ(ctx, 0, -0.675 * S, 0.05 * S); ctx.stroke();
    // шток
    ctx.fillStyle = OUT;
    rr(ctx, -0.036 * S, -0.595 * S, 0.072 * S, 0.08 * S, 0.012 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, -0.03 * S, 0, 0.03 * S, 0, [[0, "#ffe1a0"], [0.5, "#e8a413"], [1, "#b06f14"]]);
    rr(ctx, -0.028 * S, -0.588 * S, 0.056 * S, 0.066 * S, 0.01 * S); ctx.fill();
    // головка (ручка завода)
    ctx.save();
    ctx.translate(0, -0.555 * S);
    ctx.rotate(a.crownA);
    raisedDisc(ctx, 0, 0, 0.062 * S, "#fff0bd", "#ffc63d", "#d98d12", OUT);
    ctx.strokeStyle = "#a86a10"; ctx.lineWidth = 0.008 * S;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 0.038 * S, Math.sin(ang) * 0.038 * S);
      ctx.lineTo(Math.cos(ang) * 0.058 * S, Math.sin(ang) * 0.058 * S);
      ctx.stroke();
    }
    ctx.restore();
    if (alive && a.winding) {
      ctx.strokeStyle = "#ffc63d"; ctx.lineCap = "round"; ctx.lineWidth = 0.016 * S;
      ctx.beginPath(); ctx.arc(0, -0.555 * S, 0.095 * S, -Math.PI / 2, -Math.PI / 2 + a.wind * Math.PI * 2); ctx.stroke();
      ctx.lineCap = "butt";
    }

    /* ---- корпус: золотой диск с глубиной ---- */
    ctx.fillStyle = OUT;
    circ(ctx, 0, 0, R + 0.014 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.17 * S, -0.2 * S, 0.05 * S, R * 1.2, [[0, "#fff3c4"], [0.42, "#ffd35c"], [0.8, "#eda92b"], [1, "#b06f14"]]);
    circ(ctx, 0, 0, R); ctx.fill();
    // полированный ободок-безель: свет сверху, тень снизу
    ctx.lineWidth = 0.045 * S;
    ctx.strokeStyle = lin(ctx, 0, -R, 0, R, [[0, "#fff3c4"], [0.45, "#f2b03a"], [1, "#9c6210"]]);
    circ(ctx, 0, 0, R * 0.94); ctx.stroke();
    ctx.lineWidth = 0.012 * S;
    ctx.strokeStyle = "rgba(255,250,225,0.85)";
    ctx.beginPath(); ctx.arc(0, 0, R * 0.9, -2.6, -0.9); ctx.stroke();

    /* ---- циферблат (утоплен) ---- */
    ctx.fillStyle = OUT;
    circ(ctx, 0, 0, 0.42 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.08 * S, -0.1 * S, 0.04 * S, 0.42 * S, [[0, "#ffffff"], [0.75, "#fdf3dc"], [1, "#ecd9ae"]]);
    circ(ctx, 0, 0, 0.4 * S); ctx.fill();
    // внутренняя тень сверху (безель нависает)
    ctx.strokeStyle = "rgba(120,80,20,0.35)";
    ctx.lineWidth = 0.02 * S;
    ctx.beginPath(); ctx.arc(0, 0, 0.385 * S, -2.9, -0.25); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.012 * S;
    ctx.beginPath(); ctx.arc(0, 0, 0.385 * S, 0.4, 2.6); ctx.stroke();

    // минутные точки
    for (let i = 0; i < 60; i++) {
      const ang = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      ctx.fillStyle = big ? "#c9962e" : "#e3cf9d";
      circ(ctx, Math.cos(ang) * 0.345 * S, Math.sin(ang) * 0.345 * S, (big ? 0.013 : 0.006) * S);
      ctx.fill();
    }
    // цветные цифры с лёгкой тенью
    const nums: [string, number, number, string][] = [
      ["12", 0, -0.265, "#ff7a59"], ["3", 0.27, 0.012, "#38b6ff"],
      ["6", 0, 0.29, "#2fc98a"], ["9", -0.27, 0.012, "#9b6bff"],
    ];
    ctx.font = `900 ${0.115 * S}px "Nunito", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const [n, nx, ny, col] of nums) {
      ctx.fillStyle = "rgba(90,58,20,0.28)";
      ctx.fillText(n, nx * S + 0.006 * S, ny * S + 0.008 * S);
      ctx.fillStyle = col;
      ctx.fillText(n, nx * S, ny * S);
    }

    /* ---- скелетонное окно с шестернями ---- */
    ctx.save();
    circ(ctx, -0.2 * S, -0.13 * S, 0.095 * S);
    ctx.fillStyle = OUT; ctx.fill();
    ctx.clip();
    circ(ctx, -0.2 * S, -0.13 * S, 0.088 * S);
    ctx.fillStyle = "#3a2412"; ctx.fill();
    const gearA = a.secA * -0.55;
    drawGear(ctx, -0.232 * S, -0.148 * S, 0.05 * S, 8, gearA, "#ffd35c", "#a86a10");
    drawGear(ctx, -0.163 * S, -0.095 * S, 0.036 * S, 7, -gearA * 1.35 + 0.3, "#ff9d5c", "#c95f10");
    ctx.restore();
    circ(ctx, -0.2 * S, -0.13 * S, 0.095 * S);
    ctx.strokeStyle = "rgba(255,240,200,0.5)"; ctx.lineWidth = 0.008 * S; ctx.stroke();
    ctx.strokeStyle = "rgba(60,35,10,0.6)";
    ctx.beginPath(); ctx.arc(-0.2 * S, -0.13 * S, 0.088 * S, 0.6, 3.4); ctx.stroke();

    /* ---- милый смайлик ---- */
    ctx.fillStyle = "#f9a8c9";
    circ(ctx, -0.115 * S, 0.085 * S, 0.034 * S); ctx.fill();
    circ(ctx, 0.115 * S, 0.085 * S, 0.034 * S); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.011 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 0.055 * S, 0.06 * S, 0.25, Math.PI - 0.25); ctx.stroke();
    if (alive && a.wind > 0.05) {
      ctx.fillStyle = "#ff7a59";
      ctx.beginPath(); ctx.arc(0, 0.075 * S, 0.05 * S, 0, Math.PI); ctx.fill();
    }
    ctx.lineCap = "butt";

    /* ---- стрелки с падающими тенями ---- */
    const handSh = (ang: number, len: number, w: number) => {
      ctx.save(); ctx.rotate(ang);
      ctx.strokeStyle = "rgba(70,45,15,0.3)"; ctx.lineWidth = w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0.008 * S, len * 0.14 + 0.012 * S); ctx.lineTo(0.008 * S, -len + 0.012 * S); ctx.stroke();
      ctx.restore();
    };
    const hand = (ang: number, len: number, w: number, col: string, tip: string) => {
      ctx.save(); ctx.rotate(ang);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, len * 0.14); ctx.lineTo(0, -len); ctx.stroke();
      ctx.fillStyle = tip; circ(ctx, 0, -len, w * 0.55); ctx.fill();
      ctx.lineCap = "butt"; ctx.restore();
    };
    handSh(a.hourA, 0.17 * S, 0.034 * S);
    handSh(a.minA, 0.27 * S, 0.026 * S);
    hand(a.hourA, 0.17 * S, 0.034 * S, "#5b3b1e", "#8a6a4a");
    hand(a.minA, 0.27 * S, 0.026 * S, "#38b6ff", "#1e93dd");
    // секундная с сердечком
    ctx.save(); ctx.rotate(a.secA);
    ctx.strokeStyle = "rgba(70,45,15,0.25)"; ctx.lineWidth = 0.011 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0.006 * S, 0.05 * S + 0.01 * S); ctx.lineTo(0.006 * S, -0.3 * S + 0.01 * S); ctx.stroke();
    ctx.strokeStyle = "#ff5c5c";
    ctx.beginPath(); ctx.moveTo(0, 0.05 * S); ctx.lineTo(0, -0.3 * S); ctx.stroke();
    ctx.fillStyle = "#ff5c5c";
    ctx.save(); ctx.translate(0, -0.32 * S); ctx.scale(S / 100, S / 100); heartPath(ctx, 4.4); ctx.fill(); ctx.restore();
    ctx.lineCap = "butt"; ctx.restore();
    // центральная заклёпка
    raisedDisc(ctx, 0, 0, 0.026 * S, "#fff0bd", "#ffc63d", "#d98d12", OUT);

    /* ---- стекло: диагональный блик ---- */
    ctx.save();
    circ(ctx, 0, 0, 0.4 * S); ctx.clip();
    ctx.rotate(-0.6);
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.beginPath(); ctx.ellipse(-0.06 * S, -0.16 * S, 0.34 * S, 0.075 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath(); ctx.ellipse(0.02 * S, 0.02 * S, 0.4 * S, 0.05 * S, 0, 0, Math.PI * 2); ctx.fill();
    if (alive) {
      const sheen = (t * 0.22) % 1;
      const sx = (-0.7 + sheen * 1.4) * S;
      ctx.fillStyle = lin(ctx, sx - 0.1 * S, 0, sx + 0.1 * S, 0, [[0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.4)"], [1, "rgba(255,255,255,0)"]]);
      ctx.fillRect(-R, -R, R * 2, R * 2);
    }
    ctx.restore();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const cx = 0, cy = -0.555 * S;
    if (type === "down") {
      if (Math.hypot(x - cx, y - cy) < 0.17 * S) {
        a.winding = true;
        a.lastA = Math.atan2(y - cy, x - cx);
        api.audio.windRatchet();
      }
    } else if (type === "move" && a.winding) {
      const ang = Math.atan2(y - cy, x - cx);
      const d = wrapAngle(ang - a.lastA);
      a.lastA = ang;
      a.crownA += d * 1.6;
      a.wind = clamp(a.wind + Math.abs(d) * 0.2, 0, 1);
      a.rachetAcc += Math.abs(d);
      if (a.rachetAcc > 0.42) { a.rachetAcc = 0; api.audio.windRatchet(); }
    } else if (type === "up") {
      a.winding = false;
    }
  },
};

/* ================================================================
   02 — КОНСОЛЬ «ИСКРА-89»
   ================================================================ */
const console89: ArtifactDef = {
  id: "console",
  name: "Консоль «Искра-89»",
  collection: "nostalgia",
  collectionLabel: "Ностальгия",
  materialLabel: "пластик · LCD",
  tagline: "Питомец на экране крепко спит. Разбуди!",
  base: 140,
  par: 95,
  boundsMul: 0.56,
  aliveHint: "ЩЁЛКНИ КНОПКУ СВЕРХУ · D-PAD — БЕГАТЬ · A — ОБНИМАШКИ",
  drawMask(ctx, S) {
    rr(ctx, -0.48 * S, -0.36 * S, 0.96 * S, 0.72 * S, 0.06 * S); ctx.fill();
    ctx.fillRect(0.34 * S, -0.36 * S, 0.12 * S, 0.05 * S);
  },
  createAnim() {
    return {
      powered: false, bootT: 0, pet: { x: 4, y: 3, vx: 0, vy: 0 },
      pressed: null as string | null, pressT: 0, heartT: 0, spinA: 0, blinkT: 0, idleT: 0,
    };
  },
  update(a, dt, api) {
    if (a.powered) {
      a.bootT += dt;
      a.blinkT += dt;
      if (a.bootT > 1) {
        const p = a.pet;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= Math.pow(0.25, dt); p.vy *= Math.pow(0.25, dt);
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.8; }
        if (p.x > 10) { p.x = 10; p.vx = -Math.abs(p.vx) * 0.8; }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) * 0.8; }
        if (p.y > 5.4) { p.y = 5.4; p.vy = -Math.abs(p.vy) * 0.8; }
        a.idleT += dt;
        if (a.idleT > 2.4) {
          a.idleT = 0;
          p.vx += (Math.random() - 0.5) * 5;
          p.vy += (Math.random() - 0.5) * 3.4;
          api.audio.blip(700 + Math.random() * 300);
        }
      }
    }
    a.pressT = Math.max(0, a.pressT - dt * 4);
    a.heartT = Math.max(0, a.heartT - dt * 1.4);
    a.spinA *= Math.pow(0.05, dt);
  },
  draw(ctx, S, a, t, phase) {
    void phase;
    /* ---- корпус ---- */
    ctx.fillStyle = OUT;
    rr(ctx, -0.478 * S, -0.358 * S, 0.956 * S, 0.716 * S, 0.078 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.35 * S, 0, 0.36 * S, [[0, "#8ff0e0"], [0.45, "#46c9bd"], [1, "#21968b"]]);
    rr(ctx, -0.46 * S, -0.34 * S, 0.92 * S, 0.68 * S, 0.06 * S); ctx.fill();
    // нижняя тёмная кромка (толщина)
    ctx.fillStyle = "rgba(10,70,62,0.45)";
    rr(ctx, -0.46 * S, 0.27 * S, 0.92 * S, 0.07 * S, 0.03 * S); ctx.fill();
    // глянцевая шапка
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    rr(ctx, -0.42 * S, -0.325 * S, 0.84 * S, 0.045 * S, 0.022 * S); ctx.fill();
    // винтики
    const screw = (x: number, y: number) => {
      raisedDisc(ctx, x, y, 0.016 * S, "#d8d3c6", "#a8a294", "#7c766a", "rgba(20,60,52,0.6)");
      ctx.strokeStyle = "#5c564a"; ctx.lineWidth = 0.005 * S;
      ctx.beginPath(); ctx.moveTo(x - 0.008 * S, y); ctx.lineTo(x + 0.008 * S, y); ctx.stroke();
    };
    screw(-0.425 * S, -0.3 * S); screw(0.425 * S, 0.3 * S); screw(-0.425 * S, 0.3 * S);

    /* ---- кнопка питания ---- */
    ctx.fillStyle = OUT;
    rr(ctx, 0.312 * S, -0.362 * S, 0.118 * S, 0.046 * S, 0.016 * S); ctx.fill();
    ctx.fillStyle = "#2c6f66";
    rr(ctx, 0.318 * S, -0.356 * S, 0.106 * S, 0.034 * S, 0.012 * S); ctx.fill();
    raisedDisc(ctx, (a.powered ? 0.393 : 0.345) * S, -0.339 * S, 0.022 * S,
      a.powered ? "#b6ffd0" : "#e0dccb", a.powered ? "#2fc98a" : "#b3ad9d", a.powered ? "#1e9e68" : "#8a8474", OUT);

    /* ---- экран ---- */
    ctx.fillStyle = OUT;
    rr(ctx, -0.4 * S, -0.3 * S, 0.5 * S, 0.36 * S, 0.038 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.29 * S, 0, 0.05 * S, [[0, "#57c4ff"], [1, "#2b8fd6"]]);
    rr(ctx, -0.388 * S, -0.288 * S, 0.476 * S, 0.336 * S, 0.03 * S); ctx.fill();
    const lx = -0.357 * S, ly = -0.257 * S, lw = 0.414 * S, lh = 0.274 * S;
    if (!a.powered) {
      ctx.fillStyle = "#9dbfa6";
      rr(ctx, lx, ly, lw, lh, 0.014 * S); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.moveTo(lx, ly); ctx.lineTo(lx + lw * 0.5, ly); ctx.lineTo(lx + lw * 0.2, ly + lh); ctx.lineTo(lx, ly + lh);
      ctx.fill();
      ctx.fillStyle = "rgba(40,60,45,0.55)";
      const cell = lw / 14, zx = lx + lw * 0.5, zy = ly + lh * 0.55;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `900 ${cell}px "Nunito", sans-serif`;
      ctx.fillText("z", zx + cell * 0.8, zy - cell * 1.2);
      ctx.font = `900 ${cell * 1.5}px "Nunito", sans-serif`;
      ctx.fillText("Z", zx, zy);
    } else {
      ctx.fillStyle = lin(ctx, 0, ly, 0, ly + lh, [[0, "#d4fa95"], [1, "#a5e563"]]);
      rr(ctx, lx, ly, lw, lh, 0.014 * S); ctx.fill();
      const cell = lw / 14;
      ctx.fillStyle = "#2e4a1c";
      if (a.bootT < 1) {
        const bw = lw * 0.7 * clamp(a.bootT, 0, 1);
        ctx.fillRect(lx + lw * 0.15, ly + lh * 0.55, bw, cell * 0.8);
        ctx.strokeStyle = "#2e4a1c"; ctx.lineWidth = cell * 0.22;
        ctx.strokeRect(lx + lw * 0.15, ly + lh * 0.55, lw * 0.7, cell * 0.8);
        if (Math.floor(t * 6) % 2 === 0) ctx.fillRect(lx + lw * 0.15, ly + lh * 0.24, cell * 3, cell * 0.8);
      } else {
        const p = a.pet;
        const bob = Math.sin(t * 5) * cell * 0.22;
        const px = lx + (p.x + 1) * cell, py = ly + (p.y + 0.7) * cell + bob;
        const blink = a.blinkT % 3.2 < 0.14;
        for (let r = 0; r < 8; r++)
          for (let c = 0; c < 8; c++) {
            if (!PET[r][c]) continue;
            if (blink && r === 2) continue;
            ctx.fillRect(px + c * cell * 0.62, py + r * cell * 0.62, cell * 0.62, cell * 0.62);
          }
        if (a.heartT > 0) {
          ctx.globalAlpha = Math.min(1, a.heartT * 2);
          const hy = py - cell * 1.6 - (1 - a.heartT) * cell * 2;
          for (let r = 0; r < 5; r++)
            for (let c = 0; c < 5; c++)
              if (HEART[r][c]) ctx.fillRect(px + cell + c * cell * 0.42, hy + r * cell * 0.42, cell * 0.42, cell * 0.42);
          ctx.globalAlpha = 1;
        }
        ctx.fillRect(lx + lw - cell * 2.4, ly + cell * 0.4, cell * 1.8, cell * 0.8);
        ctx.clearRect(lx + lw - cell * 2.2, ly + cell * 0.6, cell * 1.4 * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.8))), cell * 0.4);
        ctx.fillStyle = "#2e4a1c";
      }
      // блик стекла экрана
      ctx.save();
      rr(ctx, lx, ly, lw, lh, 0.014 * S); ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(lx, ly); ctx.lineTo(lx + lw * 0.42, ly); ctx.lineTo(lx + lw * 0.12, ly + lh); ctx.lineTo(lx, ly + lh);
      ctx.fill();
      ctx.restore();
    }

    /* ---- крестовина ---- */
    const dx = -0.2 * S, dy = 0.165 * S, aw = 0.062 * S, al = 0.175 * S;
    ctx.save();
    if (a.pressT > 0 && a.pressed) {
      const sh = 0.008 * S * a.pressT;
      if (a.pressed === "left") ctx.translate(-sh, 0);
      if (a.pressed === "right") ctx.translate(sh, 0);
      if (a.pressed === "up") ctx.translate(0, -sh);
      if (a.pressed === "down") ctx.translate(0, sh);
    }
    // тень под крестовиной
    ctx.fillStyle = "rgba(10,70,62,0.4)";
    rr(ctx, dx - al - 0.008 * S, dy - aw - 0.002 * S, al * 2 + 0.016 * S, aw * 2 + 0.016 * S, aw * 0.45); ctx.fill();
    rr(ctx, dx - aw - 0.008 * S, dy - al - 0.002 * S, aw * 2 + 0.016 * S, al * 2 + 0.016 * S, aw * 0.45); ctx.fill();
    ctx.fillStyle = OUT;
    rr(ctx, dx - al - 0.014 * S, dy - aw - 0.014 * S, al * 2 + 0.028 * S, aw * 2 + 0.028 * S, aw * 0.5); ctx.fill();
    rr(ctx, dx - aw - 0.014 * S, dy - al - 0.014 * S, aw * 2 + 0.028 * S, al * 2 + 0.028 * S, aw * 0.5); ctx.fill();
    ctx.fillStyle = lin(ctx, dx - al, dy - al, dx + al, dy + al, [[0, "#ffe27a"], [0.5, "#ffc63d"], [1, "#e09a1e"]]);
    rr(ctx, dx - al, dy - aw, al * 2, aw * 2, aw * 0.4); ctx.fill();
    rr(ctx, dx - aw, dy - al, aw * 2, al * 2, aw * 0.4); ctx.fill();
    raisedDisc(ctx, dx, dy, aw * 0.55, "#fff0bd", "#f2b03a", "#c97f10", "#a86a10");
    ctx.restore();

    /* ---- кнопки A/B (ягодки-сферы) ---- */
    const candy = (bx: number, by: number, hi: string, base: string, lo: string, label: string, active: boolean) => {
      ctx.save();
      if (active && a.pressT > 0) ctx.translate(0, 0.007 * S * a.pressT);
      ctx.fillStyle = "rgba(10,70,62,0.45)";
      circ(ctx, bx + 0.006 * S, by + 0.014 * S, 0.058 * S); ctx.fill();
      ctx.fillStyle = OUT;
      circ(ctx, bx, by, 0.062 * S); ctx.fill();
      ctx.fillStyle = rad(ctx, bx - 0.02 * S, by - 0.025 * S, 0.004 * S, 0.062 * S, [[0, hi], [0.55, base], [1, lo]]);
      circ(ctx, bx, by, 0.054 * S); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      circ(ctx, bx - 0.017 * S, by - 0.022 * S, 0.016 * S); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${0.046 * S}px "Nunito", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, bx, by + 0.004 * S);
      ctx.restore();
    };
    candy(0.34 * S, 0.095 * S, "#ffc4e2", "#e24e94", "#b02e6c", "A", a.pressed === "a");
    candy(0.2 * S, 0.175 * S, "#bfe4ff", "#1e93dd", "#1568a8", "B", a.pressed === "b");

    /* ---- SELECT / START ---- */
    const pill = (px2: number) => {
      ctx.fillStyle = OUT;
      rr(ctx, px2 - 0.006 * S, 0.262 * S, 0.092 * S, 0.036 * S, 0.018 * S); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, 0.264 * S, 0, 0.294 * S, [[0, "#fff6df"], [1, "#dccfa8"]]);
      rr(ctx, px2, 0.267 * S, 0.08 * S, 0.026 * S, 0.013 * S); ctx.fill();
    };
    pill(-0.052 * S); pill(0.058 * S);

    /* ---- динамик ---- */
    ctx.fillStyle = "rgba(15,75,66,0.55)";
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 3; j++) {
        circ(ctx, (0.3 + j * 0.03) * S, (0.24 + i * 0.022) * S, 0.007 * S);
        ctx.fill();
      }

    /* ---- бренд и светодиод ---- */
    ctx.fillStyle = "#1f7d74";
    ctx.font = `700 ${0.05 * S}px "Balsamiq Sans", cursive`;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("ИСКРА-89", -0.42 * S, 0.318 * S);
    ctx.fillStyle = OUT;
    circ(ctx, 0.425 * S, -0.24 * S, 0.017 * S); ctx.fill();
    ctx.fillStyle = a.powered ? "#7dff9c" : "#8aa89b";
    circ(ctx, 0.425 * S, -0.24 * S, 0.012 * S); ctx.fill();
    if (a.powered) {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 4);
      circ(ctx, 0.425 * S, -0.24 * S, 0.026 * S); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type !== "down") return;
    if (x > 0.3 * S && x < 0.44 * S && y > -0.37 * S && y < -0.31 * S) {
      a.powered = !a.powered;
      a.bootT = 0; a.pressed = null;
      if (a.powered) api.audio.jingle(); else api.audio.powerDown();
      api.shake(2);
      return;
    }
    if (!a.powered || a.bootT < 1) return;
    const dx = -0.2 * S, dy = 0.165 * S;
    if (Math.abs(x - dx) < 0.19 * S && Math.abs(y - dy) < 0.19 * S) {
      const ddx = x - dx, ddy = y - dy;
      let dir: string;
      if (Math.abs(ddx) > Math.abs(ddy)) dir = ddx > 0 ? "right" : "left";
      else dir = ddy > 0 ? "down" : "up";
      a.pressed = dir; a.pressT = 1;
      if (dir === "left") a.pet.vx -= 7;
      if (dir === "right") a.pet.vx += 7;
      if (dir === "up") a.pet.vy -= 5.4;
      if (dir === "down") a.pet.vy += 5.4;
      api.audio.blip(dir === "up" ? 760 : dir === "down" ? 560 : 660);
      return;
    }
    if (Math.hypot(x - 0.34 * S, y - 0.095 * S) < 0.085 * S) {
      a.pressed = "a"; a.pressT = 1; a.heartT = 1;
      a.pet.vy -= 4;
      api.audio.blip(1040);
      api.spawn("pixel", -0.15 * S, -0.1 * S, 3, "#2e4a1c");
      return;
    }
    if (Math.hypot(x - 0.2 * S, y - 0.175 * S) < 0.085 * S) {
      a.pressed = "b"; a.pressT = 1; a.spinA += 4;
      api.audio.blip(520);
      return;
    }
  },
};

/* ================================================================
   03 — КОЛЕЧКО «ЗВЁЗДОЧКА»
   ================================================================ */
const ring: ArtifactDef = {
  id: "ring",
  name: "Колечко «Звёздочка»",
  collection: "treasure",
  collectionLabel: "Сокровища",
  materialLabel: "золото · сапфир",
  tagline: "Камень не видел солнышка сто лет!",
  base: 160,
  par: 80,
  boundsMul: 0.55,
  aliveHint: "ТАП ПО КАМНЮ — СИЯНИЕ! · ТЯНИ ОБОД — КРУТИ",
  drawMask(ctx, S) {
    circ(ctx, 0, 0.1 * S, 0.325 * S); ctx.fill();
    circ(ctx, 0, 0.1 * S, 0.23 * S);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fill();
    ctx.restore();
    octPath(ctx, 0, -0.24 * S, 0.175 * S); ctx.fill();
    ctx.fillRect(-0.075 * S, -0.16 * S, 0.15 * S, 0.08 * S);
  },
  createAnim() {
    return { rot: 0, dragging: false, lastX: 0, flashT: 0, sparkAng: -1.2, active: false, idleSpark: 0 };
  },
  update(a, dt, api) {
    const S = api.S;
    a.flashT = Math.max(0, a.flashT - dt * 1.3);
    const gx = 0, gy = -0.24 * S;
    const target = Math.atan2(api.pointer.ly - gy, api.pointer.lx - gx);
    a.sparkAng += wrapAngle(target - a.sparkAng) * Math.min(1, dt * 6);
    a.idleSpark += dt;
    if (a.active && a.idleSpark > 1.3) {
      a.idleSpark = 0;
      const ang = Math.random() * Math.PI * 2;
      api.spawn("star", gx + Math.cos(ang) * 0.1 * S, gy + Math.sin(ang) * 0.1 * S, 1, "#7fdcff");
    }
  },
  draw(ctx, S, a, t, phase) {
    const alive = phase === "alive";
    ctx.save();
    ctx.rotate(a.rot * 0.32);
    const bcx = 0, bcy = 0.1 * S, br = 0.26 * S;

    /* ---- обод (тор): обводка + градиент + свет/тень ---- */
    ctx.lineWidth = 0.118 * S;
    ctx.strokeStyle = OUT;
    circ(ctx, bcx, bcy, br); ctx.stroke();
    ctx.lineWidth = 0.095 * S;
    ctx.strokeStyle = lin(ctx, -0.3 * S, -0.15 * S, 0.3 * S, 0.35 * S, [[0, "#fff3c4"], [0.35, "#ffd35c"], [0.7, "#eda92b"], [1, "#b06f14"]]);
    circ(ctx, bcx, bcy, br); ctx.stroke();
    // тень внутри отверстия (сверху) — тор читается объёмным
    ctx.lineWidth = 0.028 * S;
    ctx.strokeStyle = "rgba(90,50,8,0.55)";
    ctx.beginPath(); ctx.arc(bcx, bcy, br - 0.055 * S, -2.7, -0.4); ctx.stroke();
    // рефлекс снизу внутри отверстия
    ctx.strokeStyle = "rgba(255,240,190,0.5)";
    ctx.beginPath(); ctx.arc(bcx, bcy, br - 0.055 * S, 0.5, 2.6); ctx.stroke();
    // бегущий блик по внешней кромке
    const spAng = -2.1 + Math.sin(t * 0.6) * 0.35 + a.rot;
    ctx.lineWidth = 0.03 * S;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(255,255,255,${alive ? 0.95 : 0.5})`;
    ctx.beginPath(); ctx.arc(bcx, bcy, br + 0.012 * S, spAng, spAng + 0.6); ctx.stroke();
    ctx.lineCap = "butt";

    /* ---- посадочное гнёздышко ---- */
    ctx.fillStyle = OUT;
    ctx.beginPath();
    ctx.moveTo(-0.064 * S, -0.118 * S);
    ctx.lineTo(0.064 * S, -0.118 * S);
    ctx.lineTo(0.046 * S, -0.2 * S);
    ctx.lineTo(-0.046 * S, -0.2 * S);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, -0.05 * S, -0.2 * S, 0.05 * S, -0.12 * S, [[0, "#ffe9a8"], [0.5, "#f2b03a"], [1, "#c97f10"]]);
    ctx.beginPath();
    ctx.moveTo(-0.05 * S, -0.125 * S);
    ctx.lineTo(0.05 * S, -0.125 * S);
    ctx.lineTo(0.036 * S, -0.185 * S);
    ctx.lineTo(-0.036 * S, -0.185 * S);
    ctx.closePath(); ctx.fill();

    /* ---- сапфир: огранка ---- */
    const gx = 0, gy = -0.24 * S, R = 0.16 * S;
    ctx.fillStyle = OUT;
    octPath(ctx, gx, gy, R * 1.1); ctx.fill();
    ctx.fillStyle = rad(ctx, gx, gy, 0.01 * S, R, [[0, "#5f95ff"], [0.7, "#2b57d8"], [1, "#1a337f"]]);
    octPath(ctx, gx, gy, R); ctx.fill();
    const palette = ["#2b57d8", "#4f8bff", "#7fb2ff", "#b9d6ff", "#ffffff"];
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const a1 = ((k + 1) / 8) * Math.PI * 2 + Math.PI / 8;
      const mid = (a0 + a1) / 2;
      const light = 0.5 + 0.5 * Math.cos(mid - a.sparkAng + Math.sin(t * 0.9) * 0.4);
      ctx.fillStyle = palette[Math.min(4, Math.floor(light * 4.99))];
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(a0) * R, gy + Math.sin(a0) * R);
      ctx.lineTo(gx + Math.cos(a1) * R, gy + Math.sin(a1) * R);
      ctx.lineTo(gx + Math.cos(a1) * R * 0.5, gy + Math.sin(a1) * R * 0.5);
      ctx.lineTo(gx + Math.cos(a0) * R * 0.5, gy + Math.sin(a0) * R * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#5f95ff";
    octPath(ctx, gx, gy, R * 0.48); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.35 * Math.abs(Math.sin(a.sparkAng))})`;
    ctx.beginPath();
    ctx.ellipse(gx - R * 0.12, gy - R * 0.14, R * 0.2, R * 0.12, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // звёздочка внутри
    ctx.save();
    ctx.translate(gx + R * 0.18, gy + R * 0.12);
    ctx.rotate(t * 0.8);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 3)})`;
    star4(ctx, 0, 0, R * 0.16); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 0.005 * S;
    octPath(ctx, gx, gy, R); ctx.stroke();

    /* ---- лапки ---- */
    for (let k = 0; k < 4; k++) {
      const ang = Math.PI / 4 + (k * Math.PI) / 2;
      const px = gx + Math.cos(ang) * R * 0.95, py = gy + Math.sin(ang) * R * 0.95;
      raisedDisc(ctx, px, py, 0.019 * S, "#fff3c4", "#f2b03a", "#c97f10", OUT);
    }

    /* ---- дисперсия при тапе ---- */
    if (a.flashT > 0) {
      ctx.globalCompositeOperation = "lighter";
      const f = a.flashT;
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2 + t;
        ctx.strokeStyle = `hsla(${k * 30}, 95%, 65%, ${0.6 * f})`;
        ctx.lineWidth = 0.011 * S; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(ang) * R * 0.4, gy + Math.sin(ang) * R * 0.4);
        ctx.lineTo(gx + Math.cos(ang) * (R + 0.16 * S * (1.4 - f)), gy + Math.sin(ang) * (R + 0.16 * S * (1.4 - f)));
        ctx.stroke();
      }
      ctx.fillStyle = rad(ctx, gx, gy, 0, R * 2.4, [[0, `rgba(255,255,255,${0.7 * f})`], [1, "rgba(255,255,255,0)"]]);
      circ(ctx, gx, gy, R * 2.4); ctx.fill();
      ctx.lineCap = "butt";
    }
    // каустика под камнем, когда живой
    if (alive) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rad(ctx, gx, bcy + 0.05 * S, 0, 0.2 * S, [[0, `rgba(160,200,255,${0.14 + 0.06 * Math.sin(t * 3)})`], [1, "rgba(160,200,255,0)"]]);
      circ(ctx, gx, bcy + 0.05 * S, 0.2 * S); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const gx = 0, gy = -0.24 * S;
    if (type === "down") {
      if (Math.hypot(x - gx, y - gy) < 0.24 * S) {
        a.flashT = 1; a.active = true;
        api.audio.chime();
        api.flash(0.45);
        api.shake(5);
        api.spawn("star", gx, gy, 22, "#bfe0ff");
      } else if (Math.abs(Math.hypot(x, y - 0.1 * S) - 0.26 * S) < 0.12 * S) {
        a.dragging = true; a.lastX = x;
      }
    } else if (type === "move" && a.dragging) {
      a.rot = clamp(a.rot + (x - a.lastX) * 0.005, -0.8, 0.8);
      a.lastX = x;
      if (Math.random() < 0.2) api.audio.windRatchet();
    } else if (type === "up") {
      a.dragging = false;
    }
  },
};

import { EXTRA_ARTIFACTS } from "./artifacts2";
import { TOYS_MUSIC } from "./artifacts3";
import { TECH_SEA } from "./artifacts4";

/** Каталог реликвий: винтаж + ностальгия + сокровища + механика/музыка + техника/море. */
export const ARTIFACTS: ArtifactDef[] = [
  watch, console89, ring, ...EXTRA_ARTIFACTS, ...TOYS_MUSIC, ...TECH_SEA,
];
export const ARTIFACT_BY_ID: Record<string, ArtifactDef> = Object.fromEntries(
  ARTIFACTS.map((a) => [a.id, a])
);
