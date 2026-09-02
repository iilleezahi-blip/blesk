import type { ArtifactDef } from "./types";
import { clamp } from "./rng";
import { OUT, lin, rad, rr, circ, star4, drawGear } from "./artifacts";

/* ================================================================
   КОЛЛЕКЦИЯ «МЕХАНИКА» — заводные игрушки
   ================================================================ */

/* ---- ЮЛА «ВИХРЬ» (Rotator) ---- */
const top: ArtifactDef = {
  id: "top",
  name: "Юла «Вихрь»",
  collection: "toys",
  collectionLabel: "Механика",
  materialLabel: "жесть · лак",
  tagline: "Крутани её — запоёт и запляшет!",
  base: 150, par: 85, boundsMul: 0.6,
  aliveHint: "ПРОВЕДИ ПАЛЬЦЕМ В СТОРОНУ — РАСКРУТИ ЮЛУ!",
  drawMask(ctx, S) {
    ctx.fillRect(-0.03 * S, -0.42 * S, 0.06 * S, 0.12 * S);
    ctx.beginPath(); ctx.arc(0, -0.28 * S, 0.1 * S, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.3 * S, -0.18 * S); ctx.lineTo(0.3 * S, -0.18 * S);
    ctx.lineTo(0.05 * S, 0.36 * S); ctx.lineTo(-0.05 * S, 0.36 * S); ctx.closePath(); ctx.fill();
  },
  createAnim() { return { ang: 0, av: 0, wob: 0, dragging: false, lastX: 0, sparkT: 0 }; },
  update(a, dt, api) {
    if (!a.dragging) a.av *= Math.pow(0.4, dt);
    a.ang += a.av * dt;
    a.wob = clamp(Math.abs(a.av) * 0.02, 0, 0.22) * Math.sin(a.ang * 3);
    a.sparkT -= dt;
    if (Math.abs(a.av) > 6 && a.sparkT <= 0) {
      a.sparkT = 0.2;
      api.spawn("star", (Math.random() - 0.5) * 0.3 * api.S, -0.1 * api.S, 1, "#ffd166");
      if (Math.abs(a.av) > 10) api.audio.crank();
    }
  },
  draw(ctx, S, a, t, phase) {
    ctx.save();
    ctx.rotate(a.wob);
    // ось с ручкой
    ctx.fillStyle = OUT; ctx.fillRect(-0.035 * S, -0.44 * S, 0.07 * S, 0.14 * S);
    ctx.fillStyle = lin(ctx, -0.03 * S, 0, 0.03 * S, 0, [[0, "#ffe1a0"], [1, "#c98f2c"]]);
    ctx.fillRect(-0.025 * S, -0.43 * S, 0.05 * S, 0.12 * S);
    raisedDiscLocal(ctx, 0, -0.3 * S, 0.1 * S, "#ffe9a8", "#ffc63d", "#e89313", OUT);
    // купол
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.arc(0, -0.14 * S, 0.31 * S, Math.PI, 0); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.08 * S, -0.22 * S, 0.02 * S, 0.3 * S, [[0, "#a5e563"], [0.6, "#46c9bd"], [1, "#1f7d74"]]);
    ctx.beginPath(); ctx.arc(0, -0.14 * S, 0.3 * S, Math.PI, 0); ctx.fill();
    // конус с полосками (вращаются)
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-0.3 * S, -0.14 * S); ctx.lineTo(0.3 * S, -0.14 * S);
    ctx.lineTo(0.05 * S, 0.38 * S); ctx.lineTo(-0.05 * S, 0.38 * S); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = lin(ctx, 0, -0.14 * S, 0, 0.38 * S, [[0, "#ff9dcb"], [1, "#e24e94"]]);
    ctx.fillRect(-0.3 * S, -0.14 * S, 0.6 * S, 0.52 * S);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const off = ((a.ang * 0.12 + i / n) % 1) * 0.6 * S - 0.3 * S;
      ctx.fillStyle = i % 2 ? "#7fdcff" : "#ffd166";
      ctx.beginPath();
      ctx.moveTo(off, -0.14 * S); ctx.lineTo(off + 0.12 * S, -0.14 * S);
      ctx.lineTo(off * 0.16 + 0.02 * S, 0.38 * S); ctx.lineTo(off * 0.16 - 0.02 * S, 0.38 * S);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.02 * S;
    ctx.beginPath(); ctx.moveTo(-0.3 * S, -0.14 * S); ctx.lineTo(0.3 * S, -0.14 * S);
    ctx.lineTo(0.05 * S, 0.38 * S); ctx.lineTo(-0.05 * S, 0.38 * S); ctx.closePath(); ctx.stroke();
    // кончик
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0.4 * S, 0.035 * S, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffc63d"; ctx.beginPath(); ctx.arc(0, 0.4 * S, 0.025 * S, 0, Math.PI * 2); ctx.fill();
    // блик
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.02 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-0.06 * S, -0.2 * S, 0.2 * S, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
    void t; void phase;
  },
  onPointer(api, a, type, x, _y) {
    if (type === "down") { a.dragging = true; a.lastX = x; }
    else if (type === "move" && a.dragging) {
      a.av = clamp(a.av + (x - a.lastX) * 0.35, -30, 30);
      a.lastX = x;
    } else if (type === "up") { a.dragging = false; }
  },
};

function raisedDiscLocal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hi: string, mid: string, lo: string, rim: string) {
  ctx.fillStyle = rim; circ(ctx, x, y, r); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, hi); g.addColorStop(0.55, mid); g.addColorStop(1, lo);
  ctx.fillStyle = g; circ(ctx, x, y, r * 0.88); ctx.fill();
}

/* ---- ВАНЬКА-ВСТАНЬКА «ВАНЯ» (Button) ---- */
const roly: ArtifactDef = {
  id: "roly",
  name: "Ванька-встанька",
  collection: "toys",
  collectionLabel: "Механика",
  materialLabel: "дерево · роспись",
  tagline: "Как ни качай — всегда встаёт!",
  base: 140, par: 80, boundsMul: 0.58,
  aliveHint: "ТОЛКНИ ВАНЮ — ОН ОБЯЗАТЕЛЬНО ВСТАНЕТ!",
  drawMask(ctx, S) {
    ctx.beginPath(); ctx.arc(0, 0.08 * S, 0.32 * S, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -0.22 * S, 0.2 * S, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { ang: 0, av: 0, dragging: false, lastX: 0 }; },
  update(a, dt, api) {
    if (!a.dragging) {
      a.av += -a.ang * 26 * dt;      // пружина к вертикали
      a.av *= Math.pow(0.3, dt);     // затухание
    } else a.av = 0;
    a.ang += a.av * dt;
    if (!a.dragging && Math.abs(a.av) > 3 && Math.random() < dt * 8) api.audio.boing();
  },
  draw(ctx, S, a) {
    ctx.save();
    ctx.translate(0, 0.3 * S);
    ctx.rotate(a.ang);
    ctx.translate(0, -0.3 * S);
    // пузо
    ctx.fillStyle = OUT; circ(ctx, 0, 0.08 * S, 0.33 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.08 * S, 0, 0.03 * S, 0.34 * S, [[0, "#ffd9c9"], [0.6, "#ff9d5c"], [1, "#e0682c"]]);
    circ(ctx, 0, 0.08 * S, 0.32 * S); ctx.fill();
    // узор
    ctx.strokeStyle = "#ffc63d"; ctx.lineWidth = 0.02 * S;
    ctx.beginPath(); ctx.arc(0, 0.08 * S, 0.22 * S, 0.4, 2.7); ctx.stroke();
    // голова
    ctx.fillStyle = OUT; circ(ctx, 0, -0.22 * S, 0.21 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.05 * S, -0.26 * S, 0.02 * S, 0.2 * S, [[0, "#ffe9d0"], [1, "#f2b98a"]]);
    circ(ctx, 0, -0.22 * S, 0.2 * S); ctx.fill();
    // колпак
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-0.2 * S, -0.3 * S); ctx.quadraticCurveTo(0, -0.6 * S, 0.2 * S, -0.3 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, -0.2 * S, -0.3 * S, 0.2 * S, -0.3 * S, [[0, "#4f8bff"], [1, "#2b57d8"]]);
    ctx.beginPath(); ctx.moveTo(-0.19 * S, -0.3 * S); ctx.quadraticCurveTo(0, -0.58 * S, 0.19 * S, -0.3 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffc63d"; circ(ctx, 0, -0.52 * S, 0.035 * S); ctx.fill();
    // лицо
    ctx.fillStyle = "#4a2f14";
    circ(ctx, -0.07 * S, -0.22 * S, 0.022 * S); ctx.fill();
    circ(ctx, 0.07 * S, -0.22 * S, 0.022 * S); ctx.fill();
    ctx.strokeStyle = "#4a2f14"; ctx.lineWidth = 0.016 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, -0.16 * S, 0.06 * S, 0.3, 2.8); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "#ffb3c9";
    circ(ctx, -0.12 * S, -0.17 * S, 0.03 * S); ctx.fill();
    circ(ctx, 0.12 * S, -0.17 * S, 0.03 * S); ctx.fill();
    ctx.restore();
  },
  onPointer(api, a, type, x, _y) {
    if (type === "down") { a.dragging = true; a.lastX = x; }
    else if (type === "move" && a.dragging) {
      a.ang = clamp(a.ang + (x - a.lastX) * 0.006, -1.1, 1.1);
      a.lastX = x;
    } else if (type === "up") { a.dragging = false; api.audio.boing(); }
  },
};

/* ---- ЗАВОДНАЯ УТКА «КРЯКА» (Rotator) ---- */
const duck: ArtifactDef = {
  id: "duck",
  name: "Утка «Кряка»",
  collection: "toys",
  collectionLabel: "Механика",
  materialLabel: "жесть · заводной ключ",
  tagline: "Заведи ключ — и она закрякает!",
  base: 150, par: 85, boundsMul: 0.62,
  aliveHint: "КРУТИ КЛЮЧИК НА СПИНЕ — ЗАВОДИ УТКУ!",
  drawMask(ctx, S) {
    ctx.beginPath(); ctx.ellipse(0, 0.05 * S, 0.34 * S, 0.26 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0.2 * S, -0.24 * S, 0.15 * S, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(0.3 * S, -0.28 * S, 0.14 * S, 0.07 * S);
  },
  createAnim() { return { keyA: 0, wind: 0, winding: false, lastA: 0, quackT: 0, flap: 0 }; },
  update(a, dt, api) {
    if (!a.winding) a.wind = Math.max(0, a.wind - dt * 0.12);
    a.flap = a.wind > 0.05 ? Math.sin(api.t * 20) * 0.25 * a.wind : 0;
    a.quackT -= dt;
    if (a.wind > 0.05 && a.quackT <= 0) {
      a.quackT = 0.7 - a.wind * 0.4;
      api.audio.quack();
      api.spawn("star", 0.3 * api.S, -0.3 * api.S, 1, "#ffd166");
    }
  },
  draw(ctx, S, a) {
    ctx.save();
    ctx.translate(0, a.wind > 0.05 ? Math.sin(a.flap * 40) * 0.008 * S : 0);
    // ключ на спинке
    ctx.save();
    ctx.translate(-0.18 * S, -0.16 * S);
    ctx.rotate(a.keyA);
    ctx.fillStyle = OUT; rr(ctx, -0.02 * S, -0.14 * S, 0.04 * S, 0.16 * S, 0.015 * S); ctx.fill();
    ctx.fillStyle = "#c8ccd6"; rr(ctx, -0.014 * S, -0.13 * S, 0.028 * S, 0.14 * S, 0.01 * S); ctx.fill();
    ctx.fillStyle = OUT; circ(ctx, 0, -0.15 * S, 0.045 * S); ctx.fill();
    ctx.fillStyle = "#ffc63d"; circ(ctx, 0, -0.15 * S, 0.032 * S); ctx.fill();
    ctx.restore();
    // хвост
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-0.3 * S, 0.02 * S); ctx.lineTo(-0.44 * S, -0.1 * S); ctx.lineTo(-0.26 * S, -0.14 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffb347";
    ctx.beginPath(); ctx.moveTo(-0.3 * S, 0.02 * S); ctx.lineTo(-0.42 * S, -0.09 * S); ctx.lineTo(-0.27 * S, -0.12 * S); ctx.closePath(); ctx.fill();
    // тело
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(0, 0.05 * S, 0.35 * S, 0.27 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.1 * S, -0.04 * S, 0.03 * S, 0.35 * S, [[0, "#ffe14d"], [0.6, "#ffc63d"], [1, "#e89313"]]);
    ctx.beginPath(); ctx.ellipse(0, 0.05 * S, 0.34 * S, 0.26 * S, 0, 0, Math.PI * 2); ctx.fill();
    // крыло
    ctx.save();
    ctx.translate(-0.06 * S, 0.04 * S);
    ctx.rotate(a.flap);
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.16 * S, 0.11 * S, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffb347";
    ctx.beginPath(); ctx.ellipse(0, 0, 0.145 * S, 0.095 * S, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // голова
    ctx.fillStyle = OUT; circ(ctx, 0.2 * S, -0.24 * S, 0.16 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, 0.15 * S, -0.29 * S, 0.02 * S, 0.16 * S, [[0, "#ffe14d"], [1, "#ffc63d"]]);
    circ(ctx, 0.2 * S, -0.24 * S, 0.15 * S); ctx.fill();
    // клюв
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(0.33 * S, -0.27 * S); ctx.lineTo(0.47 * S, -0.22 * S); ctx.lineTo(0.33 * S, -0.17 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff7a3c";
    ctx.beginPath(); ctx.moveTo(0.33 * S, -0.26 * S); ctx.lineTo(0.45 * S, -0.22 * S); ctx.lineTo(0.33 * S, -0.18 * S); ctx.closePath(); ctx.fill();
    // глаз
    ctx.fillStyle = "#4a2f14"; circ(ctx, 0.22 * S, -0.27 * S, 0.025 * S); ctx.fill();
    ctx.fillStyle = "#fff"; circ(ctx, 0.215 * S, -0.278 * S, 0.009 * S); ctx.fill();
    ctx.restore();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const cx = -0.18 * S, cy = -0.16 * S;
    if (type === "down") {
      if (Math.hypot(x - cx, y - cy) < 0.22 * S) { a.winding = true; a.lastA = Math.atan2(y - cy, x - cx); }
    } else if (type === "move" && a.winding) {
      const ang = Math.atan2(y - cy, x - cx);
      let d = ang - a.lastA;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      a.lastA = ang;
      a.keyA += d;
      a.wind = clamp(a.wind + Math.abs(d) * 0.25, 0, 1);
      if (Math.abs(d) > 0.3) api.audio.crank();
    } else if (type === "up") { a.winding = false; }
  },
};

/* ---- РОБОТ «БИП» (Button) ---- */
const robot: ArtifactDef = {
  id: "robot",
  name: "Робот «Бип»",
  collection: "toys",
  collectionLabel: "Механика",
  materialLabel: "жесть · лампочки",
  tagline: "Заведи — и он замашет руками!",
  base: 160, par: 90, boundsMul: 0.56,
  aliveHint: "КРУТИ КЛЮЧ НА СПИНЕ — ЗАПУСТИ РОБОТА!",
  drawMask(ctx, S) {
    rr(ctx, -0.26 * S, -0.12 * S, 0.52 * S, 0.5 * S, 0.04 * S); ctx.fill();
    rr(ctx, -0.2 * S, -0.4 * S, 0.4 * S, 0.26 * S, 0.05 * S); ctx.fill();
    rr(ctx, -0.42 * S, -0.08 * S, 0.12 * S, 0.4 * S, 0.05 * S); ctx.fill();
    rr(ctx, 0.3 * S, -0.08 * S, 0.12 * S, 0.4 * S, 0.05 * S); ctx.fill();
  },
  createAnim() { return { keyA: 0, wind: 0, winding: false, lastA: 0, armT: 0, blinkT: 0, beepT: 0 }; },
  update(a, dt, api) {
    if (!a.winding) a.wind = Math.max(0, a.wind - dt * 0.1);
    a.armT += dt * (a.wind > 0.05 ? 12 : 0);
    a.blinkT += dt;
    a.beepT -= dt;
    if (a.wind > 0.05 && a.beepT <= 0) { a.beepT = 0.6; api.audio.blip(880 + Math.random() * 400); }
  },
  draw(ctx, S, a, t) {
    const on = a.wind > 0.05;
    // руки
    const armAng = on ? Math.sin(a.armT) * 0.7 : 0.15;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 0.32 * S, -0.04 * S);
      ctx.rotate(side * (side === -1 ? armAng : -armAng + 0.3));
      ctx.fillStyle = OUT; rr(ctx, -0.05 * S, 0, 0.1 * S, 0.36 * S, 0.045 * S); ctx.fill();
      ctx.fillStyle = "#b8c4d0"; rr(ctx, -0.04 * S, 0.01 * S, 0.08 * S, 0.34 * S, 0.038 * S); ctx.fill();
      ctx.fillStyle = "#8d97a5"; circ(ctx, 0, 0.34 * S, 0.06 * S); ctx.fill();
      ctx.restore();
    }
    // тело
    ctx.fillStyle = OUT; rr(ctx, -0.27 * S, -0.13 * S, 0.54 * S, 0.52 * S, 0.05 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.13 * S, 0, 0.39 * S, [[0, "#dfe8f2"], [0.5, "#b8c4d0"], [1, "#8d97a5"]]);
    rr(ctx, -0.26 * S, -0.12 * S, 0.52 * S, 0.5 * S, 0.04 * S); ctx.fill();
    // панель с лампочками
    ctx.fillStyle = "#5a6b7d"; rr(ctx, -0.18 * S, 0.12 * S, 0.36 * S, 0.18 * S, 0.03 * S); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const lit = on && Math.sin(t * 8 + i * 2.1) > 0;
      ctx.fillStyle = lit ? ["#ff6b6b", "#ffc63d", "#4de08a"][i] : "#3a4654";
      circ(ctx, (-0.1 + i * 0.1) * S, 0.21 * S, 0.04 * S); ctx.fill();
      if (lit) { ctx.fillStyle = "rgba(255,255,255,0.7)"; circ(ctx, (-0.11 + i * 0.1) * S, 0.2 * S, 0.012 * S); ctx.fill(); }
    }
    // болты
    ctx.fillStyle = "#5a6b7d";
    for (const [bx, by] of [[-0.21, -0.07], [0.21, -0.07], [-0.21, 0.33], [0.21, 0.33]]) {
      circ(ctx, bx * S, by * S, 0.018 * S); ctx.fill();
    }
    // голова
    ctx.fillStyle = OUT; rr(ctx, -0.21 * S, -0.41 * S, 0.42 * S, 0.28 * S, 0.06 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.41 * S, 0, -0.13 * S, [[0, "#e8eef5"], [1, "#a8b4c2"]]);
    rr(ctx, -0.2 * S, -0.4 * S, 0.4 * S, 0.26 * S, 0.05 * S); ctx.fill();
    // глаза
    const blink = a.blinkT % 3 < 0.12;
    for (const ex of [-0.09, 0.09]) {
      ctx.fillStyle = OUT; circ(ctx, ex * S, -0.28 * S, 0.05 * S); ctx.fill();
      ctx.fillStyle = on ? (blink ? "#2c5c3d" : "#4de08a") : "#5a6b7d";
      circ(ctx, ex * S, -0.28 * S, 0.036 * S); ctx.fill();
      if (on && !blink) { ctx.fillStyle = "#fff"; circ(ctx, (ex - 0.012) * S, -0.292 * S, 0.011 * S); ctx.fill(); }
    }
    // антенна
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.02 * S;
    ctx.beginPath(); ctx.moveTo(0, -0.41 * S); ctx.lineTo(0, -0.5 * S); ctx.stroke();
    ctx.fillStyle = on && Math.sin(t * 10) > 0 ? "#ff6b6b" : "#8d97a5";
    circ(ctx, 0, -0.52 * S, 0.03 * S); ctx.fill();
    // рот
    ctx.fillStyle = "#5a6b7d"; rr(ctx, -0.08 * S, -0.19 * S, 0.16 * S, 0.03 * S, 0.015 * S); ctx.fill();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const cx = 0, cy = -0.5 * S;
    if (type === "down") {
      if (Math.hypot(x - cx, y - cy) < 0.24 * S) { a.winding = true; a.lastA = Math.atan2(y - cy, x - cx); }
    } else if (type === "move" && a.winding) {
      const ang = Math.atan2(y - cy, x - cx);
      let d = ang - a.lastA;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      a.lastA = ang;
      a.keyA += d;
      a.wind = clamp(a.wind + Math.abs(d) * 0.22, 0, 1);
      if (Math.abs(d) > 0.3) api.audio.crank();
    } else if (type === "up") { a.winding = false; }
  },
};

/* ---- ЧАСЫ С КУКУШКОЙ (Hinge/Button) ---- */
const cuckoo: ArtifactDef = {
  id: "cuckoo",
  name: "Часы с кукушкой",
  collection: "toys",
  collectionLabel: "Механика",
  materialLabel: "дерево · резьба",
  tagline: "Раскачай маятник — вылетит кукушка!",
  base: 170, par: 95, boundsMul: 0.58,
  aliveHint: "ТОЛКНИ МАЯТНИК — ЧАСЫ ОЖИВУТ!",
  drawMask(ctx, S) {
    ctx.beginPath(); ctx.moveTo(0, -0.55 * S); ctx.lineTo(0.34 * S, -0.28 * S); ctx.lineTo(0.34 * S, 0.2 * S);
    ctx.lineTo(-0.34 * S, 0.2 * S); ctx.lineTo(-0.34 * S, -0.28 * S); ctx.closePath(); ctx.fill();
    ctx.fillRect(-0.02 * S, 0.2 * S, 0.04 * S, 0.28 * S);
    ctx.beginPath(); ctx.arc(0, 0.5 * S, 0.07 * S, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { pend: 0, pendV: 0, run: 0, door: 0, bird: 0, cuckooT: 0, tickT: 0 }; },
  update(a, dt, api) {
    if (a.run > 0.05) {
      a.pend = Math.sin(api.t * 4) * 0.5 * a.run;
      a.tickT -= dt;
      if (a.tickT <= 0) { a.tickT = 0.8; api.audio.tick(); }
      a.cuckooT -= dt;
      if (a.cuckooT <= 0) {
        a.cuckooT = 4;
        api.audio.cuckoo();
      }
      const cyc = a.cuckooT;
      a.door = cyc > 3.4 ? clamp((3.8 - cyc) / 0.3, 0, 1) : cyc > 0.4 ? 1 : clamp(cyc / 0.4, 0, 1);
      a.bird = a.door > 0.5 ? clamp((a.door - 0.5) * 2, 0, 1) : 0;
    } else {
      a.pend *= Math.pow(0.25, dt);
      a.door = 0; a.bird = 0;
      a.run = Math.max(0, a.run - dt * 0.3);
    }
  },
  draw(ctx, S, a) {
    // маятник
    ctx.save();
    ctx.translate(0, 0.2 * S);
    ctx.rotate(a.pend);
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.018 * S;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.3 * S); ctx.stroke();
    ctx.fillStyle = OUT; circ(ctx, 0, 0.32 * S, 0.075 * S); ctx.fill();
    ctx.fillStyle = rad(ctx, -0.02 * S, 0.3 * S, 0.01 * S, 0.07 * S, [[0, "#ffe1a0"], [1, "#c98f2c"]]);
    circ(ctx, 0, 0.32 * S, 0.062 * S); ctx.fill();
    ctx.restore();
    // домик
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(0, -0.57 * S); ctx.lineTo(0.36 * S, -0.28 * S); ctx.lineTo(0.36 * S, 0.22 * S);
    ctx.lineTo(-0.36 * S, 0.22 * S); ctx.lineTo(-0.36 * S, -0.28 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, -0.34 * S, 0, 0.34 * S, 0, [[0, "#c98f4a"], [0.5, "#b07a38"], [1, "#8f5f24"]]);
    ctx.beginPath(); ctx.moveTo(0, -0.55 * S); ctx.lineTo(0.34 * S, -0.28 * S); ctx.lineTo(0.34 * S, 0.2 * S);
    ctx.lineTo(-0.34 * S, 0.2 * S); ctx.lineTo(-0.34 * S, -0.28 * S); ctx.closePath(); ctx.fill();
    // крыша
    ctx.fillStyle = "#7a4f1e";
    ctx.beginPath(); ctx.moveTo(0, -0.55 * S); ctx.lineTo(0.34 * S, -0.28 * S); ctx.lineTo(0.28 * S, -0.26 * S);
    ctx.lineTo(0, -0.48 * S); ctx.lineTo(-0.28 * S, -0.26 * S); ctx.lineTo(-0.34 * S, -0.28 * S); ctx.closePath(); ctx.fill();
    // дверца кукушки
    ctx.save();
    ctx.translate(-0.14 * S, -0.2 * S);
    ctx.fillStyle = "#5f3f16"; rr(ctx, -0.08 * S, -0.09 * S, 0.16 * S, 0.18 * S, 0.02 * S); ctx.fill();
    ctx.fillStyle = "#3a2508";
    rr(ctx, -0.06 * S, -0.07 * S, 0.12 * S, 0.14 * S, 0.015 * S); ctx.fill();
    // птичка
    if (a.bird > 0) {
      ctx.save();
      ctx.translate(a.bird * 0.12 * S, 0);
      ctx.fillStyle = "#8f5f24";
      ctx.beginPath(); ctx.ellipse(0.02 * S, 0, 0.045 * S, 0.035 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.055 * S, -0.02 * S, 0.025 * S, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffc63d";
      ctx.beginPath(); ctx.moveTo(0.08 * S, -0.02 * S); ctx.lineTo(0.105 * S, -0.012 * S); ctx.lineTo(0.08 * S, -0.004 * S); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2b1a08"; circ(ctx, 0.05 * S, -0.026 * S, 0.006 * S); ctx.fill();
      ctx.restore();
    }
    // дверца (створка)
    ctx.rotate(-a.door * 1.2);
    ctx.fillStyle = lin(ctx, 0, -0.07 * S, 0, 0.07 * S, [[0, "#d9a05c"], [1, "#b07a38"]]);
    rr(ctx, -0.06 * S, -0.07 * S, 0.12 * S, 0.14 * S, 0.015 * S); ctx.fill();
    ctx.strokeStyle = "#7a4f1e"; ctx.lineWidth = 0.008 * S;
    rr(ctx, -0.06 * S, -0.07 * S, 0.12 * S, 0.14 * S, 0.015 * S); ctx.stroke();
    ctx.restore();
    // циферблат
    ctx.fillStyle = OUT; circ(ctx, 0.12 * S, -0.18 * S, 0.09 * S); ctx.fill();
    ctx.fillStyle = "#fdf3dc"; circ(ctx, 0.12 * S, -0.18 * S, 0.075 * S); ctx.fill();
    ctx.strokeStyle = "#4a2f14"; ctx.lineWidth = 0.008 * S; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0.12 * S, -0.18 * S); ctx.lineTo(0.12 * S, -0.235 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.12 * S, -0.18 * S); ctx.lineTo(0.155 * S, -0.16 * S); ctx.stroke();
    ctx.lineCap = "butt";
    // резьба-листок
    ctx.fillStyle = "#8f5f24";
    ctx.beginPath(); ctx.ellipse(0, 0.08 * S, 0.09 * S, 0.05 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7a4f1e"; ctx.lineWidth = 0.006 * S;
    ctx.beginPath(); ctx.moveTo(-0.07 * S, 0.08 * S); ctx.lineTo(0.07 * S, 0.08 * S); ctx.stroke();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type === "down" && Math.hypot(x, y - 0.45 * S) < 0.22 * S) {
      a.run = 1;
      a.cuckooT = 1.2;
      api.audio.boing();
    }
  },
};

/* ================================================================
   КОЛЛЕКЦИЯ «МУЗЫКА»
   ================================================================ */

/* ---- ШАРМАНКА (Rotator) ---- */
const organ: ArtifactDef = {
  id: "organ",
  name: "Шарманка «Весёлая»",
  collection: "music",
  collectionLabel: "Музыка",
  materialLabel: "дерево · латунь",
  tagline: "Крути ручку — польётся мелодия!",
  base: 165, par: 90, boundsMul: 0.62,
  aliveHint: "КРУТИ РУЧКУ СБОКУ — ИГРАЙ МЕЛОДИЮ!",
  drawMask(ctx, S) {
    rr(ctx, -0.38 * S, -0.22 * S, 0.76 * S, 0.5 * S, 0.04 * S); ctx.fill();
    ctx.fillRect(-0.3 * S, -0.34 * S, 0.06 * S, 0.14 * S);
    ctx.fillRect(-0.16 * S, -0.38 * S, 0.06 * S, 0.18 * S);
    ctx.fillRect(-0.02 * S, -0.35 * S, 0.06 * S, 0.15 * S);
  },
  createAnim() { return { crankA: 0, playing: false, winding: false, lastA: 0, noteT: 0, noteI: 0, pipeT: 0 }; },
  update(a, dt, api) {
    a.playing = a.winding;
    a.pipeT += dt;
    if (a.playing) {
      a.noteT -= dt;
      if (a.noteT <= 0) {
        a.noteT = 0.3;
        a.noteI++;
        api.audio.musicNote(a.noteI);
        api.spawn("star", (-0.27 + (a.noteI % 3) * 0.14) * api.S, -0.4 * api.S, 1, "#7fdcff");
      }
    }
  },
  draw(ctx, S, a, t) {
    // трубы
    const pipes: [number, number, string][] = [[-0.27, 0.2, "#ff8a5c"], [-0.13, 0.26, "#ffc63d"], [0.01, 0.22, "#4de08a"]];
    pipes.forEach(([px, ph, col], i) => {
      const bounce = a.playing ? Math.max(0, Math.sin(t * 10 - i * 2)) * 0.02 * S : 0;
      ctx.fillStyle = OUT; rr(ctx, (px - 0.032) * S, (-0.24 - ph) * S - bounce, 0.064 * S, ph * S, 0.03 * S); ctx.fill();
      ctx.fillStyle = lin(ctx, (px - 0.03) * S, 0, (px + 0.03) * S, 0, [[0, "#ffe1a0"], [1, col]]);
      rr(ctx, (px - 0.026) * S, (-0.23 - ph) * S - bounce, 0.052 * S, (ph - 0.02) * S, 0.025 * S); ctx.fill();
    });
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.39 * S, -0.23 * S, 0.78 * S, 0.52 * S, 0.05 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.23 * S, 0, 0.29 * S, [[0, "#d9a05c"], [0.5, "#c98f4a"], [1, "#8f5f24"]]);
    rr(ctx, -0.38 * S, -0.22 * S, 0.76 * S, 0.5 * S, 0.04 * S); ctx.fill();
    // декор
    ctx.fillStyle = "#7a4f1e"; rr(ctx, -0.38 * S, 0.16 * S, 0.76 * S, 0.12 * S, 0.02 * S); ctx.fill();
    ctx.strokeStyle = "#7a4f1e"; ctx.lineWidth = 0.012 * S;
    rr(ctx, -0.3 * S, -0.14 * S, 0.6 * S, 0.24 * S, 0.03 * S); ctx.stroke();
    // нотки на фасаде
    ctx.fillStyle = "#4a2f14";
    circ(ctx, -0.2 * S, 0.02 * S, 0.02 * S); ctx.fill();
    circ(ctx, 0, -0.04 * S, 0.02 * S); ctx.fill();
    circ(ctx, 0.2 * S, 0.03 * S, 0.02 * S); ctx.fill();
    ctx.strokeStyle = "#4a2f14"; ctx.lineWidth = 0.008 * S;
    ctx.beginPath(); ctx.moveTo(-0.18 * S, 0.02 * S); ctx.lineTo(-0.18 * S, -0.08 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.02 * S, -0.04 * S); ctx.lineTo(0.02 * S, -0.14 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.22 * S, 0.03 * S); ctx.lineTo(0.22 * S, -0.07 * S); ctx.stroke();
    // ручка
    ctx.save();
    ctx.translate(0.44 * S, 0.02 * S);
    ctx.rotate(a.crankA);
    ctx.fillStyle = OUT; rr(ctx, -0.02 * S, -0.02 * S, 0.16 * S, 0.04 * S, 0.02 * S); ctx.fill();
    ctx.fillStyle = "#8d97a5"; rr(ctx, -0.014 * S, -0.014 * S, 0.15 * S, 0.028 * S, 0.014 * S); ctx.fill();
    ctx.fillStyle = OUT; circ(ctx, 0.13 * S, 0, 0.045 * S); ctx.fill();
    ctx.fillStyle = "#c98f4a"; circ(ctx, 0.13 * S, 0, 0.032 * S); ctx.fill();
    ctx.restore();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const cx = 0.44 * S, cy = 0.02 * S;
    if (type === "down") {
      if (Math.hypot(x - cx, y - cy) < 0.26 * S) { a.winding = true; a.lastA = Math.atan2(y - cy, x - cx); }
    } else if (type === "move" && a.winding) {
      const ang = Math.atan2(y - cy, x - cx);
      let d = ang - a.lastA;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      a.lastA = ang;
      a.crankA += d;
      if (Math.abs(d) > 0.25) api.audio.crank();
    } else if (type === "up") { a.winding = false; }
  },
};

/* ---- ГРАММОФОН (Rotator) ---- */
const gram: ArtifactDef = {
  id: "gram",
  name: "Граммофон «Мелодия»",
  collection: "music",
  collectionLabel: "Музыка",
  materialLabel: "латунь · дерево",
  tagline: "Заведи — и труба запоёт джаз!",
  base: 175, par: 95, boundsMul: 0.62,
  aliveHint: "КРУТИ РУЧКУ — ВКЛЮЧИ ГРАММОФОН!",
  drawMask(ctx, S) {
    rr(ctx, -0.34 * S, 0.02 * S, 0.68 * S, 0.34 * S, 0.04 * S); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 0.24 * S, 0.07 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.05 * S, -0.05 * S); ctx.lineTo(0.4 * S, -0.4 * S); ctx.lineTo(0.42 * S, -0.1 * S); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0.4 * S, -0.38 * S, 0.16 * S, 0, Math.PI * 2); ctx.fill();
  },
  createAnim() { return { crankA: 0, wind: 0, winding: false, lastA: 0, discA: 0, noteT: 0, noteI: 0 }; },
  update(a, dt, api) {
    if (!a.winding) a.wind = Math.max(0, a.wind - dt * 0.15);
    if (a.wind > 0.05) {
      a.discA += dt * 5 * a.wind;
      a.noteT -= dt;
      if (a.noteT <= 0) {
        a.noteT = 0.45;
        a.noteI++;
        api.audio.horn(262 + (a.noteI % 4) * 60);
        api.spawn("star", 0.35 * api.S, -0.4 * api.S, 1, "#ffd166");
      }
    }
  },
  draw(ctx, S, a) {
    // труба-раструб
    ctx.save();
    ctx.translate(0.1 * S, -0.06 * S);
    ctx.rotate(-0.6);
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-0.05 * S, 0); ctx.lineTo(0.42 * S, -0.16 * S); ctx.lineTo(0.42 * S, 0.16 * S); ctx.lineTo(-0.05 * S, 0.05 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.16 * S, 0, 0.16 * S, [[0, "#ffe1a0"], [0.5, "#e8a413"], [1, "#c97f10"]]);
    ctx.beginPath(); ctx.moveTo(-0.04 * S, 0); ctx.lineTo(0.4 * S, -0.145 * S); ctx.lineTo(0.4 * S, 0.145 * S); ctx.lineTo(-0.04 * S, 0.04 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c97f10";
    ctx.beginPath(); ctx.ellipse(0.4 * S, 0, 0.02 * S, 0.145 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // корпус
    ctx.fillStyle = OUT; rr(ctx, -0.35 * S, 0.01 * S, 0.7 * S, 0.36 * S, 0.04 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, 0.01 * S, 0, 0.37 * S, [[0, "#c98f4a"], [1, "#8f5f24"]]);
    rr(ctx, -0.34 * S, 0.02 * S, 0.68 * S, 0.34 * S, 0.04 * S); ctx.fill();
    ctx.strokeStyle = "#7a4f1e"; ctx.lineWidth = 0.01 * S;
    rr(ctx, -0.28 * S, 0.1 * S, 0.56 * S, 0.18 * S, 0.02 * S); ctx.stroke();
    // диск
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(0, -0.01 * S, 0.25 * S, 0.08 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b1a08";
    ctx.beginPath(); ctx.ellipse(0, -0.02 * S, 0.23 * S, 0.07 * S, 0, 0, Math.PI * 2); ctx.fill();
    // дорожки (вращаются)
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -0.02 * S, 0.23 * S, 0.07 * S, 0, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 0.005 * S;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.ellipse(0, -0.02 * S, (0.08 + i * 0.045) * S, (0.024 + i * 0.014) * S, a.discA * 0.2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#e8a413";
    ctx.beginPath(); ctx.ellipse(0, -0.02 * S, 0.05 * S, 0.016 * S, 0, 0, Math.PI * 2); ctx.fill();
    // ручка завода
    ctx.save();
    ctx.translate(0.36 * S, 0.18 * S);
    ctx.rotate(a.crankA);
    ctx.fillStyle = OUT; rr(ctx, -0.015 * S, -0.015 * S, 0.13 * S, 0.03 * S, 0.014 * S); ctx.fill();
    ctx.fillStyle = "#8d97a5"; rr(ctx, -0.01 * S, -0.01 * S, 0.12 * S, 0.02 * S, 0.01 * S); ctx.fill();
    ctx.fillStyle = OUT; circ(ctx, 0.11 * S, 0, 0.035 * S); ctx.fill();
    ctx.fillStyle = "#c98f4a"; circ(ctx, 0.11 * S, 0, 0.025 * S); ctx.fill();
    ctx.restore();
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    const cx = 0.36 * S, cy = 0.18 * S;
    if (type === "down") {
      if (Math.hypot(x - cx, y - cy) < 0.26 * S) { a.winding = true; a.lastA = Math.atan2(y - cy, x - cx); }
    } else if (type === "move" && a.winding) {
      const ang = Math.atan2(y - cy, x - cx);
      let d = ang - a.lastA;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      a.lastA = ang;
      a.crankA += d;
      a.wind = clamp(a.wind + Math.abs(d) * 0.25, 0, 1);
      if (Math.abs(d) > 0.25) api.audio.crank();
    } else if (type === "up") { a.winding = false; }
  },
};

/* ---- ДЖУКБОКС (Button) ---- */
const juke: ArtifactDef = {
  id: "juke",
  name: "Джукбокс «Джук»",
  collection: "music",
  collectionLabel: "Музыка",
  materialLabel: "хром · неон",
  tagline: "Жми кнопки — выбирай мотив!",
  base: 180, par: 95, boundsMul: 0.58,
  aliveHint: "ЖМИ РАЗНОЦВЕТНЫЕ КНОПКИ — СЛУШАЙ МОТИВЫ!",
  drawMask(ctx, S) {
    rr(ctx, -0.34 * S, -0.42 * S, 0.68 * S, 0.8 * S, 0.3 * S); ctx.fill();
  },
  createAnim() { return { btnLit: -1, lightT: 0, discA: 0, tuneT: 0, tuneI: 0, playing: false }; },
  update(a, dt, api) {
    a.lightT += dt;
    if (a.playing) {
      a.discA += dt * 6;
      a.tuneT -= dt;
      if (a.tuneT <= 0) {
        a.tuneT = 0.28;
        a.tuneI++;
        api.audio.musicNote(a.tuneI + a.btnLit * 3);
      }
      if (a.tuneI > 14) { a.playing = false; a.tuneI = 0; a.btnLit = -1; }
    }
  },
  draw(ctx, S, a, t) {
    // корпус
    ctx.fillStyle = OUT;
    rr(ctx, -0.35 * S, -0.43 * S, 0.7 * S, 0.82 * S, 0.3 * S); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -0.42 * S, 0, 0.39 * S, [[0, "#ff9dcb"], [0.5, "#e24e94"], [1, "#a83268"]]);
    rr(ctx, -0.34 * S, -0.42 * S, 0.68 * S, 0.8 * S, 0.29 * S); ctx.fill();
    // арка с неоном
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.05 * S;
    ctx.beginPath(); ctx.arc(0, -0.05 * S, 0.26 * S, Math.PI, 0); ctx.stroke();
    const neonOn = a.playing;
    ctx.strokeStyle = neonOn ? `hsl(${(t * 120) % 360},95%,65%)` : "#7a5c68";
    ctx.lineWidth = 0.022 * S;
    ctx.beginPath(); ctx.arc(0, -0.05 * S, 0.26 * S, Math.PI, 0); ctx.stroke();
    // окно с диском
    ctx.fillStyle = OUT;
    rr(ctx, -0.2 * S, -0.3 * S, 0.4 * S, 0.34 * S, 0.05 * S); ctx.fill();
    ctx.fillStyle = "#241426";
    rr(ctx, -0.18 * S, -0.28 * S, 0.36 * S, 0.3 * S, 0.04 * S); ctx.fill();
    // диск
    ctx.save();
    ctx.translate(0, -0.13 * S);
    ctx.rotate(a.discA);
    ctx.fillStyle = "#3a2b3e"; circ(ctx, 0, 0, 0.12 * S); ctx.fill();
    ctx.fillStyle = "#ffc63d"; circ(ctx, 0, 0, 0.05 * S); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.006 * S;
    ctx.beginPath(); ctx.arc(0, 0, 0.09 * S, 0.4, 2.2); ctx.stroke();
    ctx.restore();
    // кнопки
    const cols = ["#ff6b6b", "#ffc63d", "#4de08a", "#38b6ff"];
    cols.forEach((c, i) => {
      const bx = (-0.21 + i * 0.14) * S, by = 0.16 * S;
      ctx.fillStyle = OUT; circ(ctx, bx, by, 0.062 * S); ctx.fill();
      ctx.fillStyle = a.btnLit === i ? "#ffffff" : c;
      circ(ctx, bx, by, 0.05 * S); ctx.fill();
      if (a.btnLit === i) {
        ctx.fillStyle = c; ctx.globalAlpha = 0.7; circ(ctx, bx, by, 0.035 * S); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "rgba(255,255,255,0.6)"; circ(ctx, bx - 0.015 * S, by - 0.018 * S, 0.014 * S); ctx.fill();
    });
    // решётка
    ctx.strokeStyle = "#a83268"; ctx.lineWidth = 0.012 * S;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-0.2 * S, (0.26 + i * 0.045) * S); ctx.lineTo(0.2 * S, (0.26 + i * 0.045) * S); ctx.stroke();
    }
  },
  onPointer(api, a, type, x, y) {
    const S = api.S;
    if (type !== "down") return;
    for (let i = 0; i < 4; i++) {
      const bx = (-0.21 + i * 0.14) * S, by = 0.16 * S;
      if (Math.hypot(x - bx, y - by) < 0.09 * S) {
        a.btnLit = i;
        a.playing = true;
        a.tuneI = 0;
        api.audio.blip(600 + i * 200);
        api.spawn("star", bx, by, 5, "#ffd166");
        return;
      }
    }
  },
};

export const TOYS_MUSIC: ArtifactDef[] = [top, roly, duck, robot, cuckoo, organ, gram, juke];
