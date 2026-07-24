import { LEVELS } from "./levels.js";
import { COLORS, ICON_UNLOCKS } from "./constants.js";
import { loadSave, writeSave } from "./storage.js";
import { AudioEngine } from "./audio.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { Game } from "./game.js";

import { AutoPlayer } from "./autoplay.js";

const $ = (sel) => document.querySelector(sel);
const canvas = $("#game");
const save = loadSave();
const audio = new AudioEngine();
const input = new Input(canvas);
const renderer = new Renderer(canvas);
input.setEnabled(false);

const ui = {
  menu: $("#menu"),
  levels: $("#levels"),
  icons: $("#icons"),
  howto: $("#howto"),
  hud: $("#hud"),
  pause: $("#pause"),
  death: $("#death"),
  complete: $("#complete"),
  levelList: $("#level-list"),
  iconGrid: $("#icon-grid"),
  attempt: $("#attempt"),
  percent: $("#percent"),
  progress: $("#progress-bar"),
  deathPercent: $("#death-percent"),
  completeStars: $("#complete-stars"),
  completeAttempts: $("#complete-attempts"),
  totalStars: $("#total-stars"),
  totalMoney: $("#total-money"),
  bestRun: $("#best-run"),
  hudMoney: $("#hud-money"),
  completeMoney: $("#complete-money"),
};

function hideAllScreens() {
  [ui.menu, ui.levels, ui.icons, ui.howto].forEach((el) => el.classList.add("hidden"));
  [ui.pause, ui.death, ui.complete].forEach((el) => el.classList.add("hidden"));
}

function showScreen(name) {
  hideAllScreens();
  ui.hud.classList.add("hidden");
  input.setEnabled(false);
  if (name === "menu") {
    ui.menu.classList.remove("hidden");
    refreshMenuStats();
  } else if (name === "levels") {
    ui.levels.classList.remove("hidden");
    renderLevels();
  } else if (name === "icons") {
    ui.icons.classList.remove("hidden");
    renderIcons();
  } else if (name === "howto") {
    ui.howto.classList.remove("hidden");
  }
  idleDraw();
}

function refreshMenuStats() {
  ui.totalStars.textContent = `★ ${save.stars}`;
  ui.totalMoney.textContent = `R$ ${save.money || 0}`;
  const bests = Object.values(save.bestPercent);
  const best = bests.length ? Math.max(...bests) : 0;
  ui.bestRun.textContent = `Melhor: ${best}%`;
}

function renderLevels() {
  ui.levelList.innerHTML = "";
  LEVELS.forEach((lvl) => {
    const best = save.bestPercent[lvl.id] || 0;
    const done = !!save.completed[lvl.id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-card";
    btn.dataset.levelId = String(lvl.id);
    btn.innerHTML =
      `<div class="name">${done ? "✓ " : ""}${lvl.name}</div>` +
      `<div class="meta"><span class="diff">${lvl.difficulty} · ${"★".repeat(lvl.stars)}</span><span>${best}%</span></div>`;
    ui.levelList.appendChild(btn);
  });
}

function renderIcons() {
  ui.iconGrid.innerHTML = "";
  ICON_UNLOCKS.forEach((icon) => {
    const unlocked = save.unlockedIcons.includes(icon.id);
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = `icon-slot${unlocked ? "" : " locked"}${save.selectedIcon === icon.id ? " selected" : ""}`;
    slot.dataset.iconId = String(icon.id);
    slot.title = unlocked ? icon.name : `Complete o nível ${icon.unlock}`;
    slot.style.background = unlocked ? COLORS.player[icon.id] : "#121a33";
    slot.textContent = unlocked ? "◆" : "🔒";
    ui.iconGrid.appendChild(slot);
  });
}

const game = new Game({
  renderer,
  input,
  audio,
  save,
  onUI: handleUI,
});

function handleUI(msg) {
  if (msg.type === "hud") {
    ui.attempt.textContent = `Tentativa ${msg.attempt}${msg.practice ? " · PRÁTICA" : ""}`;
    ui.percent.textContent = `${Math.floor(msg.percent)}%`;
    ui.progress.style.width = `${msg.percent}%`;
    ui.hudMoney.textContent = `R$ ${msg.money ?? save.money ?? 0}`;
  }
  if (msg.type === "playing") {
    hideAllScreens();
    ui.hud.classList.remove("hidden");
    ui.pause.classList.add("hidden");
    ui.death.classList.add("hidden");
    ui.complete.classList.add("hidden");
    input.setEnabled(true);
  }
  if (msg.type === "pause") {
    ui.pause.classList.remove("hidden");
    input.setEnabled(false);
  }
  if (msg.type === "resume") {
    ui.pause.classList.add("hidden");
    input.setEnabled(true);
  }
  if (msg.type === "death") {
    ui.deathPercent.textContent = `${Math.floor(msg.percent)}%`;
    ui.death.classList.remove("hidden");
    input.setEnabled(false);
  }
  if (msg.type === "complete") {
    ui.completeStars.textContent = "★".repeat(msg.stars);
    ui.completeMoney.textContent = `+ R$ ${msg.runMoney ?? 0} nesta partida`;
    ui.completeAttempts.textContent = `Tentativas: ${msg.attempts}`;
    ui.complete.classList.remove("hidden");
    input.setEnabled(false);
    refreshMenuStats();
  }
  if (msg.type === "menu") showScreen("menu");
}

function startGame(levelId) {
  audio.unlock().catch(() => {});
  try {
    hideAllScreens();
    ui.hud.classList.remove("hidden");
    game.startLevel(levelId, { practice: false });
  } catch (err) {
    console.error(err);
    showScreen("menu");
  }
}

function handleAction(action) {
  audio.unlock().catch(() => {});
  if (action === "play") startGame(0);
  else if (action === "levels") showScreen("levels");
  else if (action === "icons") showScreen("icons");
  else if (action === "howto") showScreen("howto");
  else if (action === "resume") game.togglePause();
  else if (action === "restart" || action === "retry") {
    ui.death.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.complete.classList.add("hidden");
    game.retry();
    input.setEnabled(true);
  } else if (action === "to-menu") {
    game.stopToMenu();
    showScreen("menu");
  } else if (action === "next") {
    startGame(Math.min(LEVELS.length - 1, (game.levelId || 0) + 1));
  }
}

// Delegação única — funciona no iOS/Android sem depender de click fantasma
let tapLock = false;
function uiTap(e) {
  const btn = e.target.closest("[data-action], [data-back], #btn-pause, #btn-practice, .level-card, .icon-slot");
  if (!btn || btn.disabled || btn.classList.contains("locked")) return;

  // Só processa toque/clique primário
  if (e.type === "pointerdown" && e.button != null && e.button !== 0) return;

  e.preventDefault();
  e.stopPropagation();
  if (tapLock) return;
  tapLock = true;
  setTimeout(() => { tapLock = false; }, 400);

  if (btn.id === "btn-pause") {
    game.togglePause();
    return;
  }
  if (btn.id === "btn-practice") {
    if (!game.running) return;
    game.practice = !game.practice;
    if (!game.practice) game.checkpoints = [];
    return;
  }
  if (btn.classList.contains("level-card") && btn.dataset.levelId != null) {
    startGame(Number(btn.dataset.levelId));
    return;
  }
  if (btn.classList.contains("icon-slot") && btn.dataset.iconId != null) {
    const id = Number(btn.dataset.iconId);
    if (!save.unlockedIcons.includes(id)) return;
    save.selectedIcon = id;
    writeSave(save);
    renderIcons();
    return;
  }
  if (btn.hasAttribute("data-back")) {
    showScreen(btn.getAttribute("data-back"));
    return;
  }
  if (btn.hasAttribute("data-action")) {
    handleAction(btn.getAttribute("data-action"));
  }
}

const app = $("#app");

// Fallback explícito do botão JOGAR (iOS às vezes engole delegação)
window.__gdPlay = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  handleAction("play");
};
const playBtn = $("#btn-play");
if (playBtn) {
  playBtn.onclick = (e) => window.__gdPlay(e);
  playBtn.ontouchend = (e) => {
    e.preventDefault();
    window.__gdPlay(e);
  };
}

app.addEventListener("pointerdown", uiTap, { passive: false });
app.addEventListener("touchend", (e) => {
  const btn = e.target.closest("[data-action], [data-back], #btn-pause, #btn-practice, .level-card, .icon-slot");
  if (!btn) return;
  uiTap(e);
}, { passive: false });
app.addEventListener("click", (e) => {
  if (e.target.closest("[data-action], [data-back], #btn-pause, #btn-practice, .level-card, .icon-slot")) {
    uiTap(e);
  }
}, true);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    renderer.resize();
    if (!game.running) idleDraw();
  });
}

function idleDraw() {
  if (game.running) return;
  try {
    renderer.draw({
      level: { objects: [], theme: 0 },
      player: { alive: false, x: 0, y: 0, w: 0, h: 0, mode: "cube", rotation: 0 },
      particles: { items: [] },
      camX: 0,
      practice: false,
      checkpoints: [],
      attemptFlash: 0,
      iconId: save.selectedIcon,
    });
  } catch (err) {
    console.error(err);
  }
}

showScreen("menu");
idleDraw();

window.addEventListener("resize", () => {
  renderer.resize();
  if (!game.running) idleDraw();
});
window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    renderer.resize();
    if (!game.running) idleDraw();
  }, 150);
});

document.addEventListener(
  "visibilitychange",
  () => {
    if (!document.hidden) {
      renderer.resize();
      audio.unlock().catch(() => {});
    }
  }
);

// Exposto para testes / modo automático
window.__GD = { game, input, audio, save, startGame, handleAction };

const params = new URLSearchParams(location.search);
if (params.get("auto") === "1") {
  const bot = new AutoPlayer(game);
  game.autoplay = bot;
  bot.start();
  // inicia sozinho após curto delay
  setTimeout(() => {
    const lvl = Number(params.get("level") || 0);
    startGame(Number.isFinite(lvl) ? lvl : 0);
  }, 300);

  // relatório periódico no console
  setInterval(() => {
    console.log("[AUTOPLAY REPORT]", bot.report());
  }, 5000);
}
