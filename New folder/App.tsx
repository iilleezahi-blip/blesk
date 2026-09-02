import { useEffect, useRef, useState } from "react";
import { Game, renderThumbnail } from "./game/engine";
import { ARTIFACTS } from "./game/artifacts";
import type { HudSnapshot, ToolId } from "./game/types";
import {
  IconScraper, IconLaser, IconFoam, IconLock, IconPause, IconSound,
  IconDownload, IconCoin, IconCheck, IconArrow, IconHand,
} from "./components/icons";

const initialHud: HudSnapshot = {
  phase: "catalog", paused: false, muted: false, artifactId: null, clean: 0,
  layers: { resin: 0, oxide: 0, grease: 0, foam: 0 }, tool: 1,
  unlocked: [true, false, false], combo: 0, heat: 0, overheated: false, foamPhase: 1,
  hint: "", credits: 0, timeStr: "00:00", replayT: 0, replayDur: 0,
  hasReplay: false, restoredIds: [], unlockedIds: [], payout: null, allDone: false,
};

const CONFETTI_COLORS = ["#ffd166", "#ff7a59", "#38b6ff", "#2fc98a", "#ff6fb2", "#9b6bff"];

function Confetti() {
  const pieces = Array.from({ length: 44 }, (_, i) => ({
    left: (i * 137) % 100,
    delay: ((i * 61) % 100) / 100 * 2.4,
    dur: 2.6 + ((i * 29) % 100) / 100 * 2,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 7 + ((i * 13) % 7),
    h: 9 + ((i * 17) % 8),
    round: i % 3 === 0,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w, height: p.round ? p.w : p.h,
            background: p.color,
            borderRadius: p.round ? "50%" : 3,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function MoodFace({ mood }: { mood: 0 | 1 | 2 }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="27" fill="#ffe9a8" stroke="#5b3b1e" strokeWidth="3.4" />
      <circle cx="20" cy="40" r="5" fill="#ffb3c9" opacity="0.75" />
      <circle cx="44" cy="40" r="5" fill="#ffb3c9" opacity="0.75" />
      {mood === 0 ? (
        <>
          <path d="M18 28q5 4 10 0" stroke="#5b3b1e" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M36 28q5 4 10 0" stroke="#5b3b1e" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M26 44h12" stroke="#5b3b1e" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : mood === 1 ? (
        <>
          <circle cx="23" cy="28" r="3.4" fill="#5b3b1e" />
          <circle cx="41" cy="28" r="3.4" fill="#5b3b1e" />
          <path d="M23 40q9 9 18 0" stroke="#5b3b1e" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M18 26l3 3 3-3M40 26l3 3 3-3" stroke="#5b3b1e" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="23" cy="30" r="3.4" fill="#5b3b1e" />
          <circle cx="41" cy="30" r="3.4" fill="#5b3b1e" />
          <path d="M22 39q10 12 20 0z" fill="#ff7a59" stroke="#5b3b1e" strokeWidth="3" strokeLinejoin="round" />
          <path d="M54 12l1.6 3.4 3.4 1.6-3.4 1.6L54 22l-1.6-3.4L49 17l3.4-1.6z" fill="#7fdcff" />
          <path d="M9 14l1.3 2.7L13 18l-2.7 1.3L9 22l-1.3-2.7L5 18l2.7-1.3z" fill="#ffd166" />
        </>
      )}
    </svg>
  );
}

function Thumb({ id, px = 116 }: { id: string; px?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const def = ARTIFACTS.find((a) => a.id === id);
    if (def && ref.current) renderThumbnail(def, ref.current, px);
  }, [id, px]);
  return <canvas ref={ref} style={{ width: px, height: px }} />;
}

function Stars({ rating }: { rating: string }) {
  const n = rating === "S" ? 3 : rating === "A" ? 2 : 1;
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" className={i < n ? "" : "opacity-25"}>
          <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
            fill="#ffc63d" stroke="#5b3b1e" strokeWidth="1.6" strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

const TOOL_META: { id: ToolId; name: string; gesture: string; cls: string; soft: string }[] = [
  { id: 1, name: "СКРЕБОК", gesture: "держи и веди", cls: "text-[#e89313]", soft: "bg-[#ffe9a8]" },
  { id: 2, name: "ЛАЗЕР", gesture: "веди ровно", cls: "text-[#e05a39]", soft: "bg-[#ffd9c9]" },
  { id: 3, name: "ПЕНА", gesture: "намыль и сотри", cls: "text-[#1e93dd]", soft: "bg-[#d3ecff]" },
];

const COLL_COLOR: Record<string, string> = {
  vintage: "#ffc63d",
  nostalgia: "#2fc98a",
  treasure: "#ff6fb2",
  toys: "#38b6ff",
  music: "#9b6bff",
  tech: "#ff8a5c",
  sea: "#4dd8e0",
};
/** Текст заголовка коллекции на тёмном/светлом */
const COLL_DARKTEXT: Record<string, boolean> = { vintage: true };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [lockToast, setLockToast] = useState<{ txt: string; n: number } | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);

  useEffect(() => {
    if (!lockToast) return;
    const t = window.setTimeout(() => setLockToast(null), 1900);
    return () => window.clearTimeout(t);
  }, [lockToast]);

  useEffect(() => {
    const g = new Game(canvasRef.current!);
    g.onHud = setHud;
    gameRef.current = g;
    g.pushHud();
    return () => g.destroy();
  }, []);

  const g = () => gameRef.current!;
  const artifact = ARTIFACTS.find((a) => a.id === hud.artifactId) ?? null;
  const inGame = hud.phase !== "catalog";
  const mood: 0 | 1 | 2 = hud.clean < 34 ? 0 : hud.clean < 76 ? 1 : 2;

  return (
    <div className="relative h-full w-full select-none overflow-hidden font-ui text-[#5b3b1e]">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ touchAction: "none" }} />

      {/* ==================== HUD: ВЕРХ ==================== */}
      {inGame && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
          <div className="flex flex-col gap-2">
            <div className="plate pointer-events-auto flex items-center gap-2 px-3 py-1.5">
              <span className="coin-spin inline-flex text-[#e8a413]"><IconCoin size={20} /></span>
              <span className="font-display text-xl font-bold leading-none tabular-nums">{hud.credits}</span>
            </div>
            {artifact && (
              <div className="plate-sm pointer-events-auto hidden items-center gap-2 px-3 py-1.5 sm:flex">
                <Thumb id={artifact.id} px={30} />
                <div>
                  <div className="font-display text-sm font-bold leading-tight">{artifact.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{artifact.collectionLabel} · {hud.timeStr}</div>
                </div>
              </div>
            )}
          </div>
          {/* центр: чистота (десктоп) */}
          {(hud.phase === "work" || hud.phase === "snap" || hud.phase === "replay") && (
            <div className="plate pointer-events-auto hidden flex-col items-center px-4 py-2 md:flex">
              <MoodFace mood={mood} />
              <div className="font-display text-3xl font-bold leading-none tabular-nums">
                {hud.clean}<span className="text-base text-[#e8a413]">%</span>
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-60">чистота</div>
              <div className="bar mt-1.5 w-36">
                <div className="bar-fill bg-[#2fc98a]" style={{ width: `${hud.clean}%` }} />
              </div>
            </div>
          )}
          <div className="pointer-events-auto flex gap-2">
            <button className="iconbtn" onClick={() => g().toggleMute()} title="звук [M]">
              <IconSound size={20} off={hud.muted} />
            </button>
            <button className="iconbtn" onClick={() => g().togglePause()} title="пауза [P]">
              <IconPause size={18} />
            </button>
          </div>
        </div>
      )}

      {/* слои (десктоп, слева) */}
      {hud.phase === "work" && (
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 hidden w-48 -translate-y-1/2 flex-col gap-2 lg:flex">
          {[
            { label: "ЛИПУЧКА", val: hud.layers.resin, col: "#e08f2a", done: hud.layers.resin >= 1 },
            { label: "РЖАВЧИНА", val: hud.layers.oxide, col: "#e05a39", done: hud.layers.oxide >= 1 },
            { label: "ПЫЛИНКИ", val: hud.layers.grease, col: "#1e93dd", done: hud.layers.grease >= 1 },
          ].map((l) => (
            <div key={l.label} className={`plate-sm px-3 py-2 ${l.done ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="font-display text-[13px] font-bold">{l.label}</span>
                {l.done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2fc98a] text-white"><IconCheck size={12} /></span>
                ) : (
                  <span className="text-[11px] font-extrabold tabular-nums opacity-70">{Math.round(l.val * 100)}%</span>
                )}
              </div>
              <div className="bar mt-1 h-3">
                <div className="bar-fill" style={{ width: `${l.val * 100}%`, background: l.col }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* чистота для мобил */}
      {hud.phase === "work" && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center md:hidden">
          <div className="plate-sm flex items-center gap-2 px-3 py-1.5">
            <span className="font-display text-lg font-bold leading-none tabular-nums">{hud.clean}%</span>
            <div className="bar h-3 w-28">
              <div className="bar-fill bg-[#2fc98a]" style={{ width: `${hud.clean}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ==================== HUD: НИЗ ==================== */}
      {inGame && hud.phase === "work" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-3">
          {hud.combo >= 2 && (
            <div
              key={hud.combo}
              className="combo-pop flex items-center gap-2 rounded-full border-[3px] border-[#5b3b1e] bg-[#ffc63d] px-4 py-1 shadow-[0_4px_0_rgba(90,58,20,0.4)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#fffdf5" stroke="#5b3b1e" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <span className="font-display text-lg font-bold leading-none text-[#5b3b1e]">КОМБО ×{hud.combo}</span>
            </div>
          )}
          <div className="bubble pointer-events-auto max-w-md px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#e8a413]"><IconHand size={18} /></span>
              <span className="font-display text-sm font-bold leading-snug">{hud.hint}</span>
            </div>
          </div>
          {/* накал лазера */}
          {hud.tool === 2 && (
            <div className="plate-sm pointer-events-auto flex w-64 items-center gap-2 px-3 py-1.5">
              <span className={`font-display text-[11px] font-bold ${hud.overheated ? "blink-hint text-[#e05a39]" : ""}`}>
                {hud.overheated ? "ОСТЫВАЕТ…" : "НАКАЛ"}
              </span>
              <div className="bar h-3 flex-1">
                <div
                  className="bar-fill transition-[width] duration-150"
                  style={{ width: `${hud.heat * 100}%`, background: hud.heat > 0.65 ? "#ff7a59" : "#ffc63d" }}
                />
              </div>
            </div>
          )}
          {/* прогресс пены — виден всем */}
          {hud.tool === 3 && hud.foamPhase === 1 && (
            <div className="plate-sm pointer-events-auto flex w-64 items-center gap-2 px-3 py-1.5">
              <span className="font-display text-[11px] font-bold text-[#1e93dd]">ПЕНА</span>
              <div className="bar h-3 flex-1">
                <div
                  className="bar-fill bg-[#38b6ff] transition-[width] duration-150"
                  style={{ width: `${hud.layers.foam * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-extrabold tabular-nums opacity-70">{Math.round(hud.layers.foam * 100)}%</span>
            </div>
          )}
          {hud.tool === 3 && hud.foamPhase === 2 && (
            <div className="plate-sm pointer-events-auto bounce-soft flex items-center gap-2 px-4 py-1.5">
              <IconArrow size={16} className="rotate-180 text-[#1e93dd]" />
              <span className="font-display text-sm font-bold text-[#1e93dd]">СТИРАЙ ПЕНУ — В ЛЮБУЮ СТОРОНУ!</span>
              <IconArrow size={16} className="text-[#1e93dd]" />
            </div>
          )}
          <div className="pointer-events-auto flex items-end gap-3">
            {TOOL_META.map((t) => {
              const unlocked = hud.unlocked[t.id - 1];
              const active = hud.tool === t.id;
              return (
                <button
                  key={t.id}
                  className={`toolbtn ${active ? "active" : ""} ${unlocked ? "" : "locked"}`}
                  onClick={() => (unlocked ? g().selectTool(t.id) : g().selectTool(t.id))}
                >
                  <span className={`flex h-14 w-full items-center justify-center rounded-xl border-2 border-[#5b3b1e] ${t.soft} ${t.cls}`}>
                    {!unlocked ? <IconLock size={24} /> : t.id === 1 ? <IconScraper size={32} /> : t.id === 2 ? <IconLaser size={32} /> : <IconFoam size={32} />}
                  </span>
                  <span className="font-display text-[13px] font-bold leading-none">{t.name}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-55">{unlocked ? t.gesture : "скоро"}</span>
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#5b3b1e] bg-white text-[10px] font-black">
                    {t.id}
                  </span>
                  {active && (
                    <span className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-[#5b3b1e] bg-[#fffdf5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== REPLAY ==================== */}
      {hud.phase === "replay" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-4">
          <div className="plate pointer-events-auto flex items-center gap-3 px-4 py-2">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-[#e05a39]">◉ повтор</span>
            <div className="bar h-3 w-36">
              <div className="bar-fill bg-[#ff7a59]" style={{ width: `${(hud.replayT / Math.max(0.1, hud.replayDur)) * 100}%` }} />
            </div>
            <span className="font-mono text-xs font-bold tabular-nums">{hud.replayT.toFixed(1)}с</span>
          </div>
          <button className="btn3d btn-sky pointer-events-auto px-4 py-1.5 text-sm" onClick={() => g().skipReplay()}>
            ДАЛЬШЕ <IconArrow size={14} />
          </button>
        </div>
      )}

      {/* ==================== ALIVE ==================== */}
      {hud.phase === "alive" && artifact && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
            <div className="plate pop flex items-center gap-2 px-4 py-2">
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path d="M12 1.5l2.2 6.8 6.8 2.2-6.8 2.2L12 19.5l-2.2-6.8L3 10.5l6.8-2.2z" fill="#2fc98a" stroke="#5b3b1e" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              <span className="font-display text-base font-bold text-[#2fc98a]">ОНО ЖИВОЕ!</span>
              <span className="hidden text-xs font-bold opacity-60 sm:inline">— поиграй с {artifact.name.toLowerCase()}</span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-4">
            <div className="bubble pointer-events-auto max-w-md px-4 py-2 text-center">
              <span className="font-display text-sm font-bold">{hud.hint}</span>
            </div>
            <button className="btn3d btn-mint pointer-events-auto bounce-soft px-6 py-3 text-lg" onClick={() => g().finishOrder()}>
              ЗАБРАТЬ МОНЕТКИ <IconCoin size={20} />
            </button>
          </div>
        </>
      )}

      {/* ==================== PAYOUT ==================== */}
      {hud.phase === "payout" && hud.payout && artifact && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1d5a80]/45 p-4">
          <Confetti />
          <div className="plate pop relative w-full max-w-sm px-6 py-6 text-center">
            <div className="font-display text-sm font-bold uppercase tracking-[0.25em] opacity-55">заказ выполнен</div>
            <div className="font-display text-2xl font-bold">{artifact.name}</div>
            <div className="my-3 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <svg
                  key={i}
                  width="52" height="52" viewBox="0 0 24 24"
                  className="star-pop"
                  style={{ animationDelay: `${0.15 + i * 0.18}s`, opacity: 0 }}
                >
                  <path
                    d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
                    fill={i < (hud.payout!.rating === "S" ? 3 : hud.payout!.rating === "A" ? 2 : 1) ? "#ffc63d" : "#e7dcc6"}
                    stroke="#5b3b1e" strokeWidth="1.4" strokeLinejoin="round"
                  />
                </svg>
              ))}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">
              точность {hud.payout.precision}% · время {hud.payout.timeStr} · оценка {hud.payout.rating}
            </div>
            <div className="mx-auto mt-4 w-64 space-y-1.5 text-left text-sm font-bold">
              <div className="flex justify-between"><span>Базовая оплата</span><span className="tabular-nums">+{hud.payout.base}</span></div>
              <div className="flex justify-between"><span>За точность</span><span className="tabular-nums text-[#2fc98a]">+{hud.payout.precisionBonus}</span></div>
              <div className="flex justify-between"><span>За скорость</span><span className="tabular-nums text-[#38b6ff]">+{hud.payout.speedBonus}</span></div>
              <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-[#5b3b1e]/30 pt-2 font-display text-xl">
                <span>ИТОГО</span>
                <span className="flex items-center gap-1.5 text-[#e8a413]"><IconCoin size={20} />{hud.payout.total}</span>
              </div>
            </div>
            {/* анонс открытой реликвии */}
            {!hud.allDone && (() => {
              const next = ARTIFACTS.find((a) => !hud.restoredIds.includes(a.id));
              return next ? (
                <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border-2 border-[#5b3b1e] bg-[#fff3c4] px-3 py-1 shadow-[0_3px_0_rgba(90,58,20,0.3)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" className="bounce-soft shrink-0">
                    <path d="M12 1.5l2.2 6.8 6.8 2.2-6.8 2.2L12 19.5l-2.2-6.8L3 10.5l6.8-2.2z" fill="#ff7a59" stroke="#5b3b1e" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  <span className="font-display text-[12px] font-bold">
                    ОТКРЫТО: {next.name.toUpperCase()}!
                  </span>
                </div>
              ) : null;
            })()}
            <div className="mt-5 flex flex-col gap-2">
              <button className="btn3d btn-sun px-5 py-3 text-base" onClick={() => g().nextOrder()}>
                {hud.allDone ? "В КАТАЛОГ" : "СЛЕДУЮЩИЙ ЗАКАЗ"} <IconArrow size={16} />
              </button>
              <div className="flex gap-2">
                {hud.hasReplay && (
                  <button className="btn3d btn-sky flex-1 px-3 py-2 text-sm" onClick={() => g().downloadReplay()}>
                    <IconDownload size={15} /> ПОВТОР
                  </button>
                )}
                <button className="btn3d btn-white flex-1 px-3 py-2 text-sm" onClick={() => g().toCatalog()}>
                  В КАТАЛОГ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PAUSE ==================== */}
      {hud.paused && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1d5a80]/50 p-4">
          <div className="plate pop w-full max-w-xs px-6 py-6 text-center">
            <div className="font-display text-2xl font-bold">ПАУЗА</div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-55">отдыхаем</div>
            <div className="mt-5 flex flex-col gap-2.5">
              <button className="btn3d btn-mint px-5 py-3 text-base" onClick={() => g().togglePause()}>ПРОДОЛЖИТЬ</button>
              <button className="btn3d btn-sky px-5 py-2.5 text-sm" onClick={() => g().restartArtifact()}>НАЧАТЬ ЗАНОВО</button>
              <button className="btn3d btn-coral px-5 py-2.5 text-sm" onClick={() => { g().togglePause(); g().toCatalog(); }}>В КАТАЛОГ</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CATALOG ==================== */}
      {hud.phase === "catalog" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col overflow-y-auto scroll-thin">
          <div className="flex items-start justify-between p-4 sm:p-6">
            <div className="pop">
              <div className="font-display text-3xl font-bold leading-none text-[#1d5a80] drop-shadow-[0_2px_0_rgba(255,255,255,0.7)] sm:text-5xl">
                МАСТЕРСКАЯ БЛЕСКА
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-[#402a14]/70">
                <span className="rounded-full border-2 border-[#5b3b1e] bg-[#fffdf5] px-2 py-0.5 text-[10px] uppercase tracking-widest">PRISTINE 2D</span>
                отчисти · оживи · похвастайся
              </div>
            </div>
            <div className="plate pointer-events-auto flex items-center gap-2 px-3 py-2">
              <span className="coin-spin inline-flex text-[#e8a413]"><IconCoin size={22} /></span>
              <span className="font-display text-2xl font-bold tabular-nums">{hud.credits}</span>
            </div>
          </div>

          {hud.allDone && (
            <div className="mx-auto mb-2 px-4">
              <div className="plate flex items-center gap-3 px-4 py-3">
                <svg width="34" height="34" viewBox="0 0 24 24" className="bounce-soft shrink-0">
                  <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#ffc63d" stroke="#5b3b1e" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <div className="text-left">
                  <div className="font-display text-lg font-bold leading-tight text-[#2fc98a]">ВСЁ БЛЕСТИТ! Витрина полная!</div>
                  <button className="btn3d btn-berry pointer-events-auto mt-1.5 px-3 py-1 text-xs" onClick={() => g().newShift()}>НОВАЯ СМЕНА</button>
                </div>
              </div>
            </div>
          )}

          {/* счётчик коллекции */}
          <div className="pointer-events-none flex justify-center pb-3">
            <div className="plate pointer-events-auto flex items-center gap-2 px-4 py-1.5">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#ffc63d" stroke="#5b3b1e" strokeWidth="1.6" strokeLinejoin="round" /></svg>
              <span className="font-display text-sm font-bold">СОБРАНО {hud.restoredIds.length} / {ARTIFACTS.length}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 px-3 pb-6">
            {Array.from(new Set(ARTIFACTS.map((a) => a.collection))).map((coll, ci) => {
              const group = ARTIFACTS.filter((a) => a.collection === coll);
              if (group.length === 0) return null;
              const doneInGroup = group.filter((a) => hud.restoredIds.includes(a.id)).length;
              return (
                <div key={coll} className="pointer-events-auto w-full max-w-4xl" style={{ animationDelay: `${ci * 0.1}s` }}>
                  {/* заголовок коллекции */}
                  <div className="mb-3 flex items-center gap-3 px-2">
                    <span
                      className="rounded-lg border-[3px] border-[#5b3b1e] px-3 py-1 font-display text-base font-bold uppercase tracking-wider shadow-[0_3px_0_rgba(90,58,20,0.35)]"
                      style={{ background: COLL_COLOR[coll], color: COLL_DARKTEXT[coll] || coll === "sea" ? "#5b3b1e" : "#fff" }}
                    >
                      {group[0].collectionLabel}
                    </span>
                    <span className="font-display text-sm font-bold opacity-60">{doneInGroup}/{group.length}</span>
                    <div className="h-1 flex-1 rounded-full bg-[#5b3b1e]/15" />
                  </div>
                  {/* полка с карточками */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5 pb-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.map((a, i) => {
                      const done = hud.restoredIds.includes(a.id);
                      const unlocked = hud.unlockedIds.includes(a.id);
                      const isNext = !done && hud.unlockedIds[hud.unlockedIds.length - 1] === a.id;
                      const idx = ARTIFACTS.findIndex((q) => q.id === a.id);
                      const prev = idx > 0 ? ARTIFACTS[idx - 1] : null;
                      return (
                        <div
                          key={a.id}
                          className={`artifact-card plate relative flex flex-col items-center px-3 pb-3.5 pt-5 ${unlocked ? "" : "card-locked"} ${shakeId === a.id ? "locked-shake" : ""}`}
                          style={{ animationDelay: `${i * 0.07}s` }}
                          onClick={() => {
                            if (!unlocked && !done) {
                              g().audio.thud();
                              setLockToast({ txt: prev ? `Сначала отчисти «${prev.name}»!` : "Эта реликвия ещё закрыта!", n: Date.now() });
                              setShakeId(a.id);
                              window.setTimeout(() => setShakeId((s) => (s === a.id ? null : s)), 450);
                            }
                          }}
                        >
                          {isNext && (
                            <span className="bounce-soft absolute -top-3 right-2 z-10 rounded-full border-2 border-[#5b3b1e] bg-[#ff7a59] px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-wide text-white shadow-[0_2px_0_rgba(90,58,20,0.4)]">
                              следующая!
                            </span>
                          )}
                          <div className={`relative ${done ? "" : unlocked ? "floaty" : ""}`} style={{ animationDelay: `${i * 0.5}s` }}>
                            <Thumb id={a.id} px={104} />
                            {!unlocked && !done && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#5b3b1e] bg-[#fffdf5] text-[#5b3b1e] shadow-[0_3px_0_rgba(90,58,20,0.4)]">
                                  <IconLock size={20} />
                                </span>
                              </span>
                            )}
                          </div>
                          <div className={`text-center font-display text-[15px] font-bold leading-tight ${unlocked ? "" : "opacity-50"}`}>
                            {unlocked ? a.name : "???"}
                          </div>
                          <div className="mt-0.5 min-h-8 text-center text-[11px] font-bold leading-snug opacity-60">
                            {unlocked ? a.tagline : "секретная реликвия"}
                          </div>
                          {done ? (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Stars rating={(g().restored[a.id]?.rating as string) ?? "A"} />
                              <span className="rounded-full bg-[#2fc98a] px-2 py-0.5 text-[10px] font-black uppercase text-white">готово</span>
                            </div>
                          ) : unlocked ? (
                            <button
                              className="btn3d btn-sun mt-1.5 px-4 py-1.5 text-sm"
                              onClick={(e) => { e.stopPropagation(); g().startArtifact(a.id); }}
                            >
                              ЧИСТИТЬ!
                            </button>
                          ) : (
                            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-[#5b3b1e]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#5b3b1e]/60">
                              <IconLock size={11} /> закрыто
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* деревянная полка */}
                  <div className="h-4 rounded-[9px] border-[3px] border-[#5b3b1e] bg-gradient-to-b from-[#f0b45c] to-[#d99a44] shadow-[0_5px_0_rgba(90,58,20,0.3)]" />
                  <div className="mx-auto flex justify-between px-8">
                    <div className="h-5 w-3.5 rounded-b-md border-x-[3px] border-b-[3px] border-[#5b3b1e] bg-[#d99a44]" />
                    <div className="h-5 w-3.5 rounded-b-md border-x-[3px] border-b-[3px] border-[#5b3b1e] bg-[#d99a44]" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pb-4 text-center text-[11px] font-extrabold uppercase tracking-widest text-[#1d5a80]/70">
            выбирай реликвию с полки — каждая ждёт блеска!
          </div>
        </div>
      )}

      {/* тост «реликвия закрыта» */}
      {lockToast && (
        <div key={lockToast.n} className="toast-lock pointer-events-none absolute inset-x-0 bottom-8 z-40 flex justify-center px-4">
          <div className="plate flex items-center gap-2 px-4 py-2.5">
            <span className="text-[#e05a39]"><IconLock size={18} /></span>
            <span className="font-display text-sm font-bold">{lockToast.txt}</span>
          </div>
        </div>
      )}
    </div>
  );
}
