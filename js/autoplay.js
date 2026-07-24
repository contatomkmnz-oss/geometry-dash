import { BLOCK, MODES, PLAYER_SIZE } from "./constants.js";

/**
 * Bot automático — joga o nível sozinho e reporta bugs.
 */
export class AutoPlayer {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.log = [];
    this.stats = {
      deaths: 0,
      finishes: 0,
      maxPercent: 0,
      bugs: [],
      frames: 0,
      retries: 0,
    };
    this._wasAlive = true;
    this._hold = false;
    this._lastState = "";
    this._stuckFrames = 0;
    this._lastX = 0;
  }

  start() {
    this.enabled = true;
    this.log.push("autoplay:on");
  }

  stop() {
    this.enabled = false;
    this._release();
  }

  noteBug(msg) {
    const bug = `[${Math.floor(this.game.percent())}%] ${msg}`;
    this.stats.bugs.push(bug);
    this.log.push("BUG " + bug);
    console.warn("[AUTOPLAY BUG]", bug);
  }

  _press() {
    const input = this.game.input;
    if (!input.held) {
      input._queuePress = true;
      input.held = true;
    }
    this._hold = true;
  }

  _tap() {
    const input = this.game.input;
    input._queuePress = true;
    input.held = true;
    // solta no próximo tick via _release deferred
    this._hold = false;
    setTimeout(() => {
      input.held = false;
      input._queueRelease = true;
    }, 30);
  }

  _release() {
    const input = this.game.input;
    if (input.held || this._hold) {
      input.held = false;
      input._queueRelease = true;
    }
    this._hold = false;
  }

  tick() {
    if (!this.enabled || !this.game.running) return;
    this.stats.frames++;

    const g = this.game;
    const p = g.player;
    const pct = g.percent();
    if (pct > this.stats.maxPercent) this.stats.maxPercent = pct;

    // Detecta bugs de estado
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vy)) {
      this.noteBug(`NaN na física x=${p.x} y=${p.y} vy=${p.vy}`);
      g.retry();
      return;
    }

    if (p.y > 20 * BLOCK || p.y < -10 * BLOCK) {
      this.noteBug(`Jogador fora do mundo y=${p.y.toFixed(1)}`);
    }

    // Stuck detection
    if (Math.abs(p.x - this._lastX) < 0.5 && g.state === "playing" && p.alive) {
      this._stuckFrames++;
      if (this._stuckFrames > 180) {
        this.noteBug(`Travado em x=${p.x.toFixed(0)} mode=${p.mode}`);
        this._stuckFrames = 0;
        this._tap();
      }
    } else {
      this._stuckFrames = 0;
    }
    this._lastX = p.x;

    // Morte → retry automático
    if (this._wasAlive && !p.alive) {
      this.stats.deaths++;
      this.log.push(`death@${pct.toFixed(1)}% mode=${p.mode}`);
    }
    this._wasAlive = p.alive;

    if (g.state === "dead") {
      const deathVisible = !document.getElementById("death")?.classList.contains("hidden");
      if (deathVisible || g.deathTimer <= 0) {
        this.stats.retries++;
        document.getElementById("death")?.classList.add("hidden");
        g.retry();
        g.input.setEnabled(true);
        this._wasAlive = true;
      }
      return;
    }

    if (g.state === "won") {
      this.stats.finishes++;
      this.log.push(`finish level=${g.levelId}`);
      // próximo nível
      const next = Math.min(7, g.levelId + 1);
      setTimeout(() => {
        if (this.enabled) g.startLevel(next);
      }, 400);
      return;
    }

    if (g.state !== "playing" || !p.alive || g.paused) return;

    this._decide(p, g);
  }

  _ahead(objs, p, dist, types) {
    const x0 = p.x + p.w;
    const x1 = p.x + dist;
    return objs.filter(
      (o) => types.includes(o.type) && o.x < x1 && o.x + o.w > x0
    );
  }

  _decide(p, g) {
    const objs = g.level.objects;
    const look = 160;
    const spikes = this._ahead(objs, p, look, ["spike"]);
    const pads = this._ahead(objs, p, 90, ["pad"]);
    const orbs = this._ahead(objs, p, 100, ["orb"]).filter((o) => !o.collected);
    const coins = this._ahead(objs, p, 80, ["coin"]).filter((o) => !o.collected);

    switch (p.mode) {
      case MODES.CUBE:
      case MODES.BALL: {
        const threat = spikes.find((s) => {
          const dx = s.x - (p.x + p.w);
          const nearY = Math.abs((s.y + s.h / 2) - p.cy) < BLOCK * 1.8;
          return dx > -5 && dx < 120 && nearY && (s.dir !== "down" || p.y < s.y + s.h);
        });
        if (threat && (p.onGround || p.coyote > 0 || p.jumpsLeft > 0)) {
          // Pula mais cedo nos espinhos
          if (threat.x - (p.x + p.w) < 110) this._tap();
        } else if (pads.length && p.onGround && pads[0].x - p.x < 55) {
          this._tap();
        } else if (orbs.length && !p.onGround && Math.abs(orbs[0].x - p.cx) < 45) {
          this._tap();
        } else if (coins.length && p.onGround && coins[0].y + coins[0].h < p.y - 5) {
          this._tap();
        } else {
          this._release();
        }
        break;
      }
      case MODES.SHIP:
      case MODES.UFO: {
        // Mantém no meio do corredor (entre teto y=1 e chão y=10)
        const mid = 5.5 * BLOCK;
        const target = mid - PLAYER_SIZE / 2;
        if (p.mode === MODES.SHIP) {
          if (p.y > target + 12) this._press();
          else if (p.y < target - 12) this._release();
          // desvia de spike
          const near = spikes.find((s) => s.x - p.x < 120 && s.x > p.x);
          if (near) {
            if (near.dir === "up" || near.y > 5 * BLOCK) this._press();
            else this._release();
          }
        } else {
          // UFO: toques para subir
          if (p.y > target + 20) this._tap();
          else this._release();
        }
        break;
      }
      case MODES.WAVE: {
        // Alterna para tentar passar no meio
        const mid = 5.5 * BLOCK;
        if (p.y > mid) this._press();
        else this._release();
        const near = spikes.find((s) => s.x - p.x < 100 && s.x > p.x - 20);
        if (near) {
          if (near.y > p.y) this._press();
          else this._release();
        }
        break;
      }
      default:
        this._release();
    }
  }

  report() {
    return {
      ...this.stats,
      log: this.log.slice(-40),
    };
  }
}
