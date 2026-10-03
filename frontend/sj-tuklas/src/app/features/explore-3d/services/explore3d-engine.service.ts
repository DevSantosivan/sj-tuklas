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

  /* =========================================================
     INITIALIZE BABYLON ENGINE
  ========================================================= */

  initialize(canvas: HTMLCanvasElement): void {
    this.engine = new Engine(
      canvas,
      true, // antialiasing
      {
        preserveDrawingBuffer: true,
        stencil: true,
      },
      true, // adapt to device pixel ratio
    );

    // Increase internal rendering resolution
    this.engine.setHardwareScalingLevel(0.75);
    this.engine.resize();

    // CHECK RENDER RESOLUTION
    console.log('Device Pixel Ratio:', window.devicePixelRatio);
    console.log('Hardware Scaling:', this.engine.getHardwareScalingLevel());

    console.log(
      'Render Size:',
      this.engine.getRenderWidth(),
      this.engine.getRenderHeight(),
    );

    console.log('Canvas CSS Size:', canvas.clientWidth, canvas.clientHeight);

    console.log('Canvas Drawing Buffer:', canvas.width, canvas.height);

    /* =========================================================
     SCENE
  ========================================================= */

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.78, 0.88, 0.95, 1);

    /* =========================================================
     CAMERA
  ========================================================= */

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

    /* =========================================================
     LIGHTING
  ========================================================= */

    const light = new HemisphericLight(
      'mainLight',
      new Vector3(0, 1, 0),
      this.scene,
    );

    light.intensity = 1.1;

    /* =========================================================
     RESIZE HANDLER
  ========================================================= */

    this.resizeHandler = () => {
      this.engine.resize();
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  /* =========================================================
     RENDER LOOP
  ========================================================= */

  startRenderLoop(callback: () => void): void {
    this.engine.runRenderLoop(callback);
  }

  /* =========================================================
     STOP RENDER LOOP
  ========================================================= */

  stopRenderLoop(): void {
    this.engine.stopRenderLoop();
  }

  /* =========================================================
     DISPOSE
  ========================================================= */

  dispose(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }

    if (this.engine) {
      this.engine.stopRenderLoop();
    }

    if (this.scene) {
      this.scene.dispose();
    }

    if (this.engine) {
      this.engine.dispose();
    }
  }
}
