export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.enabled = false;
    this.held = false;
    this.justPressed = false;
    this.justReleased = false;
    this.pausePressed = false;
    this.practiceToggle = false;
    this.placeCheckpoint = false;
    this._queuePress = false;
    this._queueRelease = false;
    this._pointers = 0;

    const isJumpEvent = (e) => {
      if (e.type.startsWith("pointer") || e.type.startsWith("touch") || e.type === "mousedown" || e.type === "mouseup") {
        return true;
      }
      return e.code === "Space" || e.code === "ArrowUp";
    };

    const down = (e) => {
      if (!this.enabled && !e.code) return;
      if (e.repeat) return;

      if (e.code === "Escape") {
        this.pausePressed = true;
        return;
      }
      if (e.code === "KeyP") {
        this.practiceToggle = true;
        return;
      }
      if (e.code === "KeyZ") {
        this.placeCheckpoint = true;
        return;
      }

      if (!this.enabled) return;
      if (!isJumpEvent(e)) return;

      // Ignore taps on HUD buttons
      const t = e.target;
      if (t && t.closest && t.closest("button, .overlay, .screen, #hud-right")) return;

      e.preventDefault?.();
      this._pointers += 1;
      this._queuePress = true;
      this.held = true;
    };

    const up = (e) => {
      if (!isJumpEvent(e) && e.type !== "pointercancel" && e.type !== "touchcancel") return;
      e.preventDefault?.();
      this._pointers = Math.max(0, this._pointers - 1);
      if (this._pointers === 0) {
        this._queueRelease = true;
        this.held = false;
      }
    };

    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: false });

    // Prefer pointer events (covers mouse + touch + pen)
    canvas.addEventListener("pointerdown", down, { passive: false });
    window.addEventListener("pointerup", up, { passive: false });
    window.addEventListener("pointercancel", up, { passive: false });

    // Extra touch fallback for older Android
    canvas.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("touchend", up, { passive: false });
    window.addEventListener("touchcancel", up, { passive: false });

    // Prevent page scroll/zoom while playing
    document.addEventListener(
      "touchmove",
      (e) => {
        if (this.enabled) e.preventDefault();
      },
      { passive: false }
    );
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!on) {
      this.held = false;
      this._pointers = 0;
      this._queuePress = false;
      this._queueRelease = false;
    }
    this.canvas.style.pointerEvents = on ? "auto" : "none";
  }

  beginFrame() {
    this.justPressed = this._queuePress;
    this.justReleased = this._queueRelease;
    this._queuePress = false;
    this._queueRelease = false;
  }

  endFrame() {
    this.pausePressed = false;
    this.practiceToggle = false;
    this.placeCheckpoint = false;
  }
}
