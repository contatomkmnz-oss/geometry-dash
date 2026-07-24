import { BLOCK, COLORS, MODES, PLAYER_SIZE } from "./constants.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0;
    this.h = 0;
    this.shake = 0;
    this.bgOffset = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  addShake(amt = 8) {
    this.shake = Math.max(this.shake, amt);
  }

  worldToScreenY(floorY) {
    // Floor line near bottom of screen
    return this.h * 0.72;
  }

  draw(state) {
    const { ctx } = this;
    const { level, player, particles, camX, practice, checkpoints, attemptFlash } = state;
    const theme = COLORS.bg[level.theme % COLORS.bg.length];
    const accent = COLORS.accent[level.theme % COLORS.accent.length];
    const iconColor = COLORS.player[state.iconId % COLORS.player.length];

    let shakeX = 0;
    let shakeY = 0;
    if (this.shake > 0) {
      shakeX = (Math.random() - 0.5) * this.shake;
      shakeY = (Math.random() - 0.5) * this.shake;
      this.shake *= 0.88;
      if (this.shake < 0.4) this.shake = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    this.bgOffset = camX * 0.25;
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, theme);
    g.addColorStop(1, "#03050c");
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, this.w + 20, this.h + 20);

    // Parallax grid
    this.drawGrid(camX, accent);

    const groundScreen = this.worldToScreenY();
    const camY = 0; // we map world y relative to groundScreen - 8*BLOCK

    const toScreen = (wx, wy) => ({
      x: wx - camX,
      y: groundScreen - (8 * BLOCK - wy),
    });

    // Ground glow strip
    ctx.fillStyle = `${accent}22`;
    ctx.fillRect(0, groundScreen, this.w, this.h - groundScreen);
    ctx.strokeStyle = `${accent}aa`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundScreen);
    ctx.lineTo(this.w, groundScreen);
    ctx.stroke();

    // Objects
    for (const o of level.objects) {
      const s = toScreen(o.x, o.y);
      if (s.x + o.w < -80 || s.x > this.w + 80) continue;
      this.drawObject(o, s.x, s.y, accent);
    }

    // Checkpoints
    if (practice) {
      for (const c of checkpoints) {
        const s = toScreen(c.x, c.y);
        ctx.fillStyle = "#00ff88";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(s.x, s.y - 40, 6, 50);
        ctx.beginPath();
        ctx.moveTo(s.x + 6, s.y - 40);
        ctx.lineTo(s.x + 28, s.y - 28);
        ctx.lineTo(s.x + 6, s.y - 16);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    this.drawParticles(particles, camX, groundScreen);

    // Player
    if (player.alive) {
      const ps = toScreen(player.x, player.y);
      this.drawPlayer(player, ps.x, ps.y, iconColor);
    }

    // Attempt flash
    if (attemptFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${attemptFlash * 0.35})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    ctx.restore();
  }

  drawParticles(particles, camX, groundScreen) {
    const { ctx } = this;
    for (const p of particles.items) {
      const a = Math.max(0, p.life / p.max);
      const x = p.x - camX;
      const y = groundScreen - (8 * BLOCK - p.y);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawGrid(camX, accent) {
    const { ctx } = this;
    const spacing = BLOCK;
    const off = -((camX * 0.4) % spacing);
    ctx.strokeStyle = `${accent}18`;
    ctx.lineWidth = 1;
    for (let x = off; x < this.w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.h);
      ctx.stroke();
    }
    for (let y = 0; y < this.h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }
  }

  drawObject(o, x, y, accent) {
    const { ctx } = this;
    switch (o.type) {
      case "block": {
        const grd = ctx.createLinearGradient(x, y, x, y + o.h);
        grd.addColorStop(0, "#3d4f8a");
        grd.addColorStop(1, "#1e2a4d");
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, o.w, o.h);
        ctx.strokeStyle = "#7f9cff55";
        ctx.strokeRect(x + 0.5, y + 0.5, o.w - 1, o.h - 1);
        // bevel
        ctx.fillStyle = "#ffffff18";
        ctx.fillRect(x, y, o.w, 4);
        break;
      }
      case "spike": {
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
        ctx.strokeStyle = "#9aa6c5";
        ctx.stroke();
        break;
      }
      case "pad": {
        ctx.fillStyle = o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fillRect(x, y, o.w, o.h);
        ctx.shadowBlur = 0;
        break;
      }
      case "orb": {
        const color = o.kind === "blue" ? "#4da3ff" : o.kind === "pink" ? "#ff2d95" : "#ffd24a";
        ctx.save();
        ctx.translate(x + o.w / 2, y + o.h / 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, o.w / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `${color}55`;
        ctx.fill();
        ctx.restore();
        break;
      }
      case "portal": {
        const colors = {
          [MODES.CUBE]: "#ffd24a",
          [MODES.SHIP]: "#ff2d95",
          [MODES.BALL]: "#b8ff3c",
          [MODES.UFO]: "#a78bfa",
          [MODES.WAVE]: "#00e5ff",
        };
        const c = colors[o.mode] || accent;
        ctx.save();
        ctx.fillStyle = `${c}33`;
        ctx.fillRect(x, y, o.w, o.h);
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.shadowColor = c;
        ctx.shadowBlur = 16;
        ctx.strokeRect(x, y, o.w, o.h);
        // chevrons
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const cy = y + o.h * (0.25 + i * 0.25);
          ctx.moveTo(x + 4, cy);
          ctx.lineTo(x + o.w - 4, cy);
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "gravity": {
        ctx.fillStyle = "#9b5cff44";
        ctx.fillRect(x, y, o.w, o.h);
        ctx.strokeStyle = "#c4a0ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, o.w, o.h);
        break;
      }
      case "finish": {
        const stripes = 8;
        for (let i = 0; i < stripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? "#fff" : "#111";
          ctx.fillRect(x, y + (o.h / stripes) * i, o.w, o.h / stripes + 1);
        }
        break;
      }
    }
  }

  drawPlayer(player, x, y, color) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x + player.w / 2, y + player.h / 2);
    ctx.rotate(player.rotation);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

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
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-player.w / 3, 0);
      ctx.lineTo(player.w / 3, 0);
      ctx.stroke();
    } else if (player.mode === MODES.UFO) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, player.w / 2, player.h / 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff8";
      ctx.beginPath();
      ctx.ellipse(0, -4, player.w / 3.5, player.h / 4, 0, 0, Math.PI * 2);
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
      // cube
      ctx.fillStyle = color;
      ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
      ctx.fillStyle = "#ffffff33";
      ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h * 0.28);
      ctx.strokeStyle = "#ffffff55";
      ctx.lineWidth = 2;
      ctx.strokeRect(-player.w / 2 + 1, -player.h / 2 + 1, player.w - 2, player.h - 2);
      // face
      ctx.fillStyle = "#0a1020";
      ctx.fillRect(-6, -4, 5, 5);
      ctx.fillRect(2, -4, 5, 5);
      ctx.fillRect(-4, 4, 10, 3);
    }

    ctx.restore();
  }
}
