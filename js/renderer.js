import { BLOCK, COLORS, MODES } from "./constants.js";

const PORTAL_COLORS = {
  [MODES.CUBE]: "#ffd24a",
  [MODES.SHIP]: "#ff2d95",
  [MODES.BALL]: "#b8ff3c",
  [MODES.UFO]: "#a78bfa",
  [MODES.WAVE]: "#00e5ff",
};

/** Glow barato (sem shadowBlur — pesa no celular) */
function glowRect(ctx, x, y, w, h, color, layers = 3) {
  for (let i = layers; i >= 1; i--) {
    const pad = i * 3;
    ctx.globalAlpha = 0.08 * (layers - i + 1);
    ctx.fillStyle = color;
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  }
  ctx.globalAlpha = 1;
}

function glowCircle(ctx, cx, cy, r, color, layers = 4) {
  for (let i = layers; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.07 * (layers - i + 1);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

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
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const vv = window.visualViewport;
    this.w = Math.max(1, Math.floor((vv && vv.width) || window.innerWidth || document.documentElement.clientWidth || 320));
    this.h = Math.max(1, Math.floor((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight || 480));
    const mobile = this.w < 900 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    this.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.25);
    this.viewScale = mobile ? (this.w < this.h ? 0.52 : 0.58) : 0.7;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
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

    // === Fundo estilo GD ===
    this.drawBackground(theme, accent, camX);

    const left = camX - 40;
    const right = camX + this.worldViewWidth() + 40;
    const objs = level.objects || [];

    // Chão sólido abaixo da linha (faixa GD)
    ctx.fillStyle = "#0a0620";
    ctx.fillRect(0, groundScreen, this.w, this.h - groundScreen + 4);
    // Linha neon do chão
    glowRect(ctx, 0, groundScreen - 2, this.w, 4, accent, 2);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, groundScreen - 1, this.w, 2);
    ctx.globalAlpha = 1;

    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (o.x + o.w < left || o.x > right) continue;
      this.drawObject(o, mapX(o.x), mapY(o.y), o.w * s, o.h * s, accent);
    }

    if (practice) {
      ctx.fillStyle = "#00ff88";
      for (let i = 0; i < checkpoints.length; i++) {
        const c = checkpoints[i];
        const x = mapX(c.x);
        const y = mapY(c.y);
        glowRect(ctx, x, y - 28 * s, 5, 36 * s, "#00ff88", 2);
        ctx.fillRect(x, y - 28 * s, 5, 36 * s);
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
      ctx.fillStyle = `rgba(255,255,255,${attemptFlash * 0.35})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawBackground(theme, accent, camX) {
    const ctx = this.ctx;
    // Gradiente vertical azul profundo
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, theme);
    g.addColorStop(0.55, theme);
    g.addColorStop(1, "#050318");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    // Quadrados parallax grandes (assinatura GD)
    const parallax = camX * 0.12;
    const size = 110;
    ctx.fillStyle = accent;
    for (let y = -40; y < this.h; y += size) {
      for (let x = -((parallax % size) + size); x < this.w + size; x += size) {
        const parity = (Math.floor((x + parallax) / size) + Math.floor(y / size)) % 2;
        ctx.globalAlpha = parity === 0 ? 0.045 : 0.025;
        ctx.fillRect(x, y, size - 8, size - 8);
      }
    }
    ctx.globalAlpha = 1;

    // Raios de luz suaves do centro-baixo
    const cx = this.w * 0.45;
    const cy = this.h * 0.95;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = accent;
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i - 4.5) * 0.11;
      ctx.globalAlpha = 0.035;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.04) * this.h * 1.4, Math.sin(a - 0.04) * this.h * 1.4);
      ctx.lineTo(Math.cos(a + 0.04) * this.h * 1.4, Math.sin(a + 0.04) * this.h * 1.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Nuvens estilizadas (simples)
    ctx.fillStyle = "#ffffff";
    const cloudOff = (camX * 0.08) % 400;
    for (let i = 0; i < 4; i++) {
      const x = ((i * 280 - cloudOff) % (this.w + 200)) - 80;
      const y = 40 + (i % 3) * 35;
      ctx.globalAlpha = 0.06;
      this.drawCloud(x, y, 50 + (i % 2) * 20);
    }
    ctx.globalAlpha = 1;
  }

  drawCloud(x, y, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.arc(x + r * 0.5, y - r * 0.15, r * 0.45, 0, Math.PI * 2);
    ctx.arc(x + r * 0.95, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticles(particles, camX, groundScreen, shakeX, shakeY, s) {
    const ctx = this.ctx;
    const items = particles.items;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const a = p.life / p.max;
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = p.color;
      const x = (p.x - camX) * s + shakeX;
      const y = groundScreen - (8 * BLOCK - p.y) * s + shakeY;
      const sz = Math.max(2, p.size * s);
      // Trail GD = quadradinhos
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  drawObject(o, x, y, w, h, accent) {
    const ctx = this.ctx;
    switch (o.type) {
      case "block": {
        // Bloco preto com borda neon branca (estilo GD)
        glowRect(ctx, x, y, w, h, accent, 2);
        ctx.fillStyle = "#0b0b12";
        ctx.fillRect(x, y, w, h);
        // Topo iluminado
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, y, w, Math.max(2, h * 0.08));
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, Math.max(2, w * 0.08), h);
        ctx.globalAlpha = 1;
        // Contorno
        ctx.strokeStyle = "#dfe7ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        // Divisor vertical interno
        if (w > 24) {
          ctx.strokeStyle = "#ffffff22";
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y + 2);
          ctx.lineTo(x + w / 2, y + h - 2);
          ctx.stroke();
        }
        break;
      }
      case "spike": {
        // Triângulo preto + outline ciano/branco
        glowCircle(ctx, x + w / 2, y + h / 2, w * 0.35, "#7ef9ff", 2);
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
        ctx.fillStyle = "#05050a";
        ctx.fill();
        ctx.strokeStyle = "#e8ffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
      case "pad": {
        const color = o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        glowRect(ctx, x - 2, y - 4, w + 4, h + 8, color, 3);
        // Pad semicírculo / barra brilhante
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h, w * 0.55, h * 1.6, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.7, w * 0.28, h * 0.7, 0, Math.PI, 0);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "coin": {
        if (o.collected) break;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const pulse = 1 + Math.sin(this.t * 6 + x * 0.01) * 0.08;
        const r = (w / 2) * pulse;
        glowCircle(ctx, cx, cy, r, "#ffd24a", 3);
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff6a8";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#a67c00";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "orb": {
        // Anel amarelo concêntrico (jump ring GD)
        const color = o.kind === "blue" ? "#4da3ff" : o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        const cx = x + w / 2;
        const cy = y + h / 2;
        const pulse = 1 + Math.sin(this.t * 8) * 0.1;
        const r = (w / 2) * pulse;
        glowCircle(ctx, cx, cy, r, color, 4);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, w * 0.12);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = Math.max(1, w * 0.06);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "portal": {
        // Portal oval magenta/rosa estilo GD
        const c = PORTAL_COLORS[o.mode] || accent;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = Math.max(w * 0.9, 10);
        const ry = h * 0.48;
        glowCircle(ctx, cx, cy, Math.max(rx, ry * 0.5), c, 4);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = c;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#fff";
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Interior “glitch”
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = c;
        for (let i = -3; i <= 3; i++) {
          ctx.fillRect(-rx * 0.5, i * (ry * 0.18), rx, 3);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        break;
      }
      case "gravity": {
        const c = "#c4a0ff";
        glowRect(ctx, x, y, w, h, c, 3);
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        // Setas
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.7;
        const mid = y + h / 2;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, mid + 8);
        ctx.lineTo(x + w * 0.5, mid - 10);
        ctx.lineTo(x + w * 0.7, mid + 8);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "finish": {
        const stripes = 6;
        for (let i = 0; i < stripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? "#fff" : "#111";
          ctx.fillRect(x, y + (h / stripes) * i, w, h / stripes + 1);
        }
        glowRect(ctx, x, y, w, h, "#ffffff", 2);
        break;
      }
    }
  }

  drawPlayer(player, x, y, w, h, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(player.rotation);

    // Halo suave
    glowCircle(ctx, 0, 0, w * 0.55, color, 3);

    if (player.mode === MODES.SHIP) {
      // Nave clássica GD
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, h * 0.35);
      ctx.lineTo(w * 0.55, 0);
      ctx.lineTo(-w * 0.55, -h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Cubo em cima da nave
      ctx.fillStyle = color;
      ctx.fillRect(-w * 0.22, -h * 0.22, w * 0.44, h * 0.44);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w * 0.22, -h * 0.22, w * 0.44, h * 0.44);
      ctx.fillStyle = "#111";
      const e = w * 0.08;
      ctx.fillRect(-w * 0.1, -h * 0.08, e, e);
      ctx.fillRect(w * 0.02, -h * 0.08, e, e);
    } else if (player.mode === MODES.BALL) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, 0);
      ctx.lineTo(w * 0.3, 0);
      ctx.stroke();
    } else if (player.mode === MODES.UFO) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff8";
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.12, w / 3.2, h / 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.mode === MODES.WAVE) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Cubo GD: cor sólida + outline preto + carinha
      ctx.fillStyle = color;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = "#0a0a12";
      ctx.lineWidth = Math.max(2, w * 0.08);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      // Brilho topo
      ctx.fillStyle = "#ffffff44";
      ctx.fillRect(-w / 2, -h / 2, w, h * 0.22);
      // Olhos e boca
      const eye = Math.max(2, w * 0.16);
      ctx.fillStyle = "#0a1020";
      ctx.fillRect(-w * 0.32, -h * 0.18, eye, eye);
      ctx.fillRect(w * 0.12, -h * 0.18, eye, eye);
      ctx.fillRect(-w * 0.2, h * 0.18, w * 0.4, Math.max(2, h * 0.1));
    }

    ctx.restore();
  }
}
