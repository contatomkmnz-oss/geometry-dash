import { BLOCK, COLORS, SCROLL_BASE, PLAYER_SIZE } from "./constants.js";
import { Player } from "./player.js";
import { Particles } from "./particles.js";
import { getLevel } from "./levels.js";
import { recordAttempt, recordProgress } from "./storage.js";

export class Game {
  constructor({ renderer, input, audio, save, onUI }) {
    this.renderer = renderer;
    this.input = input;
    this.audio = audio;
    this.save = save;
    this.onUI = onUI;
    this.player = new Player();
    this.particles = new Particles();
    this.running = false;
    this.paused = false;
    this.level = null;
    this.levelId = 0;
    this.attempt = 1;
    this.camX = 0;
    this.practice = false;
    this.checkpoints = [];
    this.attemptFlash = 0;
    this.deathTimer = 0;
    this.winTimer = 0;
    this.state = "idle"; // idle | playing | dead | won
    this.last = 0;
    this.raf = 0;
  }

  startLevel(levelId, { practice = false } = {}) {
    this.levelId = levelId;
    this.level = structuredClone(getLevel(levelId));
    this.practice = practice;
    this.checkpoints = [];
    this.attempt = (this.save.attempts[levelId] || 0) + 1;
    recordAttempt(this.save, levelId);
    this.input.held = false;
    this.input.justPressed = false;
    this.input._queuePress = false;
    this.input._queueRelease = false;
    this.resetAttempt(true);
    this.running = true;
    this.paused = false;
    this.state = "playing";
    this.audio.stopMusic();
    this.audio.startMusic(this.level.bpm);
    this.onUI({ type: "playing", attempt: this.attempt, practice: this.practice });
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.loop(this.last);
  }

  resetAttempt(fresh = false) {
    const spawn = this.checkpoints.length
      ? this.checkpoints[this.checkpoints.length - 1]
      : { x: 80, y: 8 * BLOCK - PLAYER_SIZE + 2, mode: "cube", gravityDir: 1 };

    this.input.held = false;
    this.input.justPressed = false;
    this.input._queuePress = false;
    this.player.reset({ x: spawn.x, y: spawn.y });
    if (spawn.mode) this.player.setMode(spawn.mode);
    if (spawn.gravityDir) this.player.gravityDir = spawn.gravityDir;
    this.player.usedPads = new Set();
    this.player.usedOrbs = new Set();
    this.particles.clear();
    this.camX = Math.max(0, this.player.x - 180);
    this.deathTimer = 0;
    this.winTimer = 0;
    this.attemptFlash = 0.6;
    this.state = "playing";
    if (!fresh && !this.checkpoints.length) {
      this.attempt++;
      recordAttempt(this.save, this.levelId);
    }
  }

  togglePause() {
    if (!this.running || this.state !== "playing") return;
    this.paused = !this.paused;
    this.onUI({ type: this.paused ? "pause" : "resume" });
    if (!this.paused) {
      this.last = performance.now();
      this.loop(this.last);
    }
  }

  stopToMenu() {
    this.running = false;
    this.paused = false;
    this.audio.stopMusic();
    cancelAnimationFrame(this.raf);
    this.onUI({ type: "menu" });
  }

  percent() {
    if (!this.level) return 0;
    return Math.max(0, Math.min(100, (this.player.x / this.level.length) * 100));
  }

  loop = (now) => {
    if (!this.running) return;
    const dt = Math.min(0.033, (now - this.last) / 1000 || 0.016);
    this.last = now;

    this.input.beginFrame();

    if (this.input.pausePressed) this.togglePause();
    if (this.input.practiceToggle && this.state === "playing") {
      this.practice = !this.practice;
      if (!this.practice) this.checkpoints = [];
      this.onUI({ type: "practice", practice: this.practice });
    }
    if (this.practice && this.input.placeCheckpoint && this.player.alive) {
      this.checkpoints.push({
        x: this.player.x,
        y: this.player.y,
        mode: this.player.mode,
        gravityDir: this.player.gravityDir,
      });
      this.audio.click();
    }

    if (!this.paused) this.update(dt);

    this.renderer.draw({
      level: this.level,
      player: this.player,
      particles: this.particles,
      camX: this.camX,
      practice: this.practice,
      checkpoints: this.checkpoints,
      attemptFlash: this.attemptFlash,
      iconId: this.save.selectedIcon,
    });

    this.onUI({
      type: "hud",
      percent: this.percent(),
      attempt: this.attempt,
      practice: this.practice,
    });

    this.input.endFrame();
    this.raf = requestAnimationFrame(this.loop);
  };

  update(dt) {
    this.attemptFlash = Math.max(0, this.attemptFlash - dt * 1.8);

    if (this.state === "dead") {
      this.particles.update(dt);
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        if (this.practice) {
          this.resetAttempt();
          this.onUI({ type: "playing", attempt: this.attempt, practice: true });
        } else {
          this.onUI({ type: "death", percent: this.percent() });
          // wait for UI retry — keep rendering
        }
      }
      return;
    }

    if (this.state === "won") {
      this.particles.update(dt);
      this.winTimer -= dt;
      return;
    }

    if (this.state !== "playing") return;

    const solids = this.level.objects.filter((o) => o.type === "block");
    const interactables = this.level.objects.filter((o) => o.type !== "block");
    const color = COLORS.player[this.save.selectedIcon % COLORS.player.length];

    const result = this.player.update(
      dt,
      this.input,
      this.level.speed,
      solids,
      interactables,
      this.audio,
      this.particles,
      color
    );

    if (this.player._pendingDeath) {
      this.player._pendingDeath = false;
      Object.assign(result, this.player.kill(this.particles, color, this.audio));
    }

    // Fall out of world
    if (this.player.y > 14 * BLOCK || this.player.y < -6 * BLOCK) {
      Object.assign(result, this.player.kill(this.particles, color, this.audio));
    }

    this.particles.update(dt);
    this.camX += (this.player.x - 180 - this.camX) * Math.min(1, dt * 10);

    const pct = this.percent();
    recordProgress(this.save, this.levelId, pct, false, 0);

    if (result.died) {
      this.state = "dead";
      this.deathTimer = this.practice ? 0.55 : 0.85;
      this.renderer.addShake(14);
      recordProgress(this.save, this.levelId, pct, false, 0);
      return;
    }

    if (result.finished) {
      this.state = "won";
      this.winTimer = 999;
      const stars = this.level.stars;
      recordProgress(this.save, this.levelId, 100, true, stars);
      this.particles.emit(this.player.cx, this.player.cy, {
        count: 40,
        color: "#b8ff3c",
        speed: 420,
        life: 1,
      });
      this.onUI({
        type: "complete",
        stars,
        attempts: this.save.attempts[this.levelId] || this.attempt,
        levelId: this.levelId,
      });
    }
  }

  retry() {
    if (!this.practice) {
      this.attempt++;
      recordAttempt(this.save, this.levelId);
    }
    this.checkpoints = this.practice ? this.checkpoints : [];
    this.resetAttempt(true);
    this.onUI({ type: "playing", attempt: this.attempt, practice: this.practice });
    this.last = performance.now();
  }
}
