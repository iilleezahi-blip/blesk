import type { ArtifactDef } from "./types";
import { clamp, wrapAngle } from "./rng";

const OUT = "#4a2f14";

/* ---------- помощники ---------- */
function lin(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function rad(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rd = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rd, y);
  ctx.arcTo(x + w, y, x + w, y + h, rd);
  ctx.arcTo(x + w, y + h, x, y + h, rd);
  ctx.arcTo(x, y + h, x, y, rd);
  ctx.arcTo(x, y, x + w, y, rd);
  ctx.closePath();
}
function circ(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hi: string, mid: string, lo: string, rim: string) {
  ctx.fillStyle = rim;
  circ(ctx, x, y, r); ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [[0, hi], [0.5, mid], [1, lo]]);
  circ(ctx, x, y, r * 0.92); ctx.fill();
}
function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const rd = k % 2 === 0 ? r : r * 0.38;
    const px = x + Math.cos(ang) * rd, py = y + Math.sin(ang) * rd;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* ================================================================
   КОМПАС «ПУТНИК» (Rotator)
   ================================================================ */
const compass: ArtifactDef = {
  id: "compass",
  name: "Компас «Путник»",
  collection: "vintage",
  collectionLabel: "Винтаж",
  materialLabel: "латунь · стекло",
  tagline: "Стрелка застряла. Куда же север?",
  base: 120, par: 80, boundsMul: 0.62,
  aliveHint: "КРУТИ ОБОД — СТРЕЛКА ИЩЕТ СЕВЕР",
  drawMask(ctx, S) {
    circ(ctx, 0, 0, 0.5 * S); ctx.fill();
    circ(ctx, 0, -0.55 * S, 0.07 * S); ctx.fill();
  },
  createAnim() {
    return { cardA: 0, cardV: 0, needleA: -Math.PI / 2, needleV: 0, dragging: false, lastA: 0, sparkT: 0 };
  },
  update(a, dt, api) {
    const S = api.S;
    a.cardV *= Math.pow(0.2, dt);
    a.cardA += a.cardV * dt;
    // стрелка — пружина к северу, дрожит от вращения картушки
    const target = -Math.PI / 2;
    const k = 40, damp = 6;
    a.needleV += (target - a.needleA) * k * dt - a.needleV * damp * dt + a.cardV * 0.6 * dt * 8;
    a.needleA += a.needleV * dt;
    a.sparkT += dt;
    if (a.sparkT > 1.1 && Math.abs(a.cardV) < 0.15) {
      a.sparkT = 0;
      const ang = Math.random() * Math.PI * 2;
      api.spawn("star", Math.cos(ang) * 0.3 * S, Math.sin(ang) * 0.3 * S, 1, "#ffd166");
    }
  },
  draw(ctx, S, a, t, phase) {
    // ушко
    ctx.fillStyle = OUT; circ(ctx, 0, -0.55 * S, 0.075 * S); ctx.fill();
    ctx.fillStyle = "#caa24e"; circ(ctx, 0, -0.55 * S, 0.05 * S); ctx.fill();
    // латунный обод
    disc(ctx, 0, 0, 0.5 * S, "#f8dd9a", "#d2a44e", "#8a5a1e", OUT);
    ctx.strokeStyle = "rgba(255,240,200,0.7)"; ctx.lineWidth = 0.012 * S;
    ctx.beginPath(); ctx.arc(0, 0, 0.45 * S, -2.5, -0.8); ctx.stroke();
    // картушка (вращается)
    ctx.save();
    ctx.rotate(a.cardA);
    ctx.fillStyle = rad(ctx, 0, 0, 0.02 * S, 0.42 * S, [[0, "#fdf6e3"], [0.85, "#f0e3c0"], [1, "#dcc99a"]]);
    circ(ctx, 0, 0, 0.42 * S); ctx.fill();
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      const big = i % 9 === 0;
      ctx.strokeStyle = big ? "#8a7a50" : "#c4b28a";
      ctx.lineWidth = (big ? 0.012 : 0.005) * S;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * (big ? 0.34 : 0.38) * S, Math.sin(ang) * (big ? 0.34 : 0.38) * S);
      ctx.lineTo(Math.cos(ang) * 0.41 * S, Math.sin(ang) * 0.41 * S);
      ctx.stroke();
    }
    const dirs: [string, string, number][] = [["N", "#c0392b", -Math.PI / 2], ["E", "#5b3b1e", 0], ["S", "#5b3b1e", Math.PI / 2], ["W", "#5b3b1e", Math.PI]];
    for (const [ch, col, ang] of dirs) {
      ctx.fillStyle = col;
      ctx.font = `900 ${0.09 * S}px "Nunito", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ch, Math.cos(ang) * 0.27 * S, Math.sin(ang) * 0.27 * S + 0.01 * S);
    }
    ctx.restore();
    // стрелка (всегда к северу)
    ctx.save();
    ctx.rotate(a.needleA);
    ctx.fillStyle = "#c0392b";
    ctx.beginPath(); ctx.moveTo(0.3 * S, 0); ctx.lineTo(0, -0.045 * S); ctx.lineTo(0, 0.045 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3a3a44";
    ctx.beginPath(); ctx.moveTo(-0.3 * S, 0); ctx.lineTo(0, -0.045 * S); ctx.lineTo(0, 0.045 * S); ctx.closePath(); ctx.fill();
    ctx.restore();
    disc(ctx, 0, 0, 0.05 * S, "#ffe1a0", "#d2a04a", "#8a5a1e", OUT);
    // блик стекла
    if (phase !== "catalog") {
      ctx.save(); ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 0.05 * S; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(0, 0, 0.36 * S, -2.5, -1.6); ctx.stroke();
      ctx.restore();
    }
    void t;
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const r = Math.hypot(x, y);
    if (type === "down") {
      if (r < 0.52 * S && r > 0.12 * S) { a.dragging = true; a.lastA = Math.atan2(y, x); }
    } else if (type === "move" && a.dragging) {
      const ang = Math.atan2(y, x);
      const d = wrapAngle(ang - a.lastA);
      a.lastA = ang;
      a.cardA += d;
      a.cardV = d * 30;
      if (Math.abs(d) > 0.03 && Math.random() < 0.25) api.audio.windRatchet();
    } else if (type === "up") a.dragging = false;
  },
};

/* ================================================================
   ЗАЖИГАЛКА «ИСКРА» (Hinge + кремень)
   ================================================================ */
const zippo: ArtifactDef = {
  id: "zippo",
  name: "Зажигалка «Искра»",
  collection: "vintage",
  collectionLabel: "Винтаж",
  materialLabel: "латунь · кремень",
  tagline: "Кремень заржавел, фитиль сух.",
  base: 125, par: 80, boundsMul: 0.6,
  aliveHint: "ОТКИНЬ КРЫШКУ, ЧИРКНИ КОЛЕСОМ!",
  drawMask(ctx, S) {
    rr(ctx, -0.26 * S, -0.3 * S, 0.52 * S, 0.68 * S, 0.07 * S); ctx.fill();
    rr(ctx, -0.26 * S, -0.52 * S, 0.52 * S, 0.24 * S, 0.07 * S); ctx.fill();
  },
  createAnim() {
    return { lidA: 0, flame: false, wheelA: 0, wheelV: 0, dragging: null as "lid" | "wheel" | null, lastY: 0, lastX: 0, sparkT: 0, crackleT: 0 };
  },
  update(a, dt, api) {
    const S = api.S;
    a.wheelV *= Math.pow(0.1, dt);
    a.wheelA += a.wheelV * dt;
    if (a.flame) {
      a.crackleT += dt;
      if (a.crackleT > 0.13) { a.crackleT = 0; api.audio.flameCrackle(); }
      a.sparkT += dt;
      if (a.sparkT > 0.3) {
        a.sparkT = 0;
        api.spawn("spark", 0, -0.42 * S, 1, "#ffb703");
      }
    }
  },
  draw(ctx, S, a, t) {
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.27 * S, -0.31 * S, 0.54 * S, 0.7 * S, 0.075 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, -0.26 * S, 0, 0.26 * S, 0, [[0, "#f8dd9a"], [0.4, "#e0b968"], [0.6, "#c89848"], [1, "#9a6a26"]]);
    rr(ctx, -0.26 * S, -0.3 * S, 0.52 * S, 0.68 * S, 0.07 * S); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,200,0.6)"; ctx.lineWidth = 0.01 * S;
    rr(ctx, -0.22 * S, -0.26 * S, 0.1 * S, 0.6 * S, 0.04 * S); ctx.stroke();
    // гравировка-звезда
    ctx.fillStyle = "rgba(122,84,30,0.5)";
    star4(ctx, 0, 0.08 * S, 0.09 * S); ctx.fill();
    // крышка на петле (откидывается)
    ctx.save();
    ctx.translate(0.24 * S, -0.3 * S);
    ctx.rotate(-a.lidA);
    ctx.translate(-0.24 * S, 0.3 * S);
    ctx.fillStyle = OUT; rr(ctx, -0.27 * S, -0.53 * S, 0.54 * S, 0.26 * S, 0.075 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, -0.26 * S, 0, 0.26 * S, 0, [[0, "#ffe9a8"], [0.5, "#e8c06a"], [1, "#b08030"]]);
    rr(ctx, -0.26 * S, -0.52 * S, 0.52 * S, 0.24 * S, 0.07 * S); ctx.fill();
    ctx.restore();
    // внутренности (видны при открытой крышке)
    if (a.lidA > 0.4) {
      ctx.fillStyle = "#6a5228";
      rr(ctx, -0.1 * S, -0.44 * S, 0.2 * S, 0.16 * S, 0.03 * S); ctx.fill();
      // фитиль
      ctx.strokeStyle = "#e8d8b0"; ctx.lineWidth = 0.03 * S; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -0.36 * S); ctx.lineTo(0, -0.46 * S); ctx.stroke();
      // колесо кремня
      ctx.save();
      ctx.translate(0.14 * S, -0.34 * S);
      ctx.rotate(a.wheelA);
      disc(ctx, 0, 0, 0.05 * S, "#d8d8e0", "#9a9aa8", "#5a5a68", "#3a3a44");
      ctx.strokeStyle = "#3a3a44"; ctx.lineWidth = 0.006 * S;
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((k / 6) * Math.PI * 2) * 0.045 * S, Math.sin((k / 6) * Math.PI * 2) * 0.045 * S);
        ctx.stroke();
      }
      ctx.restore();
    }
    // пламя
    if (a.flame) {
      const fl = 0.16 * S * (1 + 0.15 * Math.sin(t * 13) + 0.08 * Math.sin(t * 31));
      ctx.save();
      ctx.translate(0, -0.44 * S);
      ctx.fillStyle = "rgba(80,140,255,0.85)";
      ctx.beginPath(); ctx.ellipse(0, 0.01 * S, 0.035 * S, 0.05 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rad(ctx, 0, -fl * 0.3, fl * 0.05, fl, [[0, "#fff7d6"], [0.4, "#ffd166"], [0.8, "#ff8a3d"], [1, "rgba(255,120,40,0)"]]);
      ctx.beginPath();
      ctx.moveTo(-0.05 * S, 0);
      ctx.quadraticCurveTo(-0.07 * S, -fl * 0.5, 0, -fl);
      ctx.quadraticCurveTo(0.07 * S, -fl * 0.5, 0.05 * S, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    void ctx.lineCap;
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type === "down") {
      if (y < -0.28 * S && a.lidA < 0.2) { a.dragging = "lid"; a.lastY = y; }
      else if (a.lidA > 0.8 && Math.hypot(x - 0.14 * S, y + 0.34 * S) < 0.12 * S) { a.dragging = "wheel"; a.lastX = x; }
      else if (a.flame && Math.hypot(x, y + 0.5 * S) < 0.2 * S) { a.flame = false; api.audio.poof(); api.spawn("smoke", 0, -0.44 * S, 6, "#c8c8d0"); }
    } else if (type === "move" && a.dragging) {
      if (a.dragging === "lid") {
        const d = (a.lastY - y) / (0.24 * S);
        a.lidA = clamp(a.lidA + d * 0.9, 0, 1.9);
        a.lastY = y;
        if (a.lidA > 1 && Math.random() < 0.1) api.audio.windRatchet();
      } else if (a.dragging === "wheel") {
        const d = x - a.lastX;
        a.lastX = x;
        a.wheelV = d * 2;
        a.wheelA += d * 0.05;
        if (Math.abs(d) > 3) {
          api.spawn("spark", 0.14 * S, -0.34 * S, 2, "#ffd166");
          api.audio.mechClick(1.4);
          if (Math.abs(a.wheelV) > 5 && !a.flame) { a.flame = true; api.audio.flameIgnite(); api.shake(3); }
        }
      }
    } else if (type === "up") {
      if (a.dragging === "lid" && a.lidA < 0.9) a.lidA = 0;
      a.dragging = null;
    }
  },
};

/* ================================================================
   КЛЮЧ «ОТ ВСЕХ ДВЕРЕЙ» (Rotator)
   ================================================================ */
const key: ArtifactDef = {
  id: "key",
  name: "Ключ «От всех дверей»",
  collection: "vintage",
  collectionLabel: "Винтаж",
  materialLabel: "бронза",
  tagline: "Бородка стёрта, тайна ждёт.",
  base: 110, par: 70, boundsMul: 0.5,
  aliveHint: "РАСКРУТИ КЛЮЧ — И ПОЙМАЙ ИСКРЫ!",
  drawMask(ctx, S) {
    circ(ctx, 0, -0.34 * S, 0.2 * S); ctx.fill();
    circ(ctx, 0, -0.34 * S, 0.11 * S);
    ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fill(); ctx.restore();
    ctx.fillRect(-0.045 * S, -0.16 * S, 0.09 * S, 0.6 * S);
    ctx.fillRect(0.02 * S, 0.32 * S, 0.14 * S, 0.06 * S);
    ctx.fillRect(0.02 * S, 0.42 * S, 0.1 * S, 0.05 * S);
  },
  createAnim() { return { rot: 0, vel: 0, dragging: false, lastX: 0, sparkT: 0 }; },
  update(a, dt, api) {
    const S = api.S;
    if (!a.dragging) { a.rot += a.vel * dt; a.vel *= Math.pow(0.25, dt); }
    a.sparkT += dt;
    if (Math.abs(a.vel) > 4 && a.sparkT > 0.09) {
      a.sparkT = 0;
      api.spawn("star", (Math.random() - 0.5) * 0.4 * S, (Math.random() - 0.5) * 0.7 * S, 1, "#ffd166");
    }
  },
  draw(ctx, S, a) {
    ctx.save();
    ctx.rotate(a.rot);
    const gold = lin(ctx, -0.2 * S, 0, 0.2 * S, 0, [[0, "#f8dd9a"], [0.5, "#d2a44e"], [1, "#8a5a1e"]]);
    // репей (кольцо)
    ctx.fillStyle = OUT; circ(ctx, 0, -0.34 * S, 0.21 * S); ctx.fill();
    ctx.fillStyle = gold; circ(ctx, 0, -0.34 * S, 0.195 * S); ctx.fill();
    ctx.fillStyle = OUT; circ(ctx, 0, -0.34 * S, 0.12 * S); ctx.fill();
    // стержень
    ctx.fillStyle = OUT; ctx.fillRect(-0.055 * S, -0.16 * S, 0.11 * S, 0.62 * S);
    ctx.fillStyle = gold; ctx.fillRect(-0.045 * S, -0.16 * S, 0.09 * S, 0.6 * S);
    ctx.fillStyle = gold; ctx.fillRect(-0.07 * S, -0.18 * S, 0.14 * S, 0.05 * S);
    // бородка
    ctx.fillStyle = OUT; ctx.fillRect(0.01 * S, 0.31 * S, 0.17 * S, 0.075 * S);
    ctx.fillStyle = gold; ctx.fillRect(0.02 * S, 0.32 * S, 0.14 * S, 0.06 * S);
    ctx.fillStyle = gold; ctx.fillRect(0.02 * S, 0.42 * S, 0.1 * S, 0.05 * S);
    // блик
    ctx.strokeStyle = "rgba(255,245,210,0.7)"; ctx.lineWidth = 0.012 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-0.02 * S, -0.12 * S); ctx.lineTo(-0.02 * S, 0.3 * S); ctx.stroke();
    ctx.restore();
  },
  onPointer(api, a, type, x) {
    if (type === "down") { a.dragging = true; a.lastX = x; }
    else if (type === "move" && a.dragging) {
      const d = x - a.lastX; a.lastX = x;
      a.rot += d * 0.012; a.vel = d * 0.8;
      if (Math.abs(d) > 4 && Math.random() < 0.15) api.audio.windRatchet();
    } else if (type === "up") a.dragging = false;
  },
};

/* ================================================================
   ПЛЕЕР «ВОЛНА-87» (Button + Rotator-бобины)
   ================================================================ */
const MELODY = [523, 659, 784, 659, 880, 784, 659, 587];
const walkman: ArtifactDef = {
  id: "walkman",
  name: "Плеер «Волна-87»",
  collection: "nostalgia",
  collectionLabel: "Ностальгия",
  materialLabel: "пластик · магнитная лента",
  tagline: "Кассета зажёвана, мотор молчит.",
  base: 145, par: 90, boundsMul: 0.58,
  aliveHint: "ЖМИ PLAY — БОБИНЫ ЗАКРУТЯТСЯ!",
  drawMask(ctx, S) {
    rr(ctx, -0.44 * S, -0.3 * S, 0.88 * S, 0.6 * S, 0.06 * S); ctx.fill();
    circ(ctx, 0.47 * S, 0, 0.06 * S); ctx.fill();
  },
  createAnim() {
    return { playing: false, ff: false, reelA: 0, counter: 0, noteAcc: 0, noteIdx: 0, volA: 0, volDrag: false, lastY: 0 };
  },
  update(a, dt, api) {
    const S = api.S;
    if (a.playing) {
      const spd = a.ff ? 14 : 5;
      a.reelA += spd * dt;
      a.counter += (a.ff ? 6 : 2) * dt;
      a.noteAcc += dt * (a.ff ? 1.8 : 1);
      if (a.noteAcc > 0.3) {
        a.noteAcc = 0;
        api.audio.blip(MELODY[a.noteIdx % MELODY.length]);
        a.noteIdx++;
        api.spawn("pixel", (Math.random() - 0.5) * 0.5 * S, -0.35 * S, 1, "#ff6fb2");
      }
    }
  },
  draw(ctx, S, a, t, phase) {
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.455 * S, -0.315 * S, 0.91 * S, 0.63 * S, 0.07 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.3 * S, 0, 0.3 * S, [[0, "#7fd4ff"], [0.5, "#4fb8f0"], [1, "#2b8fd0"]]);
    rr(ctx, -0.44 * S, -0.3 * S, 0.88 * S, 0.6 * S, 0.06 * S); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; rr(ctx, -0.4 * S, -0.285 * S, 0.8 * S, 0.05 * S, 0.025 * S); ctx.fill();
    // кассетное окно
    ctx.fillStyle = "#17181c"; rr(ctx, -0.38 * S, -0.22 * S, 0.5 * S, 0.22 * S, 0.03 * S); ctx.fill();
    ctx.fillStyle = "#fdf3dc"; rr(ctx, -0.36 * S, -0.2 * S, 0.46 * S, 0.18 * S, 0.02 * S); ctx.fill();
    ctx.fillStyle = "#ff6fb2"; rr(ctx, -0.36 * S, -0.2 * S, 0.46 * S, 0.055 * S, 0.02 * S); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `900 ${0.045 * S}px "Nunito", sans-serif`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("ВОЛНА · ХИТЫ", -0.34 * S, -0.172 * S);
    // бобины
    const reel = (rx: number, dir: number) => {
      ctx.save();
      ctx.translate(rx, -0.085 * S);
      ctx.rotate(a.reelA * dir);
      ctx.fillStyle = "#2a2a32"; circ(ctx, 0, 0, 0.055 * S); ctx.fill();
      ctx.strokeStyle = "#fdf3dc"; ctx.lineWidth = 0.012 * S;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((k / 3) * Math.PI * 2) * 0.05 * S, Math.sin((k / 3) * Math.PI * 2) * 0.05 * S);
        ctx.stroke();
      }
      ctx.restore();
    };
    reel(-0.24 * S, 1);
    reel(-0.02 * S, a.ff ? 1.6 : 0.7);
    // счётчик
    ctx.fillStyle = "#17181c"; rr(ctx, 0.16 * S, -0.21 * S, 0.2 * S, 0.08 * S, 0.015 * S); ctx.fill();
    ctx.fillStyle = a.playing ? "#57e389" : "#8a8a94";
    ctx.font = `700 ${0.055 * S}px "IBM Plex Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText(String(Math.floor(a.counter)).padStart(3, "0"), 0.26 * S, -0.168 * S);
    // кнопки
    const btn = (bx: number, col: string, lbl: string, on: boolean) => {
      ctx.fillStyle = OUT; rr(ctx, bx - 0.065 * S, 0.06 * S, 0.13 * S, 0.15 * S, 0.03 * S); ctx.fill();
      ctx.fillStyle = on ? "#ffd166" : col;
      rr(ctx, bx - 0.055 * S, 0.07 * S, 0.11 * S, 0.13 * S, 0.025 * S); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `900 ${0.04 * S}px "Nunito", sans-serif`;
      ctx.fillText(lbl, bx, 0.138 * S);
    };
    btn(-0.25 * S, "#e05a39", "STOP", false);
    btn(-0.07 * S, "#2fc98a", "PLAY", a.playing && !a.ff);
    btn(0.11 * S, "#38b6ff", "FF≫", a.ff);
    // колесо громкости
    ctx.save();
    ctx.translate(0.47 * S, 0);
    ctx.rotate(a.volA);
    disc(ctx, 0, 0, 0.06 * S, "#e8e8f0", "#b0b0c0", "#6a6a78", OUT);
    ctx.fillStyle = OUT; ctx.fillRect(-0.008 * S, -0.055 * S, 0.016 * S, 0.035 * S);
    ctx.restore();
    ctx.fillStyle = "#1f5d8a"; ctx.font = `700 ${0.045 * S}px "Balsamiq Sans", cursive`;
    ctx.textAlign = "left";
    ctx.fillText("ВОЛНА-87", -0.4 * S, 0.265 * S);
    if (a.playing && phase !== "catalog") {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 6);
      ctx.fillStyle = "#57e389"; circ(ctx, 0.42 * S, -0.24 * S, 0.02 * S); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type === "down") {
      if (y > 0.05 * S && y < 0.22 * S) {
        if (x < -0.16 * S) { a.playing = false; a.ff = false; api.audio.powerDown(); }
        else if (x < 0.02 * S) { a.playing = true; a.ff = false; api.audio.jingle(); api.shake(2); }
        else if (x < 0.2 * S) { a.playing = true; a.ff = true; api.audio.mechClick(1.6); }
      } else if (Math.hypot(x - 0.47 * S, y) < 0.09 * S) { a.volDrag = true; a.lastY = y; }
    } else if (type === "move" && a.volDrag) {
      a.volA += (y - a.lastY) * 0.03; a.lastY = y;
      if (Math.random() < 0.1) api.audio.windRatchet();
    } else if (type === "up") a.volDrag = false;
  },
};

/* ================================================================
   ФОТОАППАРАТ «САЛЮТ-С» (Button)
   ================================================================ */
const camera: ArtifactDef = {
  id: "camera",
  name: "Фотоаппарат «Салют-С»",
  collection: "nostalgia",
  collectionLabel: "Ностальгия",
  materialLabel: "металл · оптика · плёнка",
  tagline: "Плёнка не протянута, затвор заел.",
  base: 150, par: 95, boundsMul: 0.56,
  aliveHint: "ЖМИ СПУСК — ЩЁЛК! · ТРОНЬ ОБЪЕКТИВ",
  drawMask(ctx, S) {
    rr(ctx, -0.42 * S, -0.24 * S, 0.84 * S, 0.5 * S, 0.05 * S); ctx.fill();
    circ(ctx, -0.08 * S, 0, 0.19 * S); ctx.fill();
    rr(ctx, -0.1 * S, -0.33 * S, 0.3 * S, 0.1 * S, 0.03 * S); ctx.fill();
  },
  createAnim() { return { flashT: 0, apT: 0, leverA: 0, leverAnim: 0, counter: 36 }; },
  update(a, dt) {
    a.flashT = Math.max(0, a.flashT - dt * 3);
    a.apT = Math.max(0, a.apT - dt * 2.5);
    a.leverAnim = Math.max(0, a.leverAnim - dt * 3);
    a.leverA = a.leverAnim * 0.9;
  },
  draw(ctx, S, a) {
    // корпус с «кожей»
    ctx.fillStyle = OUT; rr(ctx, -0.435 * S, -0.255 * S, 0.87 * S, 0.53 * S, 0.06 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.24 * S, 0, 0.26 * S, [[0, "#4a4a54"], [0.5, "#34343e"], [1, "#24242c"]]);
    rr(ctx, -0.42 * S, -0.24 * S, 0.84 * S, 0.5 * S, 0.05 * S); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < 40; i++) {
      const px = -0.4 * S + (i % 10) * 0.085 * S, py = -0.2 * S + Math.floor(i / 10) * 0.1 * S;
      circ(ctx, px, py, 0.008 * S); ctx.fill();
    }
    // верхняя стальная панель
    ctx.fillStyle = OUT; rr(ctx, -0.42 * S, -0.32 * S, 0.84 * S, 0.1 * S, 0.03 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.32 * S, 0, -0.22 * S, [[0, "#e8e8f0"], [1, "#a8a8b8"]]);
    rr(ctx, -0.41 * S, -0.31 * S, 0.82 * S, 0.085 * S, 0.025 * S); ctx.fill();
    // видоискатель
    ctx.fillStyle = "#17181c"; rr(ctx, 0.05 * S, -0.3 * S, 0.12 * S, 0.06 * S, 0.012 * S); ctx.fill();
    ctx.fillStyle = "#38b6ff"; rr(ctx, 0.06 * S, -0.29 * S, 0.1 * S, 0.04 * S, 0.008 * S); ctx.fill();
    // спуск
    ctx.fillStyle = OUT; circ(ctx, 0.3 * S, -0.28 * S, 0.05 * S); ctx.fill();
    ctx.fillStyle = "#e05a39"; circ(ctx, 0.3 * S, -0.285 * S, 0.042 * S); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; circ(ctx, 0.29 * S, -0.295 * S, 0.014 * S); ctx.fill();
    // рычаг взвода
    ctx.save();
    ctx.translate(0.36 * S, -0.28 * S);
    ctx.rotate(a.leverA);
    ctx.fillStyle = "#c8c8d4"; rr(ctx, 0, -0.012 * S, 0.1 * S, 0.024 * S, 0.012 * S); ctx.fill();
    ctx.fillStyle = OUT; circ(ctx, 0, 0, 0.02 * S); ctx.fill();
    ctx.restore();
    // объектив
    const lx = -0.08 * S;
    disc(ctx, lx, 0, 0.19 * S, "#5a5a68", "#3a3a44", "#1a1a22", OUT);
    disc(ctx, lx, 0, 0.15 * S, "#2a2a44", "#1a1a30", "#0d0d1a", "#3a3a44");
    // лепестки диафрагмы
    ctx.save();
    ctx.translate(lx, 0);
    ctx.rotate(a.apT * 0.8);
    ctx.fillStyle = "#0a0a14";
    for (let k = 0; k < 6; k++) {
      ctx.save();
      ctx.rotate((k / 6) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 0.11 * S * (1 - a.apT * 0.5), -0.5, 0.5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // фиолетовый блик просветления
    ctx.fillStyle = rad(ctx, lx - 0.04 * S, -0.05 * S, 0, 0.09 * S, [[0, "rgba(180,120,255,0.55)"], [1, "rgba(180,120,255,0)"]]);
    circ(ctx, lx - 0.04 * S, -0.05 * S, 0.09 * S); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)"; circ(ctx, lx - 0.06 * S, -0.07 * S, 0.02 * S); ctx.fill();
    // счётчик кадров
    ctx.fillStyle = "#17181c"; rr(ctx, -0.32 * S, -0.3 * S, 0.09 * S, 0.06 * S, 0.01 * S); ctx.fill();
    ctx.fillStyle = "#ffd166"; ctx.font = `700 ${0.045 * S}px "IBM Plex Mono", monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(a.counter).padStart(2, "0"), -0.275 * S, -0.268 * S);
    // вспышка
    if (a.flashT > 0) {
      ctx.globalAlpha = a.flashT;
      ctx.fillStyle = "#fff";
      rr(ctx, -0.42 * S, -0.24 * S, 0.84 * S, 0.5 * S, 0.05 * S); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type !== "down") return;
    if (Math.hypot(x - 0.3 * S, y + 0.28 * S) < 0.07 * S) {
      a.flashT = 1; a.leverAnim = 1;
      a.counter = Math.max(0, a.counter - 1);
      api.audio.shutter(); api.flash(0.5); api.shake(4);
      api.spawn("star", -0.08 * S, 0, 8, "#ffffff");
    } else if (Math.hypot(x + 0.08 * S, y) < 0.2 * S) {
      a.apT = 1; api.audio.mechClick(0.8);
    }
  },
};

/* ================================================================
   СКАРАБЕЙ «ХЕПРИ» (Hinge-крылья + Gem)
   ================================================================ */
const scarab: ArtifactDef = {
  id: "scarab",
  name: "Скарабей «Хепри»",
  collection: "treasure",
  collectionLabel: "Сокровища",
  materialLabel: "золото · бирюза",
  tagline: "Крылья сложены три тысячи лет.",
  base: 165, par: 85, boundsMul: 0.55,
  aliveHint: "ТРОНЬ СПИНКУ — КРЫЛЬЯ РАСКРОЮТСЯ!",
  drawMask(ctx, S) {
    ctx.beginPath(); ctx.ellipse(0, 0.08 * S, 0.26 * S, 0.32 * S, 0, 0, Math.PI * 2); ctx.fill();
    circ(ctx, 0, -0.3 * S, 0.12 * S); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-0.32 * S, 0, 0.14 * S, 0.24 * S, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.32 * S, 0, 0.14 * S, 0.24 * S, -0.3, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { openT: 0, open: false, legT: 0, sparkT: 0 }; },
  update(a, dt, api) {
    const S = api.S;
    const target = a.open ? 1 : 0;
    a.openT += (target - a.openT) * Math.min(1, dt * 5);
    if (a.open) {
      a.legT += dt * 6;
      a.sparkT += dt;
      if (a.sparkT > 0.5) {
        a.sparkT = 0;
        api.spawn("star", (Math.random() - 0.5) * 0.5 * S, (Math.random() - 0.5) * 0.4 * S, 1, "#7ff0d0");
      }
    }
  },
  draw(ctx, S, a, t) {
    const o = a.openT;
    // лапки
    ctx.strokeStyle = "#8a5a1e"; ctx.lineWidth = 0.03 * S; ctx.lineCap = "round";
    for (let sgn = -1; sgn <= 1; sgn += 2) {
      for (let k = 0; k < 3; k++) {
        const wig = a.open ? Math.sin(a.legT + k) * 0.05 * S : 0;
        ctx.beginPath();
        ctx.moveTo(sgn * 0.2 * S, (-0.1 + k * 0.15) * S);
        ctx.quadraticCurveTo(sgn * 0.34 * S, (-0.12 + k * 0.15) * S, sgn * 0.36 * S, (-0.02 + k * 0.16) * S + wig);
        ctx.stroke();
      }
    }
    // перепончатые крылья (раскрываются)
    for (let sgn = -1; sgn <= 1; sgn += 2) {
      ctx.save();
      ctx.translate(0, -0.14 * S);
      ctx.rotate(sgn * o * 0.9);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = lin(ctx, 0, 0, sgn * 0.4 * S, 0, [[0, "rgba(200,220,255,0.9)"], [1, "rgba(140,170,230,0.5)"]]);
      ctx.beginPath(); ctx.ellipse(sgn * 0.28 * S, 0.1 * S, 0.16 * S, 0.3 * S, sgn * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(120,150,210,0.5)"; ctx.lineWidth = 0.006 * S;
      for (let v = 0; v < 4; v++) {
        ctx.beginPath();
        ctx.moveTo(sgn * 0.16 * S, 0.1 * S);
        ctx.lineTo(sgn * (0.2 + v * 0.06) * S, (0.25 + v * 0.05) * S);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // надкрылья (бирюзовые, разъезжаются)
    for (let sgn = -1; sgn <= 1; sgn += 2) {
      ctx.save();
      ctx.rotate(sgn * o * 0.5);
      const bg = lin(ctx, sgn * -0.05 * S, 0, sgn * 0.3 * S, 0, [[0, "#2fc9b0"], [0.5, "#1da893"], [1, "#0d7a6a"]]);
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.ellipse(sgn * 0.01 * S, 0.08 * S, 0.145 * S, 0.31 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(sgn * 0.01 * S, 0.08 * S, 0.13 * S, 0.295 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.ellipse(sgn * -0.04 * S, -0.02 * S, 0.05 * S, 0.14 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // голова и грудка
    disc(ctx, 0, -0.3 * S, 0.12 * S, "#f8dd9a", "#d2a44e", "#8a5a1e", OUT);
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(0, -0.12 * S, 0.16 * S, 0.1 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.2 * S, 0, -0.04 * S, [[0, "#ffe9a8"], [1, "#c89848"]]);
    ctx.beginPath(); ctx.ellipse(0, -0.12 * S, 0.145 * S, 0.088 * S, 0, 0, Math.PI * 2); ctx.fill();
    // глазки
    ctx.fillStyle = "#2a1a08";
    circ(ctx, -0.05 * S, -0.32 * S, 0.02 * S); ctx.fill();
    circ(ctx, 0.05 * S, -0.32 * S, 0.02 * S); ctx.fill();
    // изумруд в спинке
    ctx.fillStyle = OUT; circ(ctx, 0, -0.12 * S, 0.045 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, 0, -0.12 * S, 0, 0.04 * S, [[0, "#7ff0d0"], [0.6, "#2fc98a"], [1, "#0d8a5a"]]);
    circ(ctx, 0, -0.12 * S, 0.038 * S); ctx.fill();
    if (o > 0.5) {
      ctx.globalAlpha = (o - 0.5) * 2 * (0.5 + 0.4 * Math.sin(t * 5));
      star4(ctx, 0.02 * S, -0.14 * S, 0.05 * S);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type === "down" && Math.hypot(x, y - 0.05 * S) < 0.4 * S) {
      a.open = !a.open;
      if (a.open) { api.audio.chime(); api.shake(3); api.spawn("star", 0, -0.1 * S, 14, "#7ff0d0"); }
      else api.audio.poof();
    }
  },
};

/* ================================================================
   КОРОНА «МАЛАЯ» (Gem Shimmer)
   ================================================================ */
const GEMS: [number, string, string, string][] = [
  [-0.22, "#ff5c7a", "#e0395c", "#8a1230"],
  [0, "#5cffb0", "#2fc98a", "#0d7a4a"],
  [0.22, "#5c9dff", "#3878f0", "#14388a"],
];
const crown: ArtifactDef = {
  id: "crown",
  name: "Корона «Малая»",
  collection: "treasure",
  collectionLabel: "Сокровища",
  materialLabel: "золото · самоцветы",
  tagline: "Камни потускнели, жемчуг пожелтел.",
  base: 175, par: 85, boundsMul: 0.55,
  aliveHint: "КАСАЙСЯ КАМНЕЙ — ОНИ ЗАПОЮТ!",
  drawMask(ctx, S) {
    rr(ctx, -0.38 * S, 0.08 * S, 0.76 * S, 0.2 * S, 0.06 * S); ctx.fill();
    for (const [gx] of GEMS) {
      ctx.beginPath();
      ctx.moveTo(gx * S - 0.1 * S, 0.1 * S);
      ctx.lineTo(gx * S, -0.32 * S);
      ctx.lineTo(gx * S + 0.1 * S, 0.1 * S);
      ctx.closePath(); ctx.fill();
    }
  },
  createAnim() { return { glow: [0, 0, 0], sparkAng: -1.2 }; },
  update(a, dt, api) {
    const S = api.S;
    for (let i = 0; i < 3; i++) a.glow[i] = Math.max(0, a.glow[i] - dt * 1.2);
    const target = Math.atan2(api.pointer.ly + 0.15 * S, api.pointer.lx);
    a.sparkAng += wrapAngle(target - a.sparkAng) * Math.min(1, dt * 6);
  },
  draw(ctx, S, a, t) {
    const gold = lin(ctx, 0, -0.3 * S, 0, 0.28 * S, [[0, "#ffe9a8"], [0.5, "#ffd35c"], [1, "#c89848"]]);
    // зубцы
    for (const [gx] of GEMS) {
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.moveTo(gx * S - 0.115 * S, 0.12 * S);
      ctx.lineTo(gx * S, -0.34 * S);
      ctx.lineTo(gx * S + 0.115 * S, 0.12 * S);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(gx * S - 0.095 * S, 0.12 * S);
      ctx.lineTo(gx * S, -0.31 * S);
      ctx.lineTo(gx * S + 0.095 * S, 0.12 * S);
      ctx.closePath(); ctx.fill();
    }
    // обод
    ctx.fillStyle = OUT; rr(ctx, -0.4 * S, 0.06 * S, 0.8 * S, 0.24 * S, 0.07 * S); ctx.fill();
    ctx.fillStyle = gold; rr(ctx, -0.38 * S, 0.08 * S, 0.76 * S, 0.2 * S, 0.06 * S); ctx.fill();
    ctx.strokeStyle = "rgba(255,250,230,0.6)"; ctx.lineWidth = 0.012 * S;
    rr(ctx, -0.34 * S, 0.1 * S, 0.68 * S, 0.05 * S, 0.02 * S); ctx.stroke();
    // камни и жемчуг
    GEMS.forEach(([gx, hi, mid, lo], i) => {
      const gy = -0.22 * S;
      const g = a.glow[i];
      ctx.fillStyle = OUT; circ(ctx, gx * S, gy, 0.085 * S); ctx.fill();
      ctx.fillStyle = rad(ctx, gx * S - 0.02 * S, gy - 0.02 * S, 0, 0.08 * S, [[0, hi], [0.6, mid], [1, lo]]);
      circ(ctx, gx * S, gy, 0.075 * S); ctx.fill();
      // грань-блик следует за светом
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * Math.abs(Math.sin(a.sparkAng + i))})`;
      ctx.beginPath();
      ctx.ellipse(gx * S - 0.02 * S, gy - 0.025 * S, 0.025 * S, 0.015 * S, -0.6, 0, Math.PI * 2);
      ctx.fill();
      if (g > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rad(ctx, gx * S, gy, 0, 0.2 * S * g, [[0, `rgba(255,255,255,${0.7 * g})`], [1, "rgba(255,255,255,0)"]]);
        circ(ctx, gx * S, gy, 0.2 * S * g); ctx.fill();
        ctx.restore();
      }
      // жемчужина на вершине
      ctx.fillStyle = OUT; circ(ctx, gx * S, -0.33 * S, 0.035 * S); ctx.fill();
      ctx.fillStyle = rad(ctx, gx * S - 0.01 * S, -0.34 * S, 0, 0.03 * S, [[0, "#ffffff"], [0.5, "#f0e8e0"], [1, "#c0b0a8"]]);
      circ(ctx, gx * S, -0.33 * S, 0.028 * S); ctx.fill();
    });
    // бегущий блик по ободу
    const sp = -2.1 + Math.sin(t * 0.6) * 0.35;
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 0.025 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 0.18 * S, 0.36 * S, sp, sp + 0.5); ctx.stroke();
    ctx.lineCap = "butt";
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type !== "down") return;
    GEMS.forEach(([gx], i) => {
      if (Math.hypot(x - gx * S, y + 0.22 * S) < 0.14 * S) {
        a.glow[i] = 1;
        api.audio.chimeNote(i / 2);
        api.shake(2);
        api.spawn("star", gx * S, -0.22 * S, 10, "#ffffff");
      }
    });
  },
};

/* ================================================================
   ШКАТУЛКА «СЕКРЕТ» (Hinge + монеты)
   ================================================================ */
const box: ArtifactDef = {
  id: "box",
  name: "Шкатулка «Секрет»",
  collection: "treasure",
  collectionLabel: "Сокровища",
  materialLabel: "дуб · латунь",
  tagline: "Замок заклинило, внутри что-то звенит.",
  base: 170, par: 90, boundsMul: 0.58,
  aliveHint: "КРУТИ ЗАМОК, ПОКА НЕ ЩЁЛКНЕТ!",
  drawMask(ctx, S) {
    rr(ctx, -0.38 * S, -0.02 * S, 0.76 * S, 0.36 * S, 0.05 * S); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.38 * S, -0.02 * S);
    ctx.quadraticCurveTo(0, -0.42 * S, 0.38 * S, -0.02 * S);
    ctx.closePath(); ctx.fill();
  },
  createAnim() { return { lidA: 0, unlocked: false, keyA: 0, keyDrag: false, lastA: 0, turnAcc: 0, burst: false }; },
  update(a, dt, api) {
    const S = api.S;
    a.lidA += ((a.unlocked ? 1.7 : 0) - a.lidA) * Math.min(1, dt * 4);
    if (a.unlocked && !a.burst) {
      a.burst = true;
      api.audio.coinBurst();
      api.shake(6);
      api.flash(0.3);
      for (let i = 0; i < 20; i++) api.spawn("star", (Math.random() - 0.5) * 0.5 * S, -0.1 * S, 1, "#ffd166");
    }
  },
  draw(ctx, S, a) {
    const wood = lin(ctx, 0, -0.4 * S, 0, 0.36 * S, [[0, "#c89858"], [0.5, "#a87838"], [1, "#8a5a20"]]);
    // дно с монетами (видно при открытой крышке)
    if (a.lidA > 0.3) {
      ctx.fillStyle = "#3a2408";
      ctx.beginPath(); ctx.ellipse(0, -0.02 * S, 0.34 * S, 0.1 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd166";
      for (let i = 0; i < 7; i++) {
        circ(ctx, -0.24 * S + i * 0.08 * S, -0.04 * S + (i % 2) * 0.03 * S, 0.03 * S); ctx.fill();
      }
    }
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.395 * S, -0.035 * S, 0.79 * S, 0.39 * S, 0.055 * S); ctx.fill();
    ctx.fillStyle = wood; rr(ctx, -0.38 * S, -0.02 * S, 0.76 * S, 0.36 * S, 0.05 * S); ctx.fill();
    ctx.strokeStyle = "rgba(60,36,10,0.4)"; ctx.lineWidth = 0.008 * S;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(-0.36 * S, (-0.02 + k * 0.09) * S); ctx.lineTo(0.36 * S, (-0.02 + k * 0.09) * S); ctx.stroke();
    }
    // латунные накладки
    ctx.fillStyle = OUT; ctx.fillRect(-0.38 * S, -0.02 * S, 0.76 * S, 0.045 * S);
    ctx.fillStyle = "#d2a44e"; ctx.fillRect(-0.365 * S, -0.012 * S, 0.73 * S, 0.03 * S);
    // крышка на петле
    ctx.save();
    ctx.translate(0, -0.02 * S);
    ctx.rotate(-a.lidA);
    ctx.fillStyle = OUT;
    ctx.beginPath();
    ctx.moveTo(-0.395 * S, 0.015 * S);
    ctx.quadraticCurveTo(0, -0.44 * S, 0.395 * S, 0.015 * S);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(-0.38 * S, 0);
    ctx.quadraticCurveTo(0, -0.42 * S, 0.38 * S, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d2a44e"; ctx.fillRect(-0.3 * S, -0.16 * S, 0.6 * S, 0.04 * S);
    // замок-замок с ключом
    disc(ctx, 0, -0.08 * S, 0.07 * S, "#ffe1a0", "#d2a04a", "#8a5a1e", OUT);
    ctx.save();
    ctx.translate(0, -0.08 * S);
    ctx.rotate(a.keyA);
    ctx.fillStyle = "#3a2a10";
    circ(ctx, 0, 0, 0.02 * S); ctx.fill();
    ctx.fillRect(-0.006 * S, 0, 0.012 * S, 0.035 * S);
    ctx.restore();
    ctx.restore();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type === "down") {
      if (!a.unlocked && Math.hypot(x, y + 0.1 * S) < 0.14 * S) { a.keyDrag = true; a.lastA = Math.atan2(y + 0.1 * S, x); }
      else if (a.unlocked && y < -0.05 * S) { a.unlocked = false; a.burst = false; api.audio.creak(); }
    } else if (type === "move" && a.keyDrag) {
      const ang = Math.atan2(y + 0.1 * S, x);
      const d = wrapAngle(ang - a.lastA);
      a.lastA = ang;
      a.keyA += d;
      a.turnAcc += Math.abs(d);
      if (Math.abs(d) > 0.05 && Math.random() < 0.3) api.audio.windRatchet();
      if (a.turnAcc > Math.PI * 2.2) { a.unlocked = true; a.keyDrag = false; api.audio.mechClick(0.6); api.audio.creak(); }
    } else if (type === "up") a.keyDrag = false;
  },
};

export const EXTRA_ARTIFACTS: ArtifactDef[] = [compass, zippo, key, walkman, camera, scarab, crown, box];
