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

interface RemotePlayerVisual {
  connectionId: string;
  userId: string;
  displayName: string;
  characterModel: CharacterModelId;

  root: TransformNode;
  visualRoot?: TransformNode;

  visualGroundOffset: number;

  animationGroups: AnimationGroup[];

  idleAnimation?: AnimationGroup;
  walkAnimation?: AnimationGroup;
  runAnimation?: AnimationGroup;
  jumpAnimation?: AnimationGroup;

  currentAnimation: PlayerAnimationType | null;

  lastPosition: Vector3;

  targetPosition: Vector3;

  groundY: number;

  isRemoteJumping: boolean;

  movementSpeed: number;

  lastUpdateTime: number;

  isLoading: boolean;
  isDisposed: boolean;

  namePlate?: Mesh;
  nameTexture?: DynamicTexture;
  nameMaterial?: StandardMaterial;

  chatBubble?: Mesh;
  chatBubbleTexture?: DynamicTexture;
  chatBubbleMaterial?: StandardMaterial;
  chatBubbleText: string;
  chatBubbleUntil: number;
  chatBubbleFadeStart: number;
}

@Injectable()
export class Explore3dPlayerService {
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

  private playerAnimations: AnimationGroup[] = [];

  private idleAnimation?: AnimationGroup;
  private walkAnimation?: AnimationGroup;
  private runAnimation?: AnimationGroup;
  private jumpAnimation?: AnimationGroup;

  private currentPlayerAnimation: PlayerAnimationType | null = null;

  private warnedAnimations = new Set<string>();

  private readonly remotePlayers = new Map<string, RemotePlayerVisual>();
  private readonly remoteDisplayNames = new Map<string, string>();

  private readonly remotePlayerLoadPromises = new Map<string, Promise<void>>();

  private remoteSyncRunning = false;
  private remoteSyncTimer = 0;
  private readonly remoteSyncInterval = 0.066;

  private readonly remoteJumpHeightThreshold = 0.45;

  private readonly remoteGroundSnapThreshold = 0.15;

  private readonly remoteGroundRebaseThreshold = 0.25;

  private readonly remotePositionSmoothSpeed = 20;

  private readonly remoteRotationSmoothSpeed = 15;

  private readonly remoteChatDuration = 5000;
  private readonly remoteChatFadeDuration = 500;
  private readonly remoteChatMaxLines = 3;
  private readonly remoteChatMaxCharacters = 180;

  private readonly pendingRemoteChats = new Map<
    string,
    {
      message: string;
      until: number;
    }
  >();

  private readonly playerSpeed = 3.2;
  private readonly playerRunSpeed = 6.0;
  private readonly playerTurnSpeed = 12;

  private readonly arrivalDistance = 0.5;
  private readonly movementThreshold = 0.0001;

  private isRunning = false;
  private isJumping = false;

  private isActuallyMoving = false;
  private hasMovementInput = false;

  private lastNetworkPosition = Vector3.Zero();

  private lastNetworkRotationY = 0;

  private networkMoveTimer = 0;

  private networkInitialSyncPending = true;

  private readonly networkUpdateInterval = 0.066;

  private networkMoveInFlight = false;

  private networkMovePending = false;

  private readonly jumpVelocity = 7.0;

  private readonly playerColliderHeight = 2;

  private readonly playerColliderRadius = 0.4;

  private readonly playerEllipsoid = new Vector3(0.4, 0.95, 0.4);

  private readonly playerEllipsoidOffset = new Vector3(0, 0.95, 0);

  private readonly gravity = -18;

  private readonly maxFallSpeed = -25;

  private verticalVelocity = 0;

  private isGrounded = false;

  private readonly groundCheckDistance = 0.3;

  destinationBusiness: Business | null = null;

  private destinationPosition: Vector3 | null = null;

  isAutoNavigating = false;

  constructor(private readonly multiplayer: Explore3dMultiplayerService) {}

  get characterModelId(): CharacterModelId {
    return this.selectedCharacter.id;
  }

  get availableCharacterModels(): CharacterModelConfig[] {
    return Object.values(CHARACTER_MODELS);
  }

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
        this.networkInitialSyncPending = true;
      }
    } catch (error) {
    } finally {
      this.isLoading = false;
    }
  }

  private async createPlayer(model: CharacterModelConfig): Promise<void> {
    try {
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

      this.logImportedSkeletons(result.meshes);

      const collider = this.createCollider();

      collider.name = `${model.id}PlayerCollider`;

      this.player = collider;

      const visualRoot = new TransformNode(`${model.id}VisualRoot`, this.scene);

      visualRoot.parent = collider;

      visualRoot.position = Vector3.Zero();

      visualRoot.rotation = Vector3.Zero();

      visualRoot.scaling = Vector3.One();

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

      this.configureImportedModel(result.meshes);

      const playerSkeleton = this.findPlayerSkeleton(result.meshes);

      if (playerSkeleton) {
      } else {
      }

      this.playerAnimations = result.animationGroups;

      this.findCharacterAnimations(model);

      this.logFinalAnimations();

      this.logAnimationTargets();

      this.logSkeletonBones(result.meshes);

      this.stopAllAnimations();

      if (this.idleAnimation) {
        this.playPlayerAnimation('idle');
      } else {
      }
    } catch (error) {
      if (this.isDisposed) {
        return;
      }

      this.createFallbackPlayer();
    }
  }

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

      for (const [connectionId, remote] of this.remotePlayers) {
        if (!activeIds.has(connectionId)) {
          this.disposeRemotePlayer(connectionId);
        }
      }

      for (const remotePlayer of players) {
        if (!remotePlayer.connectionId) {
          continue;
        }

        const existing = this.remotePlayers.get(remotePlayer.connectionId);

        if (!existing) {
          this.createRemotePlayer(remotePlayer);

          continue;
        }

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

      displayName:
        remotePlayer.displayName?.trim() ||
        this.remoteDisplayNames.get(remotePlayer.userId) ||
        'Player',

      characterModel: model.id,

      root: new TransformNode(
        `remote_${remotePlayer.connectionId}`,
        this.scene,
      ),

      visualGroundOffset: 0,

      animationGroups: [],

      currentAnimation: null,

      lastPosition: position.clone(),

      targetPosition: position.clone(),

      groundY: position.y,

      isRemoteJumping: false,

      movementSpeed: 0,

      lastUpdateTime: performance.now(),

      isLoading: true,

      isDisposed: false,

      chatBubbleText: '',
      chatBubbleUntil: 0,
      chatBubbleFadeStart: 0,
    };

    remoteState.root.position = position.clone();

    remoteState.root.rotation.y = remotePlayer.rotationY;

    remoteState.root.isVisible = true;

    const incomingName = remotePlayer.displayName?.trim();
    if (incomingName) {
      this.remoteDisplayNames.set(remotePlayer.userId, incomingName);
      remoteState.displayName = incomingName;
    }

    this.remotePlayers.set(remotePlayer.connectionId, remoteState);

    this.createRemoteNamePlate(remoteState);
    this.createRemoteChatBubble(remoteState);

    const pendingChat = this.pendingRemoteChats.get(remoteState.userId);

    if (pendingChat) {
      const remaining = pendingChat.until - performance.now();

      this.pendingRemoteChats.delete(remoteState.userId);

      if (remaining > 0) {
        this.showRemoteChatMessage(
          remoteState.userId,
          pendingChat.message,
          remaining,
          remoteState.connectionId,
        );
      }
    }

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

    this.drawRoundedRect(context, boxX, boxY, boxWidth, boxHeight, radius);

    context.fillStyle = 'rgba(0, 0, 0, 0.92)';
    context.fill();

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

    context.font = '600 40px Arial, sans-serif';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'left';
    context.textBaseline = 'middle';

    const textX = dotX + dotRadius + dotGap;

    context.fillText(name, textX, centerY);

    texture.update(true);

    const worldWidth = Math.min(2.45, Math.max(1.35, boxWidth / 185));
    remote.namePlate.scaling.set(worldWidth / 2.15, 0.44, 1);
  }

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
    namePlate.position.set(0, 1.85, 0);
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

  private updateRemoteNamePlate(remote: RemotePlayerVisual): void {
    if (remote.isDisposed || !remote.namePlate || !remote.nameTexture) {
      return;
    }

    this.renderRemoteNamePlate(remote);
  }

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
      const rootWorldY = remote.root.getAbsolutePosition().y;
      const topRelativeToRoot = bounds.max.y - rootWorldY;

      remote.namePlate.position.y = Math.max(
        1.7,
        Math.min(2.15, topRelativeToRoot + 0.02),
      );

      this.positionRemoteChatBubble(remote);
    } catch {
      remote.namePlate.position.y = 1.85;
      this.positionRemoteChatBubble(remote);
    }
  }

  private disposeRemoteNamePlate(remote: RemotePlayerVisual): void {
    if (remote.namePlate) {
      remote.namePlate.dispose();

      remote.namePlate = undefined;
    }

    if (remote.nameMaterial) {
      try {
        remote.nameMaterial.dispose();
      } catch {}

      remote.nameMaterial = undefined;
    }

    if (remote.nameTexture) {
      try {
        remote.nameTexture.dispose();
      } catch {}

      remote.nameTexture = undefined;
    }
  }

  showRemoteChatMessageByName(
    displayName: string,
    message: string,
    duration = this.remoteChatDuration,
  ): void {
    const normalizedName = displayName?.trim().toLowerCase();

    if (!normalizedName || !message?.trim()) {
      return;
    }

    for (const remote of this.remotePlayers.values()) {
      if (remote.isDisposed) {
        continue;
      }

      const remoteName = remote.displayName?.trim().toLowerCase();

      if (remoteName !== normalizedName) {
        continue;
      }

      this.showRemoteChatMessage(
        remote.userId,
        message,
        duration,
        remote.connectionId,
      );

      return;
    }
  }

  showRemoteChatMessage(
    userId: string,
    message: string,
    duration = this.remoteChatDuration,
    connectionId?: string,
  ): void {
    if (!message?.trim()) {
      return;
    }

    const cleanMessage = message
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, this.remoteChatMaxCharacters);

    let remote: RemotePlayerVisual | undefined;

    if (connectionId) {
      remote = this.remotePlayers.get(connectionId);
    }

    if (!remote) {
      for (const candidate of this.remotePlayers.values()) {
        if (candidate.userId === userId && !candidate.isDisposed) {
          remote = candidate;
          break;
        }
      }
    }

    if (!remote) {
      this.pendingRemoteChats.set(userId, {
        message: cleanMessage,
        until: performance.now() + duration,
      });
      return;
    }

    if (!remote.chatBubble || remote.chatBubble.isDisposed()) {
      this.createRemoteChatBubble(remote);
    }

    remote.chatBubbleText = cleanMessage;
    remote.chatBubbleUntil = performance.now() + duration;
    remote.chatBubbleFadeStart =
      remote.chatBubbleUntil - this.remoteChatFadeDuration;

    this.renderRemoteChatBubble(remote);

    if (remote.chatBubbleMaterial) {
      remote.chatBubbleMaterial.alpha = 1;
    }

    if (remote.chatBubble) {
      remote.chatBubble.visibility = 1;
    }

    this.positionRemoteChatBubble(remote);
  }

  private createRemoteChatBubble(remote: RemotePlayerVisual): void {
    if (remote.isDisposed || remote.root.isDisposed()) {
      return;
    }

    if (remote.chatBubble && !remote.chatBubble.isDisposed()) {
      return;
    }

    const texture = new DynamicTexture(
      `remoteChatTexture_${remote.connectionId}`,
      { width: 768, height: 260 },
      this.scene,
      true,
    );

    texture.hasAlpha = true;

    const material = new StandardMaterial(
      `remoteChatMaterial_${remote.connectionId}`,
      this.scene,
    );

    material.diffuseTexture = texture;
    material.emissiveColor = Color3.White();
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = 2;
    material.alpha = 0;

    const bubble = MeshBuilder.CreatePlane(
      `remoteChatBubble_${remote.connectionId}`,
      { width: 1, height: 1 },
      this.scene,
    );

    bubble.parent = remote.root;
    bubble.position.set(0, 2.8, 0);
    bubble.billboardMode = Mesh.BILLBOARDMODE_ALL;
    bubble.material = material;
    bubble.isPickable = false;
    bubble.checkCollisions = false;
    bubble.visibility = 0;

    remote.chatBubble = bubble;
    remote.chatBubbleTexture = texture;
    remote.chatBubbleMaterial = material;
  }

  private wrapRemoteChatText(
    texture: DynamicTexture,
    text: string,
    maxWidth: number,
  ): string[] {
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;

    context.font = '600 30px Arial, sans-serif';

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (context.measureText(testLine).width <= maxWidth || !currentLine) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;

        if (lines.length === this.remoteChatMaxLines) {
          break;
        }
      }
    }

    if (currentLine && lines.length < this.remoteChatMaxLines) {
      lines.push(currentLine);
    }

    if (lines.length === this.remoteChatMaxLines) {
      const consumedWords = lines.join(' ').split(' ').length;

      if (consumedWords < words.length) {
        let last = lines[lines.length - 1];

        while (
          context.measureText(`${last}...`).width > maxWidth &&
          last.length > 1
        ) {
          last = last.slice(0, -1);
        }

        lines[lines.length - 1] = `${last}...`;
      }
    }

    return lines;
  }

  private renderRemoteChatBubble(remote: RemotePlayerVisual): void {
    if (
      remote.isDisposed ||
      !remote.chatBubble ||
      !remote.chatBubbleTexture ||
      !remote.chatBubbleMaterial
    ) {
      return;
    }

    const texture = remote.chatBubbleTexture;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;

    const textureWidth = 768;
    const textureHeight = 260;

    texture.clear();
    context.clearRect(0, 0, textureWidth, textureHeight);

    context.font = '600 40px Arial, sans-serif';

    const maxTextWidth = 650;
    const lines = this.wrapRemoteChatText(
      texture,
      remote.chatBubbleText,
      maxTextWidth,
    );

    const lineHeight = 50;
    let textWidth = 0;

    for (const line of lines) {
      textWidth = Math.max(textWidth, context.measureText(line).width);
    }

    const bubbleWidth = Math.min(700, Math.max(260, textWidth + 86));
    const bubbleHeight = Math.min(
      190,
      Math.max(82, lines.length * lineHeight + 46),
    );
    const x = (textureWidth - bubbleWidth) / 2;
    const y = 18;
    const radius = 24;

    context.save();
    context.shadowColor = 'rgba(0,0,0,0.35)';
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;

    this.drawRoundedRect(context, x, y, bubbleWidth, bubbleHeight, radius);
    context.fillStyle = 'rgba(15, 15, 18, 0.96)';
    context.fill();
    context.restore();

    this.drawRoundedRect(context, x, y, bubbleWidth, bubbleHeight, radius);
    context.strokeStyle = 'rgba(255,255,255,0.14)';
    context.lineWidth = 3;
    context.stroke();

    const tailCenter = textureWidth / 2;
    context.beginPath();
    context.moveTo(tailCenter - 18, y + bubbleHeight);
    context.lineTo(tailCenter, y + bubbleHeight + 22);
    context.lineTo(tailCenter + 18, y + bubbleHeight);
    context.closePath();
    context.fillStyle = 'rgba(15, 15, 18, 0.96)';
    context.fill();

    context.font = '600 34px Arial, sans-serif';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const textStartY =
      y + bubbleHeight / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      context.fillText(line, textureWidth / 2, textStartY + index * lineHeight);
    });

    texture.update(true);

    const planeWidth = Math.min(5.0, Math.max(3.2, bubbleWidth / 150));
    const planeHeight = Math.min(
      1.85,
      Math.max(1.0, (bubbleHeight + 25) / 115),
    );

    remote.chatBubble.scaling.set(planeWidth, planeHeight, 1);

    this.positionRemoteChatBubble(remote);
  }

  private positionRemoteChatBubble(remote: RemotePlayerVisual): void {
    if (
      remote.isDisposed ||
      !remote.chatBubble ||
      remote.chatBubble.isDisposed() ||
      remote.root.isDisposed()
    ) {
      return;
    }

    const nameY =
      remote.namePlate && !remote.namePlate.isDisposed()
        ? remote.namePlate.position.y
        : 2.05;

    const bubbleHeight = remote.chatBubble.scaling.y;

    remote.chatBubble.position.x = 0;
    remote.chatBubble.position.z = 0;
    remote.chatBubble.position.y = nameY + 0.18 + bubbleHeight / 2;

    remote.chatBubble.computeWorldMatrix(true);
  }

  private updateRemoteChatBubble(
    remote: RemotePlayerVisual,
    now: number,
  ): void {
    if (remote.isDisposed || !remote.chatBubble || !remote.chatBubbleMaterial) {
      return;
    }

    if (remote.chatBubbleUntil <= 0) {
      return;
    }

    if (now >= remote.chatBubbleUntil) {
      remote.chatBubble.visibility = 0;
      remote.chatBubbleMaterial.alpha = 0;
      remote.chatBubbleUntil = 0;
      remote.chatBubbleFadeStart = 0;
      remote.chatBubbleText = '';
      return;
    }

    if (now >= remote.chatBubbleFadeStart) {
      const progress =
        (now - remote.chatBubbleFadeStart) / this.remoteChatFadeDuration;

      remote.chatBubbleMaterial.alpha = Math.max(0, 1 - progress);
    } else {
      remote.chatBubbleMaterial.alpha = 1;
    }

    remote.chatBubble.visibility = remote.chatBubbleMaterial.alpha > 0 ? 1 : 0;

    remote.chatBubble.position.x = 0;
    remote.chatBubble.position.z = 0;

    this.positionRemoteChatBubble(remote);
  }

  private disposeRemoteChatBubble(remote: RemotePlayerVisual): void {
    if (remote.chatBubble) {
      remote.chatBubble.dispose();
      remote.chatBubble = undefined;
    }

    if (remote.chatBubbleMaterial) {
      try {
        remote.chatBubbleMaterial.dispose();
      } catch {}
      remote.chatBubbleMaterial = undefined;
    }

    if (remote.chatBubbleTexture) {
      try {
        remote.chatBubbleTexture.dispose();
      } catch {}
      remote.chatBubbleTexture = undefined;
    }

    remote.chatBubbleText = '';
    remote.chatBubbleUntil = 0;
    remote.chatBubbleFadeStart = 0;
  }

  private removeRemoteRootMotion(
    animationGroups: AnimationGroup[],
    character: AbstractMesh,
    visualRoot: TransformNode,
  ): void {
    const rootTargets = new Set<AbstractMesh | TransformNode>();

    rootTargets.add(character);

    rootTargets.add(visualRoot);

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

        if (
          rootTargets.has(target as AbstractMesh | TransformNode) &&
          targeted.animation.targetProperty === 'position'
        ) {
          group.removeTargetedAnimation(targeted.animation);
        }
      }
    }
  }

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
      const rootWorldY = remote.root.getAbsolutePosition().y;
      const minRelativeY = bounds.min.y - rootWorldY;

      remote.visualGroundOffset = -minRelativeY;
      remote.visualRoot.position.y = remote.visualGroundOffset;
    } catch {
      remote.visualGroundOffset = 0;
      remote.visualRoot.position.y = 0;
    }
  }

  private async loadRemotePlayerModel(
    remote: RemotePlayerVisual,
    model: CharacterModelConfig,
  ): Promise<void> {
    try {
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

      for (const mesh of result.meshes) {
        mesh.isPickable = false;

        mesh.checkCollisions = false;
      }

      remote.animationGroups = result.animationGroups;

      this.removeRemoteRootMotion(
        remote.animationGroups,
        character,
        visualRoot,
      );

      this.alignRemoteCharacterToGround(remote, character);

      this.positionRemoteNamePlate(remote, character);

      this.findRemoteAnimations(remote, model);

      this.stopRemoteAnimations(remote);

      this.playRemoteAnimation(remote, 'idle');

      remote.isLoading = false;
    } catch (error) {
      remote.isLoading = false;
    }
  }

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
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        const exact = validGroups.find(
          (group) => normalize(group.name) === normalizedAlias,
        );

        if (exact) {
          return exact;
        }
      }

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

    if (!remote.walkAnimation && remote.runAnimation) {
      remote.walkAnimation = remote.runAnimation;
    }

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
  }

  private stopRemoteAnimations(remote: RemotePlayerVisual): void {
    for (const group of remote.animationGroups) {
      group.stop();

      group.reset();

      group.setWeightForAllAnimatables(0);
    }

    remote.currentAnimation = null;
  }

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

    for (const group of remote.animationGroups) {
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

    remote.currentAnimation = type;
  }

  private updateRemotePlayer(
    remote: RemotePlayerVisual,
    player: Explore3dRemotePlayer,
  ): void {
    if (remote.isDisposed || remote.root.isDisposed()) {
      return;
    }

    const now = performance.now();

    const incomingPosition = new Vector3(player.x, player.y, player.z);

    const horizontalDistance = Math.sqrt(
      Math.pow(incomingPosition.x - remote.lastPosition.x, 2) +
        Math.pow(incomingPosition.z - remote.lastPosition.z, 2),
    );

    const deltaSeconds = Math.max((now - remote.lastUpdateTime) / 1000, 0.001);

    if (horizontalDistance > 0.0001) {
      remote.movementSpeed = horizontalDistance / deltaSeconds;

      remote.lastPosition.x = incomingPosition.x;

      remote.lastPosition.z = incomingPosition.z;

      remote.lastUpdateTime = now;
    } else {
      const networkAge = now - remote.lastUpdateTime;

      if (networkAge > 250) {
        remote.movementSpeed = 0;
      }
    }

    const verticalDifference = incomingPosition.y - remote.groundY;

    if (!remote.isRemoteJumping) {
      if (verticalDifference > this.remoteJumpHeightThreshold) {
        remote.isRemoteJumping = true;
      } else if (verticalDifference < -this.remoteGroundRebaseThreshold) {
        remote.groundY = incomingPosition.y;
        remote.targetPosition.y = remote.groundY;
      } else {
        remote.targetPosition.y = remote.groundY;
      }
    }

    if (remote.isRemoteJumping) {
      remote.targetPosition.y = incomingPosition.y;

      if (
        incomingPosition.y <= remote.groundY + this.remoteGroundSnapThreshold &&
        incomingPosition.y >= remote.groundY - this.remoteGroundSnapThreshold
      ) {
        remote.isRemoteJumping = false;
        remote.groundY = incomingPosition.y;
        remote.targetPosition.y = remote.groundY;
      }
    }

    remote.targetPosition.x = incomingPosition.x;

    remote.targetPosition.z = incomingPosition.z;

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

    const incomingDisplayName = player.displayName?.trim();
    const stableDisplayName =
      incomingDisplayName ||
      (player.userId && this.remoteDisplayNames.get(player.userId)) ||
      remote.displayName ||
      'Player';

    if (incomingDisplayName && player.userId) {
      this.remoteDisplayNames.set(player.userId, incomingDisplayName);
    }

    if (remote.displayName !== stableDisplayName) {
      remote.displayName = stableDisplayName;
      this.updateRemoteNamePlate(remote);
    }
  }

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

      remote.root.position = Vector3.Lerp(
        remote.root.position,
        remote.targetPosition,
        smoothFactor,
      );

      if (
        remote.visualRoot &&
        !remote.visualRoot.isDisposed() &&
        !remote.isRemoteJumping
      ) {
        remote.visualRoot.position.y = remote.visualGroundOffset;
      }

      if (remote.namePlate && !remote.namePlate.isDisposed()) {
        remote.namePlate.position.x = 0;

        remote.namePlate.position.z = 0;
      }

      if (remote.chatBubble && !remote.chatBubble.isDisposed()) {
        remote.chatBubble.position.x = 0;
        remote.chatBubble.position.z = 0;

        this.updateRemoteChatBubble(remote, performance.now());
      }
    }
  }

  private replaceRemotePlayer(player: Explore3dRemotePlayer): void {
    const connectionId = player.connectionId;

    this.disposeRemotePlayer(connectionId);

    this.createRemotePlayer(player);
  }

  private disposeRemotePlayer(connectionId: string): void {
    const remote = this.remotePlayers.get(connectionId);

    if (!remote) {
      return;
    }

    remote.isDisposed = true;

    for (const animation of remote.animationGroups) {
      try {
        animation.stop();

        animation.dispose();
      } catch {}
    }

    remote.animationGroups = [];

    this.disposeRemoteNamePlate(remote);
    this.disposeRemoteChatBubble(remote);

    if (!remote.root.isDisposed()) {
      remote.root.dispose(false, false);
    }

    remote.visualRoot = undefined;

    this.remotePlayers.delete(connectionId);

    this.remotePlayerLoadPromises.delete(connectionId);
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

    if (
      !this.networkInitialSyncPending &&
      positionDifference < 0.005 &&
      rotationDifference < 0.01
    ) {
      return;
    }

    this.networkInitialSyncPending = false;

    this.lastNetworkPosition = position.clone();
    this.lastNetworkRotationY = rotationY;

    // Coalesce network updates. If SignalR is busy, only the newest
    // transform is kept and sent when the current packet finishes.
    this.networkMovePending = true;
    void this.flushNetworkMovement();
  }

  private async flushNetworkMovement(): Promise<void> {
    if (this.networkMoveInFlight) {
      return;
    }

    if (!this.networkMovePending) {
      return;
    }

    if (!this.player || this.player.isDisposed()) {
      return;
    }

    if (!this.multiplayer.connected()) {
      return;
    }

    if (!this.multiplayer.getCurrentWorld()) {
      return;
    }

    this.networkMovePending = false;

    this.networkMoveInFlight = true;

    try {
      await this.multiplayer.movePlayer({
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z,
        rotationY: this.player.rotation.y,
      });
    } catch {
      // Movement packets are best-effort; the next update will recover.
    } finally {
      this.networkMoveInFlight = false;

      if (this.networkMovePending) {
        void this.flushNetworkMovement();
      }
    }
  }

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

    return skeletons[0];
  }

  private logImportedSkeletons(meshes: AbstractMesh[]): void {
    const skeletons = [
      ...new Set(
        meshes
          .map((mesh) => mesh.skeleton)
          .filter((skeleton): skeleton is Skeleton => !!skeleton),
      ),
    ];

    for (const skeleton of skeletons) {
    }
  }

  private logFinalAnimations(): void {}

  private logAnimationTargets(): void {}

  private logSkeletonBones(meshes: AbstractMesh[]): void {
    const skeletons = [
      ...new Set(
        meshes
          .map((mesh) => mesh.skeleton)
          .filter((skeleton): skeleton is Skeleton => !!skeleton),
      ),
    ];

    for (const skeleton of skeletons) {
    }
  }

  private configureImportedModel(meshes: AbstractMesh[]): void {
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

    for (const mesh of meshes) {
      mesh.isPickable = false;

      mesh.checkCollisions = false;
    }
  }

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

  private createFallbackPlayer(): void {
    const collider = this.createCollider();

    const material = new StandardMaterial('playerFallbackMaterial', this.scene);

    material.diffuseColor = new Color3(0.05, 0.55, 0.65);

    collider.material = material;

    collider.isVisible = true;

    this.player = collider;

    this.currentPlayerAnimation = null;
  }

  private findCharacterAnimations(model: CharacterModelConfig): void {
    const groups = this.playerAnimations;

    const normalize = (name: string): string =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const validGroups = groups.filter(
      (group) => group.targetedAnimations.length > 0,
    );

    const findAnimation = (aliases: string[]): AnimationGroup | undefined => {
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        const exact = validGroups.find(
          (group) => normalize(group.name) === normalizedAlias,
        );

        if (exact) {
          return exact;
        }
      }

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
  }

  private stopAllAnimations(): void {
    for (const group of this.playerAnimations) {
      group.stop();

      group.reset();

      group.setWeightForAllAnimatables(0);
    }

    this.currentPlayerAnimation = null;
  }

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
  }

  setRunning(running: boolean): void {
    this.isRunning = running;
  }

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

    this.updateNetworkPosition(delta);

    this.remoteSyncTimer += delta;

    if (this.remoteSyncTimer >= this.remoteSyncInterval) {
      this.remoteSyncTimer = 0;
      this.syncRemotePlayers();
    }

    this.updateRemoteVisuals(delta);

    this.updateMutualPlayerFacing(delta);
  }

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

  cancelNavigation(): void {
    this.destinationBusiness = null;

    this.destinationPosition = null;

    this.isAutoNavigating = false;
  }

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

  getCameraTarget(): Vector3 {
    if (!this.player || this.player.isDisposed()) {
      return Vector3.Zero();
    }

    return this.player.position.add(new Vector3(0, 1.2, 0));
  }

  getPlayerPosition(): Vector3 {
    if (!this.player || this.player.isDisposed()) {
      return Vector3.Zero();
    }

    return this.player.position.clone();
  }

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

    this.lastNetworkPosition = position.clone();

    this.lastNetworkRotationY = 0;

    this.networkMoveTimer = 0;

    this.networkInitialSyncPending = false;

    this.stopAllAnimations();

    this.playPlayerAnimation('idle');

    if (this.multiplayer.connected() && this.multiplayer.getCurrentWorld()) {
      this.networkMovePending = true;
      void this.flushNetworkMovement();
    }
  }

  getRemotePlayerCount(): number {
    return this.remotePlayers.size;
  }

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

    const remoteIds = Array.from(this.remotePlayers.keys());

    for (const connectionId of remoteIds) {
      this.disposeRemotePlayer(connectionId);
    }

    this.remotePlayers.clear();

    this.remotePlayerLoadPromises.clear();
    this.remoteDisplayNames.clear();
    this.pendingRemoteChats.clear();

    this.isJumping = false;

    this.isRunning = false;

    this.hasMovementInput = false;

    this.isActuallyMoving = false;

    this.networkMoveTimer = 0;
    this.networkMoveInFlight = false;
    this.networkMovePending = false;

    this.networkInitialSyncPending = true;

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
