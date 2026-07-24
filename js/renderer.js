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
    this.viewScale = 0.7;
    this.t = 0;
    this.mobile = false;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const vv = window.visualViewport;
    this.w = Math.max(1, Math.floor((vv && vv.width) || window.innerWidth || document.documentElement.clientWidth || 320));
    this.h = Math.max(1, Math.floor((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight || 480));
    this.mobile = this.w < 900 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    // DPR 1 = bem mais leve
    this.dpr = 1;
    this.viewScale = this.mobile ? (this.w < this.h ? 0.58 : 0.64) : 0.75;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
    }
    this._groundY = this.h * (this.mobile ? 0.78 : 0.72);
  }

  addShake(amt = 5) {
    this.shake = Math.max(this.shake, amt);
  }

  worldViewWidth() {
    return this.w / this.viewScale;
  }

  draw(state) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.t = performance.now() * 0.001;
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

    // Fundo leve
    ctx.fillStyle = theme;
    ctx.fillRect(0, 0, this.w, this.h);

    // Parallax bem esparso (poucos retângulos)
    const size = 140;
    const off = -((camX * 0.1) % size);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < this.h; y += size) {
      for (let x = off; x < this.w; x += size) {
        if (((x / size) | 0) + ((y / size) | 0) & 1) {
          ctx.fillRect(x, y, size - 12, size - 12);
        }
      }
    }
    ctx.globalAlpha = 1;

    // Faixa do chão
    ctx.fillStyle = "#08061a";
    ctx.fillRect(0, groundScreen, this.w, this.h - groundScreen + 2);
    ctx.fillStyle = "#ffffffcc";
    ctx.fillRect(0, groundScreen - 1, this.w, 2);

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
        ctx.fillRect(mapX(c.x), mapY(c.y) - 28 * s, 4, 36 * s);
      }
    }

    this.drawParticles(particles, camX, groundScreen, shakeX, shakeY, s);

    if (player.alive) {
      this.drawPlayer(player, mapX(player.x), mapY(player.y), player.w * s, player.h * s, iconColor);
    }

    if (attemptFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${attemptFlash * 0.3})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawParticles(particles, camX, groundScreen, shakeX, shakeY, s) {
    const ctx = this.ctx;
    const items = particles.items;
    let last = "";
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      if (p.color !== last) {
        ctx.fillStyle = p.color;
        last = p.color;
      }
      ctx.globalAlpha = p.life / p.max;
      const sz = Math.max(2, p.size * s);
      ctx.fillRect(
        (p.x - camX) * s + shakeX - sz / 2,
        groundScreen - (8 * BLOCK - p.y) * s + shakeY - sz / 2,
        sz,
        sz
      );
    }
    ctx.globalAlpha = 1;
  }

  drawObject(o, x, y, w, h) {
    const ctx = this.ctx;
    switch (o.type) {
      case "block":
        ctx.fillStyle = "#0b0b14";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#e8eeff";
        ctx.fillRect(x, y, w, 2);
        ctx.fillStyle = "#ffffff33";
        ctx.fillRect(x, y, 2, h);
        break;
      case "spike":
        ctx.fillStyle = "#05050a";
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
        ctx.strokeStyle = "#e8ffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      case "pad": {
        const color = o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h, w * 0.55, h * 1.5, 0, Math.PI, 0);
        ctx.fill();
        break;
      }
      case "coin": {
        if (o.collected) break;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = w / 2;
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff6a8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
      case "orb": {
        const color = o.kind === "blue" ? "#4da3ff" : o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = (w / 2) * (1 + Math.sin(this.t * 8) * 0.06);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, w * 0.12);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "portal": {
        const c = PORTAL_COLORS[o.mode] || this._accent;
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(w * 0.9, 8), h * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(w * 0.55, 5), h * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "gravity":
        ctx.fillStyle = "#c4a0ff55";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#c4a0ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      case "finish":
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? "#fff" : "#111";
          ctx.fillRect(x, y + (h / 4) * i, w, h / 4 + 1);
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
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, h * 0.35);
      ctx.lineTo(w * 0.55, 0);
      ctx.lineTo(-w * 0.55, -h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-w * 0.2, -h * 0.2, w * 0.4, h * 0.4);
    } else if (player.mode === MODES.BALL) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (player.mode === MODES.UFO) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 3.4, 0, 0, Math.PI * 2);
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
      ctx.strokeStyle = "#0a0a12";
      ctx.lineWidth = Math.max(2, w * 0.08);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      const eye = Math.max(2, w * 0.16);
      ctx.fillStyle = "#0a1020";
      ctx.fillRect(-w * 0.32, -h * 0.18, eye, eye);
      ctx.fillRect(w * 0.12, -h * 0.18, eye, eye);
      ctx.fillRect(-w * 0.2, h * 0.18, w * 0.4, Math.max(2, h * 0.1));
    }

    ctx.restore();
  }
}
