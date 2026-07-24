import { LEVELS } from "./levels.js";
import { COLORS, ICON_UNLOCKS } from "./constants.js";
import { loadSave, writeSave } from "./storage.js";
import { AudioEngine } from "./audio.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { Game } from "./game.js";

const $ = (sel) => document.querySelector(sel);
const canvas = $("#game");
const save = loadSave();
const audio = new AudioEngine();
const input = new Input(canvas);
const renderer = new Renderer(canvas);

// Canvas não bloqueia o menu no mobile
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
    btn.innerHTML =
      `<div class="name">${done ? "✓ " : ""}${lvl.name}</div>` +
      `<div class="meta"><span class="diff">${lvl.difficulty} · ${"★".repeat(lvl.stars)}</span><span>${best}%</span></div>`;
    bindTap(btn, () => startGame(lvl.id));
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
    slot.title = unlocked ? icon.name : `Complete o nível ${icon.unlock}`;
    slot.style.background = unlocked ? COLORS.player[icon.id] : "#121a33";
    slot.textContent = unlocked ? "◆" : "🔒";
    bindTap(slot, () => {
      if (!unlocked) return;
      save.selectedIcon = icon.id;
      writeSave(save);
      renderIcons();
    });
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
  if (msg.type === "menu") {
    showScreen("menu");
  }
}

function startGame(levelId) {
  try {
    hideAllScreens();
    ui.hud.classList.remove("hidden");
    game.startLevel(levelId, { practice: false });
  } catch (err) {
    console.error(err);
    alert("Erro ao iniciar: " + (err && err.message ? err.message : err));
    showScreen("menu");
  }
}

/** Toque confiável no mobile (não espera áudio) */
function bindTap(el, fn) {
  let locked = false;
  const run = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;
    locked = true;
    try {
      // Áudio em paralelo — nunca bloqueia o botão
      audio.unlock().then(() => { try { audio.click(); } catch {} }).catch(() => {});
      fn();
    } finally {
      setTimeout(() => { locked = false; }, 250);
    }
  };
  el.addEventListener("click", run);
  el.addEventListener("pointerup", (e) => {
    if (e.pointerType === "touch" || e.pointerType === "pen") run(e);
  });
}

document.querySelectorAll("[data-action]").forEach((btn) => {
  bindTap(btn, () => {
    const action = btn.dataset.action;
    if (action === "play") startGame(0);
    if (action === "levels") showScreen("levels");
    if (action === "icons") showScreen("icons");
    if (action === "howto") showScreen("howto");
    if (action === "resume") game.togglePause();
    if (action === "restart" || action === "retry") {
      ui.death.classList.add("hidden");
      ui.pause.classList.add("hidden");
      ui.complete.classList.add("hidden");
      game.retry();
      input.setEnabled(true);
    }
    if (action === "to-menu") {
      game.stopToMenu();
      showScreen("menu");
    }
    if (action === "next") {
      const next = Math.min(LEVELS.length - 1, (game.levelId || 0) + 1);
      startGame(next);
    }
  });
});

document.querySelectorAll("[data-back]").forEach((btn) => {
  bindTap(btn, () => showScreen(btn.dataset.back));
});

bindTap($("#btn-pause"), () => game.togglePause());
bindTap($("#btn-practice"), () => {
  if (!game.running) return;
  game.practice = !game.practice;
  if (!game.practice) game.checkpoints = [];
});

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
  }, 200);
});

// iOS: reativa áudio no primeiro toque em qualquer lugar
window.addEventListener(
  "touchstart",
  () => { audio.unlock().catch(() => {}); },
  { once: true, passive: true }
);
