import { Injectable } from '@angular/core';

import { ArcRotateCamera, Vector3 } from '@babylonjs/core';

@Injectable()
export class Explore3dInputService {
  // =========================================================
  // KEYBOARD
  // =========================================================

  private keys: Record<string, boolean> = {};

  // =========================================================
  // MOBILE JOYSTICK
  // =========================================================

  private joystick = {
    active: false,
    x: 0,
    y: 0,
  };

  // =========================================================
  // MOBILE ACTION BUTTONS
  // =========================================================

  private mobileRun = false;
  private mobileJumpRequested = false;

  // =========================================================
  // DOM ELEMENTS
  // =========================================================

  private joystickElement?: HTMLElement;
  private joystickStickElement?: HTMLElement;

  private runButtonElement?: HTMLElement;
  private jumpButtonElement?: HTMLElement;

  // =========================================================
  // EVENT HANDLERS
  // =========================================================

  private joystickPointerDownHandler?: (event: PointerEvent) => void;

  private joystickPointerMoveHandler?: (event: PointerEvent) => void;

  private joystickPointerUpHandler?: () => void;

  private runPointerDownHandler?: (event: PointerEvent) => void;

  private runPointerUpHandler?: (event: PointerEvent) => void;

  private jumpPointerDownHandler?: (event: PointerEvent) => void;

  // =========================================================
  // INITIALIZE
  // =========================================================

  initialize(): void {
    // Prevent duplicate initialization from attaching
    // multiple keyboard listeners.
    this.dispose();

    window.addEventListener('keydown', this.onKeyDown);

    window.addEventListener('keyup', this.onKeyUp);

    this.setupJoystick();

    this.setupMobileButtons();
  }

  // =========================================================
  // MOVEMENT
  // =========================================================

  getMovement(camera: ArcRotateCamera): Vector3 {
    const forward = camera.getDirection(Vector3.Forward()).clone();

    forward.y = 0;

    if (forward.lengthSquared() > 0.000001) {
      forward.normalize();
    }

    const right = new Vector3(forward.z, 0, -forward.x);

    if (right.lengthSquared() > 0.000001) {
      right.normalize();
    }

    const movement = Vector3.Zero();

    // =======================================================
    // KEYBOARD
    // =======================================================

    if (this.keys['w']) {
      movement.addInPlace(forward);
    }

    if (this.keys['s']) {
      movement.subtractInPlace(forward);
    }

    if (this.keys['a']) {
      movement.subtractInPlace(right);
    }

    if (this.keys['d']) {
      movement.addInPlace(right);
    }

    // =======================================================
    // MOBILE JOYSTICK
    // =======================================================

    if (
      this.joystick.active ||
      this.joystick.x !== 0 ||
      this.joystick.y !== 0
    ) {
      movement.addInPlace(right.scale(this.joystick.x));

      movement.addInPlace(forward.scale(this.joystick.y));
    }

    movement.y = 0;

    if (movement.lengthSquared() > 0.000001) {
      movement.normalize();
    }

    return movement;
  }

  // =========================================================
  // MANUAL MOVEMENT
  // =========================================================

  hasManualMovement(): boolean {
    return (
      !!this.keys['w'] ||
      !!this.keys['a'] ||
      !!this.keys['s'] ||
      !!this.keys['d'] ||
      this.joystick.active ||
      this.joystick.x !== 0 ||
      this.joystick.y !== 0
    );
  }

  // =========================================================
  // RUN
  // =========================================================

  isRunning(): boolean {
    return !!this.keys['shift'] || this.mobileRun;
  }

  // =========================================================
  // JUMP
  // =========================================================

  consumeJumpRequest(): boolean {
    if (!this.mobileJumpRequested) {
      return false;
    }

    this.mobileJumpRequested = false;

    return true;
  }

  // =========================================================
  // KEY DOWN
  // =========================================================

  private onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    // Prevent browser scrolling when using
    // Space and movement keys.
    if (['w', 'a', 's', 'd', 'shift', ' '].includes(key)) {
      event.preventDefault();
    }

    // =======================================================
    // MOVEMENT
    // =======================================================

    if (['w', 'a', 's', 'd'].includes(key)) {
      this.keys[key] = true;
    }

    // =======================================================
    // RUN
    // =======================================================

    if (key === 'shift') {
      this.keys['shift'] = true;
    }

    // =======================================================
    // JUMP
    // =======================================================

    if (key === ' ' && !event.repeat) {
      this.mobileJumpRequested = true;
    }
  };

  // =========================================================
  // KEY UP
  // =========================================================

  private onKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (['w', 'a', 's', 'd', 'shift', ' '].includes(key)) {
      event.preventDefault();
    }

    this.keys[key] = false;
  };

  // =========================================================
  // JOYSTICK
  // =========================================================

  private setupJoystick(): void {
    const joystick = document.getElementById('joystick');

    const stick = document.getElementById('joystickStick');

    if (!joystick || !stick) {
      console.warn('[Explore3dInput] Joystick elements not found.');

      return;
    }

    this.joystickElement = joystick;
    this.joystickStickElement = stick;

    const maxDistance = 45;

    const updateJoystick = (clientX: number, clientY: number): void => {
      const rect = joystick.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;

      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;

      let dy = clientY - centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);

        dx = Math.cos(angle) * maxDistance;

        dy = Math.sin(angle) * maxDistance;
      }

      stick.style.transform = `translate(${dx}px, ${dy}px)`;

      this.joystick.x = dx / maxDistance;

      this.joystick.y = -dy / maxDistance;
    };

    const resetJoystick = (): void => {
      this.joystick.active = false;

      this.joystick.x = 0;
      this.joystick.y = 0;

      stick.style.transform = 'translate(0px, 0px)';
    };

    // =======================================================
    // POINTER DOWN
    // =======================================================

    this.joystickPointerDownHandler = (event: PointerEvent) => {
      event.preventDefault();

      this.joystick.active = true;

      joystick.setPointerCapture(event.pointerId);

      updateJoystick(event.clientX, event.clientY);
    };

    // =======================================================
    // POINTER MOVE
    // =======================================================

    this.joystickPointerMoveHandler = (event: PointerEvent) => {
      event.preventDefault();

      if (!this.joystick.active) {
        return;
      }

      updateJoystick(event.clientX, event.clientY);
    };

    // =======================================================
    // POINTER UP
    // =======================================================

    this.joystickPointerUpHandler = () => {
      resetJoystick();
    };

    // =======================================================
    // EVENTS
    // =======================================================

    joystick.addEventListener('pointerdown', this.joystickPointerDownHandler);

    joystick.addEventListener('pointermove', this.joystickPointerMoveHandler);

    joystick.addEventListener('pointerup', this.joystickPointerUpHandler);

    joystick.addEventListener('pointercancel', this.joystickPointerUpHandler);
  }

  // =========================================================
  // MOBILE BUTTONS
  // =========================================================

  private setupMobileButtons(): void {
    // IMPORTANT:
    // These IDs match your HTML exactly.
    this.runButtonElement = document.getElementById('runButton') ?? undefined;

    this.jumpButtonElement = document.getElementById('jumpButton') ?? undefined;

    // =======================================================
    // RUN BUTTON
    // =======================================================

    if (this.runButtonElement) {
      this.runPointerDownHandler = (event: PointerEvent) => {
        event.preventDefault();

        this.mobileRun = true;

        this.runButtonElement?.classList.add('active');

        // Keep pointer events attached to the
        // button while the finger is held.
        try {
          this.runButtonElement?.setPointerCapture(event.pointerId);
        } catch {
          // Ignore pointer-capture failures.
        }
      };

      this.runPointerUpHandler = (event: PointerEvent) => {
        event.preventDefault();

        this.mobileRun = false;

        this.runButtonElement?.classList.remove('active');
      };

      this.runButtonElement.addEventListener(
        'pointerdown',
        this.runPointerDownHandler,
      );

      this.runButtonElement.addEventListener(
        'pointerup',
        this.runPointerUpHandler,
      );

      this.runButtonElement.addEventListener(
        'pointercancel',
        this.runPointerUpHandler,
      );

      this.runButtonElement.addEventListener(
        'lostpointercapture',
        this.runPointerUpHandler,
      );
    } else {
      console.warn('[Explore3dInput] #runButton not found.');
    }

    // =======================================================
    // JUMP BUTTON
    // =======================================================

    if (this.jumpButtonElement) {
      this.jumpPointerDownHandler = (event: PointerEvent) => {
        event.preventDefault();

        // One jump request per tap.
        this.mobileJumpRequested = true;

        this.jumpButtonElement?.classList.add('active');

        window.setTimeout(() => {
          this.jumpButtonElement?.classList.remove('active');
        }, 120);
      };

      this.jumpButtonElement.addEventListener(
        'pointerdown',
        this.jumpPointerDownHandler,
      );
    } else {
      console.warn('[Explore3dInput] #jumpButton not found.');
    }
  }

  // =========================================================
  // DISPOSE
  // =========================================================

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);

    window.removeEventListener('keyup', this.onKeyUp);

    // =======================================================
    // JOYSTICK
    // =======================================================

    if (this.joystickElement && this.joystickPointerDownHandler) {
      this.joystickElement.removeEventListener(
        'pointerdown',
        this.joystickPointerDownHandler,
      );
    }

    if (this.joystickElement && this.joystickPointerMoveHandler) {
      this.joystickElement.removeEventListener(
        'pointermove',
        this.joystickPointerMoveHandler,
      );
    }

    if (this.joystickElement && this.joystickPointerUpHandler) {
      this.joystickElement.removeEventListener(
        'pointerup',
        this.joystickPointerUpHandler,
      );

      this.joystickElement.removeEventListener(
        'pointercancel',
        this.joystickPointerUpHandler,
      );
    }

    // =======================================================
    // RUN BUTTON
    // =======================================================

    if (this.runButtonElement && this.runPointerDownHandler) {
      this.runButtonElement.removeEventListener(
        'pointerdown',
        this.runPointerDownHandler,
      );
    }

    if (this.runButtonElement && this.runPointerUpHandler) {
      this.runButtonElement.removeEventListener(
        'pointerup',
        this.runPointerUpHandler,
      );

      this.runButtonElement.removeEventListener(
        'pointercancel',
        this.runPointerUpHandler,
      );

      this.runButtonElement.removeEventListener(
        'lostpointercapture',
        this.runPointerUpHandler,
      );
    }

    // =======================================================
    // JUMP BUTTON
    // =======================================================

    if (this.jumpButtonElement && this.jumpPointerDownHandler) {
      this.jumpButtonElement.removeEventListener(
        'pointerdown',
        this.jumpPointerDownHandler,
      );
    }

    // =======================================================
    // RESET
    // =======================================================

    this.keys = {};

    this.joystick.active = false;
    this.joystick.x = 0;
    this.joystick.y = 0;

    this.mobileRun = false;
    this.mobileJumpRequested = false;

    this.joystickElement = undefined;
    this.joystickStickElement = undefined;

    this.runButtonElement = undefined;
    this.jumpButtonElement = undefined;

    this.joystickPointerDownHandler = undefined;
    this.joystickPointerMoveHandler = undefined;
    this.joystickPointerUpHandler = undefined;

    this.runPointerDownHandler = undefined;
    this.runPointerUpHandler = undefined;

    this.jumpPointerDownHandler = undefined;
  }
}
