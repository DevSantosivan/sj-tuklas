import { Injectable } from '@angular/core';

import {
  ArcRotateCamera,
  Color4,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';

@Injectable()
export class Explore3dEngineService {
  engine!: Engine;
  scene!: Scene;
  camera!: ArcRotateCamera;

  private resizeHandler?: () => void;

  initialize(canvas: HTMLCanvasElement): void {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.scene = new Scene(this.engine);

    this.scene.clearColor = new Color4(0.78, 0.88, 0.95, 1);

    this.camera = new ArcRotateCamera(
      'thirdPersonCamera',
      -Math.PI / 2,
      Math.PI / 3,
      8,
      new Vector3(0, 1.2, 0),
      this.scene,
    );

    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 12;

    this.camera.lowerBetaLimit = 0.35;
    this.camera.upperBetaLimit = 1.35;

    this.camera.wheelDeltaPercentage = 0.01;

    this.camera.attachControl(canvas, true);

    const light = new HemisphericLight(
      'mainLight',
      new Vector3(0, 1, 0),
      this.scene,
    );

    light.intensity = 1.1;

    this.resizeHandler = () => {
      this.engine.resize();
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  startRenderLoop(callback: () => void): void {
    this.engine.runRenderLoop(callback);
  }

  stopRenderLoop(): void {
    this.engine.stopRenderLoop();
  }

  dispose(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    this.engine.stopRenderLoop();

    this.scene.dispose();

    this.engine.dispose();
  }
}
