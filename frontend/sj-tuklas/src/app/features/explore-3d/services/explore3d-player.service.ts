import { Injectable } from '@angular/core';

import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  Color3,
  DynamicTexture,
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
import {
  Explore3dMultiplayerService,
  Explore3dRemotePlayer,
} from '../../../core/services/explore3d-multiplayer.service';

/* =========================================================
   CHARACTER TYPES
========================================================= */

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

/* =========================================================
   CHARACTER CONFIG
========================================================= */

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

/* =========================================================
   REMOTE PLAYER RENDER STATE
========================================================= */

interface RemotePlayerVisual {
  connectionId: string;
  userId: string;
  displayName: string;
  characterModel: CharacterModelId;

  root: TransformNode;
  visualRoot?: TransformNode;

  /*
   * Corrects different GLB origins so the character's
   * feet stay aligned with the remote player's ground.
   */
  visualGroundOffset: number;

  animationGroups: AnimationGroup[];

  idleAnimation?: AnimationGroup;
  walkAnimation?: AnimationGroup;
  runAnimation?: AnimationGroup;
  jumpAnimation?: AnimationGroup;

  currentAnimation: PlayerAnimationType | null;

  /*
   * Last network position received.
   *
   * This is NOT necessarily the current rendered position.
   */
  lastPosition: Vector3;

  /*
   * Target position used by the renderer.
   */
  targetPosition: Vector3;

  /*
   * Stable Y position while the player is on the ground.
   *
   * This prevents tiny gravity/collision differences from
   * making remote players float/bounce.
   */
  groundY: number;

  /*
   * True only when a real vertical movement is detected.
   */
  isRemoteJumping: boolean;

  /*
   * Horizontal movement speed calculated from network updates.
   */
  movementSpeed: number;

  lastUpdateTime: number;

  isLoading: boolean;
  isDisposed: boolean;

  /*
   * Username / nameplate.
   */
  namePlate?: Mesh;
  nameTexture?: DynamicTexture;
  nameMaterial?: StandardMaterial;
}

/* =========================================================
   SERVICE
========================================================= */

@Injectable()
export class Explore3dPlayerService {
  // =========================================================
  // LOCAL PLAYER
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
  // LOCAL ANIMATIONS
  // =========================================================

  private playerAnimations: AnimationGroup[] = [];

  private idleAnimation?: AnimationGroup;
  private walkAnimation?: AnimationGroup;
  private runAnimation?: AnimationGroup;
  private jumpAnimation?: AnimationGroup;

  private currentPlayerAnimation: PlayerAnimationType | null = null;

  private warnedAnimations = new Set<string>();

  // =========================================================
  // REMOTE PLAYERS
  // =========================================================

  private readonly remotePlayers = new Map<string, RemotePlayerVisual>();

  private readonly remotePlayerLoadPromises = new Map<string, Promise<void>>();

  private remoteSyncRunning = false;

  // =========================================================
  // REMOTE PLAYER SETTINGS
  // =========================================================

  /*
   * A remote player must move upward at least this much
   * before we consider it a real jump.
   */
  private readonly remoteJumpHeightThreshold = 0.45;

  /*
   * Once the player comes close to its stable ground Y,
   * return to ground mode.
   */
  private readonly remoteGroundSnapThreshold = 0.15;

  /*
   * Remote visual movement smoothing.
   */
  private readonly remotePositionSmoothSpeed = 22;

  private readonly remoteRotationSmoothSpeed = 18;

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
  // NETWORK MOVEMENT
  // =========================================================
  private lastNetworkPosition = Vector3.Zero();

  private lastNetworkRotationY = 0;

  private networkMoveTimer = 0;

  /**
   * Approximately 15 network updates per second.
   *
   * 0.066 seconds ≈ 15 updates/sec.
   *
   * The local player still moves at the normal
   * Babylon render rate. This only controls how
   * often movement is sent over SignalR.
   */
  private readonly networkUpdateInterval = 0.066;

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
  // MULTIPLAYER
  // =========================================================

  constructor(private readonly multiplayer: Explore3dMultiplayerService) {}

  // =========================================================
  // CHARACTER ACCESS
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

        this.lastNetworkPosition = this.player.position.clone();

        this.lastNetworkRotationY = this.player.rotation.y;
      }
    } catch (error) {
      console.error('[Explore3D] Player initialization failed:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // =========================================================
  // CREATE LOCAL PLAYER
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

      // =====================================================
      // COLLIDER
      // =====================================================

      const collider = this.createCollider();

      collider.name = `${model.id}PlayerCollider`;

      this.player = collider;

      // =====================================================
      // VISUAL ROOT
      // =====================================================

      const visualRoot = new TransformNode(`${model.id}VisualRoot`, this.scene);

      visualRoot.parent = collider;

      visualRoot.position = Vector3.Zero();

      visualRoot.rotation = Vector3.Zero();

      visualRoot.scaling = Vector3.One();

      // =====================================================
      // IMPORTED MODEL ROOT
      // =====================================================

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

      character.rotation.set(0, model.rotationY, 0);

      this.playerVisual = visualRoot;

      // =====================================================
      // MODEL SETUP
      // =====================================================

      this.configureImportedModel(result.meshes);

      // =====================================================
      // SKELETON
      // =====================================================

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

      // =====================================================
      // ANIMATIONS
      // =====================================================

      this.playerAnimations = result.animationGroups;

      this.findCharacterAnimations(model);

      this.logFinalAnimations();

      this.logAnimationTargets();

      this.logSkeletonBones(result.meshes);

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
  // REMOTE PLAYER SYNC
  // =========================================================

  private syncRemotePlayers(): void {
    if (!this.scene || this.isDisposed || !this.isInitialized) {
      return;
    }

    if (this.remoteSyncRunning) {
      return;
    }

    this.remoteSyncRunning = true;

    try {
      const players = this.multiplayer.players();

      const activeIds = new Set(players.map((player) => player.connectionId));

      // =====================================================
      // REMOVE PLAYERS THAT NO LONGER EXIST
      // =====================================================

      for (const [connectionId, remote] of this.remotePlayers) {
        if (!activeIds.has(connectionId)) {
          this.disposeRemotePlayer(connectionId);
        }
      }

      // =====================================================
      // CREATE / UPDATE PLAYERS
      // =====================================================

      for (const remotePlayer of players) {
        if (!remotePlayer.connectionId) {
          continue;
        }

        const existing = this.remotePlayers.get(remotePlayer.connectionId);

        if (!existing) {
          this.createRemotePlayer(remotePlayer);

          continue;
        }

        // ===================================================
        // CHARACTER CHANGED
        // ===================================================

        if (existing.characterModel !== remotePlayer.characterModel) {
          this.replaceRemotePlayer(remotePlayer);

          continue;
        }

        this.updateRemotePlayer(existing, remotePlayer);
      }
    } finally {
      this.remoteSyncRunning = false;
    }
  }

  // =========================================================
  // CREATE REMOTE PLAYER
  // =========================================================

  private createRemotePlayer(remotePlayer: Explore3dRemotePlayer): void {
    if (this.remotePlayers.has(remotePlayer.connectionId)) {
      return;
    }

    if (this.remotePlayerLoadPromises.has(remotePlayer.connectionId)) {
      return;
    }

    const model =
      CHARACTER_MODELS[remotePlayer.characterModel] ?? CHARACTER_MODELS.aj;

    const position = new Vector3(
      remotePlayer.x,
      remotePlayer.y,
      remotePlayer.z,
    );

    const remoteState: RemotePlayerVisual = {
      connectionId: remotePlayer.connectionId,

      userId: remotePlayer.userId,

      displayName: remotePlayer.displayName || 'Player',

      characterModel: model.id,

      root: new TransformNode(
        `remote_${remotePlayer.connectionId}`,
        this.scene,
      ),

      /*
       * Will be calculated after the GLB loads.
       */
      visualGroundOffset: 0,

      animationGroups: [],

      currentAnimation: null,

      lastPosition: position.clone(),

      targetPosition: position.clone(),

      /*
       * The first Y value becomes our stable ground Y.
       */
      groundY: position.y,

      isRemoteJumping: false,

      movementSpeed: 0,

      lastUpdateTime: performance.now(),

      isLoading: true,

      isDisposed: false,
    };

    remoteState.root.position = position.clone();

    remoteState.root.rotation.y = remotePlayer.rotationY;

    remoteState.root.isVisible = true;

    this.remotePlayers.set(remotePlayer.connectionId, remoteState);

    // =====================================================
    // CREATE USERNAME IMMEDIATELY
    // =====================================================

    this.createRemoteNamePlate(remoteState);

    const loadPromise = this.loadRemotePlayerModel(remoteState, model);

    this.remotePlayerLoadPromises.set(remotePlayer.connectionId, loadPromise);

    void loadPromise.then(
      () => {
        this.remotePlayerLoadPromises.delete(remotePlayer.connectionId);
      },
      () => {
        this.remotePlayerLoadPromises.delete(remotePlayer.connectionId);
      },
    );
  }

  // =========================================================
  // DRAW ROUNDED USERNAME BOX
  // =========================================================

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // =========================================================
  // RENDER REMOTE USERNAME
  // =========================================================

  private renderRemoteNamePlate(remote: RemotePlayerVisual): void {
    if (remote.isDisposed || !remote.namePlate || !remote.nameTexture) {
      return;
    }

    const texture = remote.nameTexture;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;

    const textureWidth = 512;
    const textureHeight = 96;

    texture.clear();
    context.clearRect(0, 0, textureWidth, textureHeight);

    const name = (remote.displayName || 'Player').trim() || 'Player';

    // Compact username styling.
    context.font = '600 30px Arial, sans-serif';

    const textWidth = context.measureText(name).width;

    const dotRadius = 8;
    const leftPadding = 18;
    const dotGap = 11;
    const rightPadding = 20;

    const contentWidth =
      leftPadding + dotRadius * 2 + dotGap + textWidth + rightPadding;

    const boxWidth = Math.min(470, Math.max(130, contentWidth));
    const boxHeight = 58;

    const boxX = (textureWidth - boxWidth) / 2;
    const boxY = (textureHeight - boxHeight) / 2;
    const radius = 18;

    // Black rounded background.
    this.drawRoundedRect(context, boxX, boxY, boxWidth, boxHeight, radius);

    context.fillStyle = 'rgba(0, 0, 0, 0.92)';
    context.fill();

    // Very subtle border so the rounded shape remains visible.
    this.drawRoundedRect(
      context,
      boxX + 1,
      boxY + 1,
      boxWidth - 2,
      boxHeight - 2,
      radius - 1,
    );

    context.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    context.lineWidth = 2;
    context.stroke();

    // Online indicator: white outer ring + green center.
    const centerY = textureHeight / 2;
    const dotX = boxX + leftPadding + dotRadius;

    context.beginPath();
    context.arc(dotX, centerY, dotRadius + 3, 0, Math.PI * 2);
    context.fillStyle = '#000000';
    context.fill();

    context.beginPath();
    context.arc(dotX, centerY, dotRadius, 0, Math.PI * 2);
    context.fillStyle = '#22C55E';
    context.fill();

    // Username.
    context.font = '600 30px Arial, sans-serif';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'left';
    context.textBaseline = 'middle';

    const textX = dotX + dotRadius + dotGap;

    context.fillText(name, textX, centerY);

    texture.update(true);

    // Compact 3D size.
    const worldWidth = Math.min(2.45, Math.max(1.35, boxWidth / 185));
    remote.namePlate.scaling.set(worldWidth / 2.15, 0.44, 1);
  }

  // =========================================================
  // CREATE REMOTE USERNAME
  // =========================================================

  private createRemoteNamePlate(remote: RemotePlayerVisual): void {
    if (remote.isDisposed || remote.root.isDisposed()) {
      return;
    }

    this.disposeRemoteNamePlate(remote);

    const texture = new DynamicTexture(
      `remoteNameTexture_${remote.connectionId}`,
      {
        width: 512,
        height: 96,
      },
      this.scene,
      true,
    );

    texture.hasAlpha = true;

    const material = new StandardMaterial(
      `remoteNameMaterial_${remote.connectionId}`,
      this.scene,
    );

    material.diffuseTexture = texture;
    material.emissiveColor = Color3.White();
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = 2;

    const namePlate = MeshBuilder.CreatePlane(
      `remoteNamePlate_${remote.connectionId}`,
      {
        width: 2.15,
        height: 0.44,
      },
      this.scene,
    );

    namePlate.parent = remote.root;
    namePlate.position.set(0, 2.8, 0);
    namePlate.billboardMode = Mesh.BILLBOARDMODE_ALL;
    namePlate.material = material;
    namePlate.isPickable = false;
    namePlate.checkCollisions = false;
    namePlate.isVisible = true;

    remote.namePlate = namePlate;
    remote.nameTexture = texture;
    remote.nameMaterial = material;

    this.renderRemoteNamePlate(remote);
  }

  // =========================================================
  // UPDATE REMOTE USERNAME
  // =========================================================

  private updateRemoteNamePlate(remote: RemotePlayerVisual): void {
    if (remote.isDisposed || !remote.namePlate || !remote.nameTexture) {
      return;
    }

    this.renderRemoteNamePlate(remote);
  }

  // =========================================================
  // POSITION NAME ABOVE ACTUAL CHARACTER
  // =========================================================

  private positionRemoteNamePlate(
    remote: RemotePlayerVisual,
    character: AbstractMesh,
  ): void {
    if (remote.isDisposed || !remote.namePlate || remote.root.isDisposed()) {
      return;
    }

    try {
      character.computeWorldMatrix(true);

      const bounds = character.getHierarchyBoundingVectors(true);

      /*
       * bounds.max.y is in world space.
       *
       * remote.root.getAbsolutePosition().y
       * gives the world-space Y of the remote player root.
       */
      const rootWorldY = remote.root.getAbsolutePosition().y;

      const topRelativeToRoot = bounds.max.y - rootWorldY;

      remote.namePlate.position.y = Math.max(2.3, topRelativeToRoot + 0.45);
    } catch (error) {
      console.warn(
        '[Explore3D Multiplayer] Failed to position nameplate:',
        error,
      );

      remote.namePlate.position.y = 2.8;
    }
  }

  // =========================================================
  // DISPOSE REMOTE USERNAME
  // =========================================================

  private disposeRemoteNamePlate(remote: RemotePlayerVisual): void {
    if (remote.namePlate) {
      remote.namePlate.dispose();

      remote.namePlate = undefined;
    }

    if (remote.nameMaterial) {
      try {
        remote.nameMaterial.dispose();
      } catch {
        // Ignore already disposed material.
      }

      remote.nameMaterial = undefined;
    }

    if (remote.nameTexture) {
      try {
        remote.nameTexture.dispose();
      } catch {
        // Ignore already disposed texture.
      }

      remote.nameTexture = undefined;
    }
  }

  // =========================================================
  // REMOVE REMOTE ROOT MOTION
  // =========================================================

  /**
   * Some GLB animations contain actual POSITION animation
   * on the model root.
   *
   * Example:
   *
   * Walk
   *   -> root.position.y moves
   *   -> character visually bounces
   *
   * Because multiplayer already controls the character's
   * position, we don't want the Walk/Run animation to also
   * move the whole model.
   *
   * We therefore remove POSITION animation only from the
   * imported model root / visual root.
   *
   * Skeleton bone animations are NOT touched here.
   */
  private removeRemoteRootMotion(
    animationGroups: AnimationGroup[],
    character: AbstractMesh,
    visualRoot: TransformNode,
  ): void {
    const rootTargets = new Set<AbstractMesh | TransformNode>();

    rootTargets.add(character);

    rootTargets.add(visualRoot);

    /*
     * The imported GLB root can have a parent chain.
     * Include direct parents too, but don't touch skeleton
     * bones or arbitrary child meshes.
     */
    let currentParent = character.parent;

    let parentDepth = 0;

    while (currentParent && parentDepth < 3) {
      if (
        currentParent instanceof AbstractMesh ||
        currentParent instanceof TransformNode
      ) {
        rootTargets.add(currentParent);
      }

      currentParent = currentParent.parent;

      parentDepth++;
    }

    for (const group of animationGroups) {
      const targetedAnimations = [...group.targetedAnimations];

      for (const targeted of targetedAnimations) {
        const target = targeted.target;

        if (!target) {
          continue;
        }

        /*
         * Only remove POSITION animation
         * from the root objects.
         *
         * Rotation remains untouched.
         * Scaling remains untouched.
         */
        if (
          rootTargets.has(target as AbstractMesh | TransformNode) &&
          targeted.animation.targetProperty === 'position'
        ) {
          console.info(
            '[Explore3D Multiplayer] Removing root-motion position animation:',
            {
              player: character.name,

              animation: group.name,

              target: target.name,
            },
          );

          group.removeTargetedAnimation(targeted.animation);
        }
      }
    }
  }

  // =========================================================
  // ALIGN REMOTE CHARACTER TO GROUND
  // =========================================================

  /**
   * Different GLB files can have different origins.
   *
   * Example:
   *
   * AJ feet:
   *   origin = near feet
   *
   * Brian:
   *   origin = slightly below/above feet
   *
   * Suit:
   *   origin = different position
   *
   * This calculates the actual model bottom and creates
   * a visual offset so all characters stand on the same
   * multiplayer root.
   */
  private alignRemoteCharacterToGround(
    remote: RemotePlayerVisual,
    character: AbstractMesh,
  ): void {
    if (remote.isDisposed || remote.root.isDisposed() || !remote.visualRoot) {
      return;
    }

    try {
      character.computeWorldMatrix(true);

      const bounds = character.getHierarchyBoundingVectors(true);

      /*
       * Character bounds are world-space.
       */
      const rootWorldY = remote.root.getAbsolutePosition().y;

      /*
       * Convert model bottom to a position
       * relative to the remote root.
       */
      const minRelativeY = bounds.min.y - rootWorldY;

      /*
       * Move visual model so its feet line up
       * with the remote root's ground.
       */
      remote.visualGroundOffset = -minRelativeY;

      remote.visualRoot.position.y = remote.visualGroundOffset;

      console.info('[Explore3D Multiplayer] Character ground alignment:', {
        player: remote.displayName,

        character: remote.characterModel,

        boundsMinY: bounds.min.y,

        rootWorldY,

        minRelativeY,

        visualGroundOffset: remote.visualGroundOffset,
      });
    } catch (error) {
      console.warn(
        '[Explore3D Multiplayer] Failed to align remote character:',
        error,
      );

      remote.visualGroundOffset = 0;

      remote.visualRoot.position.y = 0;
    }
  }

  // =========================================================
  // LOAD REMOTE PLAYER MODEL
  // =========================================================

  private async loadRemotePlayerModel(
    remote: RemotePlayerVisual,
    model: CharacterModelConfig,
  ): Promise<void> {
    try {
      console.info('[Explore3D Multiplayer] Loading remote player:', {
        connectionId: remote.connectionId,

        displayName: remote.displayName,

        character: model.id,
      });

      const result = await SceneLoader.ImportMeshAsync(
        '',
        model.rootUrl,
        model.fileName,
        this.scene,
      );

      if (this.isDisposed || remote.isDisposed || remote.root.isDisposed()) {
        result.animationGroups.forEach((group) => group.dispose());

        result.meshes.forEach((mesh) => mesh.dispose());

        result.skeletons.forEach((skeleton) => skeleton.dispose());

        return;
      }

      if (!result.meshes.length) {
        throw new Error(`Remote ${model.fileName} loaded without meshes.`);
      }

      // =====================================================
      // REMOTE VISUAL ROOT
      // =====================================================

      const visualRoot = new TransformNode(
        `remoteVisual_${remote.connectionId}`,
        this.scene,
      );

      visualRoot.parent = remote.root;

      visualRoot.position = Vector3.Zero();

      visualRoot.rotation = Vector3.Zero();

      visualRoot.scaling = Vector3.One();

      const character =
        result.meshes.find((mesh) => mesh.name === '__root__') ??
        result.meshes.find((mesh) => !mesh.parent) ??
        result.meshes[0];

      if (!character) {
        throw new Error(`Unable to find remote ${model.name} root.`);
      }

      character.name = `remote_${model.id}_${remote.connectionId}`;

      character.parent = visualRoot;

      character.position = Vector3.Zero();

      character.rotation.set(0, model.rotationY, 0);

      remote.visualRoot = visualRoot;

      // =====================================================
      // REMOTE MODEL SETUP
      // =====================================================

      for (const mesh of result.meshes) {
        mesh.isPickable = false;

        mesh.checkCollisions = false;
      }

      // =====================================================
      // ANIMATIONS
      // =====================================================

      remote.animationGroups = result.animationGroups;

      /*
       * IMPORTANT:
       *
       * Remove root position animation BEFORE
       * playing Walk / Run.
       *
       * This prevents animation root motion from
       * fighting with multiplayer movement.
       */
      this.removeRemoteRootMotion(
        remote.animationGroups,
        character,
        visualRoot,
      );

      // =====================================================
      // GROUND ALIGNMENT
      // =====================================================

      this.alignRemoteCharacterToGround(remote, character);

      // =====================================================
      // POSITION USERNAME
      // =====================================================

      this.positionRemoteNamePlate(remote, character);

      // =====================================================
      // FIND ANIMATIONS
      // =====================================================

      this.findRemoteAnimations(remote, model);

      this.stopRemoteAnimations(remote);

      this.playRemoteAnimation(remote, 'idle');

      remote.isLoading = false;

      console.info('[Explore3D Multiplayer] Remote player loaded:', {
        connectionId: remote.connectionId,

        displayName: remote.displayName,

        character: model.id,

        visualGroundOffset: remote.visualGroundOffset,
      });
    } catch (error) {
      console.error('[Explore3D Multiplayer] Failed to load remote player:', {
        player: remote.displayName,

        character: model.id,

        error,
      });

      remote.isLoading = false;
    }
  }

  // =========================================================
  // FIND REMOTE ANIMATIONS
  // =========================================================

  private findRemoteAnimations(
    remote: RemotePlayerVisual,
    model: CharacterModelConfig,
  ): void {
    const groups = remote.animationGroups;

    const normalize = (name: string): string =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const validGroups = groups.filter(
      (group) => group.targetedAnimations.length > 0,
    );

    const findAnimation = (aliases: string[]): AnimationGroup | undefined => {
      // Exact
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        const exact = validGroups.find(
          (group) => normalize(group.name) === normalizedAlias,
        );

        if (exact) {
          return exact;
        }
      }

      // Partial
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

    remote.idleAnimation = findAnimation(model.animationNames.idle);

    remote.walkAnimation = findAnimation(model.animationNames.walk);

    remote.runAnimation = findAnimation(model.animationNames.run);

    remote.jumpAnimation = findAnimation(model.animationNames.jump);

    // =====================================================
    // RUN FALLBACK
    // =====================================================

    if (!remote.walkAnimation && remote.runAnimation) {
      remote.walkAnimation = remote.runAnimation;
    }

    // =====================================================
    // AVOID DUPLICATE STATES
    // =====================================================

    if (remote.walkAnimation === remote.idleAnimation) {
      remote.walkAnimation = undefined;
    }

    if (remote.runAnimation === remote.idleAnimation) {
      remote.runAnimation = undefined;
    }

    if (
      remote.jumpAnimation === remote.idleAnimation ||
      remote.jumpAnimation === remote.walkAnimation ||
      remote.jumpAnimation === remote.runAnimation
    ) {
      remote.jumpAnimation = undefined;
    }

    console.info('[Explore3D Multiplayer] Remote animation selection:', {
      player: remote.displayName,

      character: model.id,

      idle: remote.idleAnimation?.name ?? 'NOT FOUND',

      walk: remote.walkAnimation?.name ?? 'NOT FOUND',

      run: remote.runAnimation?.name ?? 'NOT FOUND',

      jump: remote.jumpAnimation?.name ?? 'NOT FOUND',
    });
  }

  // =========================================================
  // STOP REMOTE ANIMATIONS
  // =========================================================

  private stopRemoteAnimations(remote: RemotePlayerVisual): void {
    for (const group of remote.animationGroups) {
      group.stop();

      group.reset();

      group.setWeightForAllAnimatables(0);
    }

    remote.currentAnimation = null;
  }

  // =========================================================
  // PLAY REMOTE ANIMATION
  // =========================================================

  private playRemoteAnimation(
    remote: RemotePlayerVisual,
    type: PlayerAnimationType,
  ): void {
    const animationMap: Record<
      PlayerAnimationType,
      AnimationGroup | undefined
    > = {
      idle: remote.idleAnimation,

      walk: remote.walkAnimation,

      run: remote.runAnimation,

      jump: remote.jumpAnimation,
    };

    let next = animationMap[type];

    // =====================================================
    // FALLBACK
    // =====================================================

    if (!next && type === 'run') {
      next = remote.walkAnimation;
    }

    if (!next && type === 'walk') {
      next = remote.idleAnimation;
    }

    if (!next) {
      return;
    }

    if (remote.currentAnimation === type && next.isPlaying) {
      return;
    }

    // =====================================================
    // STOP OTHER ANIMATIONS
    // =====================================================

    for (const group of remote.animationGroups) {
      if (group === next) {
        continue;
      }

      group.stop();

      group.setWeightForAllAnimatables(0);
    }

    // =====================================================
    // PLAY NEXT
    // =====================================================

    next.stop();

    next.reset();

    next.setWeightForAllAnimatables(1);

    const shouldLoop = type !== 'jump';

    next.start(shouldLoop, 1, next.from, next.to, false);

    remote.currentAnimation = type;
  }

  // =========================================================
  // UPDATE REMOTE PLAYER
  // =========================================================

  private updateRemotePlayer(
    remote: RemotePlayerVisual,
    player: Explore3dRemotePlayer,
  ): void {
    if (remote.isDisposed || remote.root.isDisposed()) {
      return;
    }

    const now = performance.now();

    /*
     * Incoming network position.
     */
    const incomingPosition = new Vector3(player.x, player.y, player.z);

    // =====================================================
    // HORIZONTAL MOVEMENT
    // =====================================================

    /*
     * IMPORTANT:
     *
     * Movement speed is calculated ONLY from X/Z.
     *
     * Y is not involved in walking detection.
     */
    const horizontalDistance = Math.sqrt(
      Math.pow(incomingPosition.x - remote.lastPosition.x, 2) +
        Math.pow(incomingPosition.z - remote.lastPosition.z, 2),
    );

    const deltaSeconds = Math.max((now - remote.lastUpdateTime) / 1000, 0.001);

    if (horizontalDistance > 0.0001) {
      remote.movementSpeed = horizontalDistance / deltaSeconds;

      /*
       * Update X/Z only here.
       *
       * Y is intentionally handled separately.
       */
      remote.lastPosition.x = incomingPosition.x;

      remote.lastPosition.z = incomingPosition.z;

      remote.lastUpdateTime = now;
    } else {
      const networkAge = now - remote.lastUpdateTime;

      if (networkAge > 250) {
        remote.movementSpeed = 0;
      }
    }

    // =====================================================
    // REMOTE Y / GROUND STABILIZATION
    // =====================================================

    const verticalDifference = incomingPosition.y - remote.groundY;

    /*
     * IMPORTANT:
     *
     * Only a POSITIVE Y movement above the threshold
     * is treated as a jump.
     *
     * This fixes the previous problem where:
     *
     * Y difference = -0.5
     *
     * could also trigger jump mode.
     */
    if (
      !remote.isRemoteJumping &&
      verticalDifference > this.remoteJumpHeightThreshold
    ) {
      remote.isRemoteJumping = true;
    }

    // =====================================================
    // AIRBORNE
    // =====================================================

    if (remote.isRemoteJumping) {
      /*
       * While actually airborne,
       * follow network Y.
       */
      remote.targetPosition.y = incomingPosition.y;

      /*
       * When the player returns to
       * the ground, lock it again.
       */
      if (
        incomingPosition.y <= remote.groundY + this.remoteGroundSnapThreshold &&
        incomingPosition.y >= remote.groundY - this.remoteGroundSnapThreshold
      ) {
        remote.isRemoteJumping = false;

        remote.groundY = incomingPosition.y;

        remote.targetPosition.y = remote.groundY;
      }
    } else {
      /*
       * NORMAL WALKING
       *
       * Ignore incoming Y completely.
       *
       * This is the main fix for:
       *
       * "walking character looks like jumping"
       */
      remote.targetPosition.y = remote.groundY;
    }

    // =====================================================
    // TARGET X / Z
    // =====================================================

    remote.targetPosition.x = incomingPosition.x;

    remote.targetPosition.z = incomingPosition.z;

    // =====================================================
    // ROTATION
    // =====================================================

    const currentRotation = remote.root.rotation.y;

    const targetRotation = player.rotationY;

    const rotationDifference = Math.atan2(
      Math.sin(targetRotation - currentRotation),
      Math.cos(targetRotation - currentRotation),
    );

    const rotationSmooth =
      1 -
      Math.exp(-this.remoteRotationSmoothSpeed * Math.min(deltaSeconds, 0.1));

    remote.root.rotation.y =
      currentRotation + rotationDifference * rotationSmooth;

    // =====================================================
    // ANIMATION
    // =====================================================

    /*
     * Jump has priority.
     *
     * Otherwise movement is determined ONLY from
     * horizontal speed.
     */
    if (remote.isRemoteJumping) {
      if (remote.jumpAnimation) {
        this.playRemoteAnimation(remote, 'jump');
      }
    } else if (remote.movementSpeed > 4.5) {
      this.playRemoteAnimation(remote, 'run');
    } else if (remote.movementSpeed > 0.08) {
      this.playRemoteAnimation(remote, 'walk');
    } else {
      this.playRemoteAnimation(remote, 'idle');
    }

    // =====================================================
    // DISPLAY NAME UPDATE
    // =====================================================

    if (remote.displayName !== player.displayName) {
      remote.displayName = player.displayName || 'Player';

      this.updateRemoteNamePlate(remote);
    }
  }

  // =========================================================
  // UPDATE REMOTE VISUALS
  // =========================================================

  private updateRemoteVisuals(delta: number): void {
    if (this.remotePlayers.size === 0) {
      return;
    }

    const smoothFactor =
      1 - Math.exp(-this.remotePositionSmoothSpeed * Math.min(delta, 0.1));

    for (const remote of this.remotePlayers.values()) {
      if (remote.isDisposed || remote.root.isDisposed()) {
        continue;
      }

      // ===================================================
      // ROOT INTERPOLATION
      // ===================================================

      remote.root.position = Vector3.Lerp(
        remote.root.position,
        remote.targetPosition,
        smoothFactor,
      );

      // ===================================================
      // STABLE VISUAL GROUND
      // ===================================================

      /*
       * The visual model itself must remain at its
       * calculated GLB feet offset.
       *
       * The remote.root handles multiplayer position.
       *
       * The visualRoot handles model origin correction.
       */
      if (
        remote.visualRoot &&
        !remote.visualRoot.isDisposed() &&
        !remote.isRemoteJumping
      ) {
        remote.visualRoot.position.y = remote.visualGroundOffset;
      }

      // ===================================================
      // USERNAME
      // ===================================================

      if (remote.namePlate && !remote.namePlate.isDisposed()) {
        remote.namePlate.position.x = 0;

        remote.namePlate.position.z = 0;
      }
    }
  }

  // =========================================================
  // REPLACE REMOTE PLAYER
  // =========================================================

  private replaceRemotePlayer(player: Explore3dRemotePlayer): void {
    const connectionId = player.connectionId;

    this.disposeRemotePlayer(connectionId);

    this.createRemotePlayer(player);
  }

  // =========================================================
  // DISPOSE REMOTE PLAYER
  // =========================================================

  private disposeRemotePlayer(connectionId: string): void {
    const remote = this.remotePlayers.get(connectionId);

    if (!remote) {
      return;
    }

    remote.isDisposed = true;

    // =====================================================
    // ANIMATIONS
    // =====================================================

    for (const animation of remote.animationGroups) {
      try {
        animation.stop();

        animation.dispose();
      } catch {
        // Ignore already disposed animation.
      }
    }

    remote.animationGroups = [];

    // =====================================================
    // USERNAME
    // =====================================================

    this.disposeRemoteNamePlate(remote);

    // =====================================================
    // VISUAL ROOT
    // =====================================================

    if (!remote.root.isDisposed()) {
      remote.root.dispose(false, false);
    }

    remote.visualRoot = undefined;

    this.remotePlayers.delete(connectionId);

    this.remotePlayerLoadPromises.delete(connectionId);

    console.info(
      '[Explore3D Multiplayer] Remote player removed:',
      connectionId,
    );
  }

  private updateNetworkPosition(delta: number): void {
    if (
      !this.player ||
      this.player.isDisposed() ||
      !this.multiplayer.connected()
    ) {
      return;
    }

    if (!this.multiplayer.getCurrentWorld()) {
      return;
    }

    this.networkMoveTimer += delta;

    // Send movement approximately 15 times per second.
    if (this.networkMoveTimer < this.networkUpdateInterval) {
      return;
    }

    this.networkMoveTimer = 0;

    const position = this.player.position;
    const rotationY = this.player.rotation.y;

    const positionDifference = Vector3.Distance(
      position,
      this.lastNetworkPosition,
    );

    const rotationDifference = Math.abs(rotationY - this.lastNetworkRotationY);

    // Don't send unnecessary packets when the player is basically still.
    if (positionDifference < 0.005 && rotationDifference < 0.01) {
      return;
    }

    this.lastNetworkPosition = position.clone();
    this.lastNetworkRotationY = rotationY;

    // IMPORTANT:
    // Do not await this.
    // Network latency must not block the local movement loop.
    void this.multiplayer
      .movePlayer({
        x: position.x,
        y: position.y,
        z: position.z,
        rotationY,
      })
      .catch((error) => {
        console.warn('[Explore3D Multiplayer] Network movement failed:', error);
      });
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

  // =========================================================
  // ANIMATION TARGET DEBUG
  // =========================================================

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

  // =========================================================
  // SKELETON BONE DEBUG
  // =========================================================

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
  // CONFIGURE MODEL
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
      // Exact
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        const exact = validGroups.find(
          (group) => normalize(group.name) === normalizedAlias,
        );

        if (exact) {
          return exact;
        }
      }

      // Partial
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

    if (!this.walkAnimation && this.runAnimation) {
      this.walkAnimation = this.runAnimation;

      console.info(`[Explore3D] ${model.name}: using Run as Walk fallback.`);
    }

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
  // STOP LOCAL ANIMATIONS
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
  // PLAY LOCAL ANIMATION
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
  // RUN CONTROL
  // =========================================================

  setRunning(running: boolean): void {
    this.isRunning = running;
  }

  // =========================================================
  // JUMP
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

    // =======================================================
    // MULTIPLAYER
    // =======================================================

    this.updateNetworkPosition(delta);

    this.syncRemotePlayers();

    /*
     * Remote target interpolation happens EVERY frame.
     */
    this.updateRemoteVisuals(delta);

    // Keep nearby idle players visually facing each other.
    // This is calculated locally on every client and does not touch the camera.
    this.updateMutualPlayerFacing(delta);
  }

  // =========================================================
  // MUTUAL PLAYER FACING
  // =========================================================

  private readonly mutualFacingDistance = 5.0;
  private readonly mutualFacingIdleSpeed = 0.08;
  private readonly mutualFacingTurnSpeed = 14;

  private updateMutualPlayerFacing(delta: number): void {
    if (!this.player || this.player.isDisposed()) {
      return;
    }

    const maxDistanceSquared =
      this.mutualFacingDistance * this.mutualFacingDistance;

    let nearestRemote: RemotePlayerVisual | null = null;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;

    // Find the nearest loaded remote player.
    for (const remote of this.remotePlayers.values()) {
      if (remote.isDisposed || remote.root.isDisposed() || remote.isLoading) {
        continue;
      }

      const dx = remote.root.position.x - this.player.position.x;
      const dz = remote.root.position.z - this.player.position.z;
      const distanceSquared = dx * dx + dz * dz;

      if (
        distanceSquared <= maxDistanceSquared &&
        distanceSquared < nearestDistanceSquared
      ) {
        nearestDistanceSquared = distanceSquared;
        nearestRemote = remote;
      }
    }

    if (!nearestRemote) {
      return;
    }

    // ---------------------------------------------------------
    // LOCAL PLAYER
    // ---------------------------------------------------------
    // Movement direction remains the source of rotation while
    // walking/running. Only an idle local player turns to face
    // the nearby remote player.
    if (!this.isActuallyMoving && !this.isJumping) {
      const localTargetAngle = this.getHorizontalLookAngle(
        this.player.position,
        nearestRemote.root.position,
      );

      this.player.rotation.y = this.smoothAngle(
        this.player.rotation.y,
        localTargetAngle,
        delta,
        this.mutualFacingTurnSpeed,
      );
    }

    // ---------------------------------------------------------
    // REMOTE PLAYER
    // ---------------------------------------------------------
    // If the remote player is idle, it independently faces this
    // local player too. This makes the result reciprocal on both
    // browser screens without synchronizing camera rotation.
    if (
      !nearestRemote.isRemoteJumping &&
      nearestRemote.movementSpeed <= this.mutualFacingIdleSpeed
    ) {
      const remoteTargetAngle = this.getHorizontalLookAngle(
        nearestRemote.root.position,
        this.player.position,
      );

      nearestRemote.root.rotation.y = this.smoothAngle(
        nearestRemote.root.rotation.y,
        remoteTargetAngle,
        delta,
        this.mutualFacingTurnSpeed,
      );
    }
  }

  private getHorizontalLookAngle(from: Vector3, to: Vector3): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;

    if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) {
      return 0;
    }

    return Math.atan2(dx, dz);
  }

  private smoothAngle(
    current: number,
    target: number,
    delta: number,
    speed: number,
  ): number {
    const difference = Math.atan2(
      Math.sin(target - current),
      Math.cos(target - current),
    );

    const factor = 1 - Math.exp(-speed * Math.min(delta, 0.1));

    return current + difference * factor;
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
  // AUTO NAVIGATION UPDATE
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
  // GRAVITY
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
  // GROUND CHECK
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
  // RESET POSITION
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

    /*
     * Reset network baseline so the next movement update
     * correctly sends the new position.
     */
    this.lastNetworkPosition = position.clone();

    this.lastNetworkRotationY = 0;

    this.networkMoveTimer = 0;

    this.stopAllAnimations();

    this.playPlayerAnimation('idle');

    /*
     * Immediately announce the reset position.
     *
     * This is intentionally fire-and-forget.
     */
    if (this.multiplayer.connected() && this.multiplayer.getCurrentWorld()) {
      void this.multiplayer
        .movePlayer({
          x: position.x,
          y: position.y,
          z: position.z,
          rotationY: 0,
        })
        .catch((error) => {
          console.warn(
            '[Explore3D Multiplayer] Failed to sync reset position:',
            error,
          );
        });
    }
  }
  // =========================================================
  // REMOTE PLAYER COUNT
  // =========================================================

  getRemotePlayerCount(): number {
    return this.remotePlayers.size;
  }

  // =========================================================
  // DISPOSE
  // =========================================================

  dispose(): void {
    this.isDisposed = true;

    this.isInitialized = false;

    this.cancelNavigation();

    // =======================================================
    // LOCAL ANIMATIONS
    // =======================================================

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

    // =======================================================
    // REMOTE PLAYERS
    // =======================================================

    const remoteIds = Array.from(this.remotePlayers.keys());

    for (const connectionId of remoteIds) {
      this.disposeRemotePlayer(connectionId);
    }

    this.remotePlayers.clear();

    this.remotePlayerLoadPromises.clear();

    // =======================================================
    // STATE
    // =======================================================

    this.isJumping = false;

    this.isRunning = false;

    this.hasMovementInput = false;

    this.isActuallyMoving = false;

    this.networkMoveTimer = 0;

    // =======================================================
    // LOCAL VISUAL
    // =======================================================

    if (this.playerVisual && !this.playerVisual.isDisposed()) {
      this.playerVisual.dispose(false, false);
    }

    this.playerVisual = undefined;

    if (this.player && !this.player.isDisposed()) {
      this.player.dispose(false, false);
    }

    this.verticalVelocity = 0;

    this.isGrounded = false;

    console.info('[Explore3D] Player service disposed.');
  }
}
