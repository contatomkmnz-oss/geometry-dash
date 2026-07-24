export class Input {
  constructor(canvas) {
    this.held = false;
    this.justPressed = false;
    this.justReleased = false;
    this.pausePressed = false;
    this.practiceToggle = false;
    this.placeCheckpoint = false;
    this._queuePress = false;
    this._queueRelease = false;

    const down = (e) => {
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
      if (e.code === "Space" || e.code === "ArrowUp" || e.type.startsWith("pointer") || e.type.startsWith("touch") || e.type === "mousedown") {
        e.preventDefault?.();
        this._queuePress = true;
        this.held = true;
      }
    };

    const up = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.type.startsWith("pointer") || e.type.startsWith("touch") || e.type === "mouseup" || e.type === "pointerup" || e.type === "touchend") {
        this._queueRelease = true;
        this.held = false;
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    canvas.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("touchend", up);
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
