export class Particles {
  constructor() {
    this.items = [];
    this.max = 36;
  }

  emit(x, y, opts = {}) {
    let {
      count = 6,
      color = "#fff",
      speed = 220,
      life = 0.35,
      size = 3,
      gravity = 400,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
    } = opts;

    const room = this.max - this.items.length;
    if (room <= 0) return;
    count = Math.min(count, room);

    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.items.push({
        x,
        y,
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
    this.emit(x, y, { count: 8, color, speed: 280, life: 0.35, size: 3, gravity: 400 });
  }

  trail(x, y, color) {
    if (this.items.length > 20) return;
    this.emit(x, y, {
      count: 1,
      color,
      speed: 8,
      life: 0.18,
      size: 4,
      gravity: 0,
      spread: 0.3,
      angle: Math.PI,
    });
  }

  update(dt) {
    const items = this.items;
    let w = 0;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      items[w++] = p;
    }
    items.length = w;
  }

  clear() {
    this.items.length = 0;
  }
}
