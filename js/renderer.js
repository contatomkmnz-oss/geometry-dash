import { BLOCK, COLORS, MODES } from "./constants.js";

const PORTAL_COLORS = {
  [MODES.CUBE]: "#ffd24a",
  [MODES.SHIP]: "#ff2d95",
  [MODES.BALL]: "#b8ff3c",
  [MODES.UFO]: "#a78bfa",
  [MODES.WAVE]: "#00e5ff",
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    // Cap DPR hard — biggest cost on phones/hidpi
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    this.w = 0;
    this.h = 0;
    this.shake = 0;
    this._groundY = 0;
    this._accent = COLORS.accent[0];
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    // Prefer lower res on small/weak screens
    const low = this.w * this.h > 1_500_000 || this.w < 900;
    this.dpr = Math.min(window.devicePixelRatio || 1, low ? 1 : 1.25);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx = this.canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._groundY = this.h * 0.72;
  }

  addShake(amt = 6) {
    this.shake = Math.max(this.shake, amt);
  }

  draw(state) {
    const ctx = this.ctx;
    const { level, player, particles, camX, practice, checkpoints, attemptFlash } = state;
    const theme = COLORS.bg[(level.theme || 0) % COLORS.bg.length];
    const accent = COLORS.accent[(level.theme || 0) % COLORS.accent.length];
    const iconColor = COLORS.player[state.iconId % COLORS.player.length];
    this._accent = accent;

    let shakeX = 0;
    let shakeY = 0;
    if (this.shake > 0) {
      shakeX = (Math.random() - 0.5) * this.shake;
      shakeY = (Math.random() - 0.5) * this.shake;
      this.shake *= 0.85;
      if (this.shake < 0.35) this.shake = 0;
    }

    const groundScreen = this._groundY;
    const mapY = (wy) => groundScreen - (8 * BLOCK - wy);

    // Flat fill — no gradient alloc per frame
    ctx.fillStyle = theme;
    ctx.fillRect(0, 0, this.w, this.h);

    // Sparse grid (every 2 blocks, batched path)
    this.drawGrid(camX, accent);

    ctx.fillStyle = "#00000055";
    ctx.fillRect(0, groundScreen, this.w, this.h - groundScreen);
    ctx.fillStyle = accent;
    ctx.fillRect(0, groundScreen, this.w, 2);

    const left = camX - 60;
    const right = camX + this.w + 60;
    const objs = level.objects || [];
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (o.x + o.w < left || o.x > right) continue;
      this.drawObject(o, o.x - camX + shakeX, mapY(o.y) + shakeY);
    }

    if (practice) {
      ctx.fillStyle = "#00ff88";
      for (let i = 0; i < checkpoints.length; i++) {
        const c = checkpoints[i];
        const x = c.x - camX + shakeX;
        const y = mapY(c.y) + shakeY;
        ctx.fillRect(x, y - 40, 5, 48);
      }
    }

    this.drawParticles(particles, camX, groundScreen, shakeX, shakeY);

    if (player.alive) {
      this.drawPlayer(
        player,
        player.x - camX + shakeX,
        mapY(player.y) + shakeY,
        iconColor
      );
    }

    if (attemptFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${attemptFlash * 0.28})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawParticles(particles, camX, groundScreen, shakeX, shakeY) {
    const ctx = this.ctx;
    const items = particles.items;
    let last = null;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const a = p.life / p.max;
      if (p.color !== last) {
        ctx.fillStyle = p.color;
        last = p.color;
      }
      ctx.globalAlpha = a;
      const x = p.x - camX + shakeX;
      const y = groundScreen - (8 * BLOCK - p.y) + shakeY;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawGrid(camX, accent) {
    const ctx = this.ctx;
    const spacing = BLOCK * 2;
    const off = -((camX * 0.35) % spacing);
    ctx.strokeStyle = `${accent}14`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = off; x < this.w; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.h);
    }
    for (let y = 0; y < this.h; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
    }
    ctx.stroke();
  }

  drawObject(o, x, y) {
    const ctx = this.ctx;
    switch (o.type) {
      case "block":
        ctx.fillStyle = "#2a3a6a";
        ctx.fillRect(x, y, o.w, o.h);
        ctx.fillStyle = "#4a5f9a";
        ctx.fillRect(x, y, o.w, 3);
        break;
      case "spike":
        ctx.fillStyle = "#e8eefc";
        ctx.beginPath();
        if (o.dir === "down") {
          ctx.moveTo(x, y);
          ctx.lineTo(x + o.w, y);
          ctx.lineTo(x + o.w / 2, y + o.h);
        } else {
          ctx.moveTo(x, y + o.h);
          ctx.lineTo(x + o.w, y + o.h);
          ctx.lineTo(x + o.w / 2, y);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case "pad":
        ctx.fillStyle = o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        ctx.fillRect(x, y, o.w, o.h);
        break;
      case "orb": {
        const color = o.kind === "blue" ? "#4da3ff" : o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        const cx = x + o.w / 2;
        const cy = y + o.h / 2;
        const r = o.w / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "portal": {
        const c = PORTAL_COLORS[o.mode] || this._accent;
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, y, o.w, o.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, o.w - 1, o.h - 1);
        break;
      }
      case "gravity":
        ctx.fillStyle = "#9b5cff";
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, o.w, o.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#c4a0ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, o.w - 1, o.h - 1);
        break;
      case "finish":
        ctx.fillStyle = "#fff";
        ctx.fillRect(x, y, o.w, o.h);
        ctx.fillStyle = "#111";
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(x, y + (o.h / 4) * i + o.h / 8, o.w, o.h / 8);
        }
        break;
    }
  }

  drawPlayer(player, x, y, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x + player.w / 2, y + player.h / 2);
    ctx.rotate(player.rotation);

    if (player.mode === MODES.SHIP) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-player.w / 2, player.h / 3);
      ctx.lineTo(player.w / 2, 0);
      ctx.lineTo(-player.w / 2, -player.h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-4, -4, 8, 8);
    } else if (player.mode === MODES.BALL) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, player.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.mode === MODES.UFO) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, player.w / 2, player.h / 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.mode === MODES.WAVE) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-player.w / 2, player.h / 2);
      ctx.lineTo(player.w / 2, 0);
      ctx.lineTo(-player.w / 2, -player.h / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
      ctx.fillStyle = "#0a1020";
      ctx.fillRect(-6, -4, 5, 5);
      ctx.fillRect(2, -4, 5, 5);
      ctx.fillRect(-4, 4, 10, 3);
    }

    ctx.restore();
  }
}
