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
  Skeleton,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';

import { Business } from '../../../core/models/business';

type CharacterModelId = 'aj' | 'suit' | 'brian';
type PlayerAnimationType = 'idle' | 'walk' | 'run' | 'jump';

interface CharacterModelConfig {
  id: CharacterModelId;
  name: string;
  rootUrl: string;
  fileName: string;
  rotationY: number;
  animationNames: Record<PlayerAnimationType, string[]>;
}

const CHARACTER_MODELS: Record<CharacterModelId, CharacterModelConfig> = {
  aj: {
    id: 'aj',
    name: 'AJ',
    rootUrl: '/assets/3d/aj/',
    fileName: 'aj-character2.glb',
    rotationY: -Math.PI / 2,
    animationNames: {
      idle: ['Idle', 'Breathing', 'Standing', 'Stand'],
      walk: ['Walk', 'Walking'],
      run: ['Run', 'Running'],
      jump: ['Jump', 'Jumping'],
    },
  },
  suit: {
    id: 'suit',
    name: 'Suit Character',
    rootUrl: '/assets/3d/aj/',
    fileName: 'male_character_in_suit.glb',
    rotationY: -Math.PI / 2,
    animationNames: {
      idle: ['Idle', 'Breathing', 'Standing', 'Stand'],
      walk: ['Walk', 'Walking'],
      run: ['Run', 'Running'],
      jump: ['Jump', 'Jumping'],
    },
  },
  brian: {
    id: 'brian',
    name: 'Brian',
    rootUrl: '/assets/3d/brian/',
    fileName: 'Brian.glb',
    rotationY: -Math.PI / 2,
    animationNames: {
      idle: ['Idle', 'Breathing', 'Standing', 'Stand'],
      walk: ['Walk', 'Walking'],
      run: ['Run', 'Running'],
      jump: ['Jump', 'Jumping'],
    },
  },
};

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

  private selectedCharacter: CharacterModelConfig = CHARACTER_MODELS.aj;

  // =========================================================
  // ANIMATIONS
  // =========================================================

  private playerAnimations: AnimationGroup[] = [];

  private idleAnimation?: AnimationGroup;
  private walkAnimation?: AnimationGroup;
  private runAnimation?: AnimationGroup;
  private jumpAnimation?: AnimationGroup;

  private currentPlayerAnimation: PlayerAnimationType | null = null;

  private warnedAnimations = new Set<string>();

  // =========================================================
  // MOVEMENT
  // =========================================================

  private readonly playerSpeed = 3.2;
  private readonly playerRunSpeed = 6.0;
  private readonly playerTurnSpeed = 12;

  private readonly arrivalDistance = 0.5;
  private readonly movementThreshold = 0.0001;

  private isRunning = false;
  private isJumping = false;

  private isActuallyMoving = false;
  private hasMovementInput = false;

  // =========================================================
  // JUMP
  // =========================================================

  private readonly jumpVelocity = 7.0;

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
  // CHARACTER MODEL ACCESS
  // =========================================================

  get characterModelId(): CharacterModelId {
    return this.selectedCharacter.id;
  }

  get availableCharacterModels(): CharacterModelConfig[] {
    return Object.values(CHARACTER_MODELS);
  }

  // =========================================================
  // INITIALIZE
  // =========================================================

  async initialize(
    scene: Scene,
    engine: { getDeltaTime(): number },
    characterModelId: CharacterModelId = 'aj',
  ): Promise<void> {
    if (this.isLoading || this.isInitialized) {
      return;
    }

    this.scene = scene;
    this.engine = engine;
    this.isDisposed = false;
    this.isLoading = true;

    this.selectedCharacter =
      CHARACTER_MODELS[characterModelId] ?? CHARACTER_MODELS.aj;

    this.scene.collisionsEnabled = true;

    try {
      await this.createPlayer(this.selectedCharacter);

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

  private async createPlayer(model: CharacterModelConfig): Promise<void> {
    try {
      console.info(
        `[Explore3D] Loading ${model.name}: ${model.rootUrl}${model.fileName}`,
      );

      const result = await SceneLoader.ImportMeshAsync(
        '',
        model.rootUrl,
        model.fileName,
        this.scene,
      );

      // If the scene was disposed while the GLB was loading,
      // release the imported assets immediately.
      if (this.isDisposed) {
        result.animationGroups.forEach((group) => group.dispose());
        result.meshes.forEach((mesh) => mesh.dispose());
        result.skeletons.forEach((skeleton) => skeleton.dispose());
        return;
      }

      if (!result.meshes.length) {
        throw new Error(`${model.fileName} loaded without meshes.`);
      }

      console.info(
        `[Explore3D] ${model.name} meshes loaded:`,
        result.meshes.length,
      );

      this.logImportedSkeletons(result.meshes);

      // Collider
      const collider = this.createCollider();
      collider.name = `${model.id}PlayerCollider`;
      this.player = collider;

      // Visual root
      const visualRoot = new TransformNode(`${model.id}VisualRoot`, this.scene);

      visualRoot.parent = collider;
      visualRoot.position = Vector3.Zero();
      visualRoot.rotation = Vector3.Zero();
      visualRoot.scaling = Vector3.One();

      // Find imported model root.
      const character =
        result.meshes.find((mesh) => mesh.name === '__root__') ??
        result.meshes.find((mesh) => !mesh.parent) ??
        result.meshes[0];

      if (!character) {
        throw new Error(`Unable to find ${model.name} model root.`);
      }

      character.name = `${model.id}Visual`;
      character.parent = visualRoot;
      character.position = Vector3.Zero();

      // Character-specific facing direction.
      character.rotation.set(0, model.rotationY, 0);

      this.playerVisual = visualRoot;

      // Model setup
      this.configureImportedModel(result.meshes);

      // Skeleton diagnostics
      const playerSkeleton = this.findPlayerSkeleton(result.meshes);

      if (playerSkeleton) {
        console.info(
          `[Explore3D] ${model.name} skeleton:`,
          playerSkeleton.name,
          '| bones:',
          playerSkeleton.bones.length,
        );
      } else {
        console.warn(`[Explore3D] No skeleton found for ${model.name}.`);
      }

      // Preserve original animation groups and their targets.
      this.playerAnimations = result.animationGroups;

      // Find animations using this model's aliases.
      this.findCharacterAnimations(model);

      // Diagnostics
      this.logFinalAnimations();
      this.logAnimationTargets();
      this.logSkeletonBones(result.meshes);

      // Stop imported animations before starting the selected idle.
      this.stopAllAnimations();

      if (this.idleAnimation) {
        this.playPlayerAnimation('idle');
      } else {
        console.warn(
          `[Explore3D] ${model.name} has no recognized Idle animation.`,
        );
      }

      console.info(`[Explore3D] ${model.name} loaded successfully.`);
      console.info(
        '[Explore3D] Animation groups:',
        this.playerAnimations.map((group) => group.name),
      );
    } catch (error) {
      if (this.isDisposed) {
        return;
      }

      console.error(`[Explore3D] Failed to load ${model.fileName}:`, error);

      this.createFallbackPlayer();
    }
  }

  // =========================================================
  // FIND PLAYER SKELETON
  // =========================================================

  private findPlayerSkeleton(meshes: AbstractMesh[]): Skeleton | undefined {
    const skeletons: Skeleton[] = [];

    for (const mesh of meshes) {
      const skeleton = mesh.skeleton;

      if (!skeleton || skeletons.includes(skeleton)) {
        continue;
      }

      skeletons.push(skeleton);
    }

    if (!skeletons.length) {
      return undefined;
    }

    skeletons.sort((a, b) => b.bones.length - a.bones.length);

    console.info(
      '[Explore3D] Available skeletons:',
      skeletons.map((skeleton) => ({
        name: skeleton.name,
        bones: skeleton.bones.length,
      })),
    );

    return skeletons[0];
  }

  // =========================================================
  // IMPORTED SKELETON DEBUG
  // =========================================================

  private logImportedSkeletons(meshes: AbstractMesh[]): void {
    const skeletons = [
      ...new Set(
        meshes
          .map((mesh) => mesh.skeleton)
          .filter((skeleton): skeleton is Skeleton => !!skeleton),
      ),
    ];

    console.group('[Explore3D] IMPORTED SKELETONS');

    for (const skeleton of skeletons) {
      console.log({
        name: skeleton.name,
        bones: skeleton.bones.length,
      });
    }

    console.groupEnd();
  }

  // =========================================================
  // ANIMATION DIAGNOSTICS
  // =========================================================

  private logFinalAnimations(): void {
    console.group(
      `[Explore3D] ANIMATION DEBUG - ${this.selectedCharacter.name}`,
    );

    console.table(
      this.playerAnimations.map((group, index) => ({
        index,
        name: group.name,
        from: group.from,
        to: group.to,
        isPlaying: group.isPlaying,
        targets: group.targetedAnimations.length,
        speedRatio: group.speedRatio,
      })),
    );

    console.info('Selected Idle:', this.idleAnimation?.name ?? 'NOT FOUND');
    console.info('Selected Walk:', this.walkAnimation?.name ?? 'NOT FOUND');
    console.info('Selected Run:', this.runAnimation?.name ?? 'NOT FOUND');
    console.info('Selected Jump:', this.jumpAnimation?.name ?? 'NOT FOUND');

    console.groupEnd();
  }

  private logAnimationTargets(): void {
    console.group('[Explore3D] ANIMATION TARGETS');

    console.table(
      this.playerAnimations.flatMap((group) =>
        group.targetedAnimations.map((item) => ({
          group: group.name,
          target: item.target?.name ?? 'Unknown',
          property: item.animation.targetProperty,
          from: group.from,
          to: group.to,
        })),
      ),
    );

    console.groupEnd();
  }

  private logSkeletonBones(meshes: AbstractMesh[]): void {
    const skeletons = [
      ...new Set(
        meshes
          .map((mesh) => mesh.skeleton)
          .filter((skeleton): skeleton is Skeleton => !!skeleton),
      ),
    ];

    for (const skeleton of skeletons) {
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
    console.group(
      `[Explore3D] MODEL DIAGNOSTICS - ${this.selectedCharacter.name}`,
    );

    console.table(
      meshes.map((mesh) => ({
        name: mesh.name,
        parent: mesh.parent?.name ?? 'None',
        vertices: mesh.getTotalVertices(),
        material: mesh.material?.name ?? 'None',
        materialType: mesh.material?.getClassName() ?? 'None',
        enabled: mesh.isEnabled(),
        visible: mesh.isVisible,
        skeleton: mesh.skeleton?.name ?? 'None',
      })),
    );

    const textures = meshes.flatMap(
      (mesh) =>
        mesh.material?.getActiveTextures().map((texture) => {
          const size = texture.getSize();

          return {
            mesh: mesh.name,
            material: mesh.material?.name ?? 'None',
            texture: texture.name,
            width: size.width,
            height: size.height,
            samplingMode: texture.samplingMode,
            anisotropicFiltering: texture.anisotropicFilteringLevel,
          };
        }) ?? [],
    );

    console.table(textures);
    console.groupEnd();

    for (const mesh of meshes) {
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
    collider.checkCollisions = true;
    collider.isPickable = false;
    collider.isVisible = false;

    collider.ellipsoid = this.playerEllipsoid.clone();
    collider.ellipsoidOffset = this.playerEllipsoidOffset.clone();

    collider.rotation = Vector3.Zero();
    collider.scaling = Vector3.One();

    return collider;
  }

  // =========================================================
  // FALLBACK PLAYER
  // =========================================================

  private createFallbackPlayer(): void {
    console.warn('[Explore3D] Using fallback capsule.');

    const collider = this.createCollider();

    const material = new StandardMaterial('playerFallbackMaterial', this.scene);

    material.diffuseColor = new Color3(0.05, 0.55, 0.65);

    collider.material = material;
    collider.isVisible = true;

    this.player = collider;
    this.currentPlayerAnimation = null;
  }

  // =========================================================
  // FIND CHARACTER ANIMATIONS
  // =========================================================

  private findCharacterAnimations(model: CharacterModelConfig): void {
    const groups = this.playerAnimations;

    const normalize = (name: string): string =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const validGroups = groups.filter(
      (group) => group.targetedAnimations.length > 0,
    );

    console.group(`[Explore3D] ANIMATION GROUPS - ${model.name}`);

    console.table(
      groups.map((group, index) => ({
        index,
        name: group.name,
        normalized: normalize(group.name),
        from: group.from,
        to: group.to,
        targets: group.targetedAnimations.length,
      })),
    );

    console.groupEnd();

    const findAnimation = (aliases: string[]): AnimationGroup | undefined => {
      // Exact match first.
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        const exact = validGroups.find(
          (group) => normalize(group.name) === normalizedAlias,
        );

        if (exact) {
          return exact;
        }
      }

      // Partial match only as fallback.
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        const partial = validGroups.find((group) =>
          normalize(group.name).includes(normalizedAlias),
        );

        if (partial) {
          return partial;
        }
      }

      return undefined;
    };

    this.idleAnimation = findAnimation(model.animationNames.idle);
    this.walkAnimation = findAnimation(model.animationNames.walk);
    this.runAnimation = findAnimation(model.animationNames.run);
    this.jumpAnimation = findAnimation(model.animationNames.jump);

    // If Walk is absent, use Run as a temporary movement fallback.
    if (!this.walkAnimation && this.runAnimation) {
      this.walkAnimation = this.runAnimation;
      console.info(`[Explore3D] ${model.name}: using Run as Walk fallback.`);
    }

    // Do not assign the same group to incompatible animation states.
    if (this.walkAnimation === this.idleAnimation) {
      this.walkAnimation = undefined;
    }

    if (this.runAnimation === this.idleAnimation) {
      this.runAnimation = undefined;
    }

    if (
      this.jumpAnimation === this.idleAnimation ||
      this.jumpAnimation === this.walkAnimation ||
      this.jumpAnimation === this.runAnimation
    ) {
      this.jumpAnimation = undefined;
    }

    console.group(`[Explore3D] ANIMATION SELECTION - ${model.name}`);

    console.table(
      groups.map((group, index) => ({
        index,
        name: group.name,
        targets: group.targetedAnimations.length,
        idle: group === this.idleAnimation,
        walk: group === this.walkAnimation,
        run: group === this.runAnimation,
        jump: group === this.jumpAnimation,
      })),
    );

    console.info('Idle:', this.idleAnimation?.name ?? 'NOT FOUND');
    console.info('Walk:', this.walkAnimation?.name ?? 'NOT FOUND');
    console.info('Run:', this.runAnimation?.name ?? 'NOT FOUND');
    console.info('Jump:', this.jumpAnimation?.name ?? 'NOT FOUND');

    console.groupEnd();
  }

  // =========================================================
  // STOP ALL ANIMATIONS
  // =========================================================

  private stopAllAnimations(): void {
    for (const group of this.playerAnimations) {
      group.stop();
      group.reset();
      group.setWeightForAllAnimatables(0);
    }

    this.currentPlayerAnimation = null;
  }

  // =========================================================
  // PLAY PLAYER ANIMATION
  // =========================================================

  private playPlayerAnimation(type: PlayerAnimationType): void {
    const animationMap: Record<
      PlayerAnimationType,
      AnimationGroup | undefined
    > = {
      idle: this.idleAnimation,
      walk: this.walkAnimation,
      run: this.runAnimation,
      jump: this.jumpAnimation,
    };

    const next = animationMap[type];

    if (!next || next.targetedAnimations.length === 0) {
      if (!this.warnedAnimations.has(type)) {
        this.warnedAnimations.add(type);

        console.warn(
          `[Explore3D] ${this.selectedCharacter.name}: ${type.toUpperCase()} animation unavailable.`,
        );
      }

      // Avoid leaving an incompatible previous animation running.
      if (type === 'jump' && this.currentPlayerAnimation) {
        this.playPlayerAnimation(
          this.isActuallyMoving
            ? this.isRunning && this.runAnimation
              ? 'run'
              : 'walk'
            : 'idle',
        );
      }

      return;
    }

    if (this.currentPlayerAnimation === type && next.isPlaying) {
      return;
    }

    for (const group of this.playerAnimations) {
      if (group === next) {
        continue;
      }

      group.stop();
      group.setWeightForAllAnimatables(0);
    }

    next.stop();
    next.reset();
    next.setWeightForAllAnimatables(1);

    const shouldLoop = type !== 'jump';

    next.start(shouldLoop, 1, next.from, next.to, false);

    this.currentPlayerAnimation = type;

    console.info(`[Explore3D] ▶ PLAYING ${type.toUpperCase()}`, {
      character: this.selectedCharacter.name,
      name: next.name,
      from: next.from,
      to: next.to,
      targets: next.targetedAnimations.length,
      isPlaying: next.isPlaying,
      speedRatio: next.speedRatio,
      loop: shouldLoop,
    });
  }

  // =========================================================
  // PUBLIC RUN CONTROL
  // =========================================================

  setRunning(running: boolean): void {
    this.isRunning = running;
  }

  // =========================================================
  // PUBLIC JUMP
  // =========================================================

  jump(): void {
    if (!this.player || this.player.isDisposed() || this.isDisposed) {
      return;
    }

    if (!this.isGrounded || this.isJumping) {
      return;
    }

    this.verticalVelocity = this.jumpVelocity;
    this.isGrounded = false;
    this.isJumping = true;

    if (this.jumpAnimation) {
      this.playPlayerAnimation('jump');
    }
  }

  // =========================================================
  // UPDATE
  // =========================================================

  update(
    camera: ArcRotateCamera,
    movement: Vector3,
    manualMovement: boolean,
    running?: boolean,
    jumpRequested: boolean = false,
  ): void {
    if (
      !this.isInitialized ||
      this.isDisposed ||
      !this.player ||
      this.player.isDisposed()
    ) {
      return;
    }

    const delta = Math.min(this.engine.getDeltaTime() / 1000, 0.05);

    const hasManualInput = movement.lengthSquared() > this.movementThreshold;

    this.hasMovementInput = hasManualInput;

    if (running !== undefined) {
      this.isRunning = running;
    }

    if (jumpRequested) {
      this.jump();
    }

    if (manualMovement && hasManualInput) {
      this.cancelNavigation();
    }

    if (this.isAutoNavigating) {
      this.updateAutoNavigation(delta);
    } else {
      this.updateManualMovement(movement, delta);
    }

    this.applyGravity(delta);
    this.updateCameraTarget(camera, delta);
  }

  // =========================================================
  // MANUAL MOVEMENT
  // =========================================================

  private updateManualMovement(movement: Vector3, delta: number): void {
    const direction = movement.clone();
    direction.y = 0;

    const hasInput = direction.lengthSquared() > this.movementThreshold;

    if (!hasInput) {
      this.hasMovementInput = false;
      this.isActuallyMoving = false;

      if (!this.isJumping) {
        this.playPlayerAnimation('idle');
      }

      return;
    }

    direction.normalize();
    this.rotatePlayerToDirection(direction, delta);

    const speed = this.isRunning ? this.playerRunSpeed : this.playerSpeed;

    const movementVector = direction.scale(speed * delta);
    const actuallyMoved = this.moveWithCollision(movementVector);

    if (!actuallyMoved) {
      this.hasMovementInput = false;
      this.isActuallyMoving = false;

      if (!this.isJumping) {
        this.playPlayerAnimation('idle');
      }

      return;
    }

    this.hasMovementInput = true;
    this.isActuallyMoving = true;

    if (this.isJumping) {
      return;
    }

    if (this.isRunning && this.runAnimation) {
      this.playPlayerAnimation('run');
      return;
    }

    this.playPlayerAnimation('walk');
  }

  // =========================================================
  // COLLISION MOVEMENT
  // =========================================================

  private moveWithCollision(movement: Vector3): boolean {
    if (!this.player || this.player.isDisposed()) {
      return false;
    }

    const before = this.player.position.clone();

    // Preserve the existing Run collision bypass.
    if (this.isRunning) {
      this.player.position.x += movement.x;
      this.player.position.z += movement.z;
    } else {
      this.player.moveWithCollisions(movement);
    }

    const deltaX = this.player.position.x - before.x;
    const deltaZ = this.player.position.z - before.z;

    const horizontalMovement = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

    return horizontalMovement > 0.0001;
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
    this.isActuallyMoving = true;

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
      this.finishNavigation();
      return;
    }

    const direction = this.destinationPosition.subtract(this.player.position);

    direction.y = 0;

    const distance = direction.length();

    if (
      distance <= this.arrivalDistance ||
      distance <= this.movementThreshold
    ) {
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
    const actuallyMoved = this.moveWithCollision(movement);

    if (!actuallyMoved) {
      this.isActuallyMoving = false;
      this.finishNavigation();
      return;
    }

    this.isActuallyMoving = true;

    if (!this.isJumping) {
      this.playPlayerAnimation('walk');
    }
  }

  // =========================================================
  // FINISH NAVIGATION
  // =========================================================

  private finishNavigation(): void {
    this.isAutoNavigating = false;

    this.destinationBusiness = null;
    this.destinationPosition = null;

    this.isActuallyMoving = false;
    this.hasMovementInput = false;

    if (!this.isJumping) {
      this.playPlayerAnimation('idle');
    }
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
  // GRAVITY + GROUND
  // =========================================================

  private applyGravity(delta: number): void {
    if (!this.player || this.player.isDisposed()) {
      return;
    }

    this.isGrounded = this.checkGround();

    if (this.isGrounded && this.verticalVelocity <= 0) {
      this.verticalVelocity = 0;

      if (this.isJumping) {
        this.isJumping = false;
        this.updateMovementAnimationAfterLanding();
      }

      return;
    }

    this.verticalVelocity = Math.max(
      this.verticalVelocity + this.gravity * delta,
      this.maxFallSpeed,
    );

    const verticalMovement = new Vector3(0, this.verticalVelocity * delta, 0);

    this.player.moveWithCollisions(verticalMovement);

    if (this.verticalVelocity < 0 && this.checkGround()) {
      this.verticalVelocity = 0;
      this.isGrounded = true;

      if (this.isJumping) {
        this.isJumping = false;
        this.updateMovementAnimationAfterLanding();
      }
    }
  }

  // =========================================================
  // LANDING ANIMATION
  // =========================================================

  private updateMovementAnimationAfterLanding(): void {
    if (this.isAutoNavigating) {
      this.playPlayerAnimation('walk');
      return;
    }

    if (!this.isActuallyMoving) {
      this.hasMovementInput = false;
      this.playPlayerAnimation('idle');
      return;
    }

    if (this.isRunning && this.runAnimation) {
      this.playPlayerAnimation('run');
      return;
    }

    this.playPlayerAnimation('walk');
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

    camera.lowerBetaLimit = 0.01;
    camera.upperBetaLimit = Math.PI - 0.01;

    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 8;

    const target = this.getCameraTarget();
    const smoothFactor = 1 - Math.exp(-8 * delta);

    camera.target = Vector3.Lerp(camera.target, target, smoothFactor);
  }

  // =========================================================
  // CAMERA TARGET POSITION
  // =========================================================

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

    this.player.position.copyFrom(position);
    this.player.rotation.y = 0;

    this.verticalVelocity = 0;
    this.isGrounded = false;
    this.isJumping = false;
    this.isRunning = false;

    this.hasMovementInput = false;
    this.isActuallyMoving = false;

    this.stopAllAnimations();
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
    this.runAnimation = undefined;
    this.jumpAnimation = undefined;

    this.currentPlayerAnimation = null;
    this.warnedAnimations.clear();

    this.isJumping = false;
    this.isRunning = false;

    this.hasMovementInput = false;
    this.isActuallyMoving = false;

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
