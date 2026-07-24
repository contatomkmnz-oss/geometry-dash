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
    this.dpr = 1;
    this.w = 0;
    this.h = 0;
    this.shake = 0;
    this._groundY = 0;
    this._accent = COLORS.accent[0];
    /** Escala da câmera: menor = mais zoom out (vê mais obstáculos) */
    this.viewScale = 0.7;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.w = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 320);
    this.h = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 480);
    const mobile = this.w < 900 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    this.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.25);
    // Zoom menor no celular para enxergar mais à frente
    this.viewScale = mobile ? (this.w < this.h ? 0.42 : 0.5) : 0.72;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    let ctx = null;
    try {
      ctx = this.canvas.getContext("2d", { alpha: false });
    } catch {
      ctx = this.canvas.getContext("2d");
    }
    this.ctx = ctx;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._groundY = this.h * (mobile ? 0.78 : 0.72);
  }

  addShake(amt = 6) {
    this.shake = Math.max(this.shake, amt);
  }

  /** Quantos pixels de mundo cabem na tela (para culling/câmera) */
  worldViewWidth() {
    return this.w / this.viewScale;
  }

  draw(state) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { level, player, particles, camX, practice, checkpoints, attemptFlash } = state;
    const theme = COLORS.bg[(level.theme || 0) % COLORS.bg.length];
    const accent = COLORS.accent[(level.theme || 0) % COLORS.accent.length];
    const iconColor = COLORS.player[state.iconId % COLORS.player.length];
    this._accent = accent;
    const s = this.viewScale;

    let shakeX = 0;
    let shakeY = 0;
    if (this.shake > 0) {
      shakeX = (Math.random() - 0.5) * this.shake;
      shakeY = (Math.random() - 0.5) * this.shake;
      this.shake *= 0.85;
      if (this.shake < 0.35) this.shake = 0;
    }

    const groundScreen = this._groundY;
    const mapX = (wx) => (wx - camX) * s + shakeX;
    const mapY = (wy) => groundScreen - (8 * BLOCK - wy) * s + shakeY;

    ctx.fillStyle = theme;
    ctx.fillRect(0, 0, this.w, this.h);

    this.drawGrid(camX, accent, s);

    ctx.fillStyle = "#00000055";
    ctx.fillRect(0, groundScreen, this.w, this.h - groundScreen);
    ctx.fillStyle = accent;
    ctx.fillRect(0, groundScreen, this.w, 2);

    const left = camX - 40;
    const right = camX + this.worldViewWidth() + 40;
    const objs = level.objects || [];
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (o.x + o.w < left || o.x > right) continue;
      this.drawObject(o, mapX(o.x), mapY(o.y), o.w * s, o.h * s);
    }

    if (practice) {
      ctx.fillStyle = "#00ff88";
      for (let i = 0; i < checkpoints.length; i++) {
        const c = checkpoints[i];
        const x = mapX(c.x);
        const y = mapY(c.y);
        ctx.fillRect(x, y - 30 * s, 4, 40 * s);
      }
    }

    this.drawParticles(particles, camX, groundScreen, shakeX, shakeY, s);

    if (player.alive) {
      this.drawPlayer(
        player,
        mapX(player.x),
        mapY(player.y),
        player.w * s,
        player.h * s,
        iconColor
      );
    }

    if (attemptFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${attemptFlash * 0.28})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawParticles(particles, camX, groundScreen, shakeX, shakeY, s) {
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
      const x = (p.x - camX) * s + shakeX;
      const y = groundScreen - (8 * BLOCK - p.y) * s + shakeY;
      const sz = p.size * s;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  drawGrid(camX, accent, s) {
    const ctx = this.ctx;
    const spacing = BLOCK * 2 * s;
    const off = -(((camX * 0.35) * s) % spacing);
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

  drawObject(o, x, y, w, h) {
    const ctx = this.ctx;
    switch (o.type) {
      case "block":
        ctx.fillStyle = "#2a3a6a";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#4a5f9a";
        ctx.fillRect(x, y, w, Math.max(2, 3 * (h / o.h)));
        break;
      case "spike":
        ctx.fillStyle = "#e8eefc";
        ctx.beginPath();
        if (o.dir === "down") {
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w / 2, y + h);
        } else {
          ctx.moveTo(x, y + h);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x + w / 2, y);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case "pad":
        ctx.fillStyle = o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        ctx.fillRect(x, y, w, h);
        break;
      case "coin": {
        if (o.collected) break;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = w / 2;
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff6a8";
        ctx.beginPath();
        ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "orb": {
        const color = o.kind === "blue" ? "#4da3ff" : o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
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
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      }
      case "gravity":
        ctx.fillStyle = "#9b5cff";
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#c4a0ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      case "finish":
        ctx.fillStyle = "#fff";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#111";
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(x, y + (h / 4) * i + h / 8, w, h / 8);
        }
        break;
    }
  }

  drawPlayer(player, x, y, w, h, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(player.rotation);

    if (player.mode === MODES.SHIP) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 3);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(-w / 2, -h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-3, -3, 6, 6);
    } else if (player.mode === MODES.BALL) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.mode === MODES.UFO) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.mode === MODES.WAVE) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      const eye = Math.max(2, w * 0.15);
      ctx.fillStyle = "#0a1020";
      ctx.fillRect(-w * 0.28, -h * 0.18, eye, eye);
      ctx.fillRect(w * 0.08, -h * 0.18, eye, eye);
      ctx.fillRect(-w * 0.18, h * 0.15, w * 0.36, Math.max(2, h * 0.1));
    }

    ctx.restore();
  }
}
