import {
  BLOCK, GRAVITY, JUMP_V, SHIP_ACCEL, UFO_IMPULSE, WAVE_SPEED_Y,
  BALL_JUMP, PLAYER_SIZE, MODES, SCROLL_BASE,
} from "./constants.js";

export class Player {
  constructor() {
    this.reset();
  }

  reset(spawn = { x: 80, y: 8 * BLOCK - PLAYER_SIZE + 2 }) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.w = PLAYER_SIZE;
    this.h = PLAYER_SIZE;
    this.mode = MODES.CUBE;
    this.gravityDir = 1;
    this.onGround = true;
    this.alive = true;
    this.rotation = 0;
    this.shipAngle = 0;
    this.orbArmed = false;
    this.bufferJump = 0;
    this.coyote = 0.1;
    this.finished = false;
    this.trailTimer = 0;
    this.portalCooldown = 0;
    this.usedPads = new Set();
    this.usedOrbs = new Set();
    this._pendingDeath = false;
    this._spawnGrace = 0.35;
    this.jumpsMax = 2;
    this.jumpsLeft = 2;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.vy *= 0.35;
    if (mode === MODES.WAVE) {
      this.w = PLAYER_SIZE * 0.7;
      this.h = PLAYER_SIZE * 0.7;
    } else {
      this.w = PLAYER_SIZE;
      this.h = PLAYER_SIZE;
    }
  }

  flipGravity() {
    this.gravityDir *= -1;
    this.vy = 0;
    this.onGround = false;
  }

  update(dt, input, speed, solids, interactables, audio, particles, color) {
    if (!this.alive || this.finished) return { died: false, finished: false, events: [] };
    const events = [];
    this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    this.bufferJump = Math.max(0, this.bufferJump - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this._spawnGrace = Math.max(0, this._spawnGrace - dt);

    if (input.justPressed) this.bufferJump = 0.12;

    const g = GRAVITY * this.gravityDir;
    const prevOnGround = this.onGround;

    // Mode physics
    switch (this.mode) {
      case MODES.CUBE:
        this.vy += g * dt;
        if (this.orbArmed && input.justPressed) {
          this.vy = JUMP_V * this.gravityDir * 1.05;
          this.orbArmed = false;
          this.bufferJump = 0;
          this.onGround = false;
          this.coyote = 0;
          audio.orb();
          events.push("orb");
        } else if (this.bufferJump > 0 && (this.onGround || this.coyote > 0 || this.jumpsLeft > 0)) {
          const fromGround = this.onGround || this.coyote > 0;
          if (fromGround) this.jumpsLeft = this.jumpsMax - 1;
          else this.jumpsLeft -= 1;
          this.vy = JUMP_V * this.gravityDir * (fromGround ? 1 : 0.92);
          this.bufferJump = 0;
          this.onGround = false;
          this.coyote = 0;
          audio.jump();
        }
        break;

      case MODES.SHIP:
        if (input.held) this.vy -= SHIP_ACCEL * this.gravityDir * dt;
        else this.vy += SHIP_ACCEL * 0.85 * this.gravityDir * dt;
        this.vy = Math.max(-900, Math.min(900, this.vy));
        this.shipAngle = this.shipAngle * 0.85 + (input.held ? -0.55 : 0.55) * this.gravityDir * 0.15;
        break;

      case MODES.BALL:
        this.vy += g * 0.9 * dt;
        if (input.justPressed && (this.onGround || this.coyote > 0 || this.orbArmed)) {
          this.flipGravity();
          this.vy = BALL_JUMP * this.gravityDir;
          this.onGround = false;
          this.coyote = 0;
          this.orbArmed = false;
          audio.jump();
        }
        break;

      case MODES.UFO:
        this.vy += g * 0.75 * dt;
        if (input.justPressed) {
          this.vy = UFO_IMPULSE * this.gravityDir;
          audio.jump();
        }
        this.vy = Math.max(-950, Math.min(950, this.vy));
        break;

      case MODES.WAVE: {
        const dir = input.held ? -1 : 1;
        this.vy = WAVE_SPEED_Y * dir * this.gravityDir;
        break;
      }
    }

    // Movimento com eixos separados — nunca fica dentro do bloco
    const stepHeight = Math.max(this.h * 0.65, BLOCK * 0.55);

    const prevX = this.x;
    this.x += SCROLL_BASE * speed * dt;
    this.resolveSolidX(solids, prevX, stepHeight);

    this.onGround = false;
    this.y += this.vy * dt;
    this.resolveSolidY(solids);

    // Passo final: se ainda houver overlap, ejeta pelo menor eixo
    this.separateFromSolids(solids);

    if (this.onGround) {
      this.coyote = 0.08;
      this.jumpsLeft = this.jumpsMax;
    } else if (prevOnGround && this.jumpsLeft >= this.jumpsMax) {
      this.jumpsLeft = 1;
    }

    // Rotation
    if (this.mode === MODES.CUBE || this.mode === MODES.BALL) {
      if (!this.onGround) this.rotation += (this.vy > 0 ? 1 : -1) * this.gravityDir * dt * 8;
      else this.rotation = Math.round(this.rotation / (Math.PI / 2)) * (Math.PI / 2);
    } else if (this.mode === MODES.SHIP || this.mode === MODES.UFO) {
      this.rotation = this.shipAngle || this.vy * 0.001;
    } else if (this.mode === MODES.WAVE) {
      this.rotation = input.held ? -Math.PI / 4 : Math.PI / 4;
      if (this.gravityDir < 0) this.rotation *= -1;
    }

    // Interactables
    for (const o of interactables) {
      if (!aabb(this, o)) continue;

      if (o.type === "spike") {
        const hit = {
          x: o.x + o.w * 0.22,
          y: o.dir === "down" ? o.y : o.y + o.h * 0.28,
          w: o.w * 0.56,
          h: o.h * 0.72,
        };
        if (aabb(this, hit) && this._spawnGrace <= 0) {
          return this.kill(particles, color, audio);
        }
        continue;
      }

      if (o.type === "coin") {
        if (!o.collected && aabb(this, o)) {
          o.collected = true;
          audio.coin();
          particles.emit(this.cx, this.cy, { count: 6, color: "#ffd24a", speed: 180, life: 0.3, size: 3 });
          events.push("coin");
        }
        continue;
      }

      if (o.type === "pad" && !this.usedPads.has(o)) {
        this.usedPads.add(o);
        const power = o.kind === "pink" ? 1.35 : 1;
        this.vy = JUMP_V * this.gravityDir * power;
        this.onGround = false;
        audio.orb();
        particles.emit(this.cx, this.cy, { count: 10, color: o.kind === "pink" ? "#ff2d95" : "#ffd24a", speed: 260 });
      }

      if (o.type === "orb") {
        this.orbArmed = true;
        if (input.justPressed && !this.usedOrbs.has(o)) {
          this.usedOrbs.add(o);
          const power = o.kind === "blue" ? -1 : 1;
          if (o.kind === "blue") this.flipGravity();
          this.vy = JUMP_V * this.gravityDir * (o.kind === "pink" ? 1.3 : 1) * (power === -1 ? 0.9 : 1);
          this.orbArmed = false;
          audio.orb();
          particles.emit(this.cx, this.cy, { count: 14, color: "#fff", speed: 300 });
        }
      }

      if (o.type === "portal" && this.portalCooldown <= 0) {
        this.setMode(o.mode);
        this.portalCooldown = 0.35;
        audio.portal();
        particles.emit(this.cx, this.cy, { count: 8, color: "#00e5ff", speed: 220, life: 0.35 });
        events.push("portal");
      }

      if (o.type === "gravity" && this.portalCooldown <= 0) {
        this.flipGravity();
        this.portalCooldown = 0.4;
        audio.portal();
        events.push("gravity");
      }

      if (o.type === "finish") {
        this.finished = true;
        audio.win();
        return { died: false, finished: true, events };
      }
    }

    // Hazards: wave tip collision already via spikes/blocks
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.08;
      particles.trail(this.x, this.cy, color);
    }

    return { died: false, finished: false, events };
  }

  resolveSolidX(solids, prevX, stepHeight) {
    for (const s of solids) {
      if (!aabb(this, s)) continue;

      const feet = this.y + this.h;
      // Já em cima do bloco: não trata como parede
      if (feet <= s.y + 1.5 && this.y < s.y) continue;

      // Degrau: sobe em vez de atravessar/grudar
      if (
        this.gravityDir > 0 &&
        feet > s.y &&
        feet <= s.y + stepHeight &&
        this.vy >= -200
      ) {
        this.y = s.y - this.h;
        this.vy = 0;
        this.onGround = true;
        continue;
      }

      // Parede sólida — fica colado por fora, nunca dentro
      if (prevX + this.w <= s.x + 0.1) {
        this.x = s.x - this.w;
      } else if (prevX >= s.x + s.w - 0.1) {
        this.x = s.x + s.w;
      } else if (this.cx < s.x + s.w / 2) {
        this.x = s.x - this.w;
      } else {
        this.x = s.x + s.w;
      }
    }
  }

  resolveSolidY(solids) {
    for (const s of solids) {
      if (!aabb(this, s)) continue;

      const overlapX = Math.min(this.x + this.w - s.x, s.x + s.w - this.x);
      if (overlapX <= 0) continue;

      const fromAbove = this.cy < s.y + s.h / 2;
      if (fromAbove) {
        this.y = s.y - this.h;
        if (this.gravityDir > 0) {
          this.vy = Math.min(this.vy, 0);
          this.onGround = true;
        } else {
          this.vy = Math.min(this.vy, 0);
        }
      } else {
        this.y = s.y + s.h;
        if (this.gravityDir < 0) {
          this.vy = Math.max(this.vy, 0);
          this.onGround = true;
        } else {
          this.vy = Math.max(this.vy, 0);
        }
      }
    }
  }

  separateFromSolids(solids) {
    // Garante zero overlap residual (cantos / vários blocos)
    for (let n = 0; n < 3; n++) {
      let moved = false;
      for (const s of solids) {
        if (!aabb(this, s)) continue;
        const overlapX = Math.min(this.x + this.w - s.x, s.x + s.w - this.x);
        const overlapY = Math.min(this.y + this.h - s.y, s.y + s.h - this.y);
        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapY <= overlapX) {
          if (this.cy < s.y + s.h / 2) {
            this.y = s.y - this.h;
            this.vy = Math.min(this.vy, 0);
            if (this.gravityDir > 0) this.onGround = true;
          } else {
            this.y = s.y + s.h;
            this.vy = Math.max(this.vy, 0);
            if (this.gravityDir < 0) this.onGround = true;
          }
        } else if (this.cx < s.x + s.w / 2) {
          this.x = s.x - this.w;
        } else {
          this.x = s.x + s.w;
        }
        moved = true;
      }
      if (!moved) break;
    }
  }

  kill(particles, color, audio) {
    this.alive = false;
    particles.burstDeath(this.cx, this.cy, color);
    audio.death();
    return { died: true, finished: false, events: ["death"] };
  }
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
