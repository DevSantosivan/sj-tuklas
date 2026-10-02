import { Injectable } from '@angular/core';

import { ArcRotateCamera, Vector3 } from '@babylonjs/core';

@Injectable()
export class Explore3dInputService {
  private keys: Record<string, boolean> = {};

  private joystick = {
    active: false,
    x: 0,
    y: 0,
  };

  private joystickElement?: HTMLElement;

  private joystickStickElement?: HTMLElement;

  private joystickPointerDownHandler?: (event: PointerEvent) => void;

  private joystickPointerMoveHandler?: (event: PointerEvent) => void;

  private joystickPointerUpHandler?: () => void;

  initialize(): void {
    window.addEventListener('keydown', this.onKeyDown);

    window.addEventListener('keyup', this.onKeyUp);

    this.setupJoystick();
  }

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

  private onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (['w', 'a', 's', 'd'].includes(key)) {
      this.keys[key] = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    this.keys[key] = false;
  };

  private setupJoystick(): void {
    const joystick = document.getElementById('joystick');

    const stick = document.getElementById('joystickStick');

    if (!joystick || !stick) {
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

    this.joystickPointerDownHandler = (event: PointerEvent) => {
      this.joystick.active = true;

      joystick.setPointerCapture(event.pointerId);

      updateJoystick(event.clientX, event.clientY);
    };

    this.joystickPointerMoveHandler = (event: PointerEvent) => {
      if (!this.joystick.active) {
        return;
      }

      updateJoystick(event.clientX, event.clientY);
    };

    this.joystickPointerUpHandler = () => {
      resetJoystick();
    };

    joystick.addEventListener('pointerdown', this.joystickPointerDownHandler);

    joystick.addEventListener('pointermove', this.joystickPointerMoveHandler);

    joystick.addEventListener('pointerup', this.joystickPointerUpHandler);

    joystick.addEventListener('pointercancel', this.joystickPointerUpHandler);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);

    window.removeEventListener('keyup', this.onKeyUp);

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
  }
}
