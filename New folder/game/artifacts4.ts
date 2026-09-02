import type { ArtifactDef } from "./types";
import { clamp } from "./rng";
import { OUT, lin, rad, rr, circ, star4 } from "./artifacts";

/* ================================================================
   КОЛЛЕКЦИЯ «РЕТРО-ТЕХНИКА»
   ================================================================ */

/* ---- РАДИО «ЭФИР» (Rotator/Balance) ---- */
const radio: ArtifactDef = {
  id: "radio",
  name: "Радио «Эфир»",
  collection: "tech",
  collectionLabel: "Техника",
  materialLabel: "бакелит · ткань",
  tagline: "Покрути настройку — поймай волну!",
  base: 170, par: 90, boundsMul: 0.62,
  aliveHint: "ВКЛЮЧИ И КРУТИ НАСТРОЙКУ — ЛОВИ МЕЛОДИИ!",
  drawMask(ctx, S) {
    rr(ctx, -0.4 * S, -0.3 * S, 0.8 * S, 0.56 * S, 0.06 * S); ctx.fill();
    ctx.fillRect(-0.3 * S, -0.36 * S, 0.03 * S, 0.08 * S);
    ctx.fillRect(0.27 * S, -0.36 * S, 0.03 * S, 0.08 * S);
  },
  createAnim() { return { powered: false, dial: 0, lastX: 0, dragging: false, station: -1, staticT: 0, tuneT: 0 }; },
  update(a, dt, api) {
    a.staticT -= dt; a.tuneT -= dt;
    if (!a.powered) { a.station = -1; return; }
    // 3 станции на шкале
    const pos = ((a.dial % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const stations = [0.8, 2.9, 4.9];
    let nearest = -1, best = 99;
    stations.forEach((s, i) => {
      const d = Math.abs(((pos - s + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < 0.35 && d < best) { best = d; nearest = i; }
    });
    a.station = nearest;
    if (nearest >= 0) {
      if (a.tuneT <= 0) { a.tuneT = 0.35; api.audio.musicNote(nearest * 2 + Math.floor(api.t * 3)); }
    } else if (a.staticT <= 0) {
      a.staticT = 0.12;
      api.audio.radioStatic();
    }
  },
  draw(ctx, S, a, t) {
    // антенны
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.016 * S;
    ctx.beginPath(); ctx.moveTo(-0.28 * S, -0.3 * S); ctx.lineTo(-0.36 * S, -0.5 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.28 * S, -0.3 * S); ctx.lineTo(0.36 * S, -0.5 * S); ctx.stroke();
    ctx.fillStyle = "#ff6b6b"; circ(ctx, -0.36 * S, -0.5 * S, 0.02 * S); ctx.fill();
    ctx.fillStyle = "#38b6ff"; circ(ctx, 0.36 * S, -0.5 * S, 0.02 * S); ctx.fill();
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.41 * S, -0.31 * S, 0.82 * S, 0.58 * S, 0.07 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.3 * S, 0, 0.26 * S, [[0, "#8f5f24"], [0.5, "#a8702e"], [1, "#7a4f1e"]]);
    rr(ctx, -0.4 * S, -0.3 * S, 0.8 * S, 0.56 * S, 0.06 * S); ctx.fill();
    // шкала настройки
    ctx.fillStyle = OUT; rr(ctx, -0.32 * S, -0.22 * S, 0.64 * S, 0.12 * S, 0.04 * S); ctx.fill();
    ctx.fillStyle = a.powered ? (a.station >= 0 ? "#c8f58a" : "#3a2b1e") : "#2b1f12";
    rr(ctx, -0.3 * S, -0.2 * S, 0.6 * S, 0.08 * S, 0.03 * S); ctx.fill();
    if (a.powered) {
      // деления
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 0.006 * S;
      for (let i = 0; i <= 10; i++) {
        const x = -0.28 * S + i * 0.056 * S;
        ctx.beginPath(); ctx.moveTo(x, -0.19 * S); ctx.lineTo(x, -0.13 * S); ctx.stroke();
      }
      // стрелка
      const pos = ((a.dial % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const nx = -0.3 * S + (pos / (Math.PI * 2)) * 0.6 * S;
      ctx.strokeStyle = a.station >= 0 ? "#4de08a" : "#ff6b6b";
      ctx.lineWidth = 0.012 * S;
      ctx.beginPath(); ctx.moveTo(nx, -0.2 * S); ctx.lineTo(nx, -0.12 * S); ctx.stroke();
    }
    // динамик-ткань
    ctx.fillStyle = OUT; circ(ctx, -0.15 * S, 0.05 * S, 0.16 * S); ctx.fill();
    ctx.fillStyle = "#d9c49a"; circ(ctx, -0.15 * S, 0.05 * S, 0.145 * S); ctx.fill();
    ctx.strokeStyle = "#b09a6e"; ctx.lineWidth = 0.006 * S;
    for (let i = 1; i <= 4; i++) { circ(ctx, -0.15 * S, 0.05 * S, i * 0.034 * S); ctx.stroke(); }
    if (a.powered && a.station >= 0) {
      ctx.strokeStyle = "#4de08a"; ctx.lineWidth = 0.01 * S;
      const w = Math.sin(t * 14) * 0.03 * S;
      ctx.beginPath(); ctx.arc(-0.15 * S, 0.05 * S, 0.16 * S + w, 0, Math.PI * 2); ctx.stroke();
    }
    // ручка настройки
    ctx.save();
    ctx.translate(0.2 * S, 0.05 * S);
    ctx.rotate(a.dial);
    ctx.fillStyle = OUT; circ(ctx, 0, 0, 0.12 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.03 * S, -0.04 * S, 0.01 * S, 0.11 * S, [[0, "#ffe1a0"], [1, "#c98f2c"]]);
    circ(ctx, 0, 0, 0.105 * S); ctx.fill();
    ctx.fillStyle = "#8f5f24"; rr(ctx, -0.008 * S, -0.1 * S, 0.016 * S, 0.06 * S, 0.008 * S); ctx.fill();
    ctx.restore();
    // тумблер
    ctx.fillStyle = OUT; rr(ctx, 0.12 * S, -0.04 * S, 0.1 * S, 0.03 * S, 0.014 * S); ctx.fill();
    ctx.fillStyle = a.powered ? "#4de08a" : "#8d877c";
    rr(ctx, (a.powered ? 0.168 : 0.128) * S, -0.035 * S, 0.044 * S, 0.02 * S, 0.01 * S); ctx.fill();
    // индикатор
    ctx.fillStyle = a.powered ? "#4de08a" : "#3a3f3a"; circ(ctx, 0.33 * S, 0.18 * S, 0.018 * S); ctx.fill();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type === "down") {
      if (x > 0.1 * S && x < 0.24 * S && y > -0.06 * S && y < 0) {
        a.powered = !a.powered;
        if (a.powered) { api.audio.ui(); api.audio.blip(500); } else api.audio.powerDown();
        return;
      }
      if (Math.hypot(x - 0.2 * S, y - 0.05 * S) < 0.16 * S) { a.dragging = true; a.lastX = x; }
    } else if (type === "move" && a.dragging) {
      a.dial += (x - a.lastX) * 0.012;
      a.lastX = x;
      if (Math.random() < 0.2) api.audio.crank();
    } else if (type === "up") { a.dragging = false; }
  },
};

/* ---- ТЕЛЕВИЗОР «РАДУГА» (Button) ---- */
const tv: ArtifactDef = {
  id: "tv",
  name: "Телевизор «Радуга»",
  collection: "tech",
  collectionLabel: "Техника",
  materialLabel: "дерево · кинескоп",
  tagline: "Щёлкай каналы — что покажут?",
  base: 175, par: 92, boundsMul: 0.6,
  aliveHint: "ВКЛЮЧИ И КРУТИ РУЧКУ — ПЕРЕКЛЮЧАЙ КАНАЛЫ!",
  drawMask(ctx, S) {
    rr(ctx, -0.4 * S, -0.32 * S, 0.8 * S, 0.6 * S, 0.05 * S); ctx.fill();
    ctx.fillRect(-0.34 * S, 0.28 * S, 0.06 * S, 0.1 * S);
    ctx.fillRect(0.28 * S, 0.28 * S, 0.06 * S, 0.1 * S);
    ctx.fillRect(-0.02 * S, -0.44 * S, 0.04 * S, 0.14 * S);
  },
  createAnim() { return { powered: false, channel: 0, staticT: 0, knobDrag: false, lastY: 0 }; },
  update(a, dt, api) {
    if (a.powered && a.channel === 0) {
      a.staticT -= dt;
      if (a.staticT <= 0) { a.staticT = 0.08; if (Math.random() < 0.4) api.audio.tvStatic(); }
    }
  },
  draw(ctx, S, a, t) {
    // антенна
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.014 * S;
    ctx.beginPath(); ctx.moveTo(0, -0.32 * S); ctx.lineTo(-0.12 * S, -0.46 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -0.32 * S); ctx.lineTo(0.12 * S, -0.46 * S); ctx.stroke();
    ctx.fillStyle = "#ffc63d"; circ(ctx, 0, -0.34 * S, 0.03 * S); ctx.fill();
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.41 * S, -0.33 * S, 0.82 * S, 0.62 * S, 0.06 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.32 * S, 0, 0.28 * S, [[0, "#c98f4a"], [1, "#8f5f24"]]);
    rr(ctx, -0.4 * S, -0.32 * S, 0.8 * S, 0.6 * S, 0.05 * S); ctx.fill();
    // экран
    ctx.fillStyle = OUT; rr(ctx, -0.32 * S, -0.26 * S, 0.5 * S, 0.46 * S, 0.06 * S); ctx.fill();
    const sx = -0.29 * S, sy = -0.23 * S, sw = 0.44 * S, sh = 0.4 * S;
    if (!a.powered) {
      ctx.fillStyle = "#26221c"; rr(ctx, sx, sy, sw, sh, 0.04 * S); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw * 0.5, sy); ctx.lineTo(sx + sw * 0.25, sy + sh); ctx.lineTo(sx, sy + sh); ctx.fill();
    } else if (a.channel === 0) {
      // помехи
      ctx.fillStyle = "#3a3a3a"; rr(ctx, sx, sy, sw, sh, 0.04 * S); ctx.fill();
      ctx.save(); rr(ctx, sx, sy, sw, sh, 0.04 * S); ctx.clip();
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.2})`;
        ctx.fillRect(sx + Math.random() * sw, sy + Math.random() * sh, 2 + Math.random() * 5, 1.5);
      }
      ctx.restore();
    } else if (a.channel === 1) {
      // цветные полосы
      const cols = ["#ffffff", "#ffc63d", "#38b6ff", "#4de08a", "#e24e94", "#ff6b6b"];
      ctx.save(); rr(ctx, sx, sy, sw, sh, 0.04 * S); ctx.clip();
      cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(sx + (i / 6) * sw, sy, sw / 6 + 1, sh); });
      ctx.restore();
    } else {
      // мультик: солнышко и холм
      ctx.save(); rr(ctx, sx, sy, sw, sh, 0.04 * S); ctx.clip();
      ctx.fillStyle = "#7fdcff"; ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = "#ffc63d"; circ(ctx, sx + sw * 0.75, sy + sh * 0.25, sh * 0.16); ctx.fill();
      ctx.fillStyle = "#4de08a";
      ctx.beginPath(); ctx.ellipse(sx + sw * 0.3, sy + sh * 1.05, sw * 0.6, sh * 0.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff";
      const cxo = sx + ((t * 0.12) % 1.3 - 0.15) * sw;
      circ(ctx, cxo, sy + sh * 0.35, sh * 0.08); ctx.fill();
      circ(ctx, cxo + sh * 0.09, sy + sh * 0.33, sh * 0.06); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.008 * S;
    ctx.beginPath(); ctx.moveTo(sx + sw * 0.1, sy + sh * 0.08); ctx.lineTo(sx + sw * 0.4, sy + sh * 0.08); ctx.stroke();
    // панель ручек
    ctx.fillStyle = "#7a4f1e"; rr(ctx, 0.2 * S, -0.26 * S, 0.17 * S, 0.46 * S, 0.04 * S); ctx.fill();
    for (let i = 0; i < 2; i++) {
      const ky = (-0.16 + i * 0.18) * S;
      ctx.fillStyle = OUT; circ(ctx, 0.285 * S, ky, 0.055 * S); ctx.fill();
      ctx.fillStyle = rad(ctx, 0.27 * S, ky - 0.015 * S, 0.005 * S, 0.05 * S, [[0, "#ffe1a0"], [1, "#c98f2c"]]);
      circ(ctx, 0.285 * S, ky, 0.045 * S); ctx.fill();
      ctx.fillStyle = "#7a4f1e"; rr(ctx, 0.278 * S, ky - 0.045 * S, 0.013 * S, 0.03 * S, 0.006 * S); ctx.fill();
    }
    // динамик
    ctx.strokeStyle = "#7a4f1e"; ctx.lineWidth = 0.012 * S;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(0.22 * S, (0.12 + i * 0.026) * S); ctx.lineTo(0.35 * S, (0.12 + i * 0.026) * S); ctx.stroke();
    }
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type !== "down") return;
    // нижняя ручка — канал
    if (Math.hypot(x - 0.285 * S, y - 0.02 * S) < 0.09 * S) {
      a.channel = (a.channel + 1) % 3;
      if (a.powered) api.audio.blip(700 + a.channel * 200);
      return;
    }
    // верхняя ручка — питание
    if (Math.hypot(x - 0.285 * S, y + 0.16 * S) < 0.09 * S) {
      a.powered = !a.powered;
      a.channel = a.powered ? 0 : a.channel;
      if (a.powered) { api.audio.ui(); api.audio.tvStatic(); } else api.audio.powerDown();
      return;
    }
  },
};

/* ---- ДИСКОВЫЙ ТЕЛЕФОН «АЛЛО» (Rotator) ---- */
const phone: ArtifactDef = {
  id: "phone",
  name: "Телефон «Алло»",
  collection: "tech",
  collectionLabel: "Техника",
  materialLabel: "бакелит · диск",
  tagline: "Покрути диск — позвони другу!",
  base: 165, par: 88, boundsMul: 0.6,
  aliveHint: "КРУТИ ДИСК ДО УПОРА — ЗВОНОК!",
  drawMask(ctx, S) {
    rr(ctx, -0.38 * S, -0.18 * S, 0.76 * S, 0.5 * S, 0.08 * S); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -0.3 * S, 0.3 * S, 0.08 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0.05 * S, 0.2 * S, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { dialA: 0, spinning: false, lastA: 0, ringing: 0, shake: 0, ringT: 0 }; },
  update(a, dt, api) {
    if (a.ringing > 0) {
      a.ringing -= dt;
      a.shake = Math.sin(api.t * 40) * 0.02 * S0(api);
      a.ringT -= dt;
      if (a.ringT <= 0) { a.ringT = 0.5; api.audio.phoneRing(); }
    } else a.shake = 0;
    if (!a.spinning) {
      // диск возвращается
      a.dialA *= Math.pow(0.05, dt);
    }
  },
  draw(ctx, S, a) {
    ctx.save();
    ctx.translate(a.shake, 0);
    // трубка сверху
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(0, -0.3 * S, 0.31 * S, 0.09 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.38 * S, 0, -0.22 * S, [[0, "#5a6b7d"], [1, "#3a4654"]]);
    ctx.beginPath(); ctx.ellipse(0, -0.3 * S, 0.3 * S, 0.08 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b3440";
    ctx.beginPath(); ctx.ellipse(-0.24 * S, -0.3 * S, 0.07 * S, 0.08 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.24 * S, -0.3 * S, 0.07 * S, 0.08 * S, 0, 0, Math.PI * 2); ctx.fill();
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.39 * S, -0.19 * S, 0.78 * S, 0.52 * S, 0.09 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.18 * S, 0, 0.32 * S, [[0, "#e24e94"], [0.5, "#c93d7f"], [1, "#a83268"]]);
    rr(ctx, -0.38 * S, -0.18 * S, 0.76 * S, 0.5 * S, 0.08 * S); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 0.01 * S;
    ctx.beginPath(); ctx.moveTo(-0.3 * S, -0.14 * S); ctx.quadraticCurveTo(0, -0.2 * S, 0.3 * S, -0.14 * S); ctx.stroke();
    // диск набора
    ctx.fillStyle = OUT; circ(ctx, 0, 0.07 * S, 0.21 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.05 * S, 0.02 * S, 0.02 * S, 0.2 * S, [[0, "#fdf3dc"], [1, "#d9c49a"]]);
    circ(ctx, 0, 0.07 * S, 0.2 * S); ctx.fill();
    ctx.save();
    ctx.translate(0, 0.07 * S);
    ctx.rotate(a.dialA);
    // отверстия
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = "#a83268";
      circ(ctx, Math.cos(ang) * 0.13 * S, Math.sin(ang) * 0.13 * S, 0.028 * S); ctx.fill();
      ctx.fillStyle = "#7a2450";
      circ(ctx, Math.cos(ang) * 0.13 * S, Math.sin(ang) * 0.13 * S, 0.02 * S); ctx.fill();
    }
    ctx.restore();
    // центр
    ctx.fillStyle = "#c93d7f"; circ(ctx, 0, 0.07 * S, 0.06 * S); ctx.fill();
    ctx.fillStyle = "#fdf3dc"; circ(ctx, 0, 0.07 * S, 0.045 * S); ctx.fill();
    // упор
    ctx.fillStyle = "#7a2450"; rr(ctx, 0.12 * S, 0.2 * S, 0.02 * S, 0.07 * S, 0.01 * S); ctx.fill();
    ctx.restore();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const cx = 0, cy = 0.07 * S;
    if (type === "down") {
      if (Math.hypot(x - cx, y - cy) < 0.24 * S) { a.spinning = true; a.lastA = Math.atan2(y - cy, x - cx); }
    } else if (type === "move" && a.spinning) {
      const ang = Math.atan2(y - cy, x - cx);
      let d = ang - a.lastA;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      a.lastA = ang;
      a.dialA = clamp(a.dialA + d, -0.1, Math.PI * 1.5);
      if (Math.abs(d) > 0.15) api.audio.crank();
    } else if (type === "up") {
      a.spinning = false;
      if (a.dialA > Math.PI * 1.1) {
        a.ringing = 2.5;
        a.ringT = 0;
        api.spawn("star", 0, -0.35 * api.S, 6, "#ffd166");
      }
    }
  },
};

function S0(api: { S: number }) { return api.S; }

/* ---- ПАТЕФОН-ПЛАСТИНКА «ВИНИЛ» (Rotator) ---- */
const vinyl: ArtifactDef = {
  id: "vinyl",
  name: "Патефон «Винил»",
  collection: "tech",
  collectionLabel: "Техника",
  materialLabel: "винил · тонарм",
  tagline: "Опусти иглу — закрутится винил!",
  base: 170, par: 90, boundsMul: 0.62,
  aliveHint: "НАЖМИ НА ИГЛУ — ВКЛЮЧИ ПЛАСТИНКУ!",
  drawMask(ctx, S) {
    rr(ctx, -0.4 * S, -0.12 * S, 0.8 * S, 0.42 * S, 0.05 * S); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -0.12 * S, 0.3 * S, 0.1 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -0.14 * S, 0.26 * S, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { discA: 0, playing: false, arm: 0, noteT: 0, noteI: 0 }; },
  update(a, dt, api) {
    if (a.playing) {
      a.discA += dt * 4;
      a.arm = Math.min(1, a.arm + dt * 2);
      a.noteT -= dt;
      if (a.noteT <= 0) { a.noteT = 0.32; a.noteI++; api.audio.musicNote(a.noteI); }
    } else {
      a.arm = Math.max(0, a.arm - dt * 3);
      a.discA *= Math.pow(0.2, dt);
    }
  },
  draw(ctx, S, a, t) {
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.41 * S, -0.13 * S, 0.82 * S, 0.44 * S, 0.05 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.12 * S, 0, 0.3 * S, [[0, "#46c9bd"], [1, "#1f7d74"]]);
    rr(ctx, -0.4 * S, -0.12 * S, 0.8 * S, 0.42 * S, 0.05 * S); ctx.fill();
    ctx.strokeStyle = "#156a60"; ctx.lineWidth = 0.01 * S;
    rr(ctx, -0.34 * S, 0.18 * S, 0.68 * S, 0.08 * S, 0.02 * S); ctx.stroke();
    // диск
    ctx.save();
    ctx.translate(-0.06 * S, -0.14 * S);
    ctx.fillStyle = OUT; circ(ctx, 0, 0, 0.27 * S); ctx.fill();
    ctx.fillStyle = "#2b1a08"; circ(ctx, 0, 0, 0.255 * S); ctx.fill();
    ctx.save();
    ctx.rotate(a.discA);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 0.005 * S;
    for (let i = 0; i < 5; i++) { circ(ctx, 0, 0, (0.07 + i * 0.038) * S); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 0.24 * S, 0.3, 0.9); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#e8a413"; circ(ctx, 0, 0, 0.075 * S); ctx.fill();
    ctx.fillStyle = "#4a2f14"; circ(ctx, 0, 0, 0.012 * S); ctx.fill();
    ctx.restore();
    // тонарм
    ctx.save();
    ctx.translate(0.3 * S, -0.2 * S);
    ctx.rotate(-0.9 + a.arm * 1.0);
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.05 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.34 * S); ctx.stroke();
    ctx.strokeStyle = "#8d97a5"; ctx.lineWidth = 0.03 * S;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.34 * S); ctx.stroke();
    ctx.fillStyle = "#8d97a5"; rr(ctx, -0.025 * S, 0.3 * S, 0.05 * S, 0.07 * S, 0.02 * S); ctx.fill();
    ctx.fillStyle = "#ffd166"; rr(ctx, -0.012 * S, 0.36 * S, 0.024 * S, 0.02 * S, 0.008 * S); ctx.fill();
    ctx.lineCap = "butt";
    ctx.restore();
    ctx.fillStyle = OUT; circ(ctx, 0.3 * S, -0.2 * S, 0.05 * S); ctx.fill();
    ctx.fillStyle = "#c8ccd6"; circ(ctx, 0.3 * S, -0.2 * S, 0.035 * S); ctx.fill();
    // нотки
    if (a.playing) {
      ctx.fillStyle = "#7fdcff";
      star4(ctx, 0.2 * S, (-0.3 - Math.abs(Math.sin(t * 4)) * 0.06) * S, 0.03 * S); ctx.fill();
    }
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type === "down") {
      if (Math.hypot(x - 0.3 * S, y + 0.2 * S) < 0.12 * S || Math.hypot(x + 0.06 * S, y + 0.14 * S) < 0.28 * S) {
        a.playing = !a.playing;
        api.audio.ui();
        if (a.playing) { a.noteI = 0; a.noteT = 0; api.audio.musicNote(0); }
      }
    }
  },
};

/* ================================================================
   КОЛЛЕКЦИЯ «МОРЕ»
   ================================================================ */

/* ---- ПОДЗОРНАЯ ТРУБА «КАПИТАН» (Button) ---- */
const scope: ArtifactDef = {
  id: "scope",
  name: "Труба «Капитан»",
  collection: "sea",
  collectionLabel: "Море",
  materialLabel: "латунь · линзы",
  tagline: "Раздвинь секции — взгляни вдаль!",
  base: 160, par: 85, boundsMul: 0.6,
  aliveHint: "ТАПАЙ — РАЗДВИГАЙ И СДВИГАЙ СЕКЦИИ!",
  drawMask(ctx, S) {
    ctx.save();
    ctx.rotate(-0.42);
    rr(ctx, -0.42 * S, -0.09 * S, 0.84 * S, 0.18 * S, 0.08 * S); ctx.fill();
    ctx.restore();
  },
  createAnim() { return { ext: 0, target: 0, gleam: 0 }; },
  update(a, dt, api) {
    a.ext += (a.target - a.ext) * Math.min(1, dt * 8);
    a.gleam = Math.max(0, a.gleam - dt * 1.5);
    if (Math.abs(a.target - a.ext) > 0.02 && Math.random() < dt * 10) api.audio.crank();
  },
  draw(ctx, S, a, t) {
    ctx.save();
    ctx.rotate(-0.42);
    const ext = a.ext;
    const segs = [
      { w: 0.18, col: ["#e8a413", "#c98f2c"] as [string, string], off: 0 },
      { w: 0.15, col: ["#f2b566", "#d99a44"] as [string, string], off: ext * 0.24 },
      { w: 0.12, col: ["#e8a413", "#b07a28"] as [string, string], off: ext * 0.48 },
    ];
    let x0 = -0.42 * S;
    segs.forEach((sg, i) => {
      const w = (sg.w + (i === 2 ? ext * 0.2 : 0)) * S;
      const h = (0.16 - i * 0.025) * S;
      ctx.fillStyle = OUT;
      rr(ctx, x0 + sg.off * S - 0.008 * S, -h / 2 - 0.008 * S, w + 0.016 * S, h + 0.016 * S, h / 2); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, -h / 2, 0, h / 2, [[0, sg.col[0]], [0.5, "#ffe1a0"], [1, sg.col[1]]]);
      rr(ctx, x0 + sg.off * S, -h / 2, w, h, h / 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      rr(ctx, x0 + sg.off * S + w * 0.1, -h * 0.34, w * 0.8, h * 0.14, h * 0.07); ctx.fill();
      x0 += w + 0.01 * S;
    });
    // объектив
    ctx.fillStyle = OUT; circ(ctx, x0 - 0.01 * S, 0, 0.115 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, x0 - 0.03 * S, -0.03 * S, 0.01 * S, 0.1 * S, [[0, "#bfe4ff"], [0.6, "#38b6ff"], [1, "#1e6db8"]]);
    circ(ctx, x0 - 0.01 * S, 0, 0.1 * S); ctx.fill();
    if (a.gleam > 0) {
      ctx.fillStyle = `rgba(255,255,255,${a.gleam * 0.8})`;
      star4(ctx, x0 - 0.04 * S, -0.04 * S, 0.05 * S * a.gleam); ctx.fill();
    }
    // блик по длине
    ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.1 * Math.sin(t * 2)})`;
    ctx.lineWidth = 0.014 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-0.38 * S, -0.05 * S); ctx.lineTo(-0.1 * S, -0.05 * S); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
  },
  onPointer(api, a, type) {
    if (type === "down") {
      a.target = a.target > 0.5 ? 0 : 1;
      a.gleam = 1;
      api.audio.crank();
      api.audio.blip(900);
    }
  },
};

/* ---- КОРАБЛИК В БУТЫЛКЕ «БРИЗ» (Button) ---- */
const ship: ArtifactDef = {
  id: "ship",
  name: "Кораблик «Бриз»",
  collection: "sea",
  collectionLabel: "Море",
  materialLabel: "стекло · парусник",
  tagline: "Покачай бутылку — кораблик поплывёт!",
  base: 170, par: 90, boundsMul: 0.58,
  aliveHint: "ТОЛКАЙ БУТЫЛКУ — КОРАБЛИК ПОКАЧАЕТСЯ!",
  drawMask(ctx, S) {
    rr(ctx, -0.2 * S, -0.34 * S, 0.4 * S, 0.6 * S, 0.18 * S); ctx.fill();
    rr(ctx, -0.07 * S, -0.44 * S, 0.14 * S, 0.12 * S, 0.04 * S); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -0.45 * S, 0.09 * S, 0.035 * S, 0, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { rock: 0, rockV: 0, waveT: 0, dragging: false, lastX: 0 }; },
  update(a, dt, api) {
    if (!a.dragging) {
      a.rockV += -a.rock * 18 * dt;
      a.rockV *= Math.pow(0.35, dt);
    } else a.rockV = 0;
    a.rock += a.rockV * dt;
    a.waveT += dt * (1 + Math.abs(a.rock) * 2);
    if (Math.abs(a.rockV) > 2 && Math.random() < dt * 5) api.audio.splash();
  },
  draw(ctx, S, a) {
    ctx.save();
    ctx.rotate(a.rock * 0.4);
    // кораблик внутри (качается наоборот)
    ctx.save();
    ctx.translate(0, 0.12 * S + Math.sin(a.waveT * 3) * 0.015 * S);
    ctx.rotate(-a.rock * 0.6 + Math.sin(a.waveT * 3) * 0.1);
    // корпус
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-0.13 * S, 0.02 * S); ctx.lineTo(0.13 * S, 0.02 * S);
    ctx.lineTo(0.09 * S, 0.09 * S); ctx.lineTo(-0.09 * S, 0.09 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, 0.02 * S, 0, 0.09 * S, [[0, "#c98f4a"], [1, "#8f5f24"]]);
    ctx.beginPath(); ctx.moveTo(-0.12 * S, 0.025 * S); ctx.lineTo(0.12 * S, 0.025 * S);
    ctx.lineTo(0.085 * S, 0.085 * S); ctx.lineTo(-0.085 * S, 0.085 * S); ctx.closePath(); ctx.fill();
    // мачта и парус
    ctx.strokeStyle = "#7a4f1e"; ctx.lineWidth = 0.012 * S;
    ctx.beginPath(); ctx.moveTo(0, 0.02 * S); ctx.lineTo(0, -0.16 * S); ctx.stroke();
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(0.01 * S, -0.15 * S); ctx.lineTo(0.1 * S, -0.02 * S); ctx.lineTo(0.01 * S, -0.02 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fdf3dc";
    ctx.beginPath(); ctx.moveTo(0.015 * S, -0.14 * S); ctx.lineTo(0.095 * S, -0.025 * S); ctx.lineTo(0.015 * S, -0.025 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath(); ctx.moveTo(0, -0.16 * S); ctx.lineTo(0.06 * S, -0.145 * S); ctx.lineTo(0, -0.13 * S); ctx.closePath(); ctx.fill();
    ctx.restore();
    // вода
    ctx.save();
    ctx.beginPath(); rr(ctx, -0.19 * S, -0.33 * S, 0.38 * S, 0.58 * S, 0.17 * S); ctx.clip();
    ctx.fillStyle = "rgba(56,182,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(-0.2 * S, 0.2 * S);
    for (let x = -0.2; x <= 0.2; x += 0.05) {
      ctx.lineTo(x * S, (0.19 + Math.sin(a.waveT * 4 + x * 20) * 0.012) * S);
    }
    ctx.lineTo(0.2 * S, 0.3 * S); ctx.lineTo(-0.2 * S, 0.3 * S); ctx.closePath(); ctx.fill();
    ctx.restore();
    // стекло
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.02 * S;
    rr(ctx, -0.2 * S, -0.34 * S, 0.4 * S, 0.6 * S, 0.18 * S); ctx.stroke();
    ctx.fillStyle = "rgba(191,228,255,0.14)";
    rr(ctx, -0.2 * S, -0.34 * S, 0.4 * S, 0.6 * S, 0.18 * S); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.014 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-0.14 * S, -0.26 * S); ctx.quadraticCurveTo(-0.17 * S, -0.05 * S, -0.14 * S, 0.1 * S); ctx.stroke();
    ctx.lineCap = "butt";
    // горлышко и пробка
    ctx.fillStyle = OUT; rr(ctx, -0.075 * S, -0.45 * S, 0.15 * S, 0.12 * S, 0.03 * S); ctx.fill();
    ctx.fillStyle = "rgba(191,228,255,0.3)"; rr(ctx, -0.07 * S, -0.44 * S, 0.14 * S, 0.1 * S, 0.03 * S); ctx.fill();
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(0, -0.46 * S, 0.09 * S, 0.035 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c98f4a";
    ctx.beginPath(); ctx.ellipse(0, -0.46 * S, 0.08 * S, 0.028 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  onPointer(api, a, type, x) {
    if (type === "down") { a.dragging = true; a.lastX = x; }
    else if (type === "move" && a.dragging) {
      a.rock = clamp(a.rock + (x - a.lastX) * 0.008, -1, 1);
      a.lastX = x;
    } else if (type === "up") { a.dragging = false; api.audio.splash(); }
  },
};

/* ---- РАКУШКА «ЖЕМЧУЖИНА» (Hinge/Gem) ---- */
const shell: ArtifactDef = {
  id: "shell",
  name: "Ракушка «Жемчужина»",
  collection: "sea",
  collectionLabel: "Море",
  materialLabel: "перламутр · жемчуг",
  tagline: "Открой створки — внутри жемчужина!",
  base: 175, par: 88, boundsMul: 0.58,
  aliveHint: "ТАП ПО РАКУШКЕ — ОТКРОЙ И ЛЮБУЙСЯ!",
  drawMask(ctx, S) {
    ctx.beginPath(); ctx.arc(0, 0.05 * S, 0.36 * S, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0.05 * S, 0.36 * S, 0, Math.PI); ctx.fill();
  },
  createAnim() { return { open: 0, target: 0, gleam: 0, sparkAng: 0 }; },
  update(a, dt, api) {
    a.open += (a.target - a.open) * Math.min(1, dt * 6);
    a.gleam = Math.max(0, a.gleam - dt * 1.2);
    const t = Math.atan2(api.pointer.ly, api.pointer.lx);
    a.sparkAng += (t - a.sparkAng) * Math.min(1, dt * 5);
    if (a.open > 0.8 && Math.random() < dt * 2) {
      api.spawn("star", (Math.random() - 0.5) * 0.2 * api.S, 0, 1, "#bfe0ff");
    }
  },
  draw(ctx, S, a, t) {
    const open = a.open;
    // нижняя створка
    ctx.save();
    ctx.rotate(open * 0.25);
    shellHalf(ctx, S, false);
    ctx.restore();
    // жемчужина (появляется при открытии)
    if (open > 0.15) {
      const pr = 0.1 * S * open;
      const g = ctx.createRadialGradient(-pr * 0.35, -pr * 0.4, pr * 0.1, 0, 0, pr);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.4, "#f2e8f5"); g.addColorStop(0.8, "#d9c6e8"); g.addColorStop(1, "#b8a0d0");
      ctx.fillStyle = g; circ(ctx, 0, -0.02 * S, pr); ctx.fill();
      ctx.strokeStyle = "rgba(120,90,150,0.4)"; ctx.lineWidth = 0.006 * S;
      circ(ctx, 0, -0.02 * S, pr); ctx.stroke();
      ctx.fillStyle = "#fff"; circ(ctx, -pr * 0.3, -0.02 * S - pr * 0.35, pr * 0.22); ctx.fill();
      if (a.gleam > 0) {
        ctx.fillStyle = `rgba(255,255,255,${a.gleam})`;
        star4(ctx, pr * 0.25, -0.02 * S - pr * 0.2, 0.05 * S * a.gleam); ctx.fill();
      }
      // перелив по жемчужине
      ctx.save();
      ctx.beginPath(); circ(ctx, 0, -0.02 * S, pr); ctx.clip();
      const sh = ctx.createLinearGradient(-pr, 0, pr, 0);
      const h0 = (t * 40) % 360;
      sh.addColorStop(0, `hsla(${h0},70%,80%,0)`);
      sh.addColorStop(0.5, `hsla(${h0},70%,85%,0.4)`);
      sh.addColorStop(1, `hsla(${(h0 + 80) % 360},70%,80%,0)`);
      ctx.fillStyle = sh; circ(ctx, 0, -0.02 * S, pr); ctx.fill();
      ctx.restore();
    }
    // верхняя створка
    ctx.save();
    ctx.translate(0, -0.34 * S * open);
    ctx.rotate(-open * 0.5);
    shellHalf(ctx, S, true);
    ctx.restore();
  },
  onPointer(api, a, type) {
    if (type === "down") {
      a.target = a.target > 0.5 ? 0 : 1;
      a.gleam = 1;
      api.audio.blip(a.target ? 1100 : 600);
      if (a.target) { api.audio.chime(); api.spawn("star", 0, -0.05 * api.S, 8, "#d9c6ff"); }
      else api.audio.crank();
    }
  },
};

function shellHalf(ctx: CanvasRenderingContext2D, S: number, top: boolean) {
  const dir = top ? -1 : 1;
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.arc(0, 0.05 * S, 0.37 * S, top ? Math.PI : 0, top ? 0 : Math.PI); ctx.fill();
  const g = ctx.createRadialGradient(0, 0.05 * S, 0.02 * S, 0, 0.05 * S, 0.36 * S);
  g.addColorStop(0, "#ffe9f2"); g.addColorStop(0.5, "#ffb3d1"); g.addColorStop(1, "#e26ba3");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0.05 * S, 0.36 * S, top ? Math.PI : 0, top ? 0 : Math.PI); ctx.fill();
  // рёбра
  ctx.strokeStyle = "rgba(200,80,140,0.5)"; ctx.lineWidth = 0.008 * S;
  for (let i = 0; i < 6; i++) {
    const ang = (top ? Math.PI : 0) + (i + 0.5) * (Math.PI / 6) * (top ? 1 : 1);
    ctx.beginPath();
    ctx.moveTo(0, 0.05 * S);
    ctx.lineTo(Math.cos(ang) * 0.36 * S, 0.05 * S + dir * Math.sin(top ? Math.PI - ang : ang) * 0.36 * S * (top ? -1 : 1));
    ctx.stroke();
  }
  // перламутровый блик
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.arc(-0.08 * S, 0.05 * S + dir * 0.12 * S, 0.1 * S, 0, Math.PI * 2); ctx.fill();
}

/* ---- МАЯК «ПУТЕВОДНЫЙ» (Button) ---- */
const lighthouse: ArtifactDef = {
  id: "lighthouse",
  name: "Маяк «Путеводный»",
  collection: "sea",
  collectionLabel: "Море",
  materialLabel: "камень · линза",
  tagline: "Зажги свет — пусть корабли найдут путь!",
  base: 180, par: 92, boundsMul: 0.56,
  aliveHint: "ТАП ПО ФОНАРЮ — ВКЛЮЧИ СВЕТ!",
  drawMask(ctx, S) {
    ctx.beginPath(); ctx.moveTo(-0.22 * S, 0.4 * S); ctx.lineTo(-0.12 * S, -0.28 * S);
    ctx.lineTo(0.12 * S, -0.28 * S); ctx.lineTo(0.22 * S, 0.4 * S); ctx.closePath(); ctx.fill();
    rr(ctx, -0.14 * S, -0.42 * S, 0.28 * S, 0.16 * S, 0.03 * S); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.16 * S, -0.42 * S); ctx.lineTo(0, -0.54 * S); ctx.lineTo(0.16 * S, -0.42 * S); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0.4 * S, 0.28 * S, 0.06 * S, 0, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { on: false, beamA: 0, flashT: 0 }; },
  update(a, dt, api) {
    if (a.on) {
      a.beamA += dt * 1.6;
      a.flashT -= dt;
      if (a.flashT <= 0) {
        a.flashT = 1.2;
        api.audio.blip(1300);
        api.spawn("star", 0, -0.45 * api.S, 2, "#ffe9a8");
      }
    }
  },
  draw(ctx, S, a, t) {
    // лучи
    if (a.on) {
      ctx.save();
      ctx.translate(0, -0.34 * S);
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < 2; b++) {
        const ang = a.beamA + b * Math.PI;
        ctx.save();
        ctx.rotate(ang);
        const g = ctx.createLinearGradient(0, 0, 0.9 * S, 0);
        g.addColorStop(0, "rgba(255,233,168,0.5)");
        g.addColorStop(1, "rgba(255,233,168,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.9 * S, -0.16 * S); ctx.lineTo(0.9 * S, 0.16 * S); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    // основание-скала
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(0, 0.4 * S, 0.29 * S, 0.07 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.05 * S, 0.38 * S, 0.02 * S, 0.28 * S, [[0, "#b8a088"], [1, "#8a7660"]]);
    ctx.beginPath(); ctx.ellipse(0, 0.4 * S, 0.27 * S, 0.06 * S, 0, 0, Math.PI * 2); ctx.fill();
    // башня
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-0.22 * S, 0.4 * S); ctx.lineTo(-0.12 * S, -0.28 * S);
    ctx.lineTo(0.12 * S, -0.28 * S); ctx.lineTo(0.22 * S, 0.4 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, -0.2 * S, 0, 0.2 * S, 0, [[0, "#fdf3dc"], [0.5, "#ffffff"], [1, "#d9c49a"]]);
    ctx.beginPath(); ctx.moveTo(-0.21 * S, 0.39 * S); ctx.lineTo(-0.115 * S, -0.27 * S);
    ctx.lineTo(0.115 * S, -0.27 * S); ctx.lineTo(0.21 * S, 0.39 * S); ctx.closePath(); ctx.fill();
    // красные полосы
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-0.21 * S, 0.39 * S); ctx.lineTo(-0.115 * S, -0.27 * S);
    ctx.lineTo(0.115 * S, -0.27 * S); ctx.lineTo(0.21 * S, 0.39 * S); ctx.closePath(); ctx.clip();
    ctx.fillStyle = "#e24e3c";
    for (let i = 0; i < 3; i++) {
      const y0 = (-0.2 + i * 0.22) * S;
      ctx.beginPath();
      ctx.moveTo(-0.25 * S, y0); ctx.lineTo(0.25 * S, y0 - 0.03 * S);
      ctx.lineTo(0.25 * S, y0 + 0.07 * S); ctx.lineTo(-0.25 * S, y0 + 0.1 * S); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // фонарь
    ctx.fillStyle = OUT; rr(ctx, -0.145 * S, -0.425 * S, 0.29 * S, 0.17 * S, 0.03 * S); ctx.fill();
    ctx.fillStyle = a.on ? "#ffe9a8" : "#8d97a5";
    rr(ctx, -0.13 * S, -0.41 * S, 0.26 * S, 0.14 * S, 0.025 * S); ctx.fill();
    if (a.on) {
      ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.3 * Math.sin(t * 12)})`;
      circ(ctx, 0, -0.34 * S, 0.05 * S); ctx.fill();
    }
    ctx.strokeStyle = "#5a4a30"; ctx.lineWidth = 0.008 * S;
    ctx.beginPath(); ctx.moveTo(-0.045 * S, -0.41 * S); ctx.lineTo(-0.045 * S, -0.27 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.045 * S, -0.41 * S); ctx.lineTo(0.045 * S, -0.27 * S); ctx.stroke();
    // крыша
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-0.16 * S, -0.42 * S); ctx.lineTo(0, -0.55 * S); ctx.lineTo(0.16 * S, -0.42 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e24e3c";
    ctx.beginPath(); ctx.moveTo(-0.15 * S, -0.425 * S); ctx.lineTo(0, -0.54 * S); ctx.lineTo(0.15 * S, -0.425 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffc63d"; circ(ctx, 0, -0.56 * S, 0.02 * S); ctx.fill();
  },
  onPointer(api, a, type) {
    if (type === "down") {
      a.on = !a.on;
      if (a.on) { api.audio.blip(1300); api.audio.chime(); api.spawn("star", 0, -0.45 * api.S, 10, "#ffe9a8"); }
      else api.audio.powerDown();
    }
  },
};

export const TECH_SEA: ArtifactDef[] = [radio, tv, phone, vinyl, scope, ship, shell, lighthouse];
