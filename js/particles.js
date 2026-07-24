export class Particles {
  constructor() {
    this.items = [];
  }

  emit(x, y, opts = {}) {
    const {
      count = 12,
      color = "#fff",
      speed = 220,
      life = 0.45,
      size = 4,
      gravity = 400,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
    } = opts;
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.items.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        max: life,
        size: size * (0.5 + Math.random()),
        color,
        gravity,
      });
    }
  }

  burstDeath(x, y, color) {
    this.emit(x, y, { count: 28, color, speed: 380, life: 0.7, size: 5, gravity: 500 });
    this.emit(x, y, { count: 10, color: "#fff", speed: 200, life: 0.35, size: 3 });
  }

  trail(x, y, color) {
    this.emit(x, y, { count: 2, color, speed: 40, life: 0.25, size: 3, gravity: 0, spread: Math.PI });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx, camX, camY) {
    for (const p of this.items) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camX - p.size / 2, p.y - camY - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.items.length = 0;
  }
}
