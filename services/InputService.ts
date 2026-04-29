import { Vector2, InputState } from '../types';

class InputService {
  private keys: Set<string> = new Set();
  private deadzone = 0.15;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default scrolling for arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  public getInput(): InputState {
    const input: InputState = {
      move: { x: 0, y: 0 },
      shoot: { x: 0, y: 0 },
      start: false,
      dash: false,
      skill: false
    };

    // --- Keyboard Input ---
    // Move
    if (this.keys.has('KeyW')) input.move.y -= 1;
    if (this.keys.has('KeyS')) input.move.y += 1;
    if (this.keys.has('KeyA')) input.move.x -= 1;
    if (this.keys.has('KeyD')) input.move.x += 1;

    // Shoot
    if (this.keys.has('ArrowUp')) input.shoot.y -= 1;
    if (this.keys.has('ArrowDown')) input.shoot.y += 1;
    if (this.keys.has('ArrowLeft')) input.shoot.x -= 1;
    if (this.keys.has('ArrowRight')) input.shoot.x += 1;

    // Start (Enter only, Space is now Dash)
    if (this.keys.has('Enter')) input.start = true;

    // Dash (Space)
    if (this.keys.has('Space')) input.dash = true;
    
    // Skill (F)
    if (this.keys.has('KeyF')) input.skill = true;

    // --- Gamepad Input ---
    // Poll for the first active gamepad
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp) continue;

      // Stick Inputs with Radial Deadzone
      const leftStick = this.applyRadialDeadzone(gp.axes[0], gp.axes[1]);
      const rightStick = this.applyRadialDeadzone(gp.axes[2], gp.axes[3]);

      // Add to existing input (allows mixing keyboard/gamepad if desired, usually one overrides)
      // We sum them then clamp later
      input.move.x += leftStick.x;
      input.move.y += leftStick.y;
      input.shoot.x += rightStick.x;
      input.shoot.y += rightStick.y;

      // D-Pad Support (Standard Mapping)
      // 12: Up, 13: Down, 14: Left, 15: Right
      if (gp.buttons[12]?.pressed) input.move.y -= 1;
      if (gp.buttons[13]?.pressed) input.move.y += 1;
      if (gp.buttons[14]?.pressed) input.move.x -= 1;
      if (gp.buttons[15]?.pressed) input.move.x += 1;

      // Start Button (9: Start, 0: A/Cross for convenience if desired, but 0 is often Jump/Dash)
      if (gp.buttons[9]?.pressed) {
        input.start = true;
      }
      
      // Dash: Right Bumper (5) or Face Button East (1 - B/Circle) or Left Trigger (6)
      if (gp.buttons[5]?.pressed || gp.buttons[1]?.pressed || gp.buttons[6]?.pressed) {
        input.dash = true;
      }
      
      // Skill: West Button (2 - X/Square) or Left Bumper (4)
      if (gp.buttons[2]?.pressed || gp.buttons[4]?.pressed) {
          input.skill = true;
      }
      
      // If we found an active gamepad, we can break or continue merging. 
      // Breaking prevents interference if multiple controllers are plugged in but idle.
      // But for simplicity, we'll just take the first one.
      break; 
    }

    // --- Final Processing ---
    input.move = this.clampMagnitude(input.move);
    // Shoot vector is also clamped for direction, but magnitude matters for firing threshold
    const shootMag = Math.sqrt(input.shoot.x * input.shoot.x + input.shoot.y * input.shoot.y);
    if (shootMag > 1) {
       input.shoot = this.clampMagnitude(input.shoot);
    }
    
    return input;
  }

  private applyRadialDeadzone(x: number, y: number): Vector2 {
    const mag = Math.sqrt(x * x + y * y);
    if (mag < this.deadzone) {
      return { x: 0, y: 0 };
    }
    
    // Rescale 0..1 range after deadzone
    const normMag = (Math.min(mag, 1) - this.deadzone) / (1 - this.deadzone);
    const scale = normMag / mag;
    
    return { x: x * scale, y: y * scale };
  }

  private clampMagnitude(v: Vector2): Vector2 {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y);
    if (mag > 1) {
      return { x: v.x / mag, y: v.y / mag };
    }
    return v;
  }

  public cleanup() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}

export const inputService = new InputService();