import { Injectable } from '@angular/core';

import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  Color3,
  Mesh,
  MeshBuilder,
  Ray,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';

import { Business } from '../../../core/models/business';

@Injectable()
export class Explore3dPlayerService {
  // =========================================================
  // PLAYER
  // =========================================================

  player!: Mesh;

  private playerVisual?: TransformNode;
  private scene!: Scene;

  private engine!: {
    getDeltaTime(): number;
  };

  private isInitialized = false;
  private isDisposed = false;
  private isLoading = false;

  // =========================================================
  // ANIMATIONS
  // =========================================================

  private playerAnimations: AnimationGroup[] = [];

  private idleAnimation?: AnimationGroup;
  private walkAnimation?: AnimationGroup;

  private currentPlayerAnimation: 'idle' | 'walk' | null = null;

  private previousAnimation?: AnimationGroup;
  private nextAnimation?: AnimationGroup;

  private animationTransition = 0;
  private readonly animationTransitionDuration = 0.2;

  // =========================================================
  // MOVEMENT
  // =========================================================

  private readonly playerSpeed = 3.2;
  private readonly playerTurnSpeed = 12;
  private readonly arrivalDistance = 0.5;
  private readonly movementThreshold = 0.0001;

  /** Correct the imported model's facing direction. */
  private readonly playerModelRotationY = -Math.PI / 2;

  // =========================================================
  // COLLISION
  // =========================================================

  private readonly playerColliderHeight = 2;
  private readonly playerColliderRadius = 0.4;

  private readonly playerEllipsoid = new Vector3(0.4, 0.95, 0.4);
  private readonly playerEllipsoidOffset = new Vector3(0, 0.95, 0);

  // =========================================================
  // GRAVITY
  // =========================================================

  private readonly gravity = -18;
  private readonly maxFallSpeed = -25;

  private verticalVelocity = 0;
  private isGrounded = false;

  private readonly groundCheckDistance = 0.3;

  // =========================================================
  // AUTO NAVIGATION
  // =========================================================

  destinationBusiness: Business | null = null;

  private destinationPosition: Vector3 | null = null;

  isAutoNavigating = false;

  // =========================================================
  // INITIALIZE
  // =========================================================

  async initialize(
    scene: Scene,
    engine: { getDeltaTime(): number },
  ): Promise<void> {
    if (this.isLoading || this.isInitialized) {
      return;
    }

    this.scene = scene;
    this.engine = engine;

    this.isDisposed = false;
    this.isLoading = true;

    this.scene.collisionsEnabled = true;

    try {
      await this.createPlayer();

      if (!this.isDisposed && this.player && !this.player.isDisposed()) {
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('[Explore3D] Player initialization failed:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // =========================================================
  // CREATE PLAYER
  // =========================================================

  private async createPlayer(): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync(
        '',
        '/assets/3d/brian/',
        'Brian.glb',
        this.scene,
      );

      // If the service was disposed while the model was loading,
      // clean up the imported assets and stop.
      if (this.isDisposed) {
        result.animationGroups.forEach((group) => group.dispose());
        result.meshes.forEach((mesh) => mesh.dispose());
        return;
      }

      if (!result.meshes.length) {
        throw new Error('No meshes found in Brian.glb');
      }

      // Create a separate collision body.
      const collider = this.createCollider();
      this.player = collider;

      // Visual root follows the collider.
      const visualRoot = new TransformNode('brianVisualRoot', this.scene);

      visualRoot.parent = collider;
      visualRoot.position = Vector3.Zero();
      visualRoot.rotation = Vector3.Zero();

      // Find imported model root.
      const character =
        result.meshes.find((mesh) => mesh.name === '__root__') ??
        result.meshes.find((mesh) => !mesh.parent) ??
        result.meshes[0];

      character.name = 'brianVisual';
      character.parent = visualRoot;
      character.position = Vector3.Zero();

      // Keep the character upright.
      // Only correct its facing direction here.
      character.rotation.set(0, this.playerModelRotationY, 0);

      this.playerVisual = visualRoot;

      this.playerAnimations = result.animationGroups;

      this.configureImportedModel(result.meshes);
      this.findCharacterAnimations();

      // Stop all imported animations before selecting idle.
      for (const animation of this.playerAnimations) {
        animation.stop();
        animation.setWeightForAllAnimatables(0);
      }

      this.playPlayerAnimation('idle');

      console.info('[Explore3D] Brian loaded.');
      console.info(
        '[Explore3D] Animation groups:',
        this.playerAnimations.map((group) => group.name),
      );

      this.logAnimationTargets();
      this.logSkeletonBones(result.meshes);
    } catch (error) {
      if (this.isDisposed) {
        return;
      }

      console.error('[Explore3D] Failed to load Brian.glb:', error);
      this.createFallbackPlayer();
    }
  }

  // =========================================================
  // ANIMATION DIAGNOSTICS
  // =========================================================

  private logAnimationTargets(): void {
    console.table(
      this.playerAnimations.flatMap((group) =>
        group.targetedAnimations.map((item) => ({
          group: group.name,
          target: item.target.name,
          property: item.animation.targetProperty,
          from: group.from,
          to: group.to,
        })),
      ),
    );
  }

  // =========================================================
  // SKELETON BONE DIAGNOSTICS
  // =========================================================

  private logSkeletonBones(meshes: AbstractMesh[]): void {
    const skeletons = [
      ...new Set(
        meshes.map((mesh) => mesh.skeleton).filter((skeleton) => !!skeleton),
      ),
    ];

    for (const skeleton of skeletons) {
      if (!skeleton) {
        continue;
      }

      console.info(`[Explore3D] Skeleton: ${skeleton.name}`);

      console.table(
        skeleton.bones.map((bone) => ({
          name: bone.name,
          parent: bone.getParent()?.name ?? 'None',
        })),
      );
    }
  }

  // =========================================================
  // CONFIGURE IMPORTED MODEL
  // =========================================================

  private configureImportedModel(meshes: AbstractMesh[]): void {
    for (const mesh of meshes) {
      // The imported character is visual only.
      // The separate collider handles physical movement.
      mesh.isPickable = false;
      mesh.checkCollisions = false;
    }
  }

  // =========================================================
  // CREATE COLLIDER
  // =========================================================

  private createCollider(): Mesh {
    const collider = MeshBuilder.CreateCapsule(
      'playerCollider',
      {
        height: this.playerColliderHeight,
        radius: this.playerColliderRadius,
        tessellation: 8,
      },
      this.scene,
    );

    collider.position = Vector3.Zero();

    // Required for Babylon.js moveWithCollisions().
    collider.checkCollisions = true;

    // Keep the collider out of normal scene picking.
    collider.isPickable = false;
    collider.isVisible = false;

    // Collision ellipsoid used by Babylon's collision system.
    collider.ellipsoid = this.playerEllipsoid.clone();
    collider.ellipsoidOffset = this.playerEllipsoidOffset.clone();

    // Ensure the collider does not inherit visual transforms.
    collider.rotation = Vector3.Zero();
    collider.scaling = Vector3.One();

    return collider;
  }

  // =========================================================
  // FALLBACK PLAYER
  // =========================================================

  private createFallbackPlayer(): void {
    const collider = this.createCollider();

    const material = new StandardMaterial('playerFallbackMaterial', this.scene);

    material.diffuseColor = new Color3(0.05, 0.55, 0.65);

    collider.material = material;
    collider.isVisible = true;

    this.player = collider;
    this.currentPlayerAnimation = null;
  }

  // =========================================================
  // FIND ANIMATIONS
  // =========================================================

  private findCharacterAnimations(): void {
    const groups = this.playerAnimations;

    this.idleAnimation = groups.find((group) => {
      const name = group.name.toLowerCase();

      return (
        name.includes('idle') ||
        name.includes('stand') ||
        name.includes('breath')
      );
    });

    this.walkAnimation = groups.find((group) => {
      const name = group.name.toLowerCase();

      return name.includes('walk') || name.includes('walking');
    });

    // Fallback only when animation names are unclear.
    if (!this.idleAnimation && groups.length >= 2) {
      this.idleAnimation = groups[0];
    }

    if (!this.walkAnimation && groups.length >= 2) {
      this.walkAnimation = groups[1];
    }

    if (groups.length === 1 && !this.idleAnimation) {
      this.idleAnimation = groups[0];
    }

    console.info(
      '[Explore3D] Idle animation:',
      this.idleAnimation?.name ?? 'Not found',
    );

    console.info(
      '[Explore3D] Walk animation:',
      this.walkAnimation?.name ?? 'Not found',
    );
  }

  // =========================================================
  // PLAY ANIMATION
  // =========================================================

  private playPlayerAnimation(type: 'idle' | 'walk'): void {
    const next = type === 'walk' ? this.walkAnimation : this.idleAnimation;

    if (!next || this.currentPlayerAnimation === type) {
      return;
    }

    const previous =
      this.currentPlayerAnimation === 'walk'
        ? this.walkAnimation
        : this.idleAnimation;

    // First animation or no currently playing animation.
    if (!previous || !previous.isPlaying) {
      for (const group of this.playerAnimations) {
        if (group !== next) {
          group.stop();
          group.setWeightForAllAnimatables(0);
        }
      }

      next.start(true, 1, next.from, next.to, false);
      next.setWeightForAllAnimatables(1);

      this.previousAnimation = undefined;
      this.nextAnimation = undefined;
      this.animationTransition = 0;

      this.currentPlayerAnimation = type;
      return;
    }

    if (previous === next) {
      this.currentPlayerAnimation = type;
      return;
    }

    // Start the new animation and blend it in.
    next.stop();
    next.start(true, 1, next.from, next.to, false);
    next.setWeightForAllAnimatables(0);

    this.previousAnimation = previous;
    this.nextAnimation = next;

    this.animationTransition = 0;
    this.currentPlayerAnimation = type;
  }

  // =========================================================
  // UPDATE ANIMATION BLENDING
  // =========================================================

  private updateAnimationTransition(delta: number): void {
    if (!this.previousAnimation || !this.nextAnimation) {
      return;
    }

    this.animationTransition += delta;

    const progress = Math.min(
      this.animationTransition / this.animationTransitionDuration,
      1,
    );

    this.previousAnimation.setWeightForAllAnimatables(1 - progress);
    this.nextAnimation.setWeightForAllAnimatables(progress);

    if (progress >= 1) {
      this.previousAnimation.stop();
      this.nextAnimation.setWeightForAllAnimatables(1);

      this.previousAnimation = undefined;
      this.nextAnimation = undefined;

      this.animationTransition = 0;
    }
  }

  // =========================================================
  // UPDATE
  // =========================================================

  update(
    camera: ArcRotateCamera,
    movement: Vector3,
    manualMovement: boolean,
  ): void {
    if (
      !this.isInitialized ||
      this.isDisposed ||
      !this.player ||
      this.player.isDisposed()
    ) {
      return;
    }

    // Clamp delta to avoid large movement jumps.
    const delta = Math.min(this.engine.getDeltaTime() / 1000, 0.05);

    const hasManualInput = movement.lengthSquared() > this.movementThreshold;

    if (manualMovement && hasManualInput) {
      this.cancelNavigation();
    }

    if (this.isAutoNavigating) {
      this.updateAutoNavigation(delta);
    } else {
      this.updateManualMovement(movement, delta);
    }

    this.applyGravity(delta);
    this.updateAnimationTransition(delta);
    this.updateCameraTarget(camera, delta);
  }

  // =========================================================
  // MANUAL MOVEMENT
  // =========================================================

  private updateManualMovement(movement: Vector3, delta: number): void {
    const direction = movement.clone();
    direction.y = 0;

    if (direction.lengthSquared() <= this.movementThreshold) {
      this.playPlayerAnimation('idle');
      return;
    }

    direction.normalize();

    this.rotatePlayerToDirection(direction, delta);

    const distance = this.playerSpeed * delta;
    const movementVector = direction.scale(distance);

    this.moveWithCollision(movementVector);
    this.playPlayerAnimation('walk');
  }

  // =========================================================
  // COLLISION MOVEMENT
  // =========================================================

  private moveWithCollision(movement: Vector3): void {
    if (
      !this.player ||
      this.player.isDisposed() ||
      !this.scene.collisionsEnabled
    ) {
      return;
    }

    // Do not assign player.position directly here.
    // moveWithCollisions allows Babylon.js to resolve collisions.
    this.player.moveWithCollisions(movement);
  }

  // =========================================================
  // AUTO NAVIGATION
  // =========================================================

  goToBusiness(business: Business, position: Vector3): void {
    if (!this.player || this.player.isDisposed() || this.isDisposed) {
      return;
    }

    this.destinationBusiness = business;
    this.destinationPosition = position.clone();

    this.isAutoNavigating = true;

    this.playPlayerAnimation('walk');
  }

  // =========================================================
  // UPDATE AUTO NAVIGATION
  // =========================================================

  private updateAutoNavigation(delta: number): void {
    if (
      !this.destinationPosition ||
      !this.destinationBusiness ||
      !this.isAutoNavigating
    ) {
      this.cancelNavigation();
      this.playPlayerAnimation('idle');
      return;
    }

    const direction = this.destinationPosition.subtract(this.player.position);

    direction.y = 0;

    const distance = direction.length();

    if (distance <= this.arrivalDistance) {
      this.finishNavigation();
      return;
    }

    if (distance <= this.movementThreshold) {
      this.finishNavigation();
      return;
    }

    direction.normalize();

    this.rotatePlayerToDirection(direction, delta);

    const stepDistance = Math.min(
      this.playerSpeed * delta,
      distance - this.arrivalDistance,
    );

    const movement = direction.scale(Math.max(0, stepDistance));

    this.moveWithCollision(movement);
    this.playPlayerAnimation('walk');
  }

  // =========================================================
  // FINISH NAVIGATION
  // =========================================================

  private finishNavigation(): void {
    this.isAutoNavigating = false;

    this.destinationBusiness = null;
    this.destinationPosition = null;

    this.playPlayerAnimation('idle');
  }

  // =========================================================
  // CANCEL NAVIGATION
  // =========================================================

  cancelNavigation(): void {
    this.destinationBusiness = null;
    this.destinationPosition = null;
    this.isAutoNavigating = false;
  }

  // =========================================================
  // GRAVITY + GROUND DETECTION
  // =========================================================

  private applyGravity(delta: number): void {
    if (!this.player || this.player.isDisposed()) {
      return;
    }

    this.isGrounded = this.checkGround();

    if (this.isGrounded && this.verticalVelocity <= 0) {
      this.verticalVelocity = 0;
      return;
    }

    this.verticalVelocity = Math.max(
      this.verticalVelocity + this.gravity * delta,
      this.maxFallSpeed,
    );

    const verticalMovement = new Vector3(0, this.verticalVelocity * delta, 0);

    this.player.moveWithCollisions(verticalMovement);

    // Recheck after vertical movement to detect landing.
    if (this.verticalVelocity < 0 && this.checkGround()) {
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }
  }

  // =========================================================
  // CHECK GROUND
  // =========================================================

  private checkGround(): boolean {
    if (!this.player || this.player.isDisposed() || !this.scene) {
      return false;
    }

    const origin = this.player.position.add(new Vector3(0, 0.08, 0));

    const ray = new Ray(
      origin,
      new Vector3(0, -1, 0),
      this.groundCheckDistance,
    );

    const hit = this.scene.pickWithRay(
      ray,
      (mesh) =>
        mesh !== this.player &&
        mesh.isEnabled() &&
        mesh.checkCollisions &&
        mesh.isPickable,
    );

    return !!hit?.hit && !!hit.pickedMesh;
  }

  // =========================================================
  // ROTATE PLAYER
  // =========================================================

  private rotatePlayerToDirection(direction: Vector3, delta: number): void {
    if (!this.player || this.player.isDisposed()) {
      return;
    }

    const dir = direction.clone();
    dir.y = 0;

    if (dir.lengthSquared() < this.movementThreshold) {
      return;
    }

    dir.normalize();

    const targetAngle = Math.atan2(dir.x, dir.z);
    const currentAngle = this.player.rotation.y;

    const difference = Math.atan2(
      Math.sin(targetAngle - currentAngle),
      Math.cos(targetAngle - currentAngle),
    );

    const smoothFactor = 1 - Math.exp(-this.playerTurnSpeed * delta);

    this.player.rotation.y = currentAngle + difference * smoothFactor;
  }

  // =========================================================
  // CAMERA TARGET
  // =========================================================

  private updateCameraTarget(camera: ArcRotateCamera, delta: number): void {
    if (!this.player || this.player.isDisposed()) {
      return;
    }

    // Vertical camera rotation
    camera.lowerBetaLimit = 0.01;
    camera.upperBetaLimit = Math.PI - 0.01;

    // Allow manual zoom in/out
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 8;

    const target = this.getCameraTarget();
    const smoothFactor = 1 - Math.exp(-8 * delta);

    camera.target = Vector3.Lerp(camera.target, target, smoothFactor);
  }

  getCameraTarget(): Vector3 {
    if (!this.player || this.player.isDisposed()) {
      return Vector3.Zero();
    }

    return this.player.position.add(new Vector3(0, 1.2, 0));
  }

  // =========================================================
  // PLAYER POSITION
  // =========================================================

  getPlayerPosition(): Vector3 {
    if (!this.player || this.player.isDisposed()) {
      return Vector3.Zero();
    }

    return this.player.position.clone();
  }

  // =========================================================
  // RESET PLAYER
  // =========================================================

  resetPosition(position: Vector3 = Vector3.Zero()): void {
    if (!this.player || this.player.isDisposed() || this.isDisposed) {
      return;
    }

    this.cancelNavigation();

    // Reset is an intentional teleport/spawn operation.
    // Keep this separate from normal collision movement.
    this.player.position.copyFrom(position);
    this.player.rotation.y = 0;

    this.verticalVelocity = 0;
    this.isGrounded = false;

    this.previousAnimation?.stop();
    this.previousAnimation?.setWeightForAllAnimatables(0);

    this.nextAnimation?.stop();
    this.nextAnimation?.setWeightForAllAnimatables(0);

    this.previousAnimation = undefined;
    this.nextAnimation = undefined;

    this.animationTransition = 0;
    this.currentPlayerAnimation = null;

    this.playPlayerAnimation('idle');
  }

  // =========================================================
  // DISPOSE
  // =========================================================

  dispose(): void {
    this.isDisposed = true;
    this.isInitialized = false;

    this.cancelNavigation();

    for (const animation of this.playerAnimations) {
      animation.stop();
      animation.dispose();
    }

    this.playerAnimations = [];

    this.idleAnimation = undefined;
    this.walkAnimation = undefined;

    this.previousAnimation = undefined;
    this.nextAnimation = undefined;

    this.currentPlayerAnimation = null;
    this.animationTransition = 0;

    if (this.playerVisual && !this.playerVisual.isDisposed()) {
      this.playerVisual.dispose(false, false);
    }

    this.playerVisual = undefined;

    if (this.player && !this.player.isDisposed()) {
      this.player.dispose(false, false);
    }

    this.verticalVelocity = 0;
    this.isGrounded = false;
  }
}
